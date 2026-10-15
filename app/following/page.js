'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import VideoCard from '@/components/VideoCard';
import { UserIcon } from '@/components/Icons';
import { getUid } from '@/lib/uid';
import { readJSON, writeJSON, mergeCreators, creatorSlug, syncFollow } from '@/lib/local';
import { getInitialAvatar } from '@/lib/avatar';

function CreatorRow({ creator }) {
  const [videos, setVideos] = useState([]);
  const [following, setFollowing] = useState(true);
  const slug = creatorSlug(creator.name);

  useEffect(() => {
    fetch(`/api/search?q=${encodeURIComponent(creator.name)}&sort=newest&page=1`)
      .then(res => res.json())
      .then(data => setVideos((data.videos || []).slice(0, 4)))
      .catch(() => {});
  }, [creator.name]);

  const toggle = () => {
    try {
      const subs = readJSON('xhub_subscriptions', []);
      if (following) {
        writeJSON(
          'xhub_subscriptions',
          subs.filter(s => String(s).toLowerCase() !== creator.id.toLowerCase())
        );
      } else {
        writeJSON('xhub_subscriptions', [...subs, creator.name]);
      }
    } catch {}
    setFollowing(!following);
    syncFollow(getUid(), creator.id, creator.name, following ? 'unfollow' : 'follow');
  };

  if (!following) return null;

  return (
    <section className="following-creator-block">
      <div className="following-creator-head">
        <Link href={`/creators/${slug}`} className="following-creator-id">
          <img
            src={getInitialAvatar(creator.name)}
            alt={creator.name}
            className="following-creator-avatar"
            loading="lazy"
          />
          <span className="following-creator-name">{creator.name}</span>
        </Link>
        <button
          onClick={toggle}
          className={`subscribe-btn ${following ? 'subscribed' : ''}`}
        >
          {following ? 'Following' : 'Follow'}
        </button>
      </div>
      {videos.length > 0 ? (
        <div className="dense-video-grid">
          {videos.map(v => (
            <VideoCard key={v.vkey || v.id} video={v} />
          ))}
        </div>
      ) : (
        <p className="following-empty-videos">No recent videos found.</p>
      )}
    </section>
  );
}

export default function FollowingPage() {
  const [creators, setCreators] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      let server = [];
      try {
        const res = await fetch(`/api/follows?uid=${encodeURIComponent(getUid())}`);
        const data = await res.json().catch(() => null);
        if (data?.ok && Array.isArray(data.creators)) server = data.creators;
      } catch {}
      // localStorage (xhub_subscriptions) stays the source of truth
      setCreators(mergeCreators(server, readJSON('xhub_subscriptions', [])));
      setLoaded(true);
    })();
  }, []);

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        <div className="page-heading-row">
          <h1 className="page-title">Following</h1>
          <p className="page-subtitle">
            Creators you follow — newest uploads from each, all on this device.
          </p>
        </div>

        {!loaded ? (
          <div className="following-loading">Loading…</div>
        ) : creators.length === 0 ? (
          <div className="following-empty">
            <UserIcon size={40} />
            <p>You aren&apos;t following anyone yet.</p>
            <Link href="/creators" className="filter-pill-btn active" style={{ marginTop: '1rem', display: 'inline-block', padding: '0.6rem 1.5rem' }}>
              Browse creators
            </Link>
          </div>
        ) : (
          creators.map(c => <CreatorRow key={c.id} creator={c} />)
        )}
      </main>
      <Footer />
    </>
  );
}
