'use client';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { SPOTLIGHT_CREATORS } from '@/lib/videos';
import { UserIcon, BadgeCheckIcon, ChevronRightIcon } from '@/components/Icons';

export default function CreatorsIndexPage() {
  const allCreators = SPOTLIGHT_CREATORS;

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserIcon size={22} className="section-heading-icon" />
            <span>Verified Creators & Studios</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Explore official adult models, independent creators, and production studios
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '16px'
        }}>
          {allCreators.map(creator => (
            <Link
              key={creator.slug}
              href={`/creators/${creator.slug}`}
              className="creator-spotlight-card"
              style={{ padding: '1.25rem', borderRadius: '10px' }}
            >
              <img
                src={creator.avatar}
                alt={creator.name}
                className="creator-avatar"
                style={{ width: '60px', height: '60px' }}
                loading="lazy"
              />
              <div style={{ flex: 1 }}>
                <div className="creator-meta-name" style={{ fontSize: '1rem' }}>
                  <span>{creator.name}</span>
                  <BadgeCheckIcon size={16} className="verified-badge-icon" />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.35rem' }}>
                  View Creator Catalog →
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
