'use client';
import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function WatchRedirectContent() {
  const params = useSearchParams();
  const router = useRouter();
  const vkey = params.get('vkey') || params.get('id');

  useEffect(() => {
    if (vkey) {
      router.replace(`/watch/${encodeURIComponent(vkey)}`);
    } else {
      router.replace('/');
    }
  }, [vkey, router]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="skeleton-box" style={{ width: '120px', height: '24px', borderRadius: '4px' }} />
    </div>
  );
}

export default function WatchRedirectPage() {
  return (
    <Suspense fallback={null}>
      <WatchRedirectContent />
    </Suspense>
  );
}
