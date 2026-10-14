'use client';
import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { StarIcon, BadgeCheckIcon } from '@/components/Icons';
import { getInitialAvatar } from '@/lib/avatar';

export default function PornstarsPage() {
  const [selectedLetter, setSelectedLetter] = useState('ALL');

  const alphabet = ['ALL', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

  const pornstars = [
    { slug: 'angela-white', name: 'Angela White', rank: '#1' },
    { slug: 'riley-reid', name: 'Riley Reid', rank: '#2' },
    { slug: 'mia-malkova', name: 'Mia Malkova', rank: '#3' },
    { slug: 'lana-rhoades', name: 'Lana Rhoades', rank: '#4' },
    { slug: 'eva-elfie', name: 'Eva Elfie', rank: '#5' },
    { slug: 'sweetie-fox', name: 'Sweetie Fox', rank: '#6' },
    { slug: 'brandi-love', name: 'Brandi Love', rank: '#7' },
    { slug: 'leah-gotti', name: 'Leah Gotti', rank: '#8' },
    { slug: 'gabbie-carter', name: 'Gabbie Carter', rank: '#9' },
    { slug: 'kendra-lust', name: 'Kendra Lust', rank: '#10' },
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

        {/* Alphabetical A-Z Filter Bar */}
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

        {/* Avatar Cards (F9: neutral initial avatars, no stock model photos) */}
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
                src={getInitialAvatar(star.name)}
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

              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.35rem' }}>
                View Performer Profile →
              </span>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
