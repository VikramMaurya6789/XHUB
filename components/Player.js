'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  PlayIcon,
  PauseIcon,
  Volume2Icon,
  VolumeXIcon,
  MaximizeIcon,
  SettingsIcon
} from './Icons';

export default function Player({
  hlsUrl,
  streams = [],
  embedUrl,
  poster,
  title,
  onTheaterToggle,
  isTheater = false
}) {
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
  const [useEmbed, setUseEmbed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentEmbedUrl, setCurrentEmbedUrl] = useState(embedUrl);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setCurrentEmbedUrl(embedUrl);
  }, [embedUrl]);

  const handleRetryEmbed = () => {
    setRetryKey(k => k + 1);
  };

  const handleToggleSource = () => {
    setCurrentEmbedUrl(prev => {
      const url = prev || embedUrl || '';
      if (url.includes('embed.redtube.net')) {
        return url.replace('embed.redtube.net', 'embed.redtube.com');
      } else if (url.includes('embed.redtube.com')) {
        return url.replace('embed.redtube.com', 'embed.redtube.net');
      }
      return url;
    });
    setRetryKey(k => k + 1);
  };

  // Available stream source URL
  const activeStreamUrl = hlsUrl || (streams?.length ? streams[0]?.url : null);

  // Initialize HLS / HTML5 Video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!activeStreamUrl) {
      if (embedUrl) setUseEmbed(true);
      setIsLoading(false);
      return;
    }

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
              if (embedUrl) setUseEmbed(true);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari iOS HLS support
      video.src = activeStreamUrl;
      video.addEventListener('loadedmetadata', () => setIsLoading(false));
      video.addEventListener('error', () => {
        if (embedUrl) setUseEmbed(true);
      });
    } else {
      video.src = activeStreamUrl;
      video.addEventListener('loadedmetadata', () => setIsLoading(false));
      video.addEventListener('error', () => {
        if (embedUrl) setUseEmbed(true);
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeStreamUrl, embedUrl]);

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

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1));
    }
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

  const changeQuality = q => {
    setCurrentQuality(q);
    setShowSettings(false);

    if (hlsRef.current) {
      const hls = hlsRef.current;
      if (q === 'Auto') {
        hls.currentLevel = -1;
      } else {
        const height = parseInt(q.replace('p', ''), 10);
        const index = hls.levels.findIndex(l => l.height === height);
        if (index !== -1) hls.currentLevel = index;
      }
    }
  };

  const changeSpeed = s => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = s;
    setPlaybackSpeed(s);
    setShowSettings(false);
  };

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

  const qualities = ['1080p', '720p', '480p', '240p', 'Auto'];
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div
      ref={containerRef}
      className={`player-container ${isTheater ? 'theater-mode' : ''}`}
      onMouseMove={triggerControls}
      onTouchStart={triggerControls}
    >
      {useEmbed || !activeStreamUrl ? (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <iframe
            key={retryKey}
            src={currentEmbedUrl ? `${currentEmbedUrl}${currentEmbedUrl.includes('?') ? '&' : '?'}cb=${retryKey}` : ''}
            title={title || 'XHUB Stream'}
            className="player-iframe"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
          <div className="player-recovery-bar">
            <span>Playback issue?</span>
            <button type="button" onClick={handleRetryEmbed} className="player-recovery-btn">
              ↻ Reload Player
            </button>
            <button type="button" onClick={handleToggleSource} className="player-recovery-btn secondary">
              ⇄ Switch Mirror ({currentEmbedUrl?.includes('redtube.net') ? '.net → .com' : '.com → .net'})
            </button>
          </div>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            poster={poster}
            playsInline
            preload="metadata"
            className="player-video-element"
            onClick={togglePlay}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={e => setDuration(e.target.duration)}
          />

          {!isPlaying && !isLoading && (
            <div className="player-big-play" onClick={togglePlay}>
              <div className="player-big-play-btn">
                <PlayIcon size={32} />
              </div>
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
            </div>

            <div className="player-controls-bottom">
              <div className="player-controls-left">
                <button onClick={togglePlay} className="player-btn" aria-label={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
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
              </div>

              <div className="player-controls-right">
                {/* Settings menu toggle - only show if there are functional controls */}
                {(Boolean(hlsUrl) || (Boolean(activeStreamUrl) && !useEmbed)) && (
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
                        {Boolean(hlsUrl) && (
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

                        {Boolean(activeStreamUrl) && !useEmbed && (
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
