'use client';
import { useState, useEffect } from 'react';
import { ShieldCheckIcon } from './Icons';

export default function AgeGate() {
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    try {
      const hasAccepted = localStorage.getItem('xhub_age_ok') === '1' || document.cookie.includes('xhub_age_ok=1');
      if (!hasAccepted) {
        setShowGate(true);
      }
    } catch {
      setShowGate(false);
    }
  }, []);

  const handleEnter = () => {
    try {
      localStorage.setItem('xhub_age_ok', '1');
      document.cookie = 'xhub_age_ok=1; max-age=31536000; path=/; SameSite=Lax';
    } catch {}
    setShowGate(false);
  };

  const handleExit = () => {
    window.location.href = 'https://www.google.com';
  };

  if (!showGate) return null;

  return (
    <div className="age-gate-overlay">
      <div className="age-gate-modal">
        <div className="age-gate-brand">
          <span className="logo-badge">X</span>
          <span className="age-gate-brand-text">HUB</span>
        </div>

        <div className="age-gate-badge">
          <ShieldCheckIcon size={18} />
          <span>ADULT CONTENT WARNING (18+)</span>
        </div>

        <h2 className="age-gate-title">Age Verification Required</h2>

        <p className="age-gate-text">
          This website contains adult material, sexually explicit content, and age-restricted video streams.
          By proceeding, you certify under penalty of perjury that you are at least 18 years of age (or the age of legal majority in your jurisdiction) and consent to viewing sexually explicit content.
        </p>

        <div className="age-gate-actions">
          <button onClick={handleEnter} className="age-gate-enter-btn">
            I am 18 or older — Enter
          </button>
          <button onClick={handleExit} className="age-gate-exit-btn">
            Exit
          </button>
        </div>

        <div className="age-gate-footer">
          <span>RTA (Restricted to Adults) Label Compliant</span>
          <span>•</span>
          <span>18 U.S.C. 2257 Record-Keeping Verified</span>
        </div>
      </div>
    </div>
  );
}
