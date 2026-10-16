'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Hls from 'hls.js';
import {
  PlayIcon,
  PauseIcon,
  Volume2Icon,
  VolumeXIcon,
  MaximizeIcon,
  SettingsIcon,
  PiPIcon,
  LoopIcon,
  Forward10Icon,
  CastIcon,
  CaptionsIcon
} from './Icons';
import { useMiniPlayer } from './MiniPlayerProvider';

// localStorage helpers (private, JSON-safe)
const readJSON = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
};

// Chapter regex: "0:00 Intro", "1:23:45 Deep dive"
const CHAPTER_RE = /(\d{1,2}:\d{2}(?::\d{2})?)\s+([^\n]{1,80})/g;
const chapterToSecs = ts => {
  const p = ts.split(':').map(Number);
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
};

export default function Player({
  vkey,
  hlsUrl,
  streams = [],
  streamsRetrying = false,
  poster,
  title,
  onTheaterToggle,
  isTheater = false,
  onStreamError,
  onEnded = null,         // parent-owned ended hook (e.g. playlist advance);
                         // return true if it navigated, so built-in autoplay skips
  description = '',       // chapters parsing
  nextUrl = null,         // autoplay-next target
  autoplayNext = false,   // toggle state (owned by WatchClient)
  onAutoplayNextChange,   // toggle sync callback
  embedUrl = null,
}) {
  const router = useRouter();
  const mini = useMiniPlayer();
  const [useEmbed, setUseEmbed] = useState(false);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [currentQuality, setCurrentQuality] = useState('720p');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [buffered, setBuffered] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [streamError, setStreamError] = useState(false);
  // True only when a direct stream actually failed (not just "not loaded yet")
  const streamFailedRef = useRef(false);
  // Set when switching quality: { t, playing } to resume after src swap
  const resumeTimeRef = useRef(null);
  // Background preloader for instant quality switches
  const preloadRef = useRef(null);
  const [qualitySwitching, setQualitySwitching] = useState(null);
  const qualitySwitchingRef = useRef(null);
  qualitySwitchingRef.current = qualitySwitching;

  // ---- Feature-pack state ----
  const [isLoop, setIsLoop] = useState(false);            // loop single video
  const [abLoop, setAbLoop] = useState({ a: null, b: null }); // A-B loop
  const [sleepTimer, setSleepTimer] = useState(0);         // minutes, 0 = off
  const [sleepRemaining, setSleepRemaining] = useState(0); // ms countdown
  const [flash, setFlash] = useState(null);                // transient center indicator {text,key}
  const [chapters, setChapters] = useState([]);            // parsed chapters
  const [subCues, setSubCues] = useState([]);              // parsed SRT cues
  const [subsOn, setSubsOn] = useState(false);             // subtitle overlay toggle
  const [activeCue, setActiveCue] = useState('');          // current cue text
  const [castReady, setCastReady] = useState(false);       // chromecast available
  const [brightness, setBrightness] = useState(1);          // gesture brightness

  // Refs for async/unmount handlers (always latest values)
  const latestRef = useRef({});
  latestRef.current = { activeStreamUrl: null, vkey, title, poster, autoplayNext, nextUrl };
  const miniApiRef = useRef(mini);
  miniApiRef.current = mini;
  const brightnessRef = useRef(1);
  const clickTimerRef = useRef(null);   // single vs double click distinguisher
  const swipeFlagRef = useRef(false);   // suppress click right after a swipe
  const touchStartRef = useRef(null);   // gesture tracking
  const sleepTimeoutRef = useRef(null);
  const sleepIntervalRef = useRef(null);
  const sleepEndRef = useRef(0);
  const lastSaveRef = useRef(0);        // continue-watch throttle
  const resumedKeyRef = useRef(null);   // resume-once guard per video+stream
  const subFileRef = useRef(null);
  const activeCueRef = useRef('');
  const flashTimerRef = useRef(null);

  // Available stream source URL — respects the selected mp4 quality.
  // streams: [{ quality: '1080'|'720'|'480'|'240', url }] from /api/stream
  const streamList = Array.isArray(streams) ? streams : [];
  const [activeQuality, setActiveQuality] = useState(null);

  const pickDefaultQuality = list => {
    if (!list.length) return null;
    return (
      list.find(s => s.quality === '720')?.quality ||
      list.find(s => ['480', '240'].includes(s.quality))?.quality ||
      list[0].quality
    );
  };

  const activeStreamUrl =
    hlsUrl ||
    (streamList.length
      ? (streamList.find(s => s.quality === (activeQuality || pickDefaultQuality(streamList)))?.url ||
         streamList[0]?.url)
      : null);
  latestRef.current.activeStreamUrl = activeStreamUrl;

  // Transient center flash ("+10s", "Resumed 12:34", "Volume 80%"…)
  const showFlash = text => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlash({ text, key: Date.now() });
    flashTimerRef.current = setTimeout(() => setFlash(null), 900);
  };

  const seekBy = secs => {
    const video = videoRef.current;
    if (!video) return;
    const dur = video.duration || 0;
    video.currentTime = Math.max(0, Math.min(dur, video.currentTime + secs));
    triggerControls();
  };

  // Initialize HLS / HTML5 Video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!activeStreamUrl) {
      // No direct stream (yet) — show loading; streams arrive async via /api/stream.
      // If they already failed, show the error state (no third-party iframe).
      if (streamFailedRef.current) setStreamError(true);
      setIsLoading(false);
      return;
    }

    setStreamError(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = activeStreamUrl.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        startLevel: -1, // Auto or highest
        capLevelToPlayerSize: true,
      });

      hlsRef.current = hls;
      hls.loadSource(activeStreamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setIsLoading(false);
        // Find 720p or level closest to 720p as default per PRD
        if (data.levels && data.levels.length > 0) {
          const l720Index = data.levels.findIndex(l => l.height === 720);
          if (l720Index !== -1) {
            hls.currentLevel = l720Index;
            setCurrentQuality('720p');
          }
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.warn('Fatal HLS error, attempting recover or embed fallback:', data);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              streamFailedRef.current = true;
              setStreamError(true);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari iOS HLS support
      video.src = activeStreamUrl;
      video.addEventListener('loadedmetadata', () => setIsLoading(false));
      video.addEventListener('error', () => {
        streamFailedRef.current = true;
        setStreamError(true);
        // Notify parent to auto-retry with fresh streams (token may have expired;
        // the batch refreshes every 10 min, so a retry often succeeds).
        try { onStreamError?.(); } catch {}
      });
    } else {
      video.src = activeStreamUrl;
      // Resume position after a quality switch
      if (resumeTimeRef.current) {
        const { t, playing } = resumeTimeRef.current;
        resumeTimeRef.current = null;
        const onReady = () => {
          try { video.currentTime = Math.min(t, video.duration || t); } catch {}
          if (playing) video.play().catch(() => {});
          video.removeEventListener('canplay', onReady);
        };
        video.addEventListener('canplay', onReady);
      }
      video.addEventListener('loadedmetadata', () => setIsLoading(false));
      video.addEventListener('error', () => {
        streamFailedRef.current = true;
        setStreamError(true);
        try { onStreamError?.(); } catch {}
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeStreamUrl]);

  // Continue watching + speed memory: restore once per video+stream load.
  // Resume only if saved >10s and <95% of duration; finished videos start over.
  // Unified xhub_progress schema { [vkey]: { t, d, ts } } — also feeds the
  // profile page's total-watch-time stat (single writer, no duplicates).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !vkey || !activeStreamUrl) return;
    const key = `${vkey}|${activeStreamUrl}`;
    resumedKeyRef.current = null;
    const onMeta = () => {
      if (resumedKeyRef.current === key) return;
      resumedKeyRef.current = key;
      const dur = video.duration;
      // Saved position
      const saved = readJSON('xhub_progress', {})[vkey];
      if (saved && saved.t > 10 && dur && saved.t < dur * 0.95) {
        try { video.currentTime = Math.min(saved.t, dur - 1); } catch {}
        showFlash(`Resumed ${formatTime(saved.t)}`);
      }
      // Saved playback speed
      const sp = readJSON('xhub_speed', {})[vkey];
      if (sp && speeds.includes(sp)) {
        try { video.playbackRate = sp; } catch {}
        setPlaybackSpeed(sp);
      }
    };
    video.addEventListener('loadedmetadata', onMeta);
    return () => video.removeEventListener('loadedmetadata', onMeta);
  }, [activeStreamUrl, vkey]);

  // Chapters: parse "0:00 Intro" style timestamps from title + description
  useEffect(() => {
    const text = `${title || ''}\n${description || ''}`;
    const found = [];
    let m;
    CHAPTER_RE.lastIndex = 0;
    while ((m = CHAPTER_RE.exec(text)) && found.length < 60) {
      found.push({ t: chapterToSecs(m[1]), label: m[2].trim() });
    }
    found.sort((a, b) => a.t - b.t);
    setChapters(found.filter((c, i) => i === 0 || c.t !== found[i - 1].t));
  }, [title, description]);

  // Chromecast: load sender SDK dynamically; show button only if usable
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.chrome?.cast) { setCastReady(true); return; }
    window.__onGCastApiAvailable = available => { if (available) setCastReady(true); };
    if (document.querySelector('script[data-cast-sender]')) return;
    const s = document.createElement('script');
    s.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js';
    s.async = true;
    s.setAttribute('data-cast-sender', '1');
    s.onerror = () => {}; // offline/adblock: stay hidden, no crash
    document.head.appendChild(s);
  }, []);

  // Sleep timer cleanup on unmount
  useEffect(() => () => {
    if (sleepTimeoutRef.current) clearTimeout(sleepTimeoutRef.current);
    if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
  }, []);

  // Mini player (#10): clear any stale mini overlay when a watch page mounts…
  useEffect(() => {
    miniApiRef.current?.clear?.();
  }, []);
  // …and hand the playing video off to it when navigating away mid-playback.
  // NOTE: no visibilitychange auto-pause anywhere — background audio keeps playing.
  useEffect(() => () => {
    const v = videoRef.current;
    const L = latestRef.current;
    try {
      if (v && L.vkey && L.activeStreamUrl && !v.paused && !v.ended && v.currentTime > 1) {
        miniApiRef.current?.register?.({
          src: L.activeStreamUrl,
          vkey: L.vkey,
          title: L.title,
          poster: L.poster,
          startTime: v.currentTime,
        });
      }
    } catch {}
  }, []);

  // Controls auto-hide
  const triggerControls = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
        setShowSettings(false);
      }
    }, 2800);
  };

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {
        // Autoplay policy: retry muted
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {});
      });
    } else {
      video.pause();
    }
  }, []);

  // Single click = play/pause (300ms delay), double click/tap = ∓10s seek.
  // Left third = -10s, right third = +10s, middle third = play/pause.
  const handleVideoClick = e => {
    if (swipeFlagRef.current) { swipeFlagRef.current = false; return; } // was a swipe
    const video = videoRef.current;
    if (!video) return;
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      const rect = video.getBoundingClientRect();
      const x = (e.clientX ?? rect.left + rect.width / 2) - rect.left;
      const third = rect.width / 3;
      if (x < third) { seekBy(-10); showFlash('-10s'); }
      else if (x > rect.width - third) { seekBy(10); showFlash('+10s'); }
      else togglePlay();
      triggerControls();
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        togglePlay();
      }, 300);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const t = video.currentTime;
    setCurrentTime(t);
    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1));
    }
    // A-B loop: jump back to A when hitting B
    if (abLoop.a != null && abLoop.b != null && abLoop.b > abLoop.a && t >= abLoop.b) {
      try { video.currentTime = abLoop.a; } catch {}
    }
    // Subtitle cue sync
    if (subsOn && subCues.length) {
      const cue = subCues.find(c => t >= c.start && t <= c.end);
      const txt = cue ? cue.text : '';
      if (txt !== activeCueRef.current) {
        activeCueRef.current = txt;
        setActiveCue(txt);
      }
    }
    // Continue watching: persist position (throttled 5s), prune 30-day-old entries.
    // Single unified writer for xhub_progress = { [vkey]: { t, d, ts } }.
    if (vkey && video.duration) {
      const now = Date.now();
      if (now - lastSaveRef.current > 5000) {
        lastSaveRef.current = now;
        const prog = readJSON('xhub_progress', {});
        prog[vkey] = { t, d: video.duration, ts: now };
        for (const k of Object.keys(prog)) {
          const e = prog[k];
          if (!e || typeof e !== 'object' || now - (e.ts || 0) > 30 * 864e5) delete prog[k];
        }
        writeJSON('xhub_progress', prog);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    // Finished — mark position at duration (not deleted): the <95% resume
    // check naturally skips it next time, and the profile page's
    // total-watch-time stat still counts the completed video.
    if (vkey) {
      const prog = readJSON('xhub_progress', {});
      const dur = videoRef.current?.duration || prog[vkey]?.d || 0;
      prog[vkey] = { t: dur, d: dur, ts: Date.now() };
      writeJSON('xhub_progress', prog);
    }
    // Autoplay next video: parent hook first (playlist advance etc.).
    // If it returns true it already navigated — skip the built-in fallback.
    let parentHandled = false;
    try { parentHandled = onEnded?.() === true; } catch {}
    const L = latestRef.current;
    if (!parentHandled && L.autoplayNext && L.nextUrl) router.push(L.nextUrl);
  };

  const handleSeek = e => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = pos * duration;
    setCurrentTime(pos * duration);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = e => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    video.muted = val === 0;
    setIsMuted(val === 0);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.() || container.webkitRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
  };

  // Loop single video
  const toggleLoop = () => {
    const video = videoRef.current;
    const next = !isLoop;
    setIsLoop(next);
    if (video) video.loop = next;
    triggerControls();
  };

  // A-B loop
  const setABPoint = which => {
    const t = videoRef.current?.currentTime || 0;
    setAbLoop(prev => ({ ...prev, [which]: t }));
    showFlash(which === 'a' ? `A set ${formatTime(t)}` : `B set ${formatTime(t)}`);
  };
  const clearAB = () => setAbLoop({ a: null, b: null });

  // Sleep timer: pause after N minutes, with live countdown in settings
  const clearSleepTimers = () => {
    if (sleepTimeoutRef.current) clearTimeout(sleepTimeoutRef.current);
    if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
    sleepTimeoutRef.current = sleepIntervalRef.current = null;
  };
  const setSleep = mins => {
    clearSleepTimers();
    setSleepTimer(mins);
    if (!mins) { setSleepRemaining(0); return; }
    const endAt = Date.now() + mins * 60000;
    sleepEndRef.current = endAt;
    setSleepRemaining(mins * 60000);
    sleepTimeoutRef.current = setTimeout(() => {
      videoRef.current?.pause();
      clearSleepTimers();
      setSleepTimer(0);
      setSleepRemaining(0);
      showFlash('Sleep timer: paused');
    }, mins * 60000);
    sleepIntervalRef.current = setInterval(() => {
      const left = sleepEndRef.current - Date.now();
      if (left <= 0) return;
      setSleepRemaining(left);
    }, 1000);
    setShowSettings(false);
  };

  const changeQuality = q => {
    setShowSettings(false);

    if (hlsRef.current) {
      setCurrentQuality(q);
      const hls = hlsRef.current;
      if (q === 'Auto') {
        hls.currentLevel = -1;
      } else {
        const height = parseInt(q.replace('p', ''), 10);
        const index = hls.levels.findIndex(l => l.height === height);
        if (index !== -1) hls.currentLevel = index;
      }
      return;
    }

    // Direct mp4 streams: preload the new quality in the background, then
    // swap instantly (browser cache makes the swap near-immediate).
    // The old quality keeps playing until the new one is ready.
    const target = streamList.find(s => s.quality === q.replace('p', ''));
    if (!target || !videoRef.current) return;
    const currentQ = activeQuality || pickDefaultQuality(streamList);
    if (target.quality === currentQ) return; // already on this quality

    const video = videoRef.current;
    // Instant UI feedback
    setCurrentQuality(`${target.quality}p`);
    setQualitySwitching(target.quality);

    const doSwap = () => {
      resumeTimeRef.current = { t: video.currentTime || 0, playing: !video.paused };
      setActiveQuality(target.quality);
      setQualitySwitching(null);
    };

    // Preload in a hidden video element so the swap feels instant
    try {
      const pre = preloadRef.current || document.createElement('video');
      preloadRef.current = pre;
      pre.preload = 'auto';
      pre.muted = true;
      const cleanup = () => {
        pre.removeEventListener('canplay', onReady);
        pre.removeEventListener('error', onError);
        pre.removeAttribute('src');
        pre.load();
      };
      const onReady = () => { cleanup(); doSwap(); };
      const onError = () => { cleanup(); doSwap(); }; // fallback: swap anyway
      pre.addEventListener('canplay', onReady);
      pre.addEventListener('error', onError);
      pre.src = target.url;
      pre.load();
      // Safety: swap anyway after 10s even if preload stalls
      setTimeout(() => {
        if (qualitySwitchingRef.current === target.quality) { cleanup(); doSwap(); }
      }, 10000);
    } catch {
      doSwap();
    }
  };

  const changeSpeed = s => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = s;
    setPlaybackSpeed(s);
    // Speed memory per video
    if (vkey) {
      const mem = readJSON('xhub_speed', {});
      mem[vkey] = s;
      writeJSON('xhub_speed', mem);
    }
    setShowSettings(false);
  };

  // Subtitles: parse uploaded .srt
  const parseSRT = text => {
    const cues = [];
    const blocks = text.replace(/\r/g, '').split(/\n\s*\n/);
    const tsRe = /(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/;
    for (const b of blocks) {
      const lines = b.trim().split('\n').map(l => l.trim());
      const tsIdx = lines.findIndex(l => l.includes('-->'));
      if (tsIdx === -1) continue;
      const m = lines[tsIdx].match(tsRe);
      if (!m) continue;
      const toSec = (h, mi, s, ms) => (+h) * 3600 + (+mi) * 60 + (+s) + (+ms) / 1000;
      const txt = lines.slice(tsIdx + 1).join('\n').replace(/<[^>]*>/g, '').trim();
      if (!txt) continue;
      cues.push({ start: toSec(m[1], m[2], m[3], m[4]), end: toSec(m[5], m[6], m[7], m[8]), text: txt });
    }
    cues.sort((a, b) => a.start - b.start);
    return cues;
  };

  const handleSubFile = e => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-uploading the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const cues = parseSRT(String(reader.result || ''));
      if (cues.length) {
        setSubCues(cues);
        setSubsOn(true);
        activeCueRef.current = '';
        showFlash(`Subtitles loaded (${cues.length} cues)`);
      } else {
        showFlash('No cues found in .srt');
      }
    };
    reader.readAsText(file);
  };

  // Chromecast: cast the active stream URL to a receiver
  const startCast = () => {
    try {
      const cast = window.chrome?.cast;
      if (!cast || !activeStreamUrl) return;
      const url = activeStreamUrl.startsWith('http')
        ? activeStreamUrl
        : window.location.origin + activeStreamUrl;
      const loadOn = session => {
        try {
          const mediaInfo = new cast.media.MediaInfo(
            url,
            url.includes('.m3u8') ? 'application/x-mpegurl' : 'video/mp4'
          );
          mediaInfo.metadata = new cast.media.GenericMediaMetadata();
          mediaInfo.metadata.title = title || 'XHUB';
          session.loadMedia(new cast.media.LoadRequest(mediaInfo), () => {}, () => {});
          showFlash('Casting…');
        } catch {}
      };
      const sessionRequest = new cast.SessionRequest(cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID);
      const apiConfig = new cast.ApiConfig(
        sessionRequest,
        s => { if (s) loadOn(s); },
        () => {}
      );
      cast.initialize(apiConfig,
        () => cast.requestSession(s => loadOn(s), () => {}),
        () => {});
    } catch {}
  };

  // Swipe gestures on the video surface:
  // horizontal = seek ∓10s per 50px; vertical left-half = brightness (CSS filter);
  // vertical right-half = volume. Taps are untouched (click handler still applies).
  const onTouchStartV = e => {
    const t = e.touches[0];
    touchStartRef.current = {
      x: t.clientX, y: t.clientY,
      seekAcc: 0,
      vol: videoRef.current?.volume ?? 1,
      bright: brightnessRef.current,
      moved: false,
    };
  };
  const onTouchMoveV = e => {
    const s = touchStartRef.current;
    const video = videoRef.current;
    if (!s || !video) return;
    const t = e.touches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
    s.moved = true;
    swipeFlagRef.current = true; // suppress the click that follows the swipe
    const rect = video.getBoundingClientRect();
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal: seek 10s per 50px swiped
      const steps = Math.trunc(dx / 50);
      if (steps !== s.seekAcc) {
        const delta = (steps - s.seekAcc) * 10;
        s.seekAcc = steps;
        const dur = video.duration || 0;
        video.currentTime = Math.max(0, Math.min(dur, video.currentTime + delta));
        showFlash(`${delta > 0 ? '+' : ''}${delta}s`);
      }
    } else {
      // Vertical: left half brightness, right half volume (swipe up = more)
      const amt = (s.y - t.clientY) / 200;
      if (s.x < rect.left + rect.width / 2) {
        const b = Math.max(0.3, Math.min(1.6, s.bright + amt));
        brightnessRef.current = b;
        setBrightness(b);
        video.style.filter = `brightness(${b.toFixed(2)})`;
        showFlash(`Brightness ${Math.round(b * 100)}%`);
      } else {
        const v = Math.max(0, Math.min(1, s.vol + amt));
        video.volume = v;
        setVolume(v);
        video.muted = v === 0;
        setIsMuted(v === 0);
        showFlash(`Volume ${Math.round(v * 100)}%`);
      }
    }
    triggerControls();
  };
  const onTouchEndV = () => { touchStartRef.current = null; };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = e => {
      // Don't capture when typing in search input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlay();
          triggerControls();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          triggerControls();
          break;
        case 'arrowleft':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
            triggerControls();
          }
          break;
        case 'arrowright':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
            triggerControls();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, duration]);

  const formatTime = seconds => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatCountdown = ms => {
    const total = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = h ? String(m).padStart(2, '0') : m;
    return `${h ? h + ':' : ''}${mm}:${String(s).padStart(2, '0')}`;
  };

  const qualities = streamList.length
    ? streamList.map(s => `${s.quality}p`)
    : ['1080p', '720p', '480p', '240p', 'Auto'];
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const sleepOptions = [0, 15, 30, 60, 90];
  const visibleChapters = duration > 0 ? chapters.filter(c => c.t < duration) : [];
  const abActive = abLoop.a != null && abLoop.b != null && abLoop.b > abLoop.a;

  const togglePiP = async () => {
    try {
      const video = videoRef.current;
      if (!video) return;
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      }
    } catch {}
  };

  return (
    <div
      ref={containerRef}
      className={`player-container ${isTheater ? 'theater-mode' : ''}`}
      onMouseMove={triggerControls}
      onTouchStart={triggerControls}
    >
      {useEmbed ? (
        <div className="player-embed-wrapper" style={{ position: 'relative', width: '100%', height: '100%', minHeight: '360px', backgroundColor: '#000' }}>
          <iframe
            src={embedUrl || `https://embed.redtube.net/?id=${encodeURIComponent(vkey)}&autoplay=1`}
            title={title || 'XHUB Player'}
            style={{ width: '100%', height: '100%', minHeight: '360px', border: 'none', display: 'block' }}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
          />
          {activeStreamUrl && (
            <button
              type="button"
              onClick={() => { setUseEmbed(false); setStreamError(false); }}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(0,0,0,0.8)',
                color: '#ff6b00',
                border: '1px solid rgba(255,107,0,0.6)',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                zIndex: 20,
              }}
            >
              Switch to HD Player
            </button>
          )}
        </div>
      ) : streamError || (!activeStreamUrl && streamFailedRef.current && !streamsRetrying) ? (
        <div className="player-error-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
          <div className="player-error-icon" style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#ff6b00' }}>⚠</div>
          <div className="player-error-title" style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Direct HD stream unavailable</div>
          <div className="player-error-text" style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1.25rem', maxWidth: '360px' }}>
            The direct stream server is updating. Switch to the standard player to watch now without waiting.
          </div>
          <button
            type="button"
            onClick={() => setUseEmbed(true)}
            className="filter-pill-btn active"
            style={{
              background: '#ff6b00',
              color: '#fff',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '24px',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255,107,0,0.3)',
            }}
          >
            ▶ Watch with Standard Player
          </button>
        </div>
      ) : !activeStreamUrl ? (
        <div className="player-loading-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="player-quality-spinner" style={{ width: 32, height: 32 }} />
          <div className="player-error-text" style={{ marginTop: '0.75rem' }}>Resolving HD stream…</div>
          <button
            type="button"
            onClick={() => setUseEmbed(true)}
            style={{
              marginTop: '1rem',
              background: 'transparent',
              color: '#ff6b00',
              border: '1px solid rgba(255,107,0,0.5)',
              padding: '5px 14px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Play immediately (Standard)
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            poster={poster}
            playsInline
            preload="auto"
            className="player-video-element"
            onClick={handleVideoClick}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleEnded}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={e => setDuration(e.target.duration)}
            onTouchStart={onTouchStartV}
            onTouchMove={onTouchMoveV}
            onTouchEnd={onTouchEndV}
          />

          {!isPlaying && !isLoading && (
            <div className="player-big-play" onClick={togglePlay}>
              <div className="player-big-play-btn">
                <PlayIcon size={32} />
              </div>
            </div>
          )}

          {qualitySwitching && (
            <div className="player-quality-badge">
              <span className="player-quality-spinner" />
              Switching to {qualitySwitching}p…
            </div>
          )}

          {/* Transient center indicator (double-tap / gestures / resume / sleep) */}
          {flash && (
            <div key={flash.key} className="player-flash-indicator">
              {flash.text}
            </div>
          )}

          {/* Subtitle cue overlay */}
          {subsOn && activeCue && (
            <div className="player-subtitle-overlay">
              {activeCue.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}

          {/* Player Chrome Controls */}
          <div className={`player-chrome ${showControls || !isPlaying ? 'visible' : ''}`}>
            {/* Progress bar */}
            <div className="player-progress-bar-wrap" onClick={handleSeek}>
              <div
                className="player-progress-buffered"
                style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
              />
              <div
                className="player-progress-played"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              >
                <div className="player-progress-scrubber" />
              </div>
              {visibleChapters.map((c, i) => (
                <button
                  key={i}
                  className="player-chapter-marker"
                  style={{ left: `${(c.t / duration) * 100}%` }}
                  title={`${formatTime(c.t)} — ${c.label}`}
                  aria-label={`Chapter: ${c.label}`}
                  onClick={e => {
                    e.stopPropagation();
                    if (videoRef.current && duration) {
                      videoRef.current.currentTime = Math.min(c.t, duration - 1);
                      triggerControls();
                    }
                  }}
                />
              ))}
            </div>

            <div className="player-controls-bottom">
              <div className="player-controls-left">
                <button onClick={togglePlay} className="player-btn" aria-label={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
                </button>

                <button
                  onClick={() => { seekBy(10); showFlash('+10s'); }}
                  className="player-btn"
                  title="Forward 10 seconds"
                  aria-label="Forward 10 seconds"
                >
                  <Forward10Icon size={20} />
                </button>

                <button
                  onClick={toggleLoop}
                  className={`player-btn ${isLoop ? 'active' : ''}`}
                  title={isLoop ? 'Loop off' : 'Loop this video'}
                  aria-label="Loop video"
                >
                  <LoopIcon size={19} />
                </button>

                <div className="player-volume-group">
                  <button onClick={toggleMute} className="player-btn" aria-label="Mute">
                    {isMuted || volume === 0 ? <VolumeXIcon size={20} /> : <Volume2Icon size={20} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="player-volume-slider"
                  />
                </div>

                <div className="player-time-display">
                  <span>{formatTime(currentTime)}</span>
                  <span>/</span>
                  <span>{formatTime(duration)}</span>
                </div>

                {abActive && (
                  <span className="player-ab-chip" title="A-B loop active">
                    A-B {formatTime(abLoop.a)}–{formatTime(abLoop.b)}
                  </span>
                )}
              </div>

              <div className="player-controls-right">
                {/* Settings menu toggle - only show if there are functional controls */}
                {(Boolean(hlsUrl) || Boolean(activeStreamUrl)) && (
                  <div className="player-settings-wrap">
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="player-btn"
                      title="Playback settings"
                    >
                      <SettingsIcon size={19} />
                    </button>

                    {showSettings && (
                      <div className="player-settings-dropdown">
                        {(Boolean(hlsUrl) || streamList.length > 1) && (
                          <div className="settings-section">
                            <div className="settings-label">Quality</div>
                            <div className="settings-options">
                              {qualities.map(q => (
                                <button
                                  key={q}
                                  onClick={() => changeQuality(q)}
                                  className={`settings-opt-btn ${currentQuality === q ? 'active' : ''}`}
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {Boolean(activeStreamUrl) && (
                          <div className="settings-section">
                            <div className="settings-label">Speed</div>
                            <div className="settings-options">
                              {speeds.map(s => (
                                <button
                                  key={s}
                                  onClick={() => changeSpeed(s)}
                                  className={`settings-opt-btn ${playbackSpeed === s ? 'active' : ''}`}
                                >
                                  {s}x
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Autoplay next (synced with the sidebar toggle) */}
                        <div className="settings-section">
                          <div className="settings-label">Autoplay</div>
                          <button
                            onClick={() => onAutoplayNextChange?.(!autoplayNext)}
                            className={`settings-toggle-row ${autoplayNext ? 'on' : ''}`}
                          >
                            <span>Next video</span>
                            <span>{autoplayNext ? 'ON' : 'OFF'}</span>
                          </button>
                        </div>

                        {/* A-B loop */}
                        <div className="settings-section">
                          <div className="settings-label">A-B loop</div>
                          <div className="settings-options">
                            <button
                              onClick={() => setABPoint('a')}
                              className={`settings-opt-btn ${abLoop.a != null ? 'active' : ''}`}
                              title="Set loop start at current position"
                            >
                              A{abLoop.a != null ? ` ${formatTime(abLoop.a)}` : ''}
                            </button>
                            <button
                              onClick={() => setABPoint('b')}
                              className={`settings-opt-btn ${abLoop.b != null ? 'active' : ''}`}
                              title="Set loop end at current position"
                            >
                              B{abLoop.b != null ? ` ${formatTime(abLoop.b)}` : ''}
                            </button>
                            {(abLoop.a != null || abLoop.b != null) && (
                              <button onClick={clearAB} className="settings-opt-btn">
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Sleep timer */}
                        <div className="settings-section">
                          <div className="settings-label">
                            Sleep timer{sleepTimer ? ` · ${formatCountdown(sleepRemaining)} left` : ''}
                          </div>
                          <div className="settings-options">
                            {sleepOptions.map(m => (
                              <button
                                key={m}
                                onClick={() => setSleep(m)}
                                className={`settings-opt-btn ${sleepTimer === m ? 'active' : ''}`}
                              >
                                {m === 0 ? 'Off' : `${m}m`}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {onTheaterToggle && (
                  <button
                    onClick={onTheaterToggle}
                    className="player-btn theater-btn"
                    title="Theater mode"
                  >
                    <span className="theater-icon-box" />
                  </button>
                )}

                {/* Subtitles (.srt upload) */}
                {Boolean(activeStreamUrl) && (
                  <button
                    onClick={() => (subCues.length ? setSubsOn(!subsOn) : subFileRef.current?.click())}
                    className={`player-btn ${subsOn ? 'active' : ''}`}
                    title={subCues.length ? (subsOn ? 'Hide subtitles' : 'Show subtitles') : 'Load .srt subtitles'}
                    aria-label="Subtitles"
                  >
                    <CaptionsIcon size={19} />
                  </button>
                )}
                <input
                  ref={subFileRef}
                  type="file"
                  accept=".srt"
                  style={{ display: 'none' }}
                  onChange={handleSubFile}
                  aria-hidden="true"
                  tabIndex={-1}
                />

                {/* Chromecast (only when the sender SDK is usable) */}
                {castReady && Boolean(activeStreamUrl) && (
                  <button
                    onClick={startCast}
                    className="player-btn"
                    title="Cast to TV"
                    aria-label="Cast to TV"
                  >
                    <CastIcon size={19} />
                  </button>
                )}

                {Boolean(activeStreamUrl) && (
                  <button
                    onClick={togglePiP}
                    className="player-btn"
                    title="Picture in picture"
                  >
                    <PiPIcon size={19} />
                  </button>
                )}

                <button
                  onClick={toggleFullscreen}
                  className="player-btn"
                  title="Fullscreen (F)"
                >
                  <MaximizeIcon size={19} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
