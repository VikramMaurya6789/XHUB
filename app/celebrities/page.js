'use client';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { StarIcon, BadgeCheckIcon } from '@/components/Icons';
import { getInitialAvatar } from '@/lib/avatar';

export default function CelebritiesPage() {
  const celebs = [
    { slug: 'kim-kardashian', name: 'Kim Kardashian' },
    { slug: 'paris-hilton', name: 'Paris Hilton' },
    { slug: 'pamela-anderson', name: 'Pamela Anderson' },
    { slug: 'kendra-wilkinson', name: 'Kendra Wilkinson' },
  ];

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <StarIcon size={22} className="section-heading-icon" filled={true} />
            <span>Celebrity Tapes & Leaks</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Famous public figure leaks and celebrity tape archives
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {celebs.map(c => (
            <Link
              key={c.slug}
              href={`/celebrities/${c.slug}`}
              className="creator-spotlight-card"
              style={{ padding: '1rem', flexDirection: 'column', textAlign: 'center' }}
            >
              <img
                src={getInitialAvatar(c.name)}
                alt={c.name}
                className="creator-avatar"
                style={{ width: '80px', height: '80px', margin: '0 auto' }}
                loading="lazy"
              />
              <div style={{ marginTop: '0.5rem' }}>
                <div className="creator-meta-name" style={{ justifyContent: 'center' }}>
                  <span>{c.name}</span>
                  <BadgeCheckIcon size={14} className="verified-badge-icon" />
                </div>
                <div className="creator-sub-count">View Archive →</div>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
