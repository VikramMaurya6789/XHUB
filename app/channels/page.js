'use client';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { FilmIcon, BadgeCheckIcon, ChevronRightIcon } from '@/components/Icons';

export default function ChannelsPage() {
  const channels = [
    { slug: 'brazzers', name: 'Brazzers' },
    { slug: 'realitykings', name: 'Reality Kings' },
    { slug: 'mofos', name: 'Mofos' },
    { slug: 'twistys', name: 'Twistys' },
    { slug: 'digitaldesire', name: 'Digital Desire' },
    { slug: 'babes', name: 'Babes Network' },
    { slug: 'wicked', name: 'Wicked Pictures' },
    { slug: 'evilangel', name: 'Evil Angel' },
  ];

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FilmIcon size={22} className="section-heading-icon" />
            <span>Popular Studio Channels</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Browse official network channels and renowned production houses
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '16px'
        }}>
          {channels.map(chan => (
            <Link
              key={chan.slug}
              href={`/channels/${chan.slug}`}
              className="creator-spotlight-card"
              style={{ padding: '1.25rem', borderRadius: '10px' }}
            >
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #FF9900, #995500)',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.25rem'
              }}>
                {chan.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div className="creator-meta-name">
                  <span>{chan.name}</span>
                  <BadgeCheckIcon size={15} className="verified-badge-icon" />
                </div>
                <div className="creator-sub-count" style={{ marginTop: '0.2rem' }}>
                  Official Studio Channel →
                </div>
              </div>
              <ChevronRightIcon size={16} style={{ color: 'var(--text-3)' }} />
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
