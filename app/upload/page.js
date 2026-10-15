'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { UploadIcon, PlayIcon, TrashIcon, EyeIcon, LinkIcon } from '@/components/Icons';
import { getUid, compact } from '@/lib/uid';

const CATEGORIES = ['Amateur', 'Anal', 'BDSM', 'Big Tits', 'Blonde', 'Blowjob', 'Brunette', 'Creampie', 'Cumshot', 'Ebony', 'Fetish', 'Group', 'Hardcore', 'Indian', 'Latina', 'Lesbian', 'MILF', 'POV', 'Public', 'Teen', 'Threesome', 'Webcam'];

const card = {
  background: 'var(--bg-2, #151515)',
  border: '1px solid var(--border, #2a2a2a)',
  borderRadius: '12px',
  padding: '1.5rem',
};
const label = { display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#ddd', marginBottom: '0.4rem' };
const input = {
  width: '100%', background: '#0e0e0e', border: '1px solid #2e2e2e', borderRadius: '8px',
  color: '#fff', padding: '0.65rem 0.8rem', fontSize: '0.9rem', outline: 'none',
};

export default function UploadPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [uploader, setUploader] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [previewId, setPreviewId] = useState(null);
  const [uid, setUid] = useState('');

  useEffect(() => {
    const id = getUid();
    setUid(id);
    fetch(`/api/uploads?uid=${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(d => setUploads(d.uploads || []))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setDone(false);
    if (!title.trim() || !videoUrl.trim()) {
      setError('Title and video URL are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, videoUrl, thumbnailUrl, category, tags,
          uploader: uploader.trim() || 'Uploader', uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploads([data.upload, ...uploads]);
      setTitle(''); setDescription(''); setVideoUrl(''); setThumbnailUrl('');
      setCategory(''); setTags(''); setDone(true);
      setTimeout(() => setDone(false), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this upload?')) return;
    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id, uid }),
      });
      if (res.ok) setUploads(uploads.filter(u => u.id !== id));
    } catch {}
  };

  const handlePlay = id => {
    setPreviewId(id);
    const up = uploads.find(u => u.id === id);
    if (up) {
      fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'view', id }),
      })
        .then(r => r.json())
        .then(d => {
          if (typeof d.views === 'number') {
            setUploads(list => list.map(u => (u.id === id ? { ...u, views: d.views } : u)));
          }
        })
        .catch(() => {});
    }
  };

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper" style={{ maxWidth: '960px' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <UploadIcon size={24} className="section-heading-icon" />
            <span>Upload Video</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
            URL-based upload — paste a direct mp4 link. Your metadata is stored instantly; the video streams from the URL you provide.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ ...card, marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={label}>Title *</label>
              <input style={input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Give your video a title" maxLength={160} />
            </div>
            <div>
              <label style={label}>Video URL (direct mp4 link) *</label>
              <input style={input} value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://example.com/video.mp4" inputMode="url" />
            </div>
            <div>
              <label style={label}>Thumbnail URL</label>
              <input style={input} value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} placeholder="https://example.com/thumb.jpg" inputMode="url" />
            </div>
            <div>
              <label style={label}>Description</label>
              <textarea style={{ ...input, minHeight: '90px', resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell viewers what this video is about" maxLength={2000} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={label}>Category</label>
                <select style={input} value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">Select…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Uploader name</label>
                <input style={input} value={uploader} onChange={e => setUploader(e.target.value)} placeholder="Your channel name" maxLength={60} />
              </div>
            </div>
            <div>
              <label style={label}>Tags (comma separated)</label>
              <input style={input} value={tags} onChange={e => setTags(e.target.value)} placeholder="hd, amateur, pov" />
            </div>
          </div>

          {error && <p style={{ color: '#ff6b6b', fontSize: '0.85rem', marginTop: '1rem' }}>{error}</p>}
          {done && <p style={{ color: '#51cf66', fontSize: '0.85rem', marginTop: '1rem' }}>Video saved — it now appears in your list below.</p>}

          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: '1.25rem', background: '#ff6b00', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '0.75rem 2rem', fontWeight: 800, fontSize: '0.95rem',
              cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            }}
          >
            <UploadIcon size={16} />
            {saving ? 'Saving…' : 'Upload'}
          </button>
        </form>

        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>
          My Uploads ({uploads.length})
        </h2>

        {loadingList ? (
          <p style={{ color: 'var(--text-3)' }}>Loading…</p>
        ) : uploads.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--text-3)' }}>
            No uploads yet. Paste a direct mp4 link above to get started.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {uploads.map(u => (
              <div key={u.id} style={{ ...card, padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                {u.thumbnailUrl ? (
                  <img src={u.thumbnailUrl} alt={u.title} style={{ width: '160px', height: '90px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} loading="lazy" />
                ) : (
                  <div style={{ width: '160px', height: '90px', borderRadius: '8px', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b00', fontWeight: 800, flexShrink: 0 }}>XHUB</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.title}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: '0.3rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><EyeIcon size={13} /> {compact(u.views)} views</span>
                    {u.category && <span>{u.category}</span>}
                    <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>
                  {u.tags?.length > 0 && (
                    <div style={{ color: 'var(--text-3)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {u.tags.map(t => `#${t}`).join(' ')}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                    <button
                      onClick={() => handlePlay(previewId === u.id ? null : u.id)}
                      style={{ background: '#2a2a2a', color: '#fff', border: '1px solid #3a3a3a', borderRadius: '6px', padding: '0.4rem 0.9rem', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <PlayIcon size={13} /> {previewId === u.id ? 'Hide' : 'Preview'}
                    </button>
                    <a href={u.videoUrl} target="_blank" rel="noopener noreferrer" style={{ background: '#2a2a2a', color: '#fff', border: '1px solid #3a3a3a', borderRadius: '6px', padding: '0.4rem 0.9rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
                      <LinkIcon size={13} /> Direct link
                    </a>
                    <button
                      onClick={() => handleDelete(u.id)}
                      style={{ background: 'transparent', color: '#ff6b6b', border: '1px solid #5a2a2a', borderRadius: '6px', padding: '0.4rem 0.9rem', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <TrashIcon size={13} /> Delete
                    </button>
                  </div>
                  {previewId === u.id && (
                    <video src={u.videoUrl} controls preload="metadata" style={{ width: '100%', maxHeight: '320px', marginTop: '0.75rem', borderRadius: '8px', background: '#000' }} />
                  )}
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
