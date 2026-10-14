'use client';
import { useEffect, useState, use } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import VideoCard from '@/components/VideoCard';
import { StarIcon, BadgeCheckIcon } from '@/components/Icons';
import { getInitialAvatar } from '@/lib/avatar';

export default function CelebrityDetailPage({ params }) {
  const resolvedParams = use(params);
  const slug = resolvedParams?.slug || '';
  const celebName = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(celebName)}&sort=mostviewed&page=1`)
      .then(res => res.json())
      .then(data => {
        setVideos(data.videos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [celebName]);

  const avatar = getInitialAvatar(celebName);

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <img
            src={avatar}
            alt={celebName}
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--brand)'
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                {celebName}
              </h1>
              <BadgeCheckIcon size={18} className="verified-badge-icon" />
            </div>
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Celebrity Archive • {loading ? 'Searching...' : `${videos.length} ${videos.length === 1 ? 'scene' : 'scenes'} indexed`}
            </p>
          </div>
        </div>

        <div className="dense-video-grid">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
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
              <p style={{ color: 'var(--text-2)' }}>No videos found for {celebName}.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
