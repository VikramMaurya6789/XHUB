'use client';
// Mini floating player (#10): keeps playback alive when the user navigates
// away from a watch page. Player registers {src, vkey, title, poster,
// startTime} on unmount if the video was playing; this overlay renders a
// fixed 300x170 player bottom-right until closed or the user returns.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { XIcon, MaximizeIcon } from './Icons';

const MiniPlayerContext = createContext({
  register: () => {},
  clear: () => {},
  mini: null,
});

export function useMiniPlayer() {
  return useContext(MiniPlayerContext);
}

export function MiniPlayerProvider({ children }) {
  const [mini, setMini] = useState(null); // { src, vkey, title, poster, startTime, key }

  const register = useCallback(info => {
    setMini({ ...info, key: Date.now() });
  }, []);
  const clear = useCallback(() => setMini(null), []);

  return (
    <MiniPlayerContext.Provider value={{ register, clear, mini }}>
      {children}
      <MiniPlayerOverlay mini={mini} onClose={clear} />
    </MiniPlayerContext.Provider>
  );
}

function MiniPlayerOverlay({ mini, onClose }) {
  const videoRef = useRef(null);
  const [needsTap, setNeedsTap] = useState(false);
  const miniKey = mini?.key;

  useEffect(() => {
    if (!mini) return;
    setNeedsTap(false);
    const v = videoRef.current;
    if (!v) return;
    // Resume where the main player left off
    const onMeta = () => {
      try {
        if (mini.startTime > 1 && v.duration && mini.startTime < v.duration - 1) {
          v.currentTime = mini.startTime;
        }
      } catch {}
    };
    v.addEventListener('loadedmetadata', onMeta);
    // Audible autoplay usually succeeds right after a user-gesture navigation;
    // if blocked, show a tap-to-resume button (gesture unlocks audio).
    v.play().then(() => setNeedsTap(false)).catch(() => setNeedsTap(true));
    return () => v.removeEventListener('loadedmetadata', onMeta);
  }, [mini, miniKey]);

  if (!mini) return null;

  const resumeTap = () => {
    videoRef.current?.play().then(() => setNeedsTap(false)).catch(() => {});
  };

  return (
    <div className="mini-player">
      <div className="mini-player-head">
        <span className="mini-player-title">{mini.title || 'Now playing'}</span>
        <div className="mini-player-actions">
          {mini.vkey && (
            <Link
              href={`/watch/${encodeURIComponent(mini.vkey)}`}
              className="mini-player-btn"
              title="Back to video"
              onClick={onClose}
            >
              <MaximizeIcon size={14} />
            </Link>
          )}
          <button onClick={onClose} className="mini-player-btn" title="Close mini player" aria-label="Close mini player">
            <XIcon size={14} />
          </button>
        </div>
      </div>
      <div className="mini-player-video-wrap">
        <video
          ref={videoRef}
          src={mini.src}
          poster={mini.poster}
          playsInline
          preload="auto"
          className="mini-player-video"
        />
        {needsTap && (
          <button className="mini-player-resume" onClick={resumeTap}>
            Tap to resume
          </button>
        )}
      </div>
    </div>
  );
}
