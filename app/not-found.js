import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { POPULAR_CATEGORIES } from '@/lib/videos';

export const metadata = {
  title: '404 — Page Not Found | XHUB',
  description: 'The requested page could not be found on XHUB.',
};

export default function NotFound() {
  return (
    <>
      <AgeGate />
      <Header />

      <main className="page-wrapper" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '640px', width: '100%', margin: '0 auto', textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{
            fontSize: '5rem',
            fontWeight: 900,
            lineHeight: 1,
            color: 'var(--brand)',
            marginBottom: '1rem',
            letterSpacing: '-0.05em'
          }}>
            404
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', color: '#fff' }}>
            Page Not Found
          </h1>

          <p style={{ color: 'var(--text-2)', fontSize: '1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
            The video, category, or profile you are looking for does not exist or may have been removed.
          </p>

          <form action="/search" method="GET" style={{ maxWidth: '420px', margin: '0 auto 2.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                name="q"
                placeholder="Search videos, categories, models..."
                style={{
                  flex: 1,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: '#fff',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem 1rem',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'var(--brand)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem 1.25rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Search
              </button>
            </div>
          </form>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
              Popular Categories
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
              {POPULAR_CATEGORIES.slice(0, 8).map(cat => (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.id}`}
                  className="filter-pill-btn"
                  style={{ textDecoration: 'none' }}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <Link
              href="/"
              className="filter-pill-btn active"
              style={{ display: 'inline-block', padding: '0.65rem 1.75rem', textDecoration: 'none' }}
            >
              ← Back to Homepage
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
