'use client';
import { useEffect, useState, use } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import VideoCard from '@/components/VideoCard';
import { BadgeCheckIcon } from '@/components/Icons';
import { getInitialAvatar } from '@/lib/avatar';
import { getUid } from '@/lib/uid';
import { syncFollow } from '@/lib/local';

export default function CreatorProfilePage({ params }) {
  const resolvedParams = use(params);
  const slug = resolvedParams?.slug || '';
  const creatorName = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    try {
      const subs = JSON.parse(localStorage.getItem('xhub_subscriptions') || '[]');
      setIsSubscribed(subs.includes(creatorName));
    } catch {}

    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(slug)}&sort=newest&page=1`)
      .then(res => res.json())
      .then(data => {
        setVideos(data.videos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug, creatorName]);

  const handleToggleSubscribe = () => {
    try {
      const subs = JSON.parse(localStorage.getItem('xhub_subscriptions') || '[]');
      let updated;
      let action;
      if (isSubscribed) {
        updated = subs.filter(s => s !== creatorName);
        setIsSubscribed(false);
        action = 'unfollow';
      } else {
        updated = [...subs, creatorName];
        setIsSubscribed(true);
        action = 'follow';
      }
      localStorage.setItem('xhub_subscriptions', JSON.stringify(updated));
      // Best-effort server sync — localStorage stays the source of truth.
      syncFollow(getUid(), creatorName, creatorName, action);
    } catch {}
  };

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        {/* Creator Banner & Profile Header */}
        <div style={{
          position: 'relative',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '2rem'
        }}>
          {/* Cover Banner */}
          <div style={{
            height: '140px',
            background: 'linear-gradient(135deg, #261502 0%, #151515 50%, #0d0d0d 100%)',
            borderBottom: '1px solid var(--border)'
          }} />

          {/* Profile Details Bar */}
          <div style={{
            padding: '0 2rem 1.5rem',
            marginTop: '-45px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.25rem' }}>
              <img
                src={getInitialAvatar(creatorName)}
                alt={creatorName}
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  border: '4px solid var(--surface)',
                  objectFit: 'cover',
                  background: '#000'
                }}
              />
              <div style={{ marginBottom: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
                    {creatorName}
                  </h1>
                  <BadgeCheckIcon size={18} className="verified-badge-icon" />
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginTop: '0.15rem' }}>
                  {loading ? 'Loading catalog...' : `${videos.length} ${videos.length === 1 ? 'video' : 'videos'} uploaded`} • Verified Creator
                </div>
              </div>
            </div>

            <button
              onClick={handleToggleSubscribe}
              className={`subscribe-btn ${isSubscribed ? 'subscribed' : ''}`}
              style={{ padding: '0.6rem 1.8rem', fontSize: '0.9rem' }}
            >
              {isSubscribed ? 'Subscribed ✓' : 'Subscribe'}
            </button>
          </div>

          {/* Navigation Bar: honest single tab */}
          <div style={{ display: 'flex', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <div
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--brand)',
                borderBottom: '2px solid var(--brand)'
              }}
            >
              Videos ({videos.length})
            </div>
          </div>
        </div>

        <div className="dense-video-grid">
          {loading ? (
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="video-card-item">
                <div className="card-thumb-container skeleton-box" />
                <div style={{ marginTop: '0.65rem' }}>
                  <div className="skeleton-box" style={{ height: '16px', width: '85%', marginBottom: '6px' }} />
                  <div className="skeleton-box" style={{ height: '12px', width: '45%' }} />
                </div>
              </div>
            ))
          ) : videos.length > 0 ? (
            videos.map(video => (
              <VideoCard key={video.vkey || video.id} video={video} />
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-2)' }}>No videos found for {creatorName}.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
