'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { UserIcon, PlayIcon, ClockIcon, HeartIcon, BookmarkIcon, CheckIcon } from '@/components/Icons';
import { getUid } from '@/lib/uid';
import { readJSON, writeJSON, formatWatchTime } from '@/lib/local';
import { getInitialAvatar } from '@/lib/avatar';

export default function ProfilePage() {
  const [uid, setUid] = useState('');
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [stats, setStats] = useState({
    watched: 0,
    watchTimeSec: 0,
    liked: 0,
    disliked: 0,
    watchLater: 0,
    favorites: 0,
    following: 0,
  });

  useEffect(() => {
    const id = getUid();
    setUid(id);
    const profile = readJSON('xhub_profile', null);
    const displayName = profile?.name?.trim() || '';
    setName(displayName);
    setDraft(displayName);

    const history = readJSON('xhub_history', []);
    const progress = readJSON('xhub_progress', {});
    const likes = readJSON('xhub_likes', {});
    const watchLater = readJSON('xhub_watch_later', []);
    const favorites = readJSON('xhub_favorites', []);
    const subs = readJSON('xhub_subscriptions', []);

    // xhub_progress = { [vkey]: { t, d, ts } } (position object; legacy plain-second values tolerated)
    const watchTimeSec = Object.values(progress || {}).reduce(
      (sum, s) => sum + (s && typeof s === 'object' ? Number(s.t) || 0 : Number(s) || 0),
      0
    );
    const liked = Object.values(likes || {}).filter(v => v === 'like').length;
    const disliked = Object.values(likes || {}).filter(v => v === 'dislike').length;

    setStats({
      watched: Array.isArray(history) ? history.length : 0,
      watchTimeSec,
      liked,
      disliked,
      watchLater: Array.isArray(watchLater) ? watchLater.length : 0,
      favorites: Array.isArray(favorites) ? favorites.length : 0,
      following: Array.isArray(subs) ? subs.length : 0,
    });
  }, []);

  const saveName = () => {
    const clean = draft.trim().slice(0, 40);
    writeJSON('xhub_profile', { name: clean });
    setName(clean);
    setEditing(false);
  };

  const tiles = [
    { icon: <PlayIcon size={20} />, label: 'Videos watched', value: stats.watched, href: '/history' },
    { icon: <ClockIcon size={20} />, label: 'Total watch time', value: formatWatchTime(stats.watchTimeSec), href: null },
    { icon: <HeartIcon size={20} />, label: 'Videos liked', value: stats.liked, href: null },
    { icon: <BookmarkIcon size={20} />, label: 'Watch later', value: stats.watchLater, href: '/watch-later' },
    { icon: <HeartIcon size={20} filled={true} />, label: 'Favorites', value: stats.favorites, href: null },
    { icon: <UserIcon size={20} />, label: 'Creators followed', value: stats.following, href: '/following' },
  ];

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        <div className="profile-card">
          <img
            src={getInitialAvatar(name || uid || 'Guest')}
            alt="Profile"
            className="profile-avatar"
          />
          <div className="profile-identity">
            {editing ? (
              <div className="profile-name-edit">
                <input
                  type="text"
                  value={draft}
                  maxLength={40}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Choose a display name"
                  className="profile-name-input"
                  autoFocus
                />
                <button onClick={saveName} className="profile-save-btn" title="Save">
                  <CheckIcon size={16} />
                  <span>Save</span>
                </button>
              </div>
            ) : (
              <div className="profile-name-row">
                <h1 className="profile-name">{name || 'Guest'}</h1>
                <button
                  onClick={() => {
                    setDraft(name);
                    setEditing(true);
                  }}
                  className="profile-edit-btn"
                >
                  Edit name
                </button>
              </div>
            )}
            <p className="profile-uid">Device ID: {uid ? `${uid.slice(0, 8)}…` : '—'}</p>
            <p className="profile-note">
              Your profile lives on this device only — no account, no sign-in.
            </p>
          </div>
        </div>

        <div className="profile-stats-grid">
          {tiles.map(t => {
            const inner = (
              <>
                <span className="profile-stat-icon">{t.icon}</span>
                <span className="profile-stat-value">{t.value}</span>
                <span className="profile-stat-label">{t.label}</span>
              </>
            );
            return t.href ? (
              <Link key={t.label} href={t.href} className="profile-stat-tile">
                {inner}
              </Link>
            ) : (
              <div key={t.label} className="profile-stat-tile">
                {inner}
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
