'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import Player from '@/components/Player';
import { getInitialAvatar } from '@/lib/avatar';
import {
  ThumbsUpIcon,
  ThumbsDownIcon,
  HeartIcon,
  ClockIcon,
  ShareIcon,
  CodeIcon,
  DownloadIcon,
  FlagIcon,
  BadgeCheckIcon,
  StarIcon,
  CheckIcon
} from '@/components/Icons';

export default function WatchClient({ vkey, initialVideo = null, initialError = null }) {
  const [video, setVideo] = useState(initialVideo);
  const [loading, setLoading] = useState(!initialVideo && !initialError);
  const [error, setError] = useState(initialError);

  // Action states (per-device local storage / state per PRD §5.5)
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialVideo?.ratingsCount || 0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSavedLater, setIsSavedLater] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isTheater, setIsTheater] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [autoplayNext, setAutoplayNext] = useState(true);

  // Modals
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const [streams, setStreams] = useState([]);
  const [streamsRetrying, setStreamsRetrying] = useState(false);

  // Fetch direct mp4 streams with retry (sync refreshes every 30min).
  const fetchStreams = (vkey, attempt = 0) => {
    fetch(`/api/stream?vkey=${encodeURIComponent(vkey)}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.qualities?.length) {
          setStreams(data.qualities);
          setStreamsRetrying(false);
        } else if (attempt < 6) {
          // No streams yet or refreshing — retry in 10s (max 1 min).
          setStreamsRetrying(true);
          setTimeout(() => fetchStreams(vkey, attempt + 1), 10000);
        } else {
          setStreamsRetrying(false);
        }
      })
      .catch(() => {
        if (attempt < 6) {
          setStreamsRetrying(true);
          setTimeout(() => fetchStreams(vkey, attempt + 1), 10000);
        }
      });
  };

  useEffect(() => {
    if (!initialVideo && !initialError && vkey) {
      setLoading(true);
      setError(null);

      fetch(`/api/video?vkey=${encodeURIComponent(vkey)}`)
        .then(res => {
          if (!res.ok) throw new Error('Video not found or streaming unavailable');
          return res.json();
        })
        .then(data => {
          setVideo(data);
          setLikeCount(data.ratingsCount || 0);
          setLoading(false);
          syncLocalStorage(data);
        })
        .catch(err => {
          setError(err.message || 'Video not found or streaming unavailable');
          setLoading(false);
        });

      // Direct mp4 streams for our own custom player (with auto-retry)
      fetchStreams(vkey);
    } else if (initialVideo) {
      syncLocalStorage(initialVideo);
      fetchStreams(vkey);
    }
  }, [vkey, initialVideo, initialError]);

  const syncLocalStorage = data => {
    try {
      const history = JSON.parse(localStorage.getItem('xhub_history') || '[]');
      const filtered = history.filter(item => (item.vkey || item.id) !== data.vkey);
      const updated = [data, ...filtered].slice(0, 100);
      localStorage.setItem('xhub_history', JSON.stringify(updated));

      const later = JSON.parse(localStorage.getItem('xhub_watch_later') || '[]');
      setIsSavedLater(later.some(item => (item.vkey || item.id) === data.vkey));

      const favs = JSON.parse(localStorage.getItem('xhub_favorites') || '[]');
      setIsFavorite(favs.some(item => (item.vkey || item.id) === data.vkey));

      const subs = JSON.parse(localStorage.getItem('xhub_subscriptions') || '[]');
      setIsSubscribed(subs.includes(data.uploader?.name));
    } catch (e) {
      console.warn('localStorage error:', e);
    }
  };

  const handleLike = () => {
    if (liked) {
      setLiked(false);
      setLikeCount(prev => prev - 1);
    } else {
      setLiked(true);
      setLikeCount(prev => prev + 1);
      if (disliked) setDisliked(false);
    }
  };

  const handleDislike = () => {
    if (disliked) {
      setDisliked(false);
    } else {
      setDisliked(true);
      if (liked) {
        setLiked(false);
        setLikeCount(prev => prev - 1);
      }
    }
  };

  const handleToggleFavorite = () => {
    if (!video) return;
    try {
      const favs = JSON.parse(localStorage.getItem('xhub_favorites') || '[]');
      let updated;
      if (isFavorite) {
        updated = favs.filter(item => (item.vkey || item.id) !== video.vkey);
        setIsFavorite(false);
      } else {
        updated = [video, ...favs];
        setIsFavorite(true);
      }
      localStorage.setItem('xhub_favorites', JSON.stringify(updated));
    } catch {}
  };

  const handleToggleWatchLater = () => {
    if (!video) return;
    try {
      const later = JSON.parse(localStorage.getItem('xhub_watch_later') || '[]');
      let updated;
      if (isSavedLater) {
        updated = later.filter(item => (item.vkey || item.id) !== video.vkey);
        setIsSavedLater(false);
      } else {
        updated = [video, ...later];
        setIsSavedLater(true);
      }
      localStorage.setItem('xhub_watch_later', JSON.stringify(updated));
    } catch {}
  };

  const handleToggleSubscribe = () => {
    if (!video?.uploader?.name) return;
    const name = video.uploader.name;
    try {
      const subs = JSON.parse(localStorage.getItem('xhub_subscriptions') || '[]');
      let updated;
      if (isSubscribed) {
        updated = subs.filter(s => s !== name);
        setIsSubscribed(false);
      } else {
        updated = [...subs, name];
        setIsSubscribed(true);
      }
      localStorage.setItem('xhub_subscriptions', JSON.stringify(updated));
    } catch {}
  };

  const handleShare = async () => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: video?.title || 'Watch on XHUB',
          url: currentUrl
        });
        return;
      } catch {}
    }
    navigator.clipboard?.writeText(currentUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const embedCode = `<iframe src="${video?.embed_url || `https://xhub-rouge.vercel.app/watch/${vkey}`}" width="100%" height="480" frameborder="0" allowfullscreen></iframe>`;

  const handleCopyEmbed = () => {
    navigator.clipboard?.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2500);
  };

  if (error) {
    return (
      <>
        <AgeGate />
        <Header />
        <main className="page-wrapper" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: '440px', padding: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', color: '#ff4d4d' }}>
              Video Unavailable
            </h1>
            <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {error}
            </p>
            <Link
              href="/"
              className="filter-pill-btn active"
              style={{ display: 'inline-block', padding: '0.65rem 1.75rem' }}
            >
              ← Back to Discovery Feed
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (loading || !video) {
    return (
      <>
        <AgeGate />
        <Header />
        <main className="watch-page-container">
          <div className="watch-col-primary">
            <div className="player-container skeleton-box" />
            <div className="skeleton-box" style={{ height: '24px', width: '80%', marginTop: '1.25rem' }} />
            <div className="skeleton-box" style={{ height: '16px', width: '40%', marginTop: '0.75rem' }} />
          </div>
          <div className="watch-col-sidebar">
            <div className="skeleton-box" style={{ height: '20px', width: '50%', marginBottom: '1rem' }} />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="skeleton-box" style={{ width: '148px', height: '83px' }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton-box" style={{ height: '14px', width: '90%', marginBottom: '6px' }} />
                  <div className="skeleton-box" style={{ height: '12px', width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <AgeGate />
      <Header />

      <main className="watch-page-container">
        {/* Primary Column (§5.5) */}
        <div className="watch-col-primary">
          <Player
            hlsUrl={video.hls}
            streams={streams}
            streamsRetrying={streamsRetrying}
            poster={video.thumb}
            title={video.title}
            isTheater={isTheater}
            onTheaterToggle={() => setIsTheater(!isTheater)}
          />

          {/* Title Header */}
          <h1 className="watch-title-header">{video.title}</h1>

          {/* Uploader Card & Key Stats Bar */}
          <div className="watch-meta-strip">
            <div className="watch-uploader-card">
              <Link href={video.uploader?.url || `/creators/${encodeURIComponent(video.uploader?.name?.toLowerCase() || 'official')}`}>
                <img
                  src={video.uploader?.avatar || getInitialAvatar(video.uploader?.name)}
                  alt={video.uploader?.name || 'Uploader'}
                  className="uploader-avatar-img"
                  loading="lazy"
                />
              </Link>
              <div className="uploader-info-box">
                <Link
                  href={video.uploader?.url || `/creators/${encodeURIComponent(video.uploader?.name?.toLowerCase() || 'official')}`}
                  className="uploader-name-verified"
                >
                  <span>{video.uploader?.name || 'Unknown uploader'}</span>
                  {video.uploader?.verified && <BadgeCheckIcon size={15} className="verified-badge-icon" />}
                </Link>
                <span className="uploader-meta-stats">
                  {video.views} • {video.age || 'Recently'}
                </span>
              </div>

              <button
                onClick={handleToggleSubscribe}
                className={`subscribe-btn ${isSubscribed ? 'subscribed' : ''}`}
              >
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            </div>

            {video.rating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="card-rating" style={{ fontSize: '0.9rem' }}>
                  <StarIcon size={15} filled={true} />
                  <span>{video.rating}% Approval</span>
                </span>
              </div>
            )}
          </div>

          {/* Action Bar Semantics (§5.5) */}
          <div className="watch-action-bar">
            {/* Like */}
            <button
              onClick={handleLike}
              className={`watch-action-btn ${liked ? 'active' : ''}`}
              title="Like this video"
            >
              <ThumbsUpIcon size={16} />
              <span>{likeCount}</span>
            </button>

            {/* Dislike */}
            <button
              onClick={handleDislike}
              className={`watch-action-btn ${disliked ? 'active-danger' : ''}`}
              title="Dislike this video"
            >
              <ThumbsDownIcon size={16} />
              <span>Dislike</span>
            </button>

            {/* Favorites */}
            <button
              onClick={handleToggleFavorite}
              className={`watch-action-btn ${isFavorite ? 'active' : ''}`}
              title="Add to Favorites"
            >
              <HeartIcon size={16} filled={isFavorite} />
              <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
            </button>

            {/* Watch Later */}
            <button
              onClick={handleToggleWatchLater}
              className={`watch-action-btn ${isSavedLater ? 'active' : ''}`}
              title="Save to Watch Later list"
            >
              {isSavedLater ? <CheckIcon size={16} /> : <ClockIcon size={16} />}
              <span>{isSavedLater ? 'Saved' : 'Watch Later'}</span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="watch-action-btn"
              title="Share video"
            >
              <ShareIcon size={16} />
              <span>{copiedShare ? 'Copied Link!' : 'Share'}</span>
            </button>

            {/* Embed */}
            <button
              onClick={() => setShowEmbedModal(true)}
              className="watch-action-btn"
              title="Get Embed Code"
            >
              <CodeIcon size={16} />
              <span>Embed</span>
            </button>

            {/* Download (direct link out per PRD §5.5) */}
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="watch-action-btn"
              title="Direct link out to video source"
            >
              <DownloadIcon size={16} />
              <span>Source</span>
            </a>

            {/* Report */}
            <button
              onClick={() => setShowReportModal(true)}
              className="watch-action-btn"
              title="Report or Request Content Removal"
            >
              <FlagIcon size={16} />
              <span>Report</span>
            </button>
          </div>

          {/* Description (collapsible §5.5) */}
          <div className="watch-description-box">
            <p className={`watch-description-text ${isDescExpanded ? '' : 'collapsed'}`}>
              {video.description}
            </p>
            <button
              onClick={() => setIsDescExpanded(!isDescExpanded)}
              className="description-toggle-btn"
            >
              {isDescExpanded ? 'Show less ↑' : 'Show more description ↓'}
            </button>

            {/* Tags & Categories Chips */}
            {video.tags && video.tags.length > 0 && (
              <div className="watch-tags-row">
                {video.tags.map(tag => (
                  <Link
                    key={tag}
                    href={`/search?q=${encodeURIComponent(tag)}`}
                    className="video-tag-chip"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Comments Section (R1: Honest empty state, never invent comments) */}
          <section className="watch-comments-section">
            <h3 className="comments-header-title">
              Comments ({video.comments?.length || 0})
            </h3>

            {/* Disabled Reply Box per §5.5 */}
            <div className="comment-input-disabled-box">
              <span>Login to comment (Member accounts coming soon in v2)</span>
            </div>

            {video.comments && video.comments.length > 0 ? (
              <div className="comments-list">
                {video.comments.map(comment => (
                  <div key={comment.id} className="comment-item">
                    <img
                      src={comment.avatar || getInitialAvatar(comment.author)}
                      alt={comment.author}
                      className="comment-author-avatar"
                      loading="lazy"
                    />
                    <div className="comment-content-box">
                      <div>
                        <span className="comment-author-name">{comment.author}</span>
                        <span className="comment-time">{comment.time}</span>
                      </div>
                      <p className="comment-body-text">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.9rem' }}>
                No comments yet.
              </div>
            )}
          </section>
        </div>

        {/* Sidebar: Up Next & Related Videos (§5.5) */}
        <aside className="watch-col-sidebar">
          <div className="sidebar-header-row">
            <h3 className="sidebar-title">Up Next</h3>
            <label className="autoplay-toggle-wrap">
              <span>Autoplay next</span>
              <input
                type="checkbox"
                checked={autoplayNext}
                onChange={e => setAutoplayNext(e.target.checked)}
              />
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {(video.related || []).map(rel => (
              <Link
                key={rel.vkey || rel.id}
                href={`/watch/${encodeURIComponent(rel.vkey || rel.id)}`}
                className="related-sidebar-card"
              >
                <div className="related-sidebar-thumb">
                  <img
                    src={rel.thumb}
                    alt={rel.title}
                    loading="lazy"
                  />
                  <span className="card-duration-badge" style={{ bottom: '4px', right: '4px', fontSize: '0.7rem' }}>
                    {rel.duration}
                  </span>
                </div>
                <div className="related-sidebar-info">
                  <h4 className="related-card-title">{rel.title}</h4>
                  <div className="related-card-uploader">{rel.uploader?.name || 'Verified Creator'}</div>
                  <div className="related-card-stats">
                    <span>{rel.views} views</span>
                    <span>•</span>
                    <span>★ {rel.rating}%</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </main>

      {/* Embed Modal Popup */}
      {showEmbedModal && (
        <div className="auth-modal-backdrop" onClick={() => setShowEmbedModal(false)}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            <div className="auth-modal-header">
              <h3>Embed Video</h3>
              <button onClick={() => setShowEmbedModal(false)} className="auth-close-btn">✕</button>
            </div>
            <p className="auth-modal-desc">
              Copy this responsive iframe code to embed this video on your own website or blog:
            </p>
            <textarea
              readOnly
              value={embedCode}
              style={{
                width: '100%',
                height: '80px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text)',
                padding: '0.5rem',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                resize: 'none',
                marginBottom: '1rem'
              }}
            />
            <button
              onClick={handleCopyEmbed}
              className="filter-pill-btn active"
              style={{ width: '100%', padding: '0.65rem' }}
            >
              {copiedEmbed ? 'Copied to Clipboard!' : 'Copy Embed Code'}
            </button>
          </div>
        </div>
      )}

      {/* Report Modal Popup */}
      {showReportModal && (
        <div className="auth-modal-backdrop" onClick={() => setShowReportModal(false)}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            <div className="auth-modal-header">
              <h3>Content Removal / DMCA Notice</h3>
              <button onClick={() => setShowReportModal(false)} className="auth-close-btn">✕</button>
            </div>
            <p className="auth-modal-desc">
              XHUB respects copyright and privacy rights. If you are a copyright holder or depicted individual wishing to remove this video, please submit our expedited takedown form:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link
                href="/dmca"
                onClick={() => setShowReportModal(false)}
                className="filter-pill-btn active"
                style={{ textAlign: 'center', padding: '0.65rem' }}
              >
                Go to DMCA / Takedown Form →
              </Link>
              <button
                onClick={() => setShowReportModal(false)}
                className="filter-pill-btn"
                style={{ padding: '0.55rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
