/**
 * Neutral initial-letter avatar generator (F9: no stock model photos)
 * Generates deterministic, vibrant SVG avatars based on name hash
 */
export function getInitialAvatar(name = 'Uploader') {
  const clean = String(name || 'Uploader').trim();
  const initial = (clean[0] || 'U').toUpperCase();
  const colors = [
    '#ff6b00', // XHUB orange
    '#e05600',
    '#2563eb', // Blue
    '#7c3aed', // Purple
    '#db2777', // Pink
    '#059669', // Emerald
    '#d97706', // Amber
    '#4f46e5', // Indigo
    '#0891b2', // Cyan
  ];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" rx="50" fill="${encodeURIComponent(color)}"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="%23ffffff" font-size="44" font-family="system-ui,sans-serif" font-weight="700">${initial}</text></svg>`;
}
