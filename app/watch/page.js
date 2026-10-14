'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Player from '../../components/Player';

function WatchContent() {
  const params = useSearchParams();
  const vkey = params.get('vkey');
  const url = params.get('url');
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) { setError('No video URL'); return; }
    fetch(`/api/video?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setInfo(d); })
      .catch(e => setError(e.message));
  }, [url]);

  if (error) return <div className="min-h-screen bg-black text-white flex items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold mb-2">Video Not Found</h1><p className="text-neutral-400">{error}</p><Link href="/" className="text-orange-500 mt-4 inline-block">← Home</Link></div></div>;
  if (!info) return <div className="min-h-screen bg-black text-white flex items-center justify-center"><div className="animate-pulse text-neutral-500">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="px-4 py-3 border-b border-neutral-800"><Link href="/" className="text-2xl font-black text-orange-500">XHUB</Link></header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Player streams={info.streams} poster={info.thumbnail} title={info.title} />
        <h1 className="text-xl font-bold mt-4">{info.title}</h1>
        <div className="flex gap-4 mt-2 text-sm text-neutral-400">
          {info.views && <span>{info.views} views</span>}
          {info.duration > 0 && <span>{Math.floor(info.duration / 60)}:{String(info.duration % 60).padStart(2, '0')}</span>}
        </div>
      </main>
    </div>
  );
}

export default function Watch() {
  return <Suspense fallback={<div className="min-h-screen bg-black" />}><WatchContent /></Suspense>;
}
