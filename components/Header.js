'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SearchIcon, UserIcon, ClockIcon, HistoryIcon, FlameIcon, StarIcon, SparklesIcon, FilmIcon, BookmarkIcon } from './Icons';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSearch = e => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const navItems = [
    { label: 'Videos', href: '/', exact: true },
    { label: 'Best Videos', href: '/best' },
    { label: 'Short Videos', href: '/shorts' },
    { label: 'Indian', href: '/indian' },
    { label: 'New', href: '/new' },
    { label: 'Watch Later', href: '/watch-later' },
    { label: 'Watch History', href: '/history' },
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

          <form onSubmit={handleSearch} className="search-form">
            <SearchIcon className="search-icon" size={17} />
            <input
              type="text"
              className="search-input"
              placeholder="Search videos, categories, models..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button type="submit" className="search-btn-icon" aria-label="Search">
              <SearchIcon size={14} />
            </button>
          </form>

          <div className="header-actions">
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
