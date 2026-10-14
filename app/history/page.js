'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import VideoCard from '@/components/VideoCard';
import { HistoryIcon, DownloadIcon } from '@/components/Icons';

export default function HistoryPage() {
  const [videos, setVideos] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('xhub_history') || '[]');
      setVideos(stored);
    } catch {}
    setLoaded(true);
  }, []);

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear your entire Watch History?')) {
      localStorage.removeItem('xhub_history');
      setVideos([]);
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(videos, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'xhub_watch_history.json');
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
              <HistoryIcon size={22} className="section-heading-icon" />
              <span>Watch History ({videos.length})</span>
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Locally stored on your device only — never tracked on a server
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
                Clear History
              </button>
            </div>
          )}
        </div>

        {loaded && videos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <HistoryIcon size={48} style={{ color: 'var(--text-3)', marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              Your Watch History is clean
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Videos you watch on XHUB will automatically appear here for easy resumption.
            </p>
            <Link href="/" className="filter-pill-btn active" style={{ display: 'inline-block', padding: '0.65rem 1.8rem' }}>
              Start Watching →
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
