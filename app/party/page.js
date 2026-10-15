'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { UsersIcon, LinkIcon, PlayIcon, CheckIcon } from '@/components/Icons';
import { getUid } from '@/lib/uid';

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
const btn = (primary) => ({
  background: primary ? '#ff6b00' : '#2a2a2a', color: '#fff',
  border: primary ? 'none' : '1px solid #3a3a3a', borderRadius: '8px',
  padding: '0.7rem 1.4rem', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center',
});

function vkeyFromInput(s) {
  const t = String(s || '').trim();
  const m = t.match(/\/watch\/([^\/?#]+)/);
  return m ? decodeURIComponent(m[1]) : t;
}

function RoomView({ code }) {
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [src, setSrc] = useState('');
  const [copied, setCopied] = useState(false);
  const [uid, setUid] = useState('');
  const videoRef = useRef(null);
  const hostUidRef = useRef(null);
  const uidRef = useRef('');
  const pushingRef = useRef(false);

  useEffect(() => {
    const id = getUid();
    uidRef.current = id;
    setUid(id);

    // Load room
    fetch(`/api/party?code=${encodeURIComponent(code)}`)
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || 'Room not found');
        setRoom(d.room);
        hostUidRef.current = d.room.hostUid;
      })
      .catch(err => setError(err.message));
  }, [code]);

  // Resolve stream src once room is known (retry briefly like WatchClient)
  useEffect(() => {
    if (!room || src) return;
    let attempts = 0;
    let cancelled = false;
    const load = () => {
      fetch(`/api/stream?vkey=${encodeURIComponent(room.vkey)}`)
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (cancelled) return;
          const qs = data?.qualities || [];
          if (qs.length) {
            const pick = qs.find(q => q.quality === '720p') || qs[0];
            setSrc(`/api/vproxy?vkey=${encodeURIComponent(room.vkey)}&q=${encodeURIComponent(pick.quality)}`);
          } else if (attempts < 6) {
            attempts++;
            setTimeout(load, 8000);
          }
        })
        .catch(() => {
          if (!cancelled && attempts < 6) {
            attempts++;
            setTimeout(load, 8000);
          }
        });
    };
    load();
    return () => { cancelled = true; };
  }, [room, src]);

  // Poll every 5s: host pushes state, guests read it.
  useEffect(() => {
    if (!room) return;
    const id = setInterval(async () => {
      try {
        if (hostUidRef.current && uidRef.current === hostUidRef.current) {
          const v = videoRef.current;
          if (pushingRef.current) return;
          pushingRef.current = true;
          const res = await fetch('/api/party', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              t: v ? v.currentTime : 0,
              playing: v ? !v.paused : false,
              uid: uidRef.current,
            }),
          });
          const d = await res.json();
          pushingRef.current = false;
          if (d.room) setRoom(d.room);
        } else {
          const res = await fetch(`/api/party?code=${encodeURIComponent(code)}`);
          const d = await res.json();
          if (d.room) setRoom(d.room);
        }
      } catch { pushingRef.current = false; }
    }, 5000);
    return () => clearInterval(id);
  }, [room, code]);

  const isHost = room && uid && room.hostUid === uid;

  const hostTargetTime = () => {
    if (!room) return 0;
    const drift = room.playing ? (Date.now() - (room.updatedAt || Date.now())) / 1000 : 0;
    return Math.max(0, room.t + drift);
  };

  const syncToHost = () => {
    const v = videoRef.current;
    if (!v || !room) return;
    v.currentTime = hostTargetTime();
    if (room.playing) v.play().catch(() => {});
    else v.pause();
  };

  // Guests auto-sync once when room first loads
  const autoSyncedRef = useRef(false);
  useEffect(() => {
    if (room && !isHost && !autoSyncedRef.current && videoRef.current && room.t > 1) {
      autoSyncedRef.current = true;
      syncToHost();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, isHost]);

  const shareLink = typeof window !== 'undefined' ? `${window.location.origin}/party?room=${code}` : '';

  const copyLink = () => {
    try {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  if (error) {
    return (
      <div style={card}>
        <p style={{ color: '#ff6b6b' }}>{error}</p>
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          The room may have expired (rooms live in temporary storage). Create a new one below.
        </p>
      </div>
    );
  }
  if (!room) return <p style={{ color: 'var(--text-3)' }}>Loading room…</p>;

  return (
    <div>
      <div style={{ ...card, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>
              Room <span style={{ color: '#ff6b00', letterSpacing: '0.15em' }}>{room.code}</span>
              {isHost && <span style={{ marginLeft: '0.75rem', fontSize: '0.72rem', background: '#ff6b00', color: '#fff', borderRadius: '4px', padding: '0.15rem 0.5rem', verticalAlign: 'middle' }}>HOST</span>}
            </div>
            <div style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              {isHost ? 'You control playback — guests sync to you.' : 'Guest mode — hit "Sync to host" to jump to the host.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!isHost && (
              <button onClick={syncToHost} style={btn(true)}>
                <PlayIcon size={15} /> Sync to host
              </button>
            )}
            <button onClick={copyLink} style={btn(false)}>
              {copied ? <CheckIcon size={15} /> : <LinkIcon size={15} />} {copied ? 'Copied!' : 'Share link'}
            </button>
          </div>
        </div>
        <div style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: '0.75rem', wordBreak: 'break-all' }}>
          {shareLink}
        </div>
      </div>

      <div style={{ ...card, padding: '0.75rem' }}>
        {src ? (
          <video
            ref={videoRef}
            src={src}
            controls
            playsInline
            preload="auto"
            style={{ width: '100%', borderRadius: '8px', background: '#000', maxHeight: '70vh' }}
          />
        ) : (
          <div style={{ color: 'var(--text-3)', padding: '3rem', textAlign: 'center' }}>Resolving stream…</div>
        )}
      </div>
    </div>
  );
}

function Lobby() {
  const [createInput, setCreateInput] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const createRoom = async e => {
    e.preventDefault();
    setError('');
    const vkey = vkeyFromInput(createInput);
    if (!vkey) { setError('Paste a video link or vkey.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vkey, uid: getUid() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not create room');
      window.location.href = `/party?room=${d.code}`;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const joinRoom = e => {
    e.preventDefault();
    const c = joinCode.trim().toUpperCase();
    if (!c) return;
    window.location.href = `/party?room=${c}`;
  };

  return (
    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      <form onSubmit={createRoom} style={card}>
        <h2 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.5rem' }}>Create a room</h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
          Paste a watch-page link (or vkey). You become the host — everyone syncs to your playback.
        </p>
        <input style={input} value={createInput} onChange={e => setCreateInput(e.target.value)} placeholder="https://xhub-rouge.vercel.app/watch/… or vkey" />
        <button type="submit" disabled={busy} style={{ ...btn(true), marginTop: '0.9rem', width: '100%' }}>
          {busy ? 'Creating…' : 'Create room'}
        </button>
      </form>
      <form onSubmit={joinRoom} style={card}>
        <h2 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.5rem' }}>Join with a code</h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
          Got a 6-letter room code from a friend? Enter it here.
        </p>
        <input style={input} value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} />
        <button type="submit" style={{ ...btn(false), marginTop: '0.9rem', width: '100%' }}>
          <UsersIcon size={15} /> Join room
        </button>
      </form>
      {error && <p style={{ color: '#ff6b6b', gridColumn: '1 / -1' }}>{error}</p>}
    </div>
  );
}

function PartyPageInner() {
  const searchParams = useSearchParams();
  const code = (searchParams.get('room') || '').toUpperCase().trim();
  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper" style={{ maxWidth: '960px' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <UsersIcon size={24} className="section-heading-icon" />
            <span>Watch Party</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
            Watch the same video with friends. The host drives playback; guests stay in sync.
          </p>
        </div>
        {code ? <RoomView code={code} /> : <Lobby />}
      </main>
      <Footer />
    </>
  );
}

export default function PartyPage() {
  return (
    <Suspense fallback={<div style={{ color: '#999', padding: '2rem' }}>Loading…</div>}>
      <PartyPageInner />
    </Suspense>
  );
}
