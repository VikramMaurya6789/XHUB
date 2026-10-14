'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

export default function Home() {
  const router = useRouter();
  const [videos, setVideos] = useState([]);
  const [section, setSection] = useState('hot');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchVideos = (sec, p = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    fetch(`/api/feed?section=${sec}&page=${p}`)
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
    setPage(1);
    fetchVideos(section, 1, false);
  }, [section]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchVideos(section, nextPage, true);
  };

  const handleSearch = e => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const tabs = [
    { id: 'hot', label: '🔥 Hot' },
    { id: 'trending', label: '⭐ Top Rated' },
    { id: 'new', label: '✨ Newest' }
  ];

  return (
    <div>
      <header className="site-header">
        <div className="header-container">
          <Link href="/" className="logo-brand">
            <span className="logo-badge">X</span>
            <span>HUB</span>
          </Link>

          <form onSubmit={handleSearch} className="search-form">
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
              placeholder="Search hundreds of thousands of videos..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="submit" className="search-btn-icon" aria-label="Search">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </form>

          <nav className="nav-tabs">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setSection(t.id)}
                className={`nav-tab ${section === t.id ? 'active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="main-content">
        <div className="section-banner">
          <h2 className="section-title">
            <span className="section-title-icon">
              {section === 'hot' ? '🔥' : section === 'trending' ? '⭐' : '✨'}
            </span>
            {section === 'hot'
              ? 'Most Popular Videos'
              : section === 'trending'
              ? 'Top Rated Videos'
              : 'Recently Added Videos'}
          </h2>
        </div>

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
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No videos found</h3>
            <p style={{ color: 'var(--text-muted)' }}>Try choosing another category or refreshing.</p>
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
                {loadingMore ? 'Loading More...' : 'Load More Videos'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
