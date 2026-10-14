'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { FilmIcon, PlayIcon, StarIcon } from '@/components/Icons';

export default function ShortsPage() {
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/feed?section=shorts&page=1')
      .then(res => res.json())
      .then(data => {
        setShorts(data.videos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FilmIcon size={22} className="section-heading-icon" />
            <span>Short Videos & Vertical Clips</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Bite-sized clips under 90 seconds optimized for fast streaming
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '16px'
        }}>
          {loading ? (
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ aspectRatio: '9 / 16', borderRadius: '8px' }} className="skeleton-box" />
            ))
          ) : (
            shorts.map(video => (
              <Link
                key={video.vkey || video.id}
                href={`/watch/${encodeURIComponent(video.vkey || video.id)}`}
                style={{
                  position: 'relative',
                  aspectRatio: '9 / 16',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  background: '#000',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: '0.75rem',
                  textDecoration: 'none'
                }}
              >
                <img
                  src={video.thumb}
                  alt={video.title}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  loading="lazy"
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)'
                }} />

                <span style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0,0,0,0.75)',
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  zIndex: 2
                }}>
                  {video.duration}
                </span>

                <div style={{ position: 'relative', zIndex: 2 }}>
                  <h3 style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#fff',
                    lineHeight: 1.3,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginBottom: '0.3rem'
                  }}>
                    {video.title}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{video.views} views</span>
                    <span>•</span>
                    <span style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <StarIcon size={11} filled={true} />
                      {video.rating}%
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
