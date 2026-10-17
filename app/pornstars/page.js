'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { StarIcon, BadgeCheckIcon, SearchIcon } from '@/components/Icons';
import { TOP_PORNSTARS } from '@/lib/pornstars';
import { getInitialAvatar } from '@/lib/avatar';

export default function PornstarsPage() {
  const [selectedLetter, setSelectedLetter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const alphabet = [
    'ALL', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
  ];

  const filteredPornstars = useMemo(() => {
    let list = TOP_PORNSTARS;
    if (selectedLetter !== 'ALL') {
      list = list.filter(p => p.name.toUpperCase().startsWith(selectedLetter));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.slug.includes(q));
    }
    return list;
  }, [selectedLetter, searchQuery]);

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <StarIcon size={22} className="section-heading-icon" filled={true} />
              <span>Pornstars & Top Models Index</span>
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Explore {TOP_PORNSTARS.length}+ verified adult performers with high-definition scenes and profiles
            </p>
          </div>

          {/* Quick Search */}
          <div style={{
            position: 'relative',
            width: '260px',
            maxWidth: '100%'
          }}>
            <input
              type="text"
              placeholder="Search performer..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 1rem 0.6rem 2.2rem',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
            <SearchIcon
              size={16}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-3)'
              }}
            />
          </div>
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

        {/* Real Performer Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '16px'
        }}>
          {filteredPornstars.map(star => {
            const isTopThree = star.rank === '#1' || star.rank === '#2' || star.rank === '#3';
            return (
              <Link
                key={star.slug}
                href={`/pornstars/${star.slug}`}
                style={{
                  background: 'var(--surface)',
                  border: isTopThree ? '1px solid rgba(255, 153, 0, 0.4)' : '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '1.25rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  textDecoration: 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--brand)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 107, 0, 0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = isTopThree ? 'rgba(255, 153, 0, 0.4)' : 'var(--border)';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: isTopThree ? '#fff' : 'var(--brand)',
                  background: isTopThree ? 'linear-gradient(135deg, #ff9900, #ff5500)' : 'rgba(255, 153, 0, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  {star.rank}
                </span>

                <div style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  marginBottom: '0.85rem',
                  border: isTopThree ? '2px solid #ff9900' : '2px solid var(--border)',
                  backgroundColor: '#1a1a1a',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                }}>
                  <img
                    src={star.image}
                    alt={star.name}
                    onError={e => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getInitialAvatar(star.name);
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                    loading="lazy"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center', width: '100%' }}>
                  <h3 style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {star.name}
                  </h3>
                  <BadgeCheckIcon size={14} className="verified-badge-icon" />
                </div>

                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.35rem' }}>
                  View Profile & Scenes →
                </span>
              </Link>
            );
          })}
        </div>

        {filteredPornstars.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-3)' }}>
            <p>No performers found matching &quot;{searchQuery || selectedLetter}&quot;.</p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
