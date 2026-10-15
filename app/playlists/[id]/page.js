'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import VideoCard from '@/components/VideoCard';
import { getPlaylist, resolveVideos, removeFromPlaylist, deletePlaylist } from '@/lib/library';
import { ListPlusIcon, PlayIcon, TrashIcon, XIcon } from '@/components/Icons';

export default function PlaylistDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [playlist, setPlaylist] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const pl = getPlaylist(id);
    setPlaylist(pl);
    if (pl && pl.vkeys.length) {
      resolveVideos(pl.vkeys).then(v => {
        setVideos(v);
        setLoaded(true);
      });
    } else {
      setLoaded(true);
    }
  }, [id]);

  const handleRemove = vkey => {
    removeFromPlaylist(id, vkey);
    setPlaylist(getPlaylist(id));
    setVideos(prev => prev.filter(v => String(v.vkey || v.id) !== String(vkey)));
  };

  const handleDelete = () => {
    if (confirm(`Delete playlist "${playlist?.name}"? Videos stay in your library.`)) {
      deletePlaylist(id);
      router.push('/playlists');
    }
  };

  const handlePlayAll = () => {
    const first = videos[0] || playlist?.vkeys?.[0];
    const firstKey = first ? first.vkey || first.id : null;
    if (firstKey) router.push(`/watch/${encodeURIComponent(firstKey)}?playlist=${encodeURIComponent(id)}`);
  };

  if (loaded && !playlist) {
    return (
      <>
        <AgeGate />
        <Header />
        <main className="page-wrapper" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
            Playlist not found
          </h1>
          <Link href="/playlists" className="filter-pill-btn active" style={{ display: 'inline-block', padding: '0.65rem 1.8rem' }}>
            ← Back to Playlists
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <Link href="/playlists" style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
              ← All playlists
            </Link>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <ListPlusIcon size={22} className="section-heading-icon" />
              <span>{playlist?.name || 'Playlist'} ({videos.length})</span>
            </h1>
          </div>
          {videos.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handlePlayAll} className="filter-pill-btn active" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <PlayIcon size={14} />
                <span>Play all</span>
              </button>
              <button
                onClick={handleDelete}
                className="filter-pill-btn"
                style={{ color: 'var(--danger)', borderColor: 'rgba(224, 36, 94, 0.3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <TrashIcon size={14} />
                <span>Delete playlist</span>
              </button>
            </div>
          )}
        </div>

        {loaded && videos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <ListPlusIcon size={48} style={{ color: 'var(--text-3)', marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              This playlist is empty
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Tap the playlist icon on any video or the watch page to add it here.
            </p>
            <Link href="/" className="filter-pill-btn active" style={{ display: 'inline-block', padding: '0.65rem 1.8rem' }}>
              Browse Hot Videos →
            </Link>
          </div>
        ) : (
          <div className="dense-video-grid">
            {videos.map(video => {
              const vkey = video.vkey || video.id;
              return (
                <div key={vkey} style={{ position: 'relative' }}>
                  <VideoCard video={video} />
                  <button
                    type="button"
                    onClick={() => handleRemove(vkey)}
                    className="lib-remove-btn"
                    title="Remove from playlist"
                    aria-label="Remove from playlist"
                  >
                    <XIcon size={13} />
                  </button>
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
