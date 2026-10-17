'use client';
import { useEffect, useState, use } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import VideoCard from '@/components/VideoCard';
import { BadgeCheckIcon, StarIcon, FlameIcon } from '@/components/Icons';
import { getPornstarBySlug } from '@/lib/pornstars';
import { getInitialAvatar } from '@/lib/avatar';

export default function PornstarProfilePage({ params }) {
  const resolvedParams = use(params);
  const slug = resolvedParams?.slug || '';
  const star = getPornstarBySlug(slug);

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('mostviewed');

  const fetchVideos = (p = 1, append = false, currentSort = sort) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(star?.name || slug)}&sort=${currentSort}&page=${p}`)
      .then(res => res.json())
      .then(data => {
        const items = data.videos || [];
        setVideos(prev => (append ? [...prev, ...items] : items));
      })
      .catch(err => {
        console.error('Error fetching pornstar scenes:', err);
      })
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  };

  useEffect(() => {
    if (star?.name || slug) {
      setPage(1);
      fetchVideos(1, false, sort);
    }
  }, [slug, sort]);

  const handleSortChange = newSort => {
    setSort(newSort);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchVideos(nextPage, true, sort);
  };

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        {/* Performer Hero Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(28, 28, 28, 0.95), rgba(18, 18, 18, 0.95))',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          flexWrap: 'wrap'
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid var(--brand)',
            boxShadow: '0 4px 20px rgba(255, 107, 0, 0.3)',
            flexShrink: 0,
            backgroundColor: '#111'
          }}>
            <img
              src={star?.image || getInitialAvatar(star?.name || slug)}
              alt={star?.name || slug}
              onError={e => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = getInitialAvatar(star?.name || slug);
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block'
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
                {star?.name || slug}
              </h1>
              <BadgeCheckIcon size={22} className="verified-badge-icon" />
              {star?.rank && (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#fff',
                  background: 'linear-gradient(135deg, #ff9900, #ff5500)',
                  padding: '3px 10px',
                  borderRadius: '12px'
                }}>
                  Rank {star.rank}
                </span>
              )}
            </div>

            <p style={{ color: 'var(--text-3)', fontSize: '0.9rem', marginTop: '0.4rem', lineHeight: '1.4' }}>
              Verified Performer Profile • {loading ? 'Loading scenes...' : `${videos.length}+ scenes available in Ultra HD`}
            </p>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: 'var(--text-2)'
              }}>
                <span style={{ color: 'var(--brand)', fontWeight: 700 }}>4K & 1080p</span> Supported
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: 'var(--text-2)'
              }}>
                <span style={{ color: '#00d26a', fontWeight: 700 }}>100% Free</span> Streaming
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Sorting */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FlameIcon size={20} className="section-heading-icon" />
            <span>Featured Scenes</span>
          </h2>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[
              { id: 'mostviewed', label: 'Most Viewed' },
              { id: 'rating', label: 'Top Rated' },
              { id: 'newest', label: 'Newest' }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => handleSortChange(s.id)}
                className={`filter-pill-btn ${sort === s.id ? 'active' : ''}`}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Video Grid */}
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
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 1rem' }}>
              <p style={{ color: 'var(--text-2)' }}>No scenes found for {star?.name || slug}.</p>
            </div>
          )}
        </div>

        {/* Load More Pagination */}
        {videos.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '3rem 0 1.5rem' }}>
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="filter-pill-btn"
              style={{
                padding: '0.8rem 2.5rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)'
              }}
            >
              {loadingMore ? 'Loading More Scenes...' : `Load More ${star?.name || 'Performer'} Scenes ↓`}
            </button>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
