'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import VideoCard from '@/components/VideoCard';
import { SlidersIcon, SearchIcon } from '@/components/Icons';

function SearchInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const query = searchParams.get('q') || '';
  const sortParam = searchParams.get('sort') || 'relevant';
  const durParam = searchParams.get('dur') || 'all';
  const qualParam = searchParams.get('quality') || 'all';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(pageParam);

  const updateFilters = (key, value) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (value === 'all' || value === 'relevant') {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }
    nextParams.set('page', '1');
    router.push(`/search?${nextParams.toString()}`);
  };

  useEffect(() => {
    if (!query.trim()) {
      setVideos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setPage(1);

    const params = new URLSearchParams({
      q: query,
      page: '1',
      ...(sortParam !== 'relevant' ? { sort: sortParam } : {}),
      ...(durParam !== 'all' ? { dur: durParam } : {}),
      ...(qualParam !== 'all' ? { quality: qualParam } : {}),
    });

    fetch(`/api/search?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setVideos(data.videos || []);
        setLoading(false);
      })
      .catch(() => {
        setVideos([]);
        setLoading(false);
      });
  }, [query, sortParam, durParam, qualParam]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const params = new URLSearchParams({
      q: query,
      page: String(nextPage),
      ...(sortParam !== 'relevant' ? { sort: sortParam } : {}),
      ...(durParam !== 'all' ? { dur: durParam } : {}),
      ...(qualParam !== 'all' ? { quality: qualParam } : {}),
    });

    try {
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      if (data.videos && data.videos.length > 0) {
        setVideos(prev => [...prev, ...data.videos]);
        setPage(nextPage);
      }
    } catch {} finally {
      setLoadingMore(false);
    }
  };

  return (
    <main className="page-wrapper">
      {/* Search Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
          {query ? `Results for "${query}"` : 'Search High-Performance Videos'}
        </h1>
        {query && (
          <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
            Showing top video matches across public streaming CDNs
          </p>
        )}
      </div>

      {/* Filter Bar (PRD §5.6) */}
      <div className="search-filter-bar">
        {/* Sort Filter */}
        <div className="filter-group-wrap">
          <span className="filter-label">Sort:</span>
          <div className="filter-pills-row">
            {[
              { id: 'relevant', label: 'Most Relevant' },
              { id: 'mostviewed', label: 'Most Viewed' },
              { id: 'rating', label: 'Top Rated' },
              { id: 'newest', label: 'Newest' },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => updateFilters('sort', s.id)}
                className={`filter-pill-btn ${sortParam === s.id ? 'active' : ''}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration Filter */}
        <div className="filter-group-wrap">
          <span className="filter-label">Duration:</span>
          <div className="filter-pills-row">
            {[
              { id: 'all', label: 'All' },
              { id: 'short', label: 'Short (<10m)' },
              { id: 'medium', label: 'Medium (10–30m)' },
              { id: 'long', label: 'Long (>30m)' },
            ].map(d => (
              <button
                key={d.id}
                onClick={() => updateFilters('dur', d.id)}
                className={`filter-pill-btn ${durParam === d.id ? 'active' : ''}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quality Filter */}
        <div className="filter-group-wrap">
          <span className="filter-label">Quality:</span>
          <div className="filter-pills-row">
            {[
              { id: 'all', label: 'All' },
              { id: 'hd', label: 'HD Only' },
            ].map(q => (
              <button
                key={q.id}
                onClick={() => updateFilters('quality', q.id)}
                className={`filter-pill-btn ${qualParam === q.id ? 'active' : ''}`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Video Grid */}
      {loading ? (
        <div className="dense-video-grid">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="video-card-item">
              <div className="card-thumb-container skeleton-box" />
              <div style={{ marginTop: '0.65rem' }}>
                <div className="skeleton-box" style={{ height: '16px', width: '85%', marginBottom: '6px' }} />
                <div className="skeleton-box" style={{ height: '12px', width: '45%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length > 0 ? (
        <>
          <div className="dense-video-grid">
            {videos.map(video => (
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
              {loadingMore ? 'Loading More Results...' : 'Load More Results ↓'}
            </button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <SearchIcon size={48} style={{ color: 'var(--text-3)', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
            No results — try fewer words.
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
            We could not find matching videos for "{query}". Try searching general categories or popular creator names.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Amateur', 'POV', 'MILF', 'Blowjob', 'Japanese', 'Anal'].map(tag => (
              <Link
                key={tag}
                href={`/search?q=${encodeURIComponent(tag)}`}
                className="category-chip"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <>
      <AgeGate />
      <Header />
      <Suspense fallback={
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="skeleton-box" style={{ width: '120px', height: '24px' }} />
        </div>
      }>
        <SearchInner />
      </Suspense>
      <Footer />
    </>
  );
}
