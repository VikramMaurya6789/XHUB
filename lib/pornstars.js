import PORNSTARS_DATA from './pornstars_data.json' with { type: 'json' };
import { getInitialAvatar } from './avatar.js';

export const TOP_PORNSTARS = PORNSTARS_DATA;

export function getPornstarBySlug(slug) {
  if (!slug) return null;
  const cleanSlug = slug.toLowerCase().trim();
  const found = TOP_PORNSTARS.find(
    s => s.slug === cleanSlug || s.slug.replace(/-/g, '') === cleanSlug.replace(/-/g, '')
  );
  if (found) return found;

  const name = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return {
    slug: cleanSlug,
    name,
    image: getInitialAvatar(name),
    rank: '#TOP',
  };
}

export function searchPornstars(query = '', letter = 'ALL') {
  let list = TOP_PORNSTARS;
  if (letter && letter !== 'ALL') {
    list = list.filter(p => p.name.toUpperCase().startsWith(letter.toUpperCase()));
  }
  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.slug.includes(q));
  }
  return list;
}
