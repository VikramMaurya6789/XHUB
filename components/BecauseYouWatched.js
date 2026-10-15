'use client';
import { useEffect, useState } from 'react';
import VideoCard from '@/components/VideoCard';
import { HistoryIcon } from './Icons';

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'video', 'videos', 'watch',
  'free', 'full', 'new', 'best', 'hot', 'sexy', 'porn', 'xxx', 'online', 'part',
]);

function keywordsOf(video) {
  const out = [];
  const tags = Array.isArray(video?.tags) ? video.tags : [];
  for (const t of tags) {
    const w = String(t).toLowerCase().trim();
    if (w && !STOPWORDS.has(w)) out.push(w);
  }
  const titleWords = String(video?.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
  out.push(...titleWords);
  const uploader = video?.uploader?.name || video?.uploader;
  if (typeof uploader === 'string' && uploader.trim()) {
    out.push('uploader:' + uploader.toLowerCase().trim());
  }
  return out;
}

// Score unwatched catalog videos by keyword overlap with watch history.
export default function BecauseYouWatched() {
  const [videos, setVideos] = useState(null); // null = not yet evaluated

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const raw = localStorage.getItem('xhub_history');
        const history = raw ? JSON.parse(raw) : [];
        const items = Array.isArray(history) ? history : [];
        // History entries are full video objects; tolerate bare vkeys too.
        const watchedKeys = new Set(
          items.map(v => (typeof v === 'string' ? v : v?.vkey || v?.id)).filter(Boolean)
        );
        if (items.length === 0 || watchedKeys.size === 0) {
          if (!cancelled) setVideos([]);
          return;
        }

        // Keyword frequency profile from watched videos.
        const freq = {};
        for (const v of items) {
          if (typeof v === 'string') continue;
          for (const k of keywordsOf(v)) freq[k] = (freq[k] || 0) + 1;
        }
        if (Object.keys(freq).length === 0) {
          if (!cancelled) setVideos([]);
          return;
        }

        // Candidate pool: first pages of the main feeds.
        const sections = ['hot', 'trending', 'new', 'indian'];
        const pool = [];
        const seen = new Set();
        for (const section of sections) {
          try {
            const res = await fetch(`/api/feed?section=${encodeURIComponent(section)}&page=1`);
            const data = await res.json();
            for (const v of data.videos || []) {
              const key = v.vkey || v.id;
              if (!key || seen.has(key) || watchedKeys.has(key)) continue;
              seen.add(key);
              pool.push(v);
            }
          } catch {}
          if (cancelled) return;
        }

        const scored = pool
          .map(v => {
            let score = 0;
            for (const k of keywordsOf(v)) score += freq[k] || 0;
            return { v, score };
          })
          .filter(s => s.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 12)
          .map(s => s.v);

        if (!cancelled) setVideos(scored);
      } catch {
        if (!cancelled) setVideos([]);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  if (!videos || videos.length === 0) return null;

  return (
    <section className="homepage-section" style={{ marginTop: '2.5rem' }}>
      <div className="section-header-row">
        <h2 className="section-heading">
          <HistoryIcon className="section-heading-icon" size={19} />
          <span>Because You Watched</span>
        </h2>
      </div>
      <div className="dense-video-grid">
        {videos.map(video => (
          <VideoCard key={video.vkey || video.id} video={video} />
        ))}
      </div>
    </section>
  );
}
