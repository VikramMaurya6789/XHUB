'use client';
import { useEffect, useState } from 'react';
import { WifiOffIcon } from './Icons';

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '0.6rem 1rem',
        background: '#3a2a12',
        borderBottom: '1px solid #6b4d1c',
        color: '#ffd58a',
        fontSize: '0.85rem',
        fontWeight: 600,
      }}
    >
      <WifiOffIcon size={15} />
      <span>You are offline — some features may not work</span>
    </div>
  );
}
