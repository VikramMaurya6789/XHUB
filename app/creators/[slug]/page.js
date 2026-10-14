'use client';
import { useEffect, useState, use } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import VideoCard from '@/components/VideoCard';
import { BadgeCheckIcon, UserIcon } from '@/components/Icons';

export default function CreatorProfilePage({ params }) {
  const resolvedParams = use(params);
  const slug = resolvedParams?.slug || '';
  const creatorName = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const [activeTab, setActiveTab] = useState('videos');
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
      if (isSubscribed) {
        updated = subs.filter(s => s !== creatorName);
        setIsSubscribed(false);
      } else {
        updated = [...subs, creatorName];
        setIsSubscribed(true);
      }
      localStorage.setItem('xhub_subscriptions', JSON.stringify(updated));
    } catch {}
  };

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        {/* Creator Banner & Profile Header (§5.8) */}
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
            height: '180px',
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
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
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
                  840K Subscribers • Verified Content Creator
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

          {/* Bio */}
          <div style={{ padding: '0 2rem 1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', lineHeight: '1.5', maxWidth: '800px' }}>
              Welcome to the official {creatorName} channel on XHUB. Watch all exclusive high-definition video uploads, full scenes, and previews with high quality streaming.
            </p>
          </div>

          {/* Tabs (§5.8) */}
          <div style={{ display: 'flex', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <button
              onClick={() => setActiveTab('videos')}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: activeTab === 'videos' ? 'var(--brand)' : 'var(--text-2)',
                borderBottom: activeTab === 'videos' ? '2px solid var(--brand)' : 'none'
              }}
            >
              Videos ({videos.length || '30+'})
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: activeTab === 'photos' ? 'var(--brand)' : 'var(--text-2)',
                borderBottom: activeTab === 'photos' ? '2px solid var(--brand)' : 'none'
              }}
            >
              Photos
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'videos' ? (
          <div className="dense-video-grid">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
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
                <p style={{ color: 'var(--text-2)' }}>No videos found for this creator.</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
              Photo Galleries Coming Soon
            </h3>
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
              Hi-res photo galleries for {creatorName} are currently being indexed.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
