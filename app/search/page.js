'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function SearchContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get('q') || '');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  const doSearch = (query) => {
    if (!query.trim()) return;
    setLoading(true);
    router.push(`/search?q=${encodeURIComponent(query)}`);
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(d => { setVideos(d.videos || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="px-4 py-3 border-b border-neutral-800 flex items-center gap-4">
        <Link href="/" className="text-2xl font-black text-orange-500">XHUB</Link>
        <form onSubmit={e => { e.preventDefault(); doSearch(q); }} className="flex-1 max-w-xl flex gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search videos..."
            className="flex-1 bg-neutral-900 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
          <button type="submit" className="bg-orange-500 text-black font-bold px-4 py-2 rounded-full text-sm">Search</button>
        </form>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? <div className="text-neutral-500">Searching...</div> :
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videos.map(v => (
              <Link key={v.vkey} href={`/watch?vkey=${v.vkey}&url=${encodeURIComponent(v.url)}`} className="group">
                <div className="aspect-video bg-neutral-900 rounded-lg flex items-center justify-center text-neutral-600 text-sm">Video</div>
                <h3 className="mt-2 text-sm text-neutral-200 line-clamp-2 group-hover:text-orange-500">{v.title}</h3>
              </Link>
            ))}
          </div>}
      </main>
    </div>
  );
}
export default function Search() {
  return <Suspense><SearchContent /></Suspense>;
}
