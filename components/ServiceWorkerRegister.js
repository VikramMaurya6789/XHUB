'use client';
import { useEffect } from 'react';

// Registers /sw.js once per session. No-op on unsupported browsers.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Don't register twice in dev double-effects.
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (reg) return;
        return navigator.serviceWorker.register('/sw.js').catch(() => {});
      })
      .catch(() => {});
  }, []);
  return null;
}
