'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import VideoCard from '@/components/VideoCard';
import {
  getWatchLaterFolders,
  createWatchLaterFolder,
  renameWatchLaterFolder,
  deleteWatchLaterFolder,
  moveToFolder,
  removeFromFolder,
  clearWatchLaterFolders,
  resolveVideos,
  DEFAULT_FOLDER_ID,
} from '@/lib/library';
import { ClockIcon, DownloadIcon, FolderIcon, FolderPlusIcon, PencilIcon, TrashIcon, PlusIcon } from '@/components/Icons';

export default function WatchLaterPage() {
  const [folders, setFolders] = useState([]);
  const [activeFolderId, setActiveFolderId] = useState(DEFAULT_FOLDER_ID);
  const [videos, setVideos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [moveTarget, setMoveTarget] = useState({}); // vkey -> folderId (per-card select)

  useEffect(() => {
    // First load migrates the legacy flat `xhub_watch_later` list into a
    // "Default" folder; new flat-list saves are merged into Default too.
    setFolders(getWatchLaterFolders());
  }, []);

  useEffect(() => {
    const folder = folders.find(f => f.id === activeFolderId);
    if (!folder) {
      setVideos([]);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    if (folder.vkeys.length) {
      let cancelled = false;
      resolveVideos(folder.vkeys).then(v => {
        if (!cancelled) {
          setVideos(v);
          setLoaded(true);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    setVideos([]);
    setLoaded(true);
  }, [folders, activeFolderId]);

  const activeFolder = folders.find(f => f.id === activeFolderId);
  const totalCount = folders.reduce((n, f) => n + f.vkeys.length, 0);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const folder = createWatchLaterFolder(newFolderName.trim());
    setNewFolderName('');
    setShowNewFolder(false);
    setFolders(getWatchLaterFolders());
    setActiveFolderId(folder.id);
  };

  const handleRenameFolder = folder => {
    const name = prompt('Rename folder', folder.name);
    if (name && name.trim()) setFolders(renameWatchLaterFolder(folder.id, name.trim()));
  };

  const handleDeleteFolder = folder => {
    if (confirm(`Delete folder "${folder.name}"? Its videos move back to Default.`)) {
      const current = getWatchLaterFolders().find(f => f.id === folder.id);
      for (const vk of current?.vkeys || []) {
        moveToFolder(DEFAULT_FOLDER_ID, vk);
      }
      setFolders(deleteWatchLaterFolder(folder.id));
      setActiveFolderId(DEFAULT_FOLDER_ID);
    }
  };

  const handleMove = (vkey, video) => {
    const targetId = moveTarget[vkey];
    if (!targetId || targetId === activeFolderId) return;
    setFolders(moveToFolder(targetId, vkey, video));
    setMoveTarget(prev => {
      const next = { ...prev };
      delete next[vkey];
      return next;
    });
  };

  const handleRemove = vkey => {
    setFolders(removeFromFolder(activeFolderId, vkey));
    setVideos(prev => prev.filter(v => String(v.vkey || v.id) !== String(vkey)));
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear ALL Watch Later folders?')) {
      setFolders(clearWatchLaterFolders());
      setActiveFolderId(DEFAULT_FOLDER_ID);
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(folders, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'xhub_watch_later_folders.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClockIcon size={22} className="section-heading-icon" />
              <span>Watch Later ({totalCount})</span>
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Organize saved videos into folders — stored only on your device
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowNewFolder(!showNewFolder)}
              className="filter-pill-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <FolderPlusIcon size={14} />
              <span>New folder</span>
            </button>
            {totalCount > 0 && (
              <>
                <button
                  onClick={handleExportJSON}
                  className="filter-pill-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <DownloadIcon size={14} />
                  <span>Export JSON</span>
                </button>
                <button
                  onClick={handleClearAll}
                  className="filter-pill-btn"
                  style={{ color: 'var(--danger)', borderColor: 'rgba(224, 36, 94, 0.3)' }}
                >
                  Clear All
                </button>
              </>
            )}
          </div>
        </div>

        {showNewFolder && (
          <div className="lib-inline-form">
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateFolder();
              }}
              placeholder="Folder name…"
              maxLength={80}
              className="lib-modal-input"
              autoFocus
            />
            <button onClick={handleCreateFolder} className="filter-pill-btn active" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <PlusIcon size={14} />
              <span>Add folder</span>
            </button>
          </div>
        )}

        {/* Folder tabs */}
        <div className="lib-folder-tabs">
          {folders.map(folder => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setActiveFolderId(folder.id)}
              className={`lib-folder-tab ${folder.id === activeFolderId ? 'active' : ''}`}
            >
              <FolderIcon size={15} />
              <span>{folder.name}</span>
              <span className="lib-folder-tab-count">{folder.vkeys.length}</span>
            </button>
          ))}
        </div>

        {/* Active folder toolbar */}
        {activeFolder && (
          <div className="lib-folder-toolbar">
            <span className="lib-folder-toolbar-title">
              {activeFolder.name} — {videos.length} video{videos.length === 1 ? '' : 's'}
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button type="button" onClick={() => handleRenameFolder(activeFolder)} className="lib-icon-btn" title="Rename folder" aria-label="Rename folder">
                <PencilIcon size={14} />
              </button>
              {activeFolder.id !== DEFAULT_FOLDER_ID && (
                <button type="button" onClick={() => handleDeleteFolder(activeFolder)} className="lib-icon-btn danger" title="Delete folder" aria-label="Delete folder">
                  <TrashIcon size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {loaded && videos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <ClockIcon size={48} style={{ color: 'var(--text-3)', marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              {activeFolder?.id === DEFAULT_FOLDER_ID && folders.length <= 1
                ? 'Your Watch Later list is empty'
                : `No videos in "${activeFolder?.name}"`}
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Click the clock icon on any video card to save it for later viewing.
            </p>
            <Link href="/" className="filter-pill-btn active" style={{ display: 'inline-block', padding: '0.65rem 1.8rem' }}>
              Browse Hot Videos →
            </Link>
          </div>
        ) : (
          <div className="dense-video-grid">
            {videos.map(video => {
              const vkey = String(video.vkey || video.id);
              return (
                <div key={vkey}>
                  <VideoCard video={video} />
                  <div className="lib-card-actions">
                    <select
                      value={moveTarget[vkey] || ''}
                      onChange={e => setMoveTarget(prev => ({ ...prev, [vkey]: e.target.value }))}
                      className="lib-move-select"
                      aria-label="Move to folder"
                    >
                      <option value="">Move to…</option>
                      {folders.filter(f => f.id !== activeFolderId).map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleMove(vkey, video)}
                      disabled={!moveTarget[vkey]}
                      className="filter-pill-btn"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', opacity: moveTarget[vkey] ? 1 : 0.5 }}
                    >
                      Move
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(vkey)}
                      className="lib-icon-btn danger"
                      title="Remove from folder"
                      aria-label="Remove from folder"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
