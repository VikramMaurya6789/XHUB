/**
 * XHUB — verified uploader registry.
 * Seeds the checkmark badge shown next to uploader names in VideoCard and
 * WatchClient. Names come from the site's spotlight creator list.
 */

export const VERIFIED_UPLOADER_NAMES = [
  'Sweet Sinner',
  'Private Society',
  'Little Caprice',
  'Cherry Pimps',
  'Pure Taboo',
  'Blacked Official',
];

/** Case-insensitive match against the verified list. */
export function isVerifiedUploader(name) {
  if (!name || typeof name !== 'string') return false;
  const n = name.trim().toLowerCase();
  if (!n) return false;
  return VERIFIED_UPLOADER_NAMES.some(v => v.toLowerCase() === n);
}

export default VERIFIED_UPLOADER_NAMES;
