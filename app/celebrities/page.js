'use client';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { StarIcon, BadgeCheckIcon } from '@/components/Icons';

export default function CelebritiesPage() {
  const celebs = [
    { slug: 'kim-kardashian', name: 'Kim Kardashian', count: '12', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
    { slug: 'paris-hilton', name: 'Paris Hilton', count: '8', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80' },
    { slug: 'pamela-anderson', name: 'Pamela Anderson', count: '15', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
    { slug: 'kendra-wilkinson', name: 'Kendra Wilkinson', count: '11', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80' },
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
              href={`/search?q=${encodeURIComponent(c.name)}`}
              className="creator-spotlight-card"
              style={{ padding: '1rem', flexDirection: 'column', textAlign: 'center' }}
            >
              <img
                src={c.avatar}
                alt={c.name}
                className="creator-avatar"
                style={{ width: '80px', height: '80px' }}
                loading="lazy"
              />
              <div style={{ marginTop: '0.5rem' }}>
                <div className="creator-meta-name" style={{ justifyContent: 'center' }}>
                  <span>{c.name}</span>
                  <BadgeCheckIcon size={14} className="verified-badge-icon" />
                </div>
                <div className="creator-sub-count">{c.count} scenes indexed</div>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
