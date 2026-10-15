'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LockIcon, XIcon } from './Icons';
import {
  PARENTAL_EVENT,
  hasPin,
  verifyPin,
  isParentalLocked,
  getBlockedSlugs,
} from '@/lib/parental';

// Global gate: when the parental lock is ON and the current route is a blocked
// category page (/categories/<slug>), cover it with a PIN unlock prompt.
export default function ParentalGate() {
  const pathname = usePathname();
  const [blocked, setBlocked] = useState(false);
  const [sessionUnlocked, setSessionUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const refresh = () => {
    try {
      const match = pathname && pathname.match(/^\/categories\/([^/?#]+)/);
      const slug = match ? decodeURIComponent(match[1]).toLowerCase() : null;
      setBlocked(!!slug && isParentalLocked() && getBlockedSlugs().includes(slug));
    } catch {
      setBlocked(false);
    }
  };

  useEffect(() => {
    refresh();
    setSessionUnlocked(false);
    setPin('');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(PARENTAL_EVENT, handler);
    window.addEventListener('storage', handler);
    refresh();
    return () => {
      window.removeEventListener(PARENTAL_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!blocked || sessionUnlocked || !hasPin()) return null;

  const submit = () => {
    if (verifyPin(pin)) {
      setSessionUnlocked(true);
      setPin('');
      setError('');
    } else {
      setError('Wrong PIN. Try again.');
      setPin('');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: 'rgba(8, 8, 10, 0.97)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '2.5rem 2rem',
          maxWidth: '380px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(255,77,77,0.12)',
            border: '1px solid rgba(255,77,77,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            color: '#ff6b6b',
          }}
        >
          <LockIcon size={24} />
        </div>
        <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Blocked by Parental Controls
        </h2>
        <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          This category is blocked on this device. Enter the parental PIN to view it.
        </p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="4-digit PIN"
          autoFocus
          style={{
            width: '100%',
            padding: '0.85rem',
            textAlign: 'center',
            fontSize: '1.25rem',
            fontWeight: 800,
            letterSpacing: '0.5rem',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            color: '#fff',
            outline: 'none',
            marginBottom: '1rem',
          }}
        />
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#ff6b6b', fontSize: '0.85rem', marginBottom: '1rem' }}>
            <XIcon size={14} />
            <span>{error}</span>
          </div>
        )}
        <button
          onClick={submit}
          className="filter-pill-btn active"
          style={{ width: '100%', padding: '0.8rem', fontWeight: 700, marginBottom: '0.75rem' }}
        >
          Unlock Category
        </button>
        <Link href="/" style={{ color: 'var(--text-3)', fontSize: '0.85rem', textDecoration: 'underline' }}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
