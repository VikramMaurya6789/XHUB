'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import VideoCard from '@/components/VideoCard';
import { SparklesIcon } from '@/components/Icons';

export default function IndianVideosPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  const fetchIndian = async (p = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/feed?section=indian&page=${p}`);
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
    fetchIndian(1, false);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchIndian(nextPage, true);
  };

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SparklesIcon size={22} className="section-heading-icon" />
            <span>Indian Videos</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Desi Indian videos — curated category feed
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
            {loadingMore ? 'Loading More Releases...' : 'Load More New Releases ↓'}
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
