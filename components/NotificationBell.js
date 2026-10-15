'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BellIcon } from './Icons';
import { readJSON, mergeCreators } from '@/lib/local';

const SEEN_KEY = 'xhub_notif_seen';

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const wrapRef = useRef(null);

  const load = useCallback(async () => {
    let since = readJSON(SEEN_KEY, 0);
    if (!since) {
      // First run: don't flood the badge with the whole backlog — start "now".
      since = Date.now();
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(since));
      } catch {}
    }
    try {
      const res = await fetch(`/api/notifications?since=${since}`);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setItems(Array.isArray(data.items) ? data.items : []);
        setFailed(false);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open ]);

  const markSeen = () => {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(Date.now()));
    } catch {}
    setItems([]);
  };

  const toggle = () => {
    if (!open) {
      // Clicking the bell marks everything as seen (per spec).
      markSeen();
    }
    setOpen(!open);
  };

  const unread = items.length;

  return (
    <div className="bell-wrap" ref={wrapRef}>
      <button
        onClick={toggle}
        className="bell-btn"
        title="New uploads"
        aria-label="Notifications"
      >
        <BellIcon size={18} />
        {unread > 0 && (
          <span className="bell-badge">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="bell-dropdown">
          <div className="bell-dropdown-header">
            <span>New uploads</span>
            <button onClick={markSeen} className="bell-mark-seen">
              Mark all seen
            </button>
          </div>
          {failed ? (
            <div className="bell-empty">Couldn&apos;t load updates right now.</div>
          ) : items.length === 0 ? (
            <div className="bell-empty">You&apos;re all caught up.</div>
          ) : (
            <div className="bell-list">
              {items.map(v => (
                <Link
                  key={v.vkey}
                  href={`/watch/${encodeURIComponent(v.vkey)}`}
                  className="bell-item"
                  onClick={() => setOpen(false)}
                >
                  <img src={v.thumb} alt="" loading="lazy" className="bell-item-thumb" />
                  <div className="bell-item-info">
                    <div className="bell-item-title">{v.title}</div>
                    <div className="bell-item-meta">
                      {v.duration ? `${v.duration} • ` : ''}
                      {v.views ? `${Number(v.views).toLocaleString('en-US')} views` : ''}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <Link href="/new" className="bell-view-all" onClick={() => setOpen(false)}>
            View all new videos
          </Link>
        </div>
      )}
    </div>
  );
}

// Exported for pages that want the followed-creator names (server + local merged).
export function useFollowedCreators() {
  const [creators, setCreators] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      let server = [];
      try {
        const { getUid } = await import('@/lib/uid');
        const res = await fetch(`/api/follows?uid=${encodeURIComponent(getUid())}`);
        const data = await res.json().catch(() => null);
        if (data?.ok && Array.isArray(data.creators)) server = data.creators;
      } catch {}
      if (!alive) return;
      const local = readJSON('xhub_subscriptions', []);
      setCreators(mergeCreators(server, local));
    })();
    return () => {
      alive = false;
    };
  }, []);
  return creators;
}
