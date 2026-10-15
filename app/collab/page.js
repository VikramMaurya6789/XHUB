'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { FilmIcon, PlusIcon } from '@/components/Icons';

const card = {
  background: 'var(--bg-2, #151515)',
  border: '1px solid var(--border, #2a2a2a)',
  borderRadius: '12px',
  padding: '1.5rem',
};
const input = {
  width: '100%', background: '#0e0e0e', border: '1px solid #2e2e2e', borderRadius: '8px',
  color: '#fff', padding: '0.65rem 0.8rem', fontSize: '0.9rem', outline: 'none',
};

export default function CollabLandingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const create = async e => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/collab-playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not create playlist');
      router.push(`/collab/${d.code}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper" style={{ maxWidth: '640px' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FilmIcon size={24} className="section-heading-icon" />
            <span>Collaborative Playlists</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
            Create a playlist, share the link — anyone with the link can add or remove videos. No login needed.
          </p>
        </div>
        <form onSubmit={create} style={card}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#ddd', marginBottom: '0.4rem' }}>
            Playlist name
          </label>
          <input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="My shared playlist" maxLength={80} />
          {error && <p style={{ color: '#ff6b6b', fontSize: '0.85rem', marginTop: '0.75rem' }}>{error}</p>}
          <button
            type="submit"
            disabled={busy}
            style={{
              marginTop: '1rem', background: '#ff6b00', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '0.7rem 1.6rem', fontWeight: 800, cursor: busy ? 'wait' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem', opacity: busy ? 0.7 : 1,
            }}
          >
            <PlusIcon size={15} /> {busy ? 'Creating…' : 'Create playlist'}
          </button>
        </form>
      </main>
      <Footer />
    </>
  );
}
