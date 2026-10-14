'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

function VideoCard({ v }) {
  const [thumb, setThumb] = useState(null);
  useEffect(() => {
    // Lazy-load thumbnail via video API
    fetch(`/api/video?url=${encodeURIComponent(v.url)}`)
      .then(r => r.json())
      .then(d => { if (d.thumbnail) setThumb(d.thumbnail); })
      .catch(() => {});
  }, [v.url]);
  return (
    <Link href={`/watch?vkey=${v.vkey}&url=${encodeURIComponent(v.url)}`} className="group">
      <div className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden">
        {thumb
          ? <img src={thumb} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-neutral-600 text-sm">Loading...</div>}
      </div>
      <h3 className="mt-2 text-sm text-neutral-200 line-clamp-2 group-hover:text-orange-500">{v.title}</h3>
    </Link>
  );
}

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [section, setSection] = useState('hot');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/feed?section=${section}`)
      .then(r => r.json())
      .then(d => { setVideos(d.videos || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [section]);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 bg-black/90 backdrop-blur border-b border-neutral-800 px-4 py-3 flex items-center gap-6">
        <Link href="/" className="text-2xl font-black text-orange-500">XHUB</Link>
        <nav className="flex gap-4 text-sm">
          {['hot', 'new', 'trending'].map(s => (
            <button key={s} onClick={() => setSection(s)}
              className={`capitalize px-3 py-1 rounded-full ${section === s ? 'bg-orange-500 text-black font-bold' : 'text-neutral-400 hover:text-white'}`}>{s}</button>
          ))}
        </nav>
        <Link href="/search" className="ml-auto text-neutral-400 hover:text-white text-sm">Search</Link>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading
          ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <div key={i} className="aspect-video bg-neutral-900 rounded-lg animate-pulse" />)}</div>
          : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{videos.map(v => <VideoCard key={v.vkey} v={v} />)}</div>}
      </main>
    </div>
  );
}
