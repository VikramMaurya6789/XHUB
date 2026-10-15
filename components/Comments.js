'use client';
import { useEffect, useRef, useState } from 'react';
import { getUid } from '@/lib/uid';
import { getDisplayName } from '@/lib/local';
import { getInitialAvatar } from '@/lib/avatar';

function timeAgo(iso) {
  try {
    const t = new Date(iso).getTime();
    if (!t) return '';
    const s = Math.floor((Date.now() - t) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    const d = Math.floor(s / 86400);
    if (d < 30) return `${d}d ago`;
    const mo = Math.floor(d / 30);
    if (mo < 12) return `${mo}mo ago`;
    return `${Math.floor(mo / 12)}y ago`;
  } catch {
    return '';
  }
}

export default function Comments({ vkey }) {
  const [comments, setComments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const guestName = useRef(null);

  if (!guestName.current) {
    const profileName = getDisplayName();
    guestName.current =
      profileName || `Guest${Math.floor(1000 + Math.random() * 9000)}`;
  }

  useEffect(() => {
    if (!vkey) return;
    setLoaded(false);
    fetch(`/api/comments?vkey=${encodeURIComponent(vkey)}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        setComments(Array.isArray(data?.comments) ? data.comments : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true)); // API down → empty state, never breaks the page
  }, [vkey]);

  const handleSubmit = async e => {
    e.preventDefault();
    const body = text.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vkey,
          name: guestName.current,
          text: body,
          uid: getUid(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.comment) {
        setComments(prev => [...prev, data.comment]);
        setText('');
      }
    } catch {
      // offline — comment stays unsent; the list still shows what loaded
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="xhub-comments">
      <form onSubmit={handleSubmit} className="comment-form">
        <img
          src={getInitialAvatar(guestName.current)}
          alt={guestName.current}
          className="comment-author-avatar"
          loading="lazy"
        />
        <div className="comment-form-body">
          <input
            type="text"
            className="comment-input"
            placeholder={`Comment as ${guestName.current}…`}
            value={text}
            maxLength={500}
            onChange={e => setText(e.target.value)}
          />
          <button
            type="submit"
            className="comment-submit-btn"
            disabled={!text.trim() || posting}
          >
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>

      {!loaded ? (
        <div className="comments-loading">Loading comments…</div>
      ) : comments.length > 0 ? (
        <div className="comments-list">
          {comments.map(c => (
            <div key={c.id} className="comment-item">
              <img
                src={getInitialAvatar(c.name)}
                alt={c.name}
                className="comment-author-avatar"
                loading="lazy"
              />
              <div className="comment-content-box">
                <div>
                  <span className="comment-author-name">{c.name}</span>
                  <span className="comment-time">{timeAgo(c.time)}</span>
                </div>
                <p className="comment-body-text">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="comments-empty">
          No comments yet. Be the first to share your thoughts.
        </div>
      )}
    </div>
  );
}
