'use client';
import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { StarIcon, BadgeCheckIcon } from '@/components/Icons';

export default function PornstarsPage() {
  const [selectedLetter, setSelectedLetter] = useState('ALL');

  const alphabet = ['ALL', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

  const pornstars = [
    { slug: 'angela-white', name: 'Angela White', count: '480', rank: '#1', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80' },
    { slug: 'riley-reid', name: 'Riley Reid', count: '620', rank: '#2', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
    { slug: 'mia-malkova', name: 'Mia Malkova', count: '390', rank: '#3', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
    { slug: 'lana-rhoades', name: 'Lana Rhoades', count: '290', rank: '#4', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80' },
    { slug: 'eva-elfie', name: 'Eva Elfie', count: '210', rank: '#5', avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&auto=format&fit=crop&q=80' },
    { slug: 'sweetie-fox', name: 'Sweetie Fox', count: '175', rank: '#6', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
    { slug: 'brandi-love', name: 'Brandi Love', count: '340', rank: '#7', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
    { slug: 'leah-gotti', name: 'Leah Gotti', count: '185', rank: '#8', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
    { slug: 'gabbie-carter', name: 'Gabbie Carter', count: '220', rank: '#9', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
    { slug: 'kendra-lust', name: 'Kendra Lust', count: '410', rank: '#10', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  ];

  const filteredPornstars = selectedLetter === 'ALL'
    ? pornstars
    : pornstars.filter(p => p.name.toUpperCase().startsWith(selectedLetter));

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <StarIcon size={22} className="section-heading-icon" filled={true} />
            <span>Pornstars & Models Index</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Browse popular adult film performers alphabetically or by community rank
          </p>
        </div>

        {/* Alphabetical A-Z Filter Bar (§5.9) */}
        <div style={{
          display: 'flex',
          gap: '0.25rem',
          flexWrap: 'wrap',
          marginBottom: '2rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '0.5rem'
        }}>
          {alphabet.map(letter => (
            <button
              key={letter}
              onClick={() => setSelectedLetter(letter)}
              className={`filter-pill-btn ${selectedLetter === letter ? 'active' : ''}`}
              style={{ minWidth: '32px', padding: '0.35rem 0.6rem', textAlign: 'center' }}
            >
              {letter}
            </button>
          ))}
        </div>

        {/* Avatar Cards (§5.9) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '16px'
        }}>
          {filteredPornstars.map(star => (
            <Link
              key={star.slug}
              href={`/pornstars/${star.slug}`}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.25rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                textDecoration: 'none',
                transition: 'all 0.2s',
                position: 'relative'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--brand)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <span style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                fontSize: '0.7rem',
                fontWeight: 800,
                color: 'var(--brand)',
                background: 'rgba(255, 153, 0, 0.1)',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                {star.rank}
              </span>

              <img
                src={star.avatar}
                alt={star.name}
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  marginBottom: '0.75rem',
                  border: '2px solid var(--border)'
                }}
                loading="lazy"
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                  {star.name}
                </h3>
                <BadgeCheckIcon size={14} className="verified-badge-icon" />
              </div>

              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>
                {star.count} videos
              </span>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
