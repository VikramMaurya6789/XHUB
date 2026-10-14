'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import VideoCard from '@/components/VideoCard';
import {
  FlameIcon,
  SparklesIcon,
  StarIcon,
  UserIcon,
  ChevronRightIcon,
  FilmIcon
} from '@/components/Icons';
import { POPULAR_CATEGORIES, SPOTLIGHT_CREATORS } from '@/lib/videos';

export default function HomePage() {
  const [featuredVideos, setFeaturedVideos] = useState([]);
  const [trendingVideos, setTrendingVideos] = useState([]);
  const [newVideos, setNewVideos] = useState([]);
  const [indianVideos, setIndianVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        const [hotRes, trendRes, newRes, indianRes] = await Promise.all([
          fetch('/api/feed?section=hot&page=1').then(r => r.json()).catch(() => ({ videos: [] })),
          fetch('/api/feed?section=trending&page=1').then(r => r.json()).catch(() => ({ videos: [] })),
          fetch('/api/feed?section=new&page=1').then(r => r.json()).catch(() => ({ videos: [] })),
          fetch('/api/feed?section=indian&page=1').then(r => r.json()).catch(() => ({ videos: [] })),
        ]);

        setFeaturedVideos((hotRes.videos || []).slice(0, 5));
        setTrendingVideos(trendRes.videos || []);
        setNewVideos((newRes.videos || []).slice(0, 10));
        setIndianVideos((indianRes.videos || []).slice(0, 10));
      } catch (err) {
        console.error('Failed to load initial feeds:', err);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  const handleLoadMoreTrending = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await fetch(`/api/feed?section=trending&page=${nextPage}`);
      const data = await res.json();
      if (data.videos && data.videos.length > 0) {
        setTrendingVideos(prev => [...prev, ...data.videos]);
        setPage(nextPage);
      }
    } catch (err) {
      console.error('Error loading more:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      <AgeGate />
      <Header />

      <main className="page-wrapper">
        {/* Section 1: Featured / Hot strip (§5.3) */}
        <section className="homepage-section">
          <div className="section-header-row">
            <h2 className="section-heading">
              <FlameIcon className="section-heading-icon" size={20} />
              <span>Featured & Hot Videos</span>
            </h2>
            <Link href="/best" className="section-view-all">
              <span>View all hot</span>
              <ChevronRightIcon size={16} />
            </Link>
          </div>

          <div className="dense-video-grid">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="video-card-item">
                    <div className="card-thumb-container skeleton-box" />
                    <div style={{ marginTop: '0.65rem' }}>
                      <div className="skeleton-box" style={{ height: '16px', width: '90%', marginBottom: '6px' }} />
                      <div className="skeleton-box" style={{ height: '12px', width: '50%' }} />
                    </div>
                  </div>
                ))
              : featuredVideos.map(video => (
                  <VideoCard key={video.vkey || video.id} video={video} priority={true} />
                ))}
          </div>
        </section>

        {/* Section 2: Category chips quick-jump row (§5.3) */}
        <section className="homepage-section" style={{ marginTop: '2rem' }}>
          <div className="section-header-row">
            <h2 className="section-heading">
              <FilmIcon className="section-heading-icon" size={18} />
              <span>Popular Categories</span>
            </h2>
            <Link href="/categories" className="section-view-all">
              <span>All 150+ categories</span>
              <ChevronRightIcon size={16} />
            </Link>
          </div>

          <div className="category-chips-scroll">
            {POPULAR_CATEGORIES.map(cat => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="category-chip"
              >
                <span>{cat.name}</span>
                <span className="category-chip-count">{cat.count}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Section 3: Creators spotlight row (§5.3 & §5.8) */}
        <section className="homepage-section">
          <div className="section-header-row">
            <h2 className="section-heading">
              <UserIcon className="section-heading-icon" size={18} />
              <span>Spotlight Creators & Channels</span>
            </h2>
            <Link href="/creators" className="section-view-all">
              <span>Explore all creators</span>
              <ChevronRightIcon size={16} />
            </Link>
          </div>

          <div className="creators-spotlight-row">
            {SPOTLIGHT_CREATORS.map(creator => (
              <Link
                key={creator.slug}
                href={`/creators/${creator.slug}`}
                className="creator-spotlight-card"
              >
                <img
                  src={creator.avatar}
                  alt={creator.name}
                  className="creator-avatar"
                  loading="lazy"
                />
                <div>
                  <div className="creator-meta-name">
                    <span>{creator.name}</span>
                  </div>
                  <div className="creator-sub-count">
                    {creator.subscribers} subscribers • {creator.videos} videos
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Section 4: Recommended / Trending dense 5-col grid (§5.3) */}
        <section className="homepage-section" style={{ marginTop: '2.5rem' }}>
          <div className="section-header-row">
            <h2 className="section-heading">
              <StarIcon className="section-heading-icon" size={19} filled={true} />
              <span>Recommended Trending Videos</span>
            </h2>
            <Link href="/best" className="section-view-all">
              <span>View best list</span>
              <ChevronRightIcon size={16} />
            </Link>
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
              : trendingVideos.map(video => (
                  <VideoCard key={video.vkey || video.id} video={video} />
                ))}
          </div>

          {/* Infinite Scroll / Load More trigger (§5.3) */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '2.5rem 0 1rem' }}>
            <button
              onClick={handleLoadMoreTrending}
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
        </section>

        {/* Section 5: "New" feed grid (§5.3) */}
        <section className="homepage-section" style={{ marginTop: '2.5rem' }}>
          <div className="section-header-row">
            <h2 className="section-heading">
              <SparklesIcon className="section-heading-icon" size={19} />
              <span>Latest New Releases</span>
            </h2>
            <Link href="/new" className="section-view-all">
              <span>All new releases</span>
              <ChevronRightIcon size={16} />
            </Link>
          </div>

          <div className="dense-video-grid">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="video-card-item">
                    <div className="card-thumb-container skeleton-box" />
                    <div style={{ marginTop: '0.65rem' }}>
                      <div className="skeleton-box" style={{ height: '16px', width: '80%', marginBottom: '6px' }} />
                      <div className="skeleton-box" style={{ height: '12px', width: '50%' }} />
                    </div>
                  </div>
                ))
              : newVideos.map(video => (
                  <VideoCard key={video.vkey || video.id} video={video} />
                ))}
          </div>
        </section>

        {/* Section 6: Indian videos strip */}
        <section className="homepage-section" style={{ marginTop: '2.5rem' }}>
          <div className="section-header-row">
            <h2 className="section-heading">
              <FlameIcon className="section-heading-icon" size={19} />
              <span>Indian Videos</span>
            </h2>
            <Link href="/indian" className="section-view-all">
              <span>All Indian videos</span>
              <ChevronRightIcon size={16} />
            </Link>
          </div>

          <div className="dense-video-grid">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="video-card-item">
                    <div className="card-thumb-container skeleton-box" />
                    <div style={{ marginTop: '0.65rem' }}>
                      <div className="skeleton-box" style={{ height: '16px', width: '80%', marginBottom: '6px' }} />
                      <div className="skeleton-box" style={{ height: '12px', width: '50%' }} />
                    </div>
                  </div>
                ))
              : indianVideos.map(video => (
                  <VideoCard key={video.vkey || video.id} video={video} />
                ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
