'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function VideoCard({ v }) {
  return (
    <Link href={`/watch?id=${v.id}`} className="video-card">
      <div className="video-thumb-wrap">
        <img
          src={v.thumb}
          alt={v.title}
          className="video-thumb-img"
          loading="lazy"
        />
        {v.duration && <span className="duration-pill">{v.duration}</span>}
        {v.rating && (
          <span className="rating-badge">
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {v.rating}%
          </span>
        )}
        <div className="play-hover-overlay">
          <div className="play-circle">
            <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
      <div className="video-info">
        <h3 className="video-title" title={v.title}>
          {v.title}
        </h3>
        <div className="video-meta">
          <span>{v.views} views</span>
          {v.publishDate && <span>{v.publishDate.split(' ')[0]}</span>}
        </div>
      </div>
    </Link>
  );
}

function SearchContent() {
  const params = useSearchParams();
  const router = useRouter();
  const initialQuery = params.get('q') || '';
  const [q, setQ] = useState(initialQuery);
  const [videos, setVideos] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const doSearch = (query, p = 1, append = false) => {
    if (!query.trim()) return;
    if (append) setLoadingMore(true);
    else setLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(query)}&page=${p}`)
      .then(r => r.json())
      .then(d => {
        const items = d.videos || [];
        setVideos(prev => (append ? [...prev, ...items] : items));
        setLoading(false);
        setLoadingMore(false);
      })
      .catch(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  };

  useEffect(() => {
    if (initialQuery) {
      setQ(initialQuery);
      setPage(1);
      doSearch(initialQuery, 1, false);
    }
  }, [initialQuery]);

  const handleSubmit = e => {
    e.preventDefault();
    if (q.trim()) {
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      setPage(1);
      doSearch(q.trim(), 1, false);
    }
  };

  const handleTagClick = tag => {
    setQ(tag);
    router.push(`/search?q=${encodeURIComponent(tag)}`);
    setPage(1);
    doSearch(tag, 1, false);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    doSearch(q, nextPage, true);
  };

  const popularTags = [
    'Amateur',
    'Verified',
    'Romantic',
    'Reality',
    'HD',
    'Blonde',
    'Brunette',
    'College',
    'Japanese',
    'POV'
  ];

  return (
    <div>
      <header className="site-header">
        <div className="header-container">
          <Link href="/" className="logo-brand">
            <span className="logo-badge">X</span>
            <span>HUB</span>
          </Link>

          <form onSubmit={handleSubmit} className="search-form">
            <svg
              className="search-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search videos, actors, categories..."
              value={q}
              onChange={e => setQ(e.target.value)}
              autoFocus
            />
            {q && (
              <button type="submit" className="search-btn-icon" aria-label="Search">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </form>

          <Link href="/" className="nav-tab">
            ← Home
          </Link>
        </div>
      </header>

      <main className="main-content">
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            Popular searches:
          </div>
          <div className="tags-container" style={{ marginTop: 0 }}>
            {popularTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`tag-chip ${q.toLowerCase() === tag.toLowerCase() ? 'active' : ''}`}
                style={
                  q.toLowerCase() === tag.toLowerCase()
                    ? { background: 'var(--accent-primary)', color: '#fff' }
                    : {}
                }
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {initialQuery && (
          <div className="section-banner">
            <h2 className="section-title">
              <span>🔍</span>
              <span>Results for "{initialQuery}"</span>
            </h2>
          </div>
        )}

        {loading ? (
          <div className="video-grid">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-thumb" />
                <div className="skeleton-body">
                  <div className="skeleton-line" />
                  <div className="skeleton-line short" />
                </div>
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              {initialQuery ? `No videos found for "${initialQuery}"` : 'Search for any video or category'}
            </h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Try entering different keywords or select one of the popular categories above.
            </p>
          </div>
        ) : (
          <>
            <div className="video-grid">
              {videos.map(v => (
                <VideoCard key={v.id} v={v} />
              ))}
            </div>

            <div className="load-more-container">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="load-more-btn"
              >
                {loadingMore ? 'Loading More...' : 'Load More Results'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function Search() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }} />
      }
    >
      <SearchContent />
    </Suspense>
  );
}
