'use client';

/** Per-device identity used by uploads / party / collab features. */
export function getUid() {
  try {
    let u = localStorage.getItem('xhub_uid');
    if (!u) {
      u = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('xhub_uid', u);
    }
    return u;
  } catch {
    return 'u_anon';
  }
}

/** Compact human-readable count (1.2K, 3.4M). */
export function compact(n) {
  const num = Number(n) || 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
}
