'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Player from '../../components/Player';

function WatchContent() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get('id') || params.get('vkey');
  const url = params.get('url');

  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!id && !url) {
      setError('No video ID or URL provided');
      return;
    }

    const query = id ? `id=${encodeURIComponent(id)}` : `url=${encodeURIComponent(url)}`;
    fetch(`/api/video?${query}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setInfo(d);
      })
      .catch(e => setError(e.message));
  }, [id, url]);

  const handleSearch = e => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: '#ff4d4d' }}>
            Video Unavailable
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error}</p>
          <Link
            href="/"
            style={{
              background: 'var(--accent-primary)',
              color: '#fff',
              padding: '0.6rem 1.5rem',
              borderRadius: '9999px',
              fontWeight: 700
            }}
          >
            ← Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div>
        <header className="site-header">
          <div className="header-container">
            <Link href="/" className="logo-brand">
              <span className="logo-badge">X</span>
              <span>HUB</span>
            </Link>
          </div>
        </header>
        <div className="watch-container">
          <div className="watch-main">
            <div className="player-wrapper">
              <div className="skeleton-thumb" style={{ width: '100%', height: '100%' }} />
            </div>
            <div className="skeleton-line" style={{ marginTop: '1.5rem', height: '24px', width: '80%' }} />
            <div className="skeleton-line" style={{ marginTop: '0.75rem', height: '16px', width: '40%' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="site-header">
        <div className="header-container">
          <Link href="/" className="logo-brand">
            <span className="logo-badge">X</span>
            <span>HUB</span>
          </Link>

          <form onSubmit={handleSearch} className="search-form">
            <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </form>

          <Link href="/" className="nav-tab">
            ← Explore
          </Link>
        </div>
      </header>

      <div className="watch-container">
        <div className="watch-main">
          <Player
            embedUrl={info.embed_url}
            streams={info.streams}
            poster={info.thumb || info.thumbnail}
            title={info.title}
          />

          <h1 className="watch-title">{info.title}</h1>

          <div className="watch-stats-bar">
            <div className="stat-group">
              <div className="stat-item">
                <span className="stat-icon">👁</span>
                <span>{info.views} views</span>
              </div>
              {info.rating && (
                <div className="stat-item">
                  <span className="stat-icon">★</span>
                  <span>{info.rating}% approval</span>
                </div>
              )}
              {info.duration && (
                <div className="stat-item">
                  <span className="stat-icon">⏱</span>
                  <span>{info.duration}</span>
                </div>
              )}
            </div>
          </div>

          {info.tags && info.tags.length > 0 && (
            <div className="tags-container">
              {info.tags.map((tag, i) => (
                <Link key={i} href={`/search?q=${encodeURIComponent(tag)}`} className="tag-chip">
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </div>

        {info.related && info.related.length > 0 && (
          <aside className="related-sidebar">
            <h3 className="related-title">
              <span>🔥</span>
              <span>Related Videos</span>
            </h3>
            {info.related.map(r => (
              <Link key={r.id} href={`/watch?id=${r.id}`} className="related-card">
                <div className="related-thumb">
                  <img src={r.thumb} alt={r.title} loading="lazy" />
                  {r.duration && <span className="duration-pill">{r.duration}</span>}
                </div>
                <div className="related-info">
                  <h4 className="related-card-title">{r.title}</h4>
                  <div className="related-meta">
                    <span>{r.views} views</span>
                    {r.rating && <span> • ★ {r.rating}%</span>}
                  </div>
                </div>
              </Link>
            ))}
          </aside>
        )}
      </div>
    </div>
  );
}

export default function Watch() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }} />
      }
    >
      <WatchContent />
    </Suspense>
  );
}
