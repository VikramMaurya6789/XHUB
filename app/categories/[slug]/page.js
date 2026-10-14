'use client';
import { useEffect, useState, use, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import VideoCard from '@/components/VideoCard';
import { FilmIcon } from '@/components/Icons';

function CategoryFeedInner({ slug }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sort = searchParams.get('sort') || 'newest';

  const categoryTitle = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  const fetchVideos = async (p = 1, append = false, currentSort = sort) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(slug)}&sort=${currentSort}&page=${p}`);
      const data = await res.json();
      const items = data.videos || [];
      setVideos(prev => (append ? [...prev, ...items] : items));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (slug) {
      setPage(1);
      fetchVideos(1, false, sort);
    }
  }, [slug, sort]);

  const handleSortChange = (newSort) => {
    router.push(`/categories/${slug}?sort=${newSort}`);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchVideos(nextPage, true, sort);
  };

  return (
    <main className="page-wrapper">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FilmIcon size={22} className="section-heading-icon" />
            <span>{categoryTitle} Videos</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Streaming top rated {categoryTitle.toLowerCase()} videos
          </p>
        </div>

        {/* F6: Sort persists in URL query params */}
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
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="dense-video-grid">
        {loading ? (
          Array.from({ length: 15 }).map((_, i) => (
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
            <p style={{ color: 'var(--text-2)' }}>No videos found in this category.</p>
          </div>
        )}
      </div>

      {videos.length > 0 && (
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
            {loadingMore ? 'Loading More...' : `Load More ${categoryTitle} Videos ↓`}
          </button>
        </div>
      )}
    </main>
  );
}

export default function CategoryFeedPage({ params }) {
  const resolvedParams = use(params);
  const slug = resolvedParams?.slug || '';

  return (
    <>
      <AgeGate />
      <Header />
      <Suspense fallback={
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="skeleton-box" style={{ width: '120px', height: '24px' }} />
        </div>
      }>
        <CategoryFeedInner slug={slug} />
      </Suspense>
      <Footer />
    </>
  );
}
