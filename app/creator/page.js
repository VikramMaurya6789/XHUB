'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { UserIcon, EyeIcon, FilmIcon, BadgeCheckIcon, PlayIcon } from '@/components/Icons';
import { getUid, compact } from '@/lib/uid';

const card = {
  background: 'var(--bg-2, #151515)',
  border: '1px solid var(--border, #2a2a2a)',
  borderRadius: '12px',
  padding: '1.25rem',
};

function parseViews(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

/** Simple SVG bar chart of views per video. */
function ViewsBarChart({ items }) {
  const data = items.slice(0, 5);
  const max = Math.max(1, ...data.map(i => parseViews(i.views)));
  const W = 560, H = 190, pad = 8, barW = 64, gap = 28;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Views per video bar chart">
      <defs>
        <linearGradient id="xhubBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff8a1e" />
          <stop offset="100%" stopColor="#c14e00" />
        </linearGradient>
      </defs>
      {data.map((it, i) => {
        const h = Math.max(4, ((parseViews(it.views) / max) * (H - 60)));
        const x = pad + i * (barW + gap);
        const y = H - 30 - h;
        return (
          <g key={it.id || it.vkey || i}>
            <rect x={x} y={y} width={barW} height={h} rx={6} fill="url(#xhubBar)" />
            <text x={x + barW / 2} y={y - 8} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">
              {compact(it.views)}
            </text>
            <text x={x + barW / 2} y={H - 12} textAnchor="middle" fill="#999" fontSize="11">
              {(it.title || 'Video').slice(0, 12)}{(it.title || '').length > 12 ? '…' : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function CreatorDashboardPage() {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState('');

  useEffect(() => {
    const id = getUid();
    setUid(id);
    fetch(`/api/uploads?uid=${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(d => setUploads(d.uploads || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalViews = useMemo(() => uploads.reduce((s, u) => s + parseViews(u.views), 0), [uploads]);
  const top5 = useMemo(() => [...uploads].sort((a, b) => parseViews(b.views) - parseViews(a.views)).slice(0, 5), [uploads]);

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper" style={{ maxWidth: '960px' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <UserIcon size={24} className="section-heading-icon" />
            <span>Creator Dashboard</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
            Stats for your uploads on this device. Views count each preview play.
          </p>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-3)' }}>Loading…</p>
        ) : uploads.length === 0 ? (
          <div style={{ ...card, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-3)', marginBottom: '1rem' }}>You have no uploads yet.</p>
            <Link href="/upload" style={{ background: '#ff6b00', color: '#fff', borderRadius: '8px', padding: '0.7rem 1.6rem', fontWeight: 800, textDecoration: 'none', display: 'inline-block' }}>
              Upload your first video
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-3)', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                  <EyeIcon size={15} /> Total views
                </div>
                <div style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800 }}>{compact(totalViews)}</div>
              </div>
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-3)', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                  <FilmIcon size={15} /> Videos
                </div>
                <div style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800 }}>{uploads.length}</div>
              </div>
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-3)', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                  <BadgeCheckIcon size={15} /> Avg. views / video
                </div>
                <div style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800 }}>{compact(Math.round(totalViews / uploads.length))}</div>
              </div>
            </div>

            <div style={{ ...card, marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.75rem' }}>Views per video</h2>
              <ViewsBarChart items={top5} />
            </div>

            <h2 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem' }}>Top 5 videos</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {top5.map((u, i) => (
                <div key={u.id} style={{ ...card, padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ color: '#ff6b00', fontWeight: 800, fontSize: '1.2rem', width: '28px', textAlign: 'center' }}>{i + 1}</div>
                  {u.thumbnailUrl ? (
                    <img src={u.thumbnailUrl} alt={u.title} style={{ width: '110px', height: '62px', objectFit: 'cover', borderRadius: '6px' }} loading="lazy" />
                  ) : (
                    <div style={{ width: '110px', height: '62px', borderRadius: '6px', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b00', fontWeight: 800, fontSize: '0.75rem' }}>XHUB</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.title}</div>
                    <div style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                      {compact(u.views)} views {u.category ? `• ${u.category}` : ''}
                    </div>
                  </div>
                  <Link href="/upload" style={{ color: '#ff6b00', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none', flexShrink: 0 }}>
                    <PlayIcon size={13} /> Manage
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
