'use client';
import { useEffect, useState, use } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import VideoCard from '@/components/VideoCard';
import { BadgeCheckIcon, FilmIcon } from '@/components/Icons';

export default function ChannelProfilePage({ params }) {
  const resolvedParams = use(params);
  const slug = resolvedParams?.slug || '';
  const channelName = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(slug)}&sort=mostviewed&page=1`)
      .then(res => res.json())
      .then(data => {
        setVideos(data.videos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

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
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #FF9900, #995500)',
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '1.8rem'
          }}>
            {channelName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                {channelName} Channel
              </h1>
              <BadgeCheckIcon size={18} className="verified-badge-icon" />
            </div>
            <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Official channel network • Streaming in Full 1080p HD
            </p>
          </div>
        </div>

        <div className="dense-video-grid">
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
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
              <p style={{ color: 'var(--text-2)' }}>No videos found for this channel.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
