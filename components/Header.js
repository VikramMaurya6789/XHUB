'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SearchIcon, UserIcon, ClockIcon, HistoryIcon, FlameIcon, StarIcon, SparklesIcon, FilmIcon, BookmarkIcon, EyeOffIcon, LockIcon } from './Icons';
import SearchAutocomplete from './SearchAutocomplete';
import { isHideWatchedOn, setHideWatched } from '@/lib/discovery';
import { PARENTAL_EVENT, isParentalLocked } from '@/lib/parental';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Hide-watched toggle: persisted in localStorage, feeds re-filter on change
  const [hideWatched, setHideWatchedState] = useState(false);
  useEffect(() => {
    setHideWatchedState(isHideWatchedOn());
    const sync = () => setHideWatchedState(isHideWatchedOn());
    window.addEventListener('xhub:hide-watched-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('xhub:hide-watched-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggleHideWatched = () => {
    const next = !hideWatched;
    setHideWatchedState(next);
    setHideWatched(next);
  };

  // Parental lock badge: shown when the PIN lock is on
  const [parentalLocked, setParentalLocked] = useState(false);
  useEffect(() => {
    const refresh = () => setParentalLocked(isParentalLocked());
    refresh();
    window.addEventListener(PARENTAL_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(PARENTAL_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const navItems = [
    { label: 'Videos', href: '/', exact: true },
    { label: 'Best Videos', href: '/best' },
    { label: 'Short Videos', href: '/shorts' },
    { label: 'Indian', href: '/indian' },
    { label: 'New', href: '/new' },
    { label: 'Watch Later', href: '/watch-later' },
    { label: 'Watch History', href: '/history' },
    { label: 'Upload', href: '/upload' },
    { label: 'Creator', href: '/creator' },
    { label: 'Party', href: '/party' },
    { label: 'Playlists', href: '/playlists' },
    { label: 'Liked', href: '/liked' },
    { label: 'Categories', href: '/categories' },
    { label: 'Pornstars', href: '/pornstars' },
    { label: 'Celebrities', href: '/celebrities' },
    { label: 'Creators', href: '/creators' },
    { label: 'Channels', href: '/channels' },
  ];

  const isActive = item => {
    if (item.exact) return pathname === '/';
    return pathname.startsWith(item.href);
  };

  return (
    <header className="site-header">
      <div className="header-top">
        <div className="header-container">
          <Link href="/" className="logo-brand">
            <span className="logo-badge">X</span>
            <span className="logo-text">HUB</span>
          </Link>

          <SearchAutocomplete />

          <div className="header-actions">
            {parentalLocked && (
              <Link
                href="/parental-controls"
                title="Parental lock is on — blocked categories are filtered"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: '#2ecc71',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  padding: '0.4rem 0.7rem',
                  border: '1px solid rgba(46,204,113,0.45)',
                  borderRadius: '999px',
                  background: 'rgba(46,204,113,0.1)',
                }}
              >
                <LockIcon size={14} />
                <span>Locked</span>
              </Link>
            )}
            <button
              type="button"
              onClick={toggleHideWatched}
              className={`hide-watched-toggle ${hideWatched ? 'active' : ''}`}
              title={hideWatched ? 'Show watched videos again' : 'Hide videos you have already watched'}
              aria-pressed={hideWatched}
            >
              <EyeOffIcon size={15} />
              <span>{hideWatched ? 'Watched hidden' : 'Hide watched'}</span>
            </button>

            <div className="lang-picker-stub" title="Language: English (US)">
              <span>EN</span>
            </div>

            <button
              onClick={() => setShowAuthModal(true)}
              className="header-auth-btn"
              title="Accounts are local-only in v1"
            >
              <UserIcon size={16} />
              <span>Log in</span>
            </button>
          </div>
        </div>
      </div>

      <nav className="header-nav">
        <div className="nav-container">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive(item) ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {showAuthModal && (
        <div className="auth-modal-backdrop" onClick={() => setShowAuthModal(false)}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            <div className="auth-modal-header">
              <h3>Member Access</h3>
              <button onClick={() => setShowAuthModal(false)} className="auth-close-btn">✕</button>
            </div>
            <p className="auth-modal-desc">
              XHUB v1 utilizes privacy-first local storage for your <strong>Watch History</strong>, <strong>Watch Later</strong>, and <strong>Favorites</strong> list. No personal account or login is required to stream or bookmark videos!
            </p>
            <div className="auth-modal-actions">
              <Link href="/watch-later" onClick={() => setShowAuthModal(false)} className="auth-action-btn">
                <ClockIcon size={16} />
                <span>My Watch Later</span>
              </Link>
              <Link href="/history" onClick={() => setShowAuthModal(false)} className="auth-action-btn">
                <HistoryIcon size={16} />
                <span>My Watch History</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
