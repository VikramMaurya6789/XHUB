'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import Player from '@/components/Player';
import VideoStatsCard from '@/components/VideoStatsCard';
import Comments from '@/components/Comments';
import { getUid } from '@/lib/uid';
import { readJSON, writeJSON, syncFollow } from '@/lib/local';
import { getInitialAvatar } from '@/lib/avatar';
import { deriveTagsFromTitle } from '@/lib/discovery';
import { isVerifiedUploader } from '@/lib/verified';
import PlaylistModal from '@/components/PlaylistModal';
import { isLiked, toggleLiked, cacheVideo, getPlaylist } from '@/lib/library';
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
  CheckIcon,
  ListPlusIcon,
  QrCodeIcon
} from '@/components/Icons';

export default function WatchClient({ vkey, initialVideo = null, initialError = null }) {
  const router = useRouter();
  const [video, setVideo] = useState(initialVideo);
  const [loading, setLoading] = useState(!initialVideo && !initialError);
  const [error, setError] = useState(initialError);

  // Action states (per-device local storage / state per PRD §5.5)
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialVideo?.ratingsCount || 0);
  // Server-backed community ratings (best-effort; local state is source of truth)
  const [apiLikes, setApiLikes] = useState(0);
  const [apiDislikes, setApiDislikes] = useState(0);
  const [myRating, setMyRating] = useState(null); // 'like' | 'dislike' | null
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

  // Library features (local-only): liked videos, playlists, download, QR.
  const [isLikedVideo, setIsLikedVideo] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [playlistId, setPlaylistId] = useState(null);
  const [playlistQueue, setPlaylistQueue] = useState(null); // {name, vkeyList, index}

  const [streams, setStreams] = useState([]);
  const [streamsRetrying, setStreamsRetrying] = useState(false);

  // Fetch direct mp4 streams with retry (sync refreshes every 30min).
  // URLs are rewritten through /api/vproxy because Redtube's CDN only serves
  // video to redtube.com referers — browsers get 410 on direct URLs.
  const fetchStreams = (vkey, attempt = 0) => {
    fetch(`/api/stream?vkey=${encodeURIComponent(vkey)}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.qualities?.length) {
          const proxied = data.qualities.map(s => ({
            ...s,
            url: `/api/vproxy?vkey=${encodeURIComponent(vkey)}&q=${encodeURIComponent(s.quality)}`,
          }));
          setStreams(proxied);
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
          loadRatings(data.vkey || vkey);
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
      loadRatings(initialVideo.vkey || vkey);
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

      // Library: liked state + keep the video-meta cache fresh so vkey-only
      // collections (playlists / liked / folders) can render full cards.
      setIsLikedVideo(isLiked(data.vkey));
      cacheVideo(data);
    } catch (e) {
      console.warn('localStorage error:', e);
    }
  };

  // Library: liked-videos heart toggle (localStorage xhub_liked).
  const handleToggleLiked = () => {
    if (!video) return;
    try {
      setIsLikedVideo(toggleLiked(video));
    } catch {}
  };

  // Library: playlist "play all" queue (?playlist=<id> on the watch URL).
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('playlist');
      setPlaylistId(q || null);
    } catch {
      setPlaylistId(null);
    }
  }, [vkey]);

  useEffect(() => {
    if (!playlistId) {
      setPlaylistQueue(null);
      return;
    }
    const pl = getPlaylist(playlistId);
    if (!pl) {
      setPlaylistQueue(null);
      return;
    }
    const idx = pl.vkeys.findIndex(k => String(k) === String(vkey));
    setPlaylistQueue({ name: pl.name, vkeyList: pl.vkeys, index: idx });
  }, [playlistId, vkey]);

  const handleLike = () => {
    submitRating('like');
  };

  const handleDislike = () => {
    submitRating('dislike');
  };

  // Community ratings: optimistic local toggle + best-effort server sync.
  // localStorage (xhub_likes) stays the source of truth for this device.
  const submitRating = async type => {
    const uid = getUid();
    const prevMy = myRating;
    const nextMy =
      type === 'like'
        ? prevMy === 'like'
          ? null
          : 'like'
        : prevMy === 'dislike'
          ? null
          : 'dislike';
    setMyRating(nextMy);
    setLiked(nextMy === 'like');
    setDisliked(nextMy === 'dislike');

    try {
      const likesLS = readJSON('xhub_likes', {});
      if (video?.vkey) {
        if (nextMy) likesLS[video.vkey] = nextMy;
        else delete likesLS[video.vkey];
        writeJSON('xhub_likes', likesLS);
      }
    } catch {}

    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vkey, type, uid }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setApiLikes(data.likes);
        setApiDislikes(data.dislikes);
        setMyRating(data.myRating);
        setLiked(data.myRating === 'like');
        setDisliked(data.myRating === 'dislike');
      }
    } catch {
      // server unreachable — optimistic local state stands
    }
  };

  // Load server-backed ratings for this video (best-effort).
  const loadRatings = currentVkey => {
    if (!currentVkey) return;
    fetch(`/api/ratings?vkey=${encodeURIComponent(currentVkey)}&uid=${encodeURIComponent(getUid())}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.ok) {
          setApiLikes(data.likes);
          setApiDislikes(data.dislikes);
          setMyRating(data.myRating);
          setLiked(data.myRating === 'like');
          setDisliked(data.myRating === 'dislike');
        }
      })
      .catch(() => {});
    // Restore this device's own rating as local truth if the server has none
    try {
      const mine = readJSON('xhub_likes', {})[currentVkey];
      if (mine === 'like' || mine === 'dislike') {
        setMyRating(m => (m ? m : mine));
        setLiked(m => (m ? m : mine === 'like'));
        setDisliked(m => (m ? m : mine === 'dislike'));
      }
    } catch {}
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
      let action;
      if (isSubscribed) {
        updated = subs.filter(s => s !== name);
        setIsSubscribed(false);
        action = 'unfollow';
      } else {
        updated = [...subs, name];
        setIsSubscribed(true);
        action = 'follow';
      }
      localStorage.setItem('xhub_subscriptions', JSON.stringify(updated));
      // Best-effort server sync — localStorage stays the source of truth.
      syncFollow(getUid(), name, name, action);
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

  // Library: best available mp4 for the Download button (highest quality first).
  const downloadStream = (() => {
    if (!Array.isArray(streams) || !streams.length) return null;
    const rank = q => {
      const n = parseInt(String(q).replace(/\D/g, ''), 10);
      return Number.isFinite(n) ? n : 0;
    };
    return [...streams].sort((a, b) => rank(b.quality) - rank(a.quality))[0];
  })();
  const downloadFilename =
    `${String(video?.title || 'xhub-video').replace(/[^\w\- ]+/g, '').trim().slice(0, 80) || 'xhub-video'}.mp4`;
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Library: when playing from a playlist (?playlist=<id>), the player's
  // autoplay-next target becomes the next video in that playlist.
  const playlistNextUrl =
    playlistQueue && playlistId && playlistQueue.index >= 0 &&
    playlistQueue.index < playlistQueue.vkeyList.length - 1
      ? `/watch/${encodeURIComponent(playlistQueue.vkeyList[playlistQueue.index + 1])}?playlist=${encodeURIComponent(playlistId)}`
      : null;

  // Library: playlist "play all" — advance to the next video when this one ends.
  // Returns true when it navigated (Player skips its built-in autoplay then).
  const handlePlaylistEnded = () => {
    if (playlistNextUrl && autoplayNext) {
      router.push(playlistNextUrl);
      return true;
    }
    return false;
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

  // Discovery: tag chips — use API tags when present, otherwise derive
  // keywords from the title (meaningful words > 3 chars, max 8).
  const displayTags =
    video?.tags && video.tags.length > 0 ? video.tags : deriveTagsFromTitle(video?.title);

  return (
    <>
      <AgeGate />
      <Header />

      <main className="watch-page-container">
        {/* Primary Column (§5.5) */}
        <div className="watch-col-primary">
          <Player
            vkey={vkey}
            hlsUrl={video.hls}
            streams={streams}
            streamsRetrying={streamsRetrying}
            poster={video.thumb}
            title={video.title}
            isTheater={isTheater}
            onTheaterToggle={() => setIsTheater(!isTheater)}
            onEnded={handlePlaylistEnded}
            description={video.description}
            nextUrl={
              // Library: playlist "play all" overrides the default up-next target.
              playlistNextUrl ||
              (video.related?.[0]
                ? `/watch/${encodeURIComponent(video.related[0].vkey || video.related[0].id)}`
                : null)
            }
            autoplayNext={autoplayNext}
            onAutoplayNextChange={setAutoplayNext}
            onStreamError={() => {
              // Video element failed (e.g., token expired mid-playback).
              // Re-fetch streams after 15s — the batch refreshes every 10 min,
              // so fresh tokens are usually available on retry.
              setStreamsRetrying(true);
              setTimeout(() => fetchStreams(vkey), 15000);
            }}
          />

          {/* Library: playlist "play all" queue banner */}
          {playlistQueue && (
            <div className="lib-playlist-banner">
              <ListPlusIcon size={15} />
              <span>
                Playing from playlist <strong>{playlistQueue.name}</strong>
                {playlistQueue.index >= 0 && (
                  <> — {playlistQueue.index + 1} of {playlistQueue.vkeyList.length}</>
                )}
              </span>
              <Link href={`/playlists/${encodeURIComponent(playlistId)}`} className="lib-playlist-banner-link">
                View playlist
              </Link>
            </div>
          )}

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
                  {(video.uploader?.verified || isVerifiedUploader(video.uploader?.name)) && <BadgeCheckIcon size={15} className="verified-badge-icon" />}
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
              <span>{likeCount + apiLikes}</span>
            </button>

            {/* Dislike */}
            <button
              onClick={handleDislike}
              className={`watch-action-btn ${disliked ? 'active-danger' : ''}`}
              title="Dislike this video"
            >
              <ThumbsDownIcon size={16} />
              <span>{apiDislikes > 0 ? apiDislikes : 'Dislike'}</span>
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

            {/* Library: Liked (heart) */}
            <button
              onClick={handleToggleLiked}
              className={`watch-action-btn ${isLikedVideo ? 'active' : ''}`}
              title="Like this video (saved to Liked Videos)"
            >
              <HeartIcon size={16} filled={isLikedVideo} />
              <span>{isLikedVideo ? 'Liked' : 'Like it'}</span>
            </button>

            {/* Library: Add to playlist */}
            <button
              onClick={() => setShowPlaylistModal(true)}
              className="watch-action-btn"
              title="Save to playlist"
            >
              <ListPlusIcon size={16} />
              <span>Playlist</span>
            </button>

            {/* Library: Download MP4 */}
            <button
              onClick={() => setShowDownloadModal(true)}
              className="watch-action-btn"
              title="Download this video"
            >
              <DownloadIcon size={16} />
              <span>Download</span>
            </button>

            {/* Library: Continue on phone (QR code) */}
            <button
              onClick={() => setShowQrModal(true)}
              className="watch-action-btn"
              title="Continue watching on your phone"
            >
              <QrCodeIcon size={16} />
              <span>On phone</span>
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

            {/* Tags & Categories Chips — fall back to title-derived keywords
                when the catalog entry has no tags; chips link to /search?q=tag */}
            {displayTags.length > 0 && (
              <div className="watch-tags-row">
                {displayTags.map(tag => (
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

          {/* Video stats — deterministic estimated 14-day trend card */}
          <VideoStatsCard video={video} />

          {/* Comments Section — community comments via /api/comments */}
          <section className="watch-comments-section">
            <h3 className="comments-header-title">Comments</h3>
            <Comments vkey={video.vkey || vkey} />
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
                  <div className="related-card-uploader">
                    {rel.uploader?.name || 'Verified Creator'}
                    {(rel.uploader?.verified || isVerifiedUploader(rel.uploader?.name)) && (
                      <BadgeCheckIcon size={12} className="verified-badge-icon" style={{ marginLeft: '4px', verticalAlign: '-2px' }} />
                    )}
                  </div>
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

      {/* Library: playlist picker modal */}
      {showPlaylistModal && video && (
        <PlaylistModal video={video} onClose={() => setShowPlaylistModal(false)} />
      )}

      {/* Library: download modal */}
      {showDownloadModal && (
        <div className="auth-modal-backdrop" onClick={() => setShowDownloadModal(false)}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            <div className="auth-modal-header">
              <h3>Download video</h3>
              <button onClick={() => setShowDownloadModal(false)} className="auth-close-btn">✕</button>
            </div>
            <p className="auth-modal-desc">
              {downloadStream
                ? `Highest available quality: ${downloadStream.quality}p MP4.`
                : 'Stream links are still resolving — try again in a few seconds.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {downloadStream && (
                <a
                  href={downloadStream.url}
                  download={downloadFilename}
                  className="filter-pill-btn active"
                  style={{ textAlign: 'center', padding: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <DownloadIcon size={15} />
                  <span>Download MP4 ({downloadStream.quality}p)</span>
                </a>
              )}
              {downloadStream && (
                <a
                  href={downloadStream.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="filter-pill-btn"
                  style={{ textAlign: 'center', padding: '0.55rem' }}
                >
                  Open in new tab instead
                </a>
              )}
              <button onClick={() => setShowDownloadModal(false)} className="filter-pill-btn" style={{ padding: '0.55rem' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Library: QR code modal (continue on phone) */}
      {showQrModal && (
        <div className="auth-modal-backdrop" onClick={() => setShowQrModal(false)}>
          <div className="auth-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '340px', textAlign: 'center' }}>
            <div className="auth-modal-header">
              <h3>Continue on phone</h3>
              <button onClick={() => setShowQrModal(false)} className="auth-close-btn">✕</button>
            </div>
            <p className="auth-modal-desc">Scan with your phone camera to open this video:</p>
            {pageUrl ? (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pageUrl)}`}
                alt="QR code for this page"
                width={220}
                height={220}
                style={{ borderRadius: '8px', background: '#fff', padding: '8px', margin: '0 auto' }}
                loading="lazy"
              />
            ) : (
              <p className="auth-modal-desc">QR unavailable.</p>
            )}
            <div style={{ marginTop: '1rem' }}>
              <button onClick={() => setShowQrModal(false)} className="filter-pill-btn" style={{ padding: '0.55rem 1.5rem' }}>
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
