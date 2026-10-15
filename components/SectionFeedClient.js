'use client';
import { useEffect, useMemo, useState } from 'react';
import VideoCard from '@/components/VideoCard';
import { ShuffleIcon } from '@/components/Icons';
import {
  filterDiscoveryVideos,
  shuffleArray,
  useDiscoveryVersion,
  matchesDuration,
  matchesDate,
  isVideoHD,
  DURATION_FILTERS,
  QUALITY_FILTERS,
  DATE_FILTERS,
} from '@/lib/discovery';

export default function SectionFeedClient({
  initialVideos = [],
  section = 'best',
  showFilters = false,
  showShuffle = false,
}) {
  const version = useDiscoveryVersion();
  const [videos, setVideos] = useState(initialVideos);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [durFilter, setDurFilter] = useState('all');
  const [qualityFilter, setQualityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [shuffledOrder, setShuffledOrder] = useState(null);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await fetch(`/api/feed?section=${encodeURIComponent(section)}&page=${nextPage}`);
      const data = await res.json();
      if (data.videos && data.videos.length > 0) {
        setVideos(prev => [...prev, ...data.videos]);
        setPage(nextPage);
      }
    } catch (err) {
      console.error('Error loading more:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Reset shuffle when the underlying list grows (load more).
  useEffect(() => {
    setShuffledOrder(null);
  }, [videos.length]);

  const shown = useMemo(() => {
    const base = shuffledOrder || videos;
    let list = filterDiscoveryVideos(base);
    if (showFilters) {
      list = list.filter(
        v =>
          matchesDuration(v, durFilter) &&
          matchesDate(v, dateFilter) &&
          (qualityFilter === 'all' ||
            (qualityFilter === 'hd' ? isVideoHD(v) : !isVideoHD(v)))
      );
    }
    return list;
  }, [shuffledOrder, videos, version, showFilters, durFilter, qualityFilter, dateFilter]);

  const handleShuffle = () => {
    setShuffledOrder(shuffleArray(filterDiscoveryVideos(videos)));
  };

  const activeFilterCount =
    (durFilter !== 'all' ? 1 : 0) +
    (qualityFilter !== 'all' ? 1 : 0) +
    (dateFilter !== 'all' ? 1 : 0);

  return (
    <>
      {(showFilters || showShuffle) && (
        <div className="search-filter-bar" style={{ marginBottom: '1.25rem' }}>
          {showShuffle && (
            <div className="filter-group-wrap">
              <button
                type="button"
                onClick={handleShuffle}
                className="filter-pill-btn"
                title="Shuffle video order"
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ShuffleIcon size={14} />
                  Shuffle
                </span>
              </button>
            </div>
          )}

          {showFilters && (
            <>
              <div className="filter-group-wrap">
                <span className="filter-label">Duration:</span>
                <div className="filter-pills-row">
                  {DURATION_FILTERS.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setDurFilter(d.id)}
                      className={`filter-pill-btn ${durFilter === d.id ? 'active' : ''}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group-wrap">
                <span className="filter-label">Quality:</span>
                <div className="filter-pills-row">
                  {QUALITY_FILTERS.map(q => (
                    <button
                      key={q.id}
                      onClick={() => setQualityFilter(q.id)}
                      className={`filter-pill-btn ${qualityFilter === q.id ? 'active' : ''}`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group-wrap">
                <span className="filter-label">Date:</span>
                <div className="filter-pills-row">
                  {DATE_FILTERS.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setDateFilter(d.id)}
                      className={`filter-pill-btn ${dateFilter === d.id ? 'active' : ''}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <div className="filter-group-wrap">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                    {shown.length} video{shown.length === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDurFilter('all');
                      setQualityFilter('all');
                      setDateFilter('all');
                    }}
                    className="filter-pill-btn"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {shown.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-2)' }}>
            No videos match these filters.
          </p>
          {showFilters && (
            <button
              type="button"
              onClick={() => {
                setDurFilter('all');
                setQualityFilter('all');
                setDateFilter('all');
              }}
              className="filter-pill-btn"
              style={{ marginTop: '0.75rem' }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="dense-video-grid">
          {shown.map(video => (
            <VideoCard key={video.vkey || video.id} video={video} />
          ))}
        </div>
      )}

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
