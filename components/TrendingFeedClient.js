'use client';
import { useState, useMemo } from 'react';
import VideoCard from '@/components/VideoCard';
import { filterDiscoveryVideos, useDiscoveryVersion } from '@/lib/discovery';

export default function TrendingFeedClient({ initialVideos = [] }) {
  const discoveryVersion = useDiscoveryVersion();
  const [videos, setVideos] = useState(initialVideos);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  // Discovery: filter "not interested" + watched-hidden videos on render.
  const shownVideos = useMemo(
    () => filterDiscoveryVideos(videos),
    [videos, discoveryVersion]
  );

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await fetch(`/api/feed?section=trending&page=${nextPage}`);
      const data = await res.json();
      if (data.videos && data.videos.length > 0) {
        setVideos(prev => [...prev, ...data.videos]);
        setPage(nextPage);
      }
    } catch (err) {
      console.error('Error loading more trending videos:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      <div className="dense-video-grid">
        {shownVideos.map(video => (
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
          {loadingMore ? 'Loading More Videos...' : 'Load More Videos ↓'}
        </button>
      </div>
    </>
  );
}
