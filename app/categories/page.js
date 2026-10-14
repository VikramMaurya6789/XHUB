'use client';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { POPULAR_CATEGORIES } from '@/lib/videos';
import { FilmIcon, ChevronRightIcon } from '@/components/Icons';

export default function CategoriesIndexPage() {
  const extendedCategories = [
    ...POPULAR_CATEGORIES,
    { slug: 'bbw', name: 'BBW', count: '38K' },
    { slug: 'brunette', name: 'Brunette', count: '89K' },
    { slug: 'blonde', name: 'Blonde', count: '105K' },
    { slug: 'redhead', name: 'Redhead', count: '32K' },
    { slug: 'threesome', name: 'Threesome', count: '45K' },
    { slug: 'interracial', name: 'Interracial', count: '63K' },
    { slug: 'masturbation', name: 'Solo / Masturbation', count: '78K' },
    { slug: 'compilation', name: 'Compilation', count: '29K' },
    { slug: 'hardcore', name: 'Hardcore', count: '94K' },
    { slug: 'fetish', name: 'Fetish & Feet', count: '42K' },
    { slug: 'vr', name: 'VR Videos', count: '18K' },
    { slug: 'vintage', name: 'Vintage / Classic', count: '15K' }
  ];

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FilmIcon size={22} className="section-heading-icon" />
            <span>All Video Categories</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Browse through hundreds of niche adult topics and curated collections
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '12px'
        }}>
          {extendedCategories.map(cat => (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s',
                textDecoration: 'none'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--brand)';
                e.currentTarget.style.background = 'var(--surface-2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--surface)';
              }}
            >
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{cat.name}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{cat.count} videos</span>
              </div>
              <ChevronRightIcon size={16} style={{ color: 'var(--brand)' }} />
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
