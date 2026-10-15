'use client';
import { useEffect, useState } from 'react';
import {
  getPlaylists,
  createPlaylist,
  toggleInPlaylist,
  playlistsContaining,
  vkOf,
} from '@/lib/library';
import { ListPlusIcon, PlusIcon, CheckIcon } from './Icons';

// Modal: pick playlists for a video, or create a new one.
// Props: video (object), onClose()
export default function PlaylistModal({ video, onClose }) {
  const [playlists, setPlaylists] = useState([]);
  const [checkedIds, setCheckedIds] = useState([]);
  const [newName, setNewName] = useState('');
  const vkey = vkOf(video);

  useEffect(() => {
    setPlaylists(getPlaylists());
    setCheckedIds(vkey ? playlistsContaining(vkey) : []);
  }, []);

  const refresh = () => {
    setPlaylists(getPlaylists());
    setCheckedIds(vkey ? playlistsContaining(vkey) : []);
  };

  const handleToggle = id => {
    toggleInPlaylist(id, video);
    refresh();
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const pl = createPlaylist(name);
    toggleInPlaylist(pl.id, video);
    setNewName('');
    refresh();
  };

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <div
        className="auth-modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '380px' }}
      >
        <div className="auth-modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ListPlusIcon size={18} className="section-heading-icon" />
            Save to playlist
          </h3>
          <button onClick={onClose} className="auth-close-btn" aria-label="Close">✕</button>
        </div>

        {playlists.length === 0 ? (
          <p className="auth-modal-desc">No playlists yet — create your first one below.</p>
        ) : (
          <div className="lib-modal-list">
            {playlists.map(pl => {
              const checked = checkedIds.includes(pl.id);
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => handleToggle(pl.id)}
                  className={`lib-modal-row ${checked ? 'checked' : ''}`}
                >
                  <span className="lib-modal-check">
                    {checked ? <CheckIcon size={14} /> : null}
                  </span>
                  <span className="lib-modal-row-name">{pl.name}</span>
                  <span className="lib-modal-row-count">{pl.vkeys.length}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="lib-modal-create">
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
          />
          <button
            type="button"
            onClick={handleCreate}
            className="filter-pill-btn active"
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}
          >
            <PlusIcon size={14} />
            <span>Create</span>
          </button>
        </div>
      </div>
    </div>
  );
}
