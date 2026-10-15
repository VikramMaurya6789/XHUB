'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { PlusIcon, TrashIcon, LinkIcon, CheckIcon, PlayIcon, FilmIcon } from '@/components/Icons';

const card = {
  background: 'var(--bg-2, #151515)',
  border: '1px solid var(--border, #2a2a2a)',
  borderRadius: '12px',
  padding: '1.25rem',
};
const input = {
  width: '100%', background: '#0e0e0e', border: '1px solid #2e2e2e', borderRadius: '8px',
  color: '#fff', padding: '0.65rem 0.8rem', fontSize: '0.9rem', outline: 'none',
};
const btnPrimary = {
  background: '#ff6b00', color: '#fff', border: 'none', borderRadius: '8px',
  padding: '0.65rem 1.2rem', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
};

export default function CollabPlaylistPage() {
  const params = useParams();
  const code = String(params?.code || '').toLowerCase().trim();
  const [playlist, setPlaylist] = useState(null);
  const [error, setError] = useState('');
  const [vkeyInput, setVkeyInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = () => {
    if (!code) return;
    fetch(`/api/collab-playlists?code=${encodeURIComponent(code)}`)
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || 'Playlist not found');
        setPlaylist(d.playlist);
      })
      .catch(err => setError(err.message));
  };

  useEffect(() => { load(); }, [code]);

  // Light refresh so collaborators see each other's changes
  useEffect(() => {
    if (!code || error) return;
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, error]);

  const resolveTitle = async vkey => {
    try {
      const res = await fetch(`/api/video?vkey=${encodeURIComponent(vkey)}`);
      if (!res.ok) return vkey;
      const d = await res.json();
      return d?.title || vkey;
    } catch {
      return vkey;
    }
  };

  const handleAdd = async e => {
    e.preventDefault();
    const vkey = vkeyInput.trim();
    if (!vkey || adding) return;
    setAdding(true);
    try {
      const title = await resolveTitle(vkey);
      const res = await fetch('/api/collab-playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', code, vkey, title }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not add video');
      setPlaylist(d.playlist);
      setVkeyInput('');
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async vkey => {
    try {
      const res = await fetch('/api/collab-playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', code, vkey }),
      });
      const d = await res.json();
      if (res.ok) setPlaylist(d.playlist);
    } catch {}
  };

  const shareLink = typeof window !== 'undefined' ? `${window.location.origin}/collab/${code}` : '';
  const copyLink = () => {
    try {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper" style={{ maxWidth: '860px' }}>
        {error && !playlist ? (
          <div style={card}>
            <p style={{ color: '#ff6b6b' }}>{error}</p>
            <Link href="/collab" style={{ color: '#ff6b00', fontSize: '0.9rem' }}>Create a new playlist</Link>
          </div>
        ) : !playlist ? (
          <p style={{ color: 'var(--text-3)' }}>Loading playlist…</p>
        ) : (
          <>
            <div style={{ ...card, marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FilmIcon size={20} className="section-heading-icon" />
                    {playlist.name}
                  </h1>
                  <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                    Collaborative playlist • {playlist.items.length} video{playlist.items.length === 1 ? '' : 's'} • anyone with the link can add or remove
                  </p>
                </div>
                <button onClick={copyLink} style={{ ...btnPrimary, background: '#2a2a2a', border: '1px solid #3a3a3a' }}>
                  {copied ? <CheckIcon size={15} /> : <LinkIcon size={15} />} {copied ? 'Copied!' : 'Share link'}
                </button>
              </div>
              <div style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: '0.6rem', wordBreak: 'break-all' }}>{shareLink}</div>
            </div>

            <form onSubmit={handleAdd} style={{ ...card, marginBottom: '1rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <input
                style={{ ...input, flex: 1, minWidth: '200px' }}
                value={vkeyInput}
                onChange={e => setVkeyInput(e.target.value)}
                placeholder="Paste a video vkey or watch link"
              />
              <button type="submit" disabled={adding} style={btnPrimary}>
                <PlusIcon size={15} /> {adding ? 'Adding…' : 'Add video'}
              </button>
            </form>

            {playlist.items.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', color: 'var(--text-3)' }}>
                Empty playlist — add the first video above.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.6rem' }}>
                {playlist.items.map((it, i) => (
                  <div key={it.vkey} style={{ ...card, padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                    <div style={{ color: '#ff6b00', fontWeight: 800, width: '24px', textAlign: 'center' }}>{i + 1}</div>
                    <Link
                      href={`/watch/${encodeURIComponent(it.vkey)}`}
                      style={{ flex: 1, minWidth: 0, color: '#fff', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <PlayIcon size={14} style={{ flexShrink: 0, color: '#ff6b00' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</span>
                    </Link>
                    <button
                      onClick={() => handleRemove(it.vkey)}
                      title="Remove from playlist"
                      style={{ background: 'transparent', border: '1px solid #5a2a2a', color: '#ff6b6b', borderRadius: '6px', padding: '0.35rem 0.6rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
