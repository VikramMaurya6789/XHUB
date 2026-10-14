'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';

export default function Player({ streams, poster, title }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [quality, setQuality] = useState('auto');
  const [showQMenu, setShowQMenu] = useState(false);
  const hideTimer = useRef(null);

  // Default to 720p for fast start
  const defaultUrl = (() => {
    if (!streams?.length) return null;
    return (streams.find(s => String(s.quality) === '720') || streams.find(s => String(s.quality) === '480') || streams[0])?.url;
  })();
  const qualities = [...new Set((streams || []).map(s => s.quality).filter(q => q && q !== 'auto'))];

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !defaultUrl) return;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    const isHls = defaultUrl.includes('.m3u8');
    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false });
      hlsRef.current = hls;
      hls.loadSource(defaultUrl);
      hls.attachMedia(video);
    } else {
      video.src = defaultUrl;
    }
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [defaultUrl]);

  const changeQuality = (q) => {
    setQuality(q); setShowQMenu(false);
    const video = videoRef.current; if (!video) return;
    const wasPlaying = !video.paused, pos = video.currentTime;
    let url = defaultUrl;
    if (q !== 'auto') { const m = streams.find(s => String(s.quality) === String(q)); if (m) url = m.url; }
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (url.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false });
      hlsRef.current = hls; hls.loadSource(url); hls.attachMedia(video);
    } else { video.src = url; }
    video.currentTime = pos;
    if (wasPlaying) video.play().catch(() => {});
  };

  const togglePlay = useCallback(() => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { v.play().catch(() => { v.muted = true; setIsMuted(true); v.play().catch(() => {}); }); }
    else v.pause();
  }, []);

  const seek = (e) => {
    const v = videoRef.current; if (!v || !duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - r.left) / r.width) * duration;
  };

  const poke = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { if (videoRef.current && !videoRef.current.paused) setShowControls(false); }, 3000);
  };
  useEffect(() => { poke(); return () => clearTimeout(hideTimer.current); }, []);

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }} onMouseMove={poke} onTouchStart={poke}>
      <video ref={videoRef} poster={poster} playsInline preload="auto" className="w-full h-full"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}
        onTimeUpdate={e => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={e => setDuration(e.target.duration)} />
      {!isPlaying && (
        <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/40" aria-label="Play">
          <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center hover:scale-110 transition-transform">
            <svg className="w-10 h-10 text-black ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </button>
      )}
      <div className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8 transition-opacity ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-3" onClick={seek}>
          <div className="h-full bg-orange-500 rounded-full" style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }} />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={togglePlay} className="text-white" aria-label="Play/Pause">
            {isPlaying
              ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
          </button>
          <button onClick={() => { const v = videoRef.current; v.muted = !v.muted; setIsMuted(v.muted); }} className="text-white" aria-label="Mute">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
          </button>
          <span className="text-white text-sm">{fmt(currentTime)} / {fmt(duration)}</span>
          <div className="flex-1" />
          <div className="relative">
            <button onClick={() => setShowQMenu(!showQMenu)} className="text-white text-sm px-2">{quality === 'auto' ? 'Auto' : `${quality}p`}</button>
            {showQMenu && (
              <div className="absolute bottom-8 right-0 bg-black/90 rounded-lg py-1 min-w-[90px]">
                <button onClick={() => changeQuality('auto')} className="block w-full text-left px-4 py-1.5 text-white text-sm hover:bg-white/10">Auto</button>
                {qualities.map(q => <button key={q} onClick={() => changeQuality(q)} className="block w-full text-left px-4 py-1.5 text-white text-sm hover:bg-white/10">{q}p</button>)}
              </div>
            )}
          </div>
          <button onClick={() => { const el = videoRef.current?.parentElement; document.fullscreenElement ? document.exitFullscreen() : el?.requestFullscreen?.(); }} className="text-white" aria-label="Fullscreen">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
