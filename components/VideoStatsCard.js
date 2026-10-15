'use client';

/* Deterministic 32-bit FNV-1a hash of the vkey — seeds the pseudo-random series. */
function hashVkey(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* mulberry32 — small seeded PRNG, same output for the same vkey every time. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function formatShort(n) {
  if (!n || isNaN(n)) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

const DAYS = 14;

/**
 * VideoStatsCard — "Stats" panel below the player.
 * Totals come from the real catalog numbers when present; the 14-day
 * series is a deterministic estimate seeded by the video's vkey
 * (labeled "estimated" — there is no analytics backend).
 */
export default function VideoStatsCard({ video }) {
  if (!video) return null;
  const vkey = String(video.vkey || video.id || '');

  const reportedViews = Number(video.viewsRaw) || 0;
  const reportedLikes = Number(video.ratingsCount) || 0;

  const rand = mulberry32(hashVkey(vkey || 'xhub'));
  const estimated = reportedViews <= 0;

  // When the catalog has no real numbers, derive a plausible baseline from
  // the seed so the chart still renders (still labeled estimated).
  const baseViews = estimated ? 5000 + Math.floor(rand() * 400000) : reportedViews;
  const baseLikes = estimated ? Math.floor(baseViews * (0.02 + rand() * 0.06)) : reportedLikes;

  // Recent-weighted daily curve with deterministic noise.
  const weights = Array.from({ length: DAYS }, (_, i) => {
    const recency = 0.55 + 1.45 * (i / (DAYS - 1)); // ramps toward today
    return recency * (0.55 + rand() * 0.9);
  });
  const wSum = weights.reduce((a, b) => a + b, 0);
  const viewsPerDay = weights.map((w) => Math.max(1, Math.round((w / wSum) * baseViews)));
  const likesPerDay = viewsPerDay.map((v) =>
    Math.max(0, Math.round((v / Math.max(baseViews, 1)) * baseLikes * (0.7 + rand() * 0.6)))
  );

  const maxV = Math.max(...viewsPerDay, 1);
  const W = 420;
  const H = 150;
  const slot = W / DAYS;
  const barW = Math.max(6, slot - 7);
  const chartH = 108;
  const base = 8 + chartH;

  const avgViews = Math.round(baseViews / DAYS);
  const dayLabel = (i) => {
    const d = DAYS - 1 - i;
    return d === 0 ? 'today' : `${d}d ago`;
  };

  return (
    <section
      aria-label="Video statistics (estimated)"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '1.1rem 1.25rem',
        marginTop: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Stats</h3>
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: 'var(--text-3)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-full)',
            padding: '0.12rem 0.55rem',
            letterSpacing: '0.02em',
          }}
        >
          estimated
        </span>
      </div>

      <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>{formatShort(baseViews)}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
            Views{estimated ? ' (est.)' : ''}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>{formatShort(baseLikes)}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
            Likes{estimated ? ' (est.)' : ''}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>{formatShort(avgViews)}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Avg views / day (est.)</div>
        </div>
      </div>

      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: '0.35rem' }}>
        Views — last {DAYS} days
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }} role="img" aria-label={`Estimated daily views for the last ${DAYS} days`}>
        {viewsPerDay.map((v, i) => {
          const h = Math.max(3, (v / maxV) * chartH);
          const x = i * slot + (slot - barW) / 2;
          const isToday = i === DAYS - 1;
          return (
            <rect
              key={i}
              x={x}
              y={base - h}
              width={barW}
              height={h}
              rx={2.5}
              fill={isToday ? 'var(--brand)' : '#3a3a44'}
            >
              <title>{`${dayLabel(i)}: ${formatShort(v)} views${likesPerDay[i] ? `, ${formatShort(likesPerDay[i])} likes` : ''} (estimated)`}</title>
            </rect>
          );
        })}
        <line x1="0" y1={base} x2={W} y2={base} stroke="var(--border)" strokeWidth="1" />
        <text x="2" y={H - 2} fontSize="9" fill="var(--text-3)">{DAYS - 1} days ago</text>
        <text x={W - 2} y={H - 2} fontSize="9" fill="var(--text-3)" textAnchor="end">today</text>
      </svg>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.7rem', marginBottom: 0 }}>
        Daily trends are estimated from a seeded per-video model, not live analytics.
        {estimated ? ' Totals are estimated too — no catalog numbers on file.' : ''}
      </p>
    </section>
  );
}
