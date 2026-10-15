'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import VideoCard from '@/components/VideoCard';
import { getLikedVkeys, resolveVideos, clearLiked } from '@/lib/library';
import { HeartIcon, DownloadIcon } from '@/components/Icons';

export default function LikedPage() {
  const [videos, setVideos] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const vkeys = getLikedVkeys();
    if (vkeys.length) {
      resolveVideos(vkeys).then(v => {
        setVideos(v);
        setLoaded(true);
      });
    } else {
      setLoaded(true);
    }
  }, []);

  const handleClearAll = () => {
    if (confirm('Remove all videos from your Liked list?')) {
      clearLiked();
      setVideos([]);
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(videos, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'xhub_liked.json');
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
              <HeartIcon size={22} className="section-heading-icon" filled={true} />
              <span>Liked Videos ({videos.length})</span>
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
            <HeartIcon size={48} style={{ color: 'var(--text-3)', marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              No liked videos yet
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Tap the heart icon on any video card or watch page to like it.
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
