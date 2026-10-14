'use client';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { SPOTLIGHT_CREATORS } from '@/lib/videos';
import { UserIcon, BadgeCheckIcon, ChevronRightIcon } from '@/components/Icons';

export default function CreatorsIndexPage() {
  const allCreators = [
    ...SPOTLIGHT_CREATORS,
    { slug: 'teamskeet', name: 'Team Skeet', subscribers: '1.4M', videos: 620, verified: true, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
    { slug: 'verifiedamateurs', name: 'Verified Amateurs', subscribers: '790K', videos: 310, verified: true, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
    { slug: 'sensualhub', name: 'Sensual Hub', subscribers: '450K', videos: 175, verified: true, avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80' }
  ];

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
                <div className="creator-sub-count" style={{ marginTop: '0.25rem', fontSize: '0.8rem' }}>
                  {creator.subscribers} subscribers
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                  {creator.videos} uploaded videos
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
