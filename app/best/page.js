'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import VideoCard from '@/components/VideoCard';
import { StarIcon } from '@/components/Icons';

export default function BestVideosPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  const fetchBest = async (p = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/feed?section=best&page=${p}`);
      const data = await res.json();
      const items = data.videos || [];
      setVideos(prev => (append ? [...prev, ...items] : items));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchBest(1, false);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchBest(nextPage, true);
  };

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <StarIcon size={22} className="section-heading-icon" filled={true} />
            <span>Best & Top Rated Videos</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Highest community approval ratings and most viewed scenes worldwide
          </p>
        </div>

        <div className="dense-video-grid">
          {loading
            ? Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="video-card-item">
                  <div className="card-thumb-container skeleton-box" />
                  <div style={{ marginTop: '0.65rem' }}>
                    <div className="skeleton-box" style={{ height: '16px', width: '85%', marginBottom: '6px' }} />
                    <div className="skeleton-box" style={{ height: '12px', width: '45%' }} />
                  </div>
                </div>
              ))
            : videos.map(video => (
                <VideoCard key={video.vkey || video.id} video={video} />
              ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '2.5rem 0 1rem' }}>
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="filter-pill-btn"
            style={{
              padding: '0.8rem 2.2rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)'
            }}
          >
            {loadingMore ? 'Loading More Videos...' : 'Load More Best Videos ↓'}
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
