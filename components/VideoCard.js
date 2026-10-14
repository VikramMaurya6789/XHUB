'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { BadgeCheckIcon, StarIcon, ClockIcon, PlayIcon, CheckIcon } from './Icons';

export default function VideoCard({ video, priority = false }) {
  const [isHovered, setIsHovered] = useState(false);
  const [thumbIndex, setThumbIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const scrubIntervalRef = useRef(null);
  const videoRef = useRef(null);

  if (!video) return null;

  const vkey = video.vkey || video.id;
  const watchUrl = `/watch/${encodeURIComponent(vkey)}`;

  const thumbs = Array.isArray(video.thumbsList) && video.thumbsList.length > 0 ? video.thumbsList : null;
  const hasPreview = Boolean(video.previewVideo || video.previewFallback);
  const previewSrc = video.previewVideo || video.previewFallback;

  const handleMouseEnter = () => {
    // Only trigger hover preview on devices that support hover (not mobile touch)
    if (typeof window !== 'undefined' && window.matchMedia && !window.matchMedia('(hover: hover)').matches) {
      return;
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      } else if (thumbs && thumbs.length > 1) {
        let idx = 0;
        scrubIntervalRef.current = setInterval(() => {
          idx = (idx + 1) % thumbs.length;
          setThumbIndex(idx);
        }, 220);
      }
    }, 180);
  };

  const handleMouseMove = e => {
    if (!thumbs || thumbs.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const targetIdx = Math.floor(pct * (thumbs.length - 1));
    setThumbIndex(targetIdx);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (scrubIntervalRef.current) clearInterval(scrubIntervalRef.current);
    setIsHovered(false);
    setThumbIndex(0);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleToggleWatchLater = e => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const stored = JSON.parse(localStorage.getItem('xhub_watch_later') || '[]');
      const exists = stored.some(item => (item.vkey || item.id) === vkey);
      let updated;
      if (exists) {
        updated = stored.filter(item => (item.vkey || item.id) !== vkey);
        setIsSaved(false);
      } else {
        updated = [video, ...stored];
        setIsSaved(true);
      }
      localStorage.setItem('xhub_watch_later', JSON.stringify(updated));
    } catch {}
  };

  const proxyThumbUrl = video.thumb?.startsWith('/api/thumb')
    ? video.thumb
    : `/api/thumb?vkey=${encodeURIComponent(vkey)}`;

  const currentDisplayThumb = isHovered && thumbs && thumbs[thumbIndex] && !thumbs[thumbIndex].includes('rdtcdn.com')
    ? thumbs[thumbIndex]
    : proxyThumbUrl;

  return (
    <div
      className="video-card-item"
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail section with sibling watch later button (R5: prevents accidental navigation) */}
      <div className="card-thumb-wrapper">
        <Link href={watchUrl} className="card-thumb-link" aria-label={video.title}>
          <div className="card-thumb-container">
            <img
              src={currentDisplayThumb}
              alt={video.title}
              className={`card-thumbnail ${isHovered && hasPreview ? 'is-faded' : ''}`}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              onError={e => {
                const currentSrc = e.currentTarget.getAttribute('src') || '';
                if (!currentSrc.includes('/api/thumb')) {
                  e.currentTarget.src = `/api/thumb?vkey=${encodeURIComponent(vkey)}`;
                  return;
                }
                e.currentTarget.style.display = 'none';
                const ph = e.currentTarget.parentElement?.querySelector('.card-thumb-fallback');
                if (ph) ph.style.display = 'flex';
              }}
            />
            <div
              className="card-thumb-fallback"
              style={{
                display: 'none',
                position: 'absolute',
                inset: 0,
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2a1503 100%)',
                color: '#ff6b00',
                fontWeight: 800,
                fontSize: '1.4rem',
                letterSpacing: '0.1em',
              }}
              aria-hidden="true"
            >
              XHUB
            </div>

            {isHovered && thumbs && thumbs.length > 1 && !hasPreview && (
              <div className="card-scrub-indicator">
                <div
                  className="card-scrub-progress"
                  style={{ width: `${((thumbIndex + 1) / thumbs.length) * 100}%` }}
                />
              </div>
            )}

            {isHovered && hasPreview && (
              <video
                ref={videoRef}
                src={previewSrc}
                muted
                playsInline
                loop
                className="card-preview-video"
              />
            )}

            {video.hd !== false && (
              <span className="card-quality-badge">HD</span>
            )}

            {video.duration && (
              <span className="card-duration-badge">{video.duration}</span>
            )}

            <div className="card-hover-play-btn">
              <PlayIcon size={20} />
            </div>
          </div>
        </Link>

        {/* Watch later button rendered as a sibling, NOT inside <a> */}
        <button
          type="button"
          onClick={handleToggleWatchLater}
          className={`card-watch-later-btn ${isSaved ? 'saved' : ''}`}
          title={isSaved ? 'In Watch Later' : 'Add to Watch Later'}
          aria-label="Save to Watch Later"
        >
          {isSaved ? <CheckIcon size={14} /> : <ClockIcon size={14} />}
        </button>
      </div>

      {/* Details section */}
      <Link href={watchUrl} className="card-details-link">
        <div className="card-details">
          <h3 className="card-title" title={video.title}>
            {video.title}
          </h3>

          <div className="card-uploader-row">
            <span className="card-uploader-name">
              {video.uploader?.name || 'Unknown uploader'}
            </span>
            {video.uploader?.verified && (
              <BadgeCheckIcon size={13} className="verified-badge-icon" />
            )}
            {video.views && (
              <span className="card-views-count">
                {' • '}{video.views}
              </span>
            )}
          </div>

          <div className="card-meta-row">
            {video.rating != null && (
              <>
                <span className="card-rating">
                  <StarIcon size={12} filled={true} />
                  <span>{video.rating}%</span>
                </span>
                <span className="card-meta-dot">•</span>
              </>
            )}
            <span className="card-age">
              {video.age || 'Recently'}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
