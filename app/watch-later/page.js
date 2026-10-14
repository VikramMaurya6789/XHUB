'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import VideoCard from '@/components/VideoCard';
import { ClockIcon, DownloadIcon } from '@/components/Icons';

export default function WatchLaterPage() {
  const [videos, setVideos] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('xhub_watch_later') || '[]');
      setVideos(stored);
    } catch {}
    setLoaded(true);
  }, []);

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear your Watch Later list?')) {
      localStorage.removeItem('xhub_watch_later');
      setVideos([]);
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(videos, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'xhub_watch_later.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClockIcon size={22} className="section-heading-icon" />
              <span>Watch Later ({videos.length})</span>
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Privacy-first local list saved securely on your device
            </p>
          </div>

          {videos.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleExportJSON}
                className="filter-pill-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <DownloadIcon size={14} />
                <span>Export JSON</span>
              </button>
              <button
                onClick={handleClearAll}
                className="filter-pill-btn"
                style={{ color: 'var(--danger)', borderColor: 'rgba(224, 36, 94, 0.3)' }}
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {loaded && videos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <ClockIcon size={48} style={{ color: 'var(--text-3)', marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              Your Watch Later list is empty
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Click the clock icon on any video card to save it for later viewing.
            </p>
            <Link href="/" className="filter-pill-btn active" style={{ display: 'inline-block', padding: '0.65rem 1.8rem' }}>
              Browse Hot Videos →
            </Link>
          </div>
        ) : (
          <div className="dense-video-grid">
            {videos.map(video => (
              <VideoCard key={video.vkey || video.id} video={video} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
