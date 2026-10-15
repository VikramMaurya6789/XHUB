'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LockIcon, ShieldCheckIcon, CheckIcon, XIcon } from './Icons';
import { POPULAR_CATEGORIES } from '@/lib/videos';
import {
  PARENTAL_PIN_KEY,
  PARENTAL_LOCK_KEY,
  PARENTAL_BLOCKED_KEY,
  hashPin,
  hasPin,
  verifyPin,
  isParentalLocked,
  notifyParentalChanged,
} from '@/lib/parental';

// Full category list for blocking — mirrors app/categories/page.js
const ALL_CATEGORIES = [
  ...POPULAR_CATEGORIES,
  { slug: 'hardcore', name: 'Hardcore' },
  { slug: 'fetish', name: 'Fetish & Feet' },
  { slug: 'vr', name: 'VR Videos' },
  { slug: 'vintage', name: 'Vintage / Classic' },
];

const cardStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '1.75rem',
};

const pinInputStyle = {
  width: '3.25rem',
  height: '3.5rem',
  textAlign: 'center',
  fontSize: '1.5rem',
  fontWeight: 800,
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  color: '#fff',
  outline: 'none',
};

function PinBoxes({ pin, setPin }) {
  const handleChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = pin.split('');
    next[i] = digit;
    setPin(next.join(''));
    if (digit && i < 3) {
      const el = document.getElementById(`pin-box-${i + 1}`);
      if (el) el.focus();
    }
  };
  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !pin[i] && i > 0) {
      const el = document.getElementById(`pin-box-${i - 1}`);
      if (el) el.focus();
    }
  };
  return (
    <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
      {[0, 1, 2, 3].map(i => (
        <input
          key={i}
          id={`pin-box-${i}`}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={pin[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          style={pinInputStyle}
          aria-label={`PIN digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

export default function ParentalControlsClient() {
  const [mounted, setMounted] = useState(false);
  const [pinSet, setPinSet] = useState(false);
  const [locked, setLocked] = useState(false);
  const [blocked, setBlocked] = useState([]);

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [verifyInput, setVerifyInput] = useState('');
  const [changeMode, setChangeMode] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok'|'err', text }

  const refresh = () => {
    try {
      setPinSet(hasPin());
      setLocked(isParentalLocked());
      const raw = localStorage.getItem(PARENTAL_BLOCKED_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      setBlocked(Array.isArray(arr) ? arr : []);
    } catch {}
  };

  useEffect(() => {
    setMounted(true);
    refresh();
  }, []);

  const say = (type, text) => setMessage({ type, text });

  const handleSetup = () => {
    if (!/^\d{4}$/.test(newPin)) return say('err', 'PIN must be exactly 4 digits.');
    if (newPin !== confirmPin) return say('err', 'PINs do not match. Try again.');
    try {
      localStorage.setItem(PARENTAL_PIN_KEY, hashPin(newPin));
      localStorage.setItem(PARENTAL_LOCK_KEY, '1');
      notifyParentalChanged();
      setNewPin('');
      setConfirmPin('');
      refresh();
      say('ok', 'PIN created and lock is ON. Blocked categories are now filtered.');
    } catch {
      say('err', 'Could not save PIN on this device.');
    }
  };

  const handleToggleLock = () => {
    if (!locked && !verifyPin(verifyInput)) return say('err', 'Wrong PIN.');
    try {
      localStorage.setItem(PARENTAL_LOCK_KEY, locked ? '0' : '1');
      notifyParentalChanged();
      setVerifyInput('');
      refresh();
      say('ok', locked ? 'Parental lock is OFF.' : 'Parental lock is ON. Blocked categories are now filtered.');
    } catch {
      say('err', 'Could not update lock state.');
    }
  };

  const handleToggleCategory = slug => {
    const next = blocked.includes(slug) ? blocked.filter(s => s !== slug) : [...blocked, slug];
    try {
      localStorage.setItem(PARENTAL_BLOCKED_KEY, JSON.stringify(next));
      notifyParentalChanged();
      setBlocked(next);
    } catch {}
  };

  const handleChangePin = () => {
    if (!verifyPin(verifyInput)) return say('err', 'Current PIN is wrong.');
    if (!/^\d{4}$/.test(newPin)) return say('err', 'New PIN must be exactly 4 digits.');
    if (newPin !== confirmPin) return say('err', 'New PINs do not match.');
    try {
      localStorage.setItem(PARENTAL_PIN_KEY, hashPin(newPin));
      setNewPin('');
      setConfirmPin('');
      setVerifyInput('');
      setChangeMode(false);
      say('ok', 'PIN changed successfully.');
    } catch {
      say('err', 'Could not save new PIN.');
    }
  };

  const handleRemovePin = () => {
    if (!verifyPin(verifyInput)) return say('err', 'Wrong PIN.');
    try {
      localStorage.removeItem(PARENTAL_PIN_KEY);
      localStorage.removeItem(PARENTAL_LOCK_KEY);
      notifyParentalChanged();
      setVerifyInput('');
      refresh();
      say('ok', 'Parental lock removed from this device.');
    } catch {
      say('err', 'Could not remove PIN.');
    }
  };

  if (!mounted) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
      {/* Status / setup card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <LockIcon size={20} className="section-heading-icon" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
            {pinSet ? 'Parental Lock' : 'Set Up a Parental PIN'}
          </h2>
          {pinSet && (
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                background: locked ? 'rgba(46, 204, 113, 0.15)' : 'rgba(255,255,255,0.06)',
                color: locked ? '#2ecc71' : 'var(--text-3)',
                border: `1px solid ${locked ? 'rgba(46,204,113,0.4)' : 'var(--border)'}`,
              }}
            >
              {locked ? 'LOCKED' : 'UNLOCKED'}
            </span>
          )}
        </div>

        {!pinSet ? (
          <>
            <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              Create a 4-digit PIN to block categories you choose. While the lock is on, blocked
              categories are filtered from feeds and category pages, and a lock badge appears in the header.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <PinBoxes pin={newPin} setPin={setNewPin} />
              <PinBoxes pin={confirmPin} setPin={setConfirmPin} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Enter PIN, then confirm it</span>
              <button
                onClick={handleSetup}
                className="filter-pill-btn active"
                style={{ padding: '0.7rem 2.5rem', fontWeight: 700 }}
              >
                Create PIN &amp; Enable Lock
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              Enter your PIN to turn the lock {locked ? 'off' : 'on'}.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
              <PinBoxes pin={verifyInput} setPin={setVerifyInput} />
              <button
                onClick={handleToggleLock}
                className={`filter-pill-btn ${locked ? '' : 'active'}`}
                style={{ padding: '0.7rem 2rem', fontWeight: 700 }}
              >
                {locked ? 'Unlock (Turn Lock Off)' : 'Lock (Turn On)'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setChangeMode(!changeMode); setMessage(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {changeMode ? 'Cancel PIN change' : 'Change PIN'}
              </button>
              <button
                onClick={handleRemovePin}
                style={{ background: 'none', border: 'none', color: '#ff6b6b', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Remove PIN
              </button>
            </div>
            {changeMode && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>New PIN</span>
                <PinBoxes pin={newPin} setPin={setNewPin} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>Confirm new PIN</span>
                <PinBoxes pin={confirmPin} setPin={setConfirmPin} />
                <button onClick={handleChangePin} className="filter-pill-btn active" style={{ padding: '0.7rem 2rem', fontWeight: 700 }}>
                  Save New PIN
                </button>
              </div>
            )}
          </>
        )}

        {message && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: message.type === 'ok' ? 'rgba(46,204,113,0.12)' : 'rgba(255,77,77,0.12)',
              border: `1px solid ${message.type === 'ok' ? 'rgba(46,204,113,0.4)' : 'rgba(255,77,77,0.4)'}`,
              color: message.type === 'ok' ? '#2ecc71' : '#ff6b6b',
            }}
          >
            {message.type === 'ok' ? <CheckIcon size={15} /> : <XIcon size={15} />}
            <span>{message.text}</span>
          </div>
        )}
      </div>

      {/* Category blocking card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <ShieldCheckIcon size={20} className="section-heading-icon" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>Blocked Categories</h2>
        </div>
        <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          {pinSet
            ? `Select categories to hide while the lock is on. ${blocked.length} blocked.`
            : 'Set a PIN first — then you can choose which categories to block.'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.6rem', opacity: pinSet ? 1 : 0.45, pointerEvents: pinSet ? 'auto' : 'none' }}>
          {ALL_CATEGORIES.map(cat => {
            const isBlocked = blocked.includes(cat.slug);
            return (
              <button
                key={cat.slug}
                onClick={() => handleToggleCategory(cat.slug)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  padding: '0.7rem 0.85rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: isBlocked ? '#ff8a8a' : 'var(--text)',
                  background: isBlocked ? 'rgba(255,77,77,0.08)' : 'var(--surface-2)',
                  border: `1px solid ${isBlocked ? 'rgba(255,77,77,0.45)' : 'var(--border)'}`,
                }}
              >
                <span>{cat.name}</span>
                {isBlocked ? <LockIcon size={14} /> : <CheckIcon size={14} style={{ opacity: 0.4 }} />}
              </button>
            );
          })}
        </div>
        <p style={{ color: 'var(--text-3)', fontSize: '0.75rem', marginTop: '1.25rem', lineHeight: 1.6 }}>
          Note: the PIN is stored as a simple hash on this device only — it is a casual deterrent for
          shared devices, not high security. Anyone with access to this browser can clear site data.
          For stronger protection, use OS-level parental controls or DNS filtering (see below).
        </p>
        <Link href="/categories" style={{ color: 'var(--brand)', fontSize: '0.85rem', textDecoration: 'underline' }}>
          Browse all categories →
        </Link>
      </div>
    </div>
  );
}
