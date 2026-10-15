'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import {
  getPlaylists,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  getCachedVideo,
} from '@/lib/library';
import { ListPlusIcon, PlusIcon, PencilIcon, TrashIcon, PlayIcon } from '@/components/Icons';

function PlaylistThumb({ playlist }) {
  const first = getCachedVideo(playlist.vkeys[0]);
  const src = first?.thumb?.startsWith('/api/thumb')
    ? first.thumb
    : first
      ? `/api/thumb?vkey=${encodeURIComponent(first.vkey)}`
      : null;
  return (
    <div className="collection-thumb">
      {src ? (
        <img src={src} alt={playlist.name} loading="lazy" />
      ) : (
        <div className="collection-thumb-empty">
          <ListPlusIcon size={32} />
        </div>
      )}
      <div className="collection-thumb-count">
        <PlayIcon size={12} />
        <span>{playlist.vkeys.length}</span>
      </div>
    </div>
  );
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [newName, setNewName] = useState('');

  const refresh = () => setPlaylists(getPlaylists());

  useEffect(() => {
    refresh();
    setLoaded(true);
  }, []);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createPlaylist(newName.trim());
    setNewName('');
    refresh();
  };

  const handleRename = pl => {
    const name = prompt('Rename playlist', pl.name);
    if (name && name.trim()) {
      setPlaylists(renamePlaylist(pl.id, name.trim()));
    }
  };

  const handleDelete = pl => {
    if (confirm(`Delete playlist "${pl.name}"? Videos stay in your library.`)) {
      setPlaylists(deletePlaylist(pl.id));
    }
  };

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ListPlusIcon size={22} className="section-heading-icon" />
              <span>My Playlists ({playlists.length})</span>
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Saved on this device only — never uploaded anywhere
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate();
              }}
              placeholder="New playlist name…"
              maxLength={80}
              className="lib-modal-input"
              style={{ minWidth: '220px' }}
            />
            <button onClick={handleCreate} className="filter-pill-btn active" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <PlusIcon size={14} />
              <span>Create</span>
            </button>
          </div>
        </div>

        {loaded && playlists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <ListPlusIcon size={48} style={{ color: 'var(--text-3)', marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              No playlists yet
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Create one above, or tap the playlist icon on any video to save it.
            </p>
            <Link href="/" className="filter-pill-btn active" style={{ display: 'inline-block', padding: '0.65rem 1.8rem' }}>
              Browse Hot Videos →
            </Link>
          </div>
        ) : (
          <div className="collection-grid">
            {playlists.map(pl => (
              <div key={pl.id} className="collection-card">
                <Link href={`/playlists/${pl.id}`} style={{ display: 'block' }}>
                  <PlaylistThumb playlist={pl} />
                </Link>
                <div className="collection-card-body">
                  <Link href={`/playlists/${pl.id}`} className="collection-card-name" title={pl.name}>
                    {pl.name}
                  </Link>
                  <div className="collection-card-meta">
                    {pl.vkeys.length} video{pl.vkeys.length === 1 ? '' : 's'}
                  </div>
                  <div className="collection-card-actions">
                    <button type="button" onClick={() => handleRename(pl)} className="lib-icon-btn" title="Rename playlist" aria-label="Rename playlist">
                      <PencilIcon size={14} />
                    </button>
                    <button type="button" onClick={() => handleDelete(pl)} className="lib-icon-btn danger" title="Delete playlist" aria-label="Delete playlist">
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
