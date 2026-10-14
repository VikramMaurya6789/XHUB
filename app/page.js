import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import VideoCard from '@/components/VideoCard';
import TrendingFeedClient from '@/components/TrendingFeedClient';
import {
  FlameIcon,
  SparklesIcon,
  StarIcon,
  UserIcon,
  ChevronRightIcon,
  FilmIcon
} from '@/components/Icons';
import { POPULAR_CATEGORIES, SPOTLIGHT_CREATORS, getFeed } from '@/lib/videos';

export const revalidate = 900;

export default async function HomePage() {
  const [hotData, trendData, newData, indianData] = await Promise.all([
    getFeed('hot', 1).catch(() => []),
    getFeed('trending', 1).catch(() => []),
    getFeed('new', 1).catch(() => []),
    getFeed('indian', 1).catch(() => []),
  ]);

  const featuredVideos = (Array.isArray(hotData) ? hotData : hotData?.videos || []).slice(0, 5);
  const trendingVideos = Array.isArray(trendData) ? trendData : trendData?.videos || [];
  const newVideos = (Array.isArray(newData) ? newData : newData?.videos || []).slice(0, 10);
  const indianVideos = (Array.isArray(indianData) ? indianData : indianData?.videos || []).slice(0, 5);

  return (
    <>
      <AgeGate />
      <Header />

      <main className="page-wrapper">
        {/* Section 1: Featured / Hot strip (§5.3) */}
        <section className="homepage-section">
          <div className="section-header-row">
            <h2 className="section-heading">
              <FlameIcon className="section-heading-icon" size={20} />
              <span>Featured & Hot Videos</span>
            </h2>
            <Link href="/best" className="section-view-all">
              <span>View all hot</span>
              <ChevronRightIcon size={16} />
            </Link>
          </div>

          <div className="dense-video-grid">
            {featuredVideos.map(video => (
              <VideoCard key={video.vkey || video.id} video={video} priority={true} />
            ))}
          </div>
        </section>

        {/* Section 2: Category chips quick-jump row (§5.3) */}
        <section className="homepage-section" style={{ marginTop: '2rem' }}>
          <div className="section-header-row">
            <h2 className="section-heading">
              <FilmIcon className="section-heading-icon" size={18} />
              <span>Popular Categories</span>
            </h2>
            <Link href="/categories" className="section-view-all">
              <span>View all categories</span>
              <ChevronRightIcon size={16} />
            </Link>
          </div>

          <div className="category-chips-scroll">
            {POPULAR_CATEGORIES.map(cat => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="category-chip"
              >
                <span>{cat.name}</span>
                {cat.count && <span className="category-chip-count">{cat.count}</span>}
              </Link>
            ))}
          </div>
        </section>

        {/* Section 3: Creators spotlight row (§5.3 & §5.8) */}
        <section className="homepage-section">
          <div className="section-header-row">
            <h2 className="section-heading">
              <UserIcon className="section-heading-icon" size={18} />
              <span>Spotlight Creators & Channels</span>
            </h2>
            <Link href="/creators" className="section-view-all">
              <span>Explore all creators</span>
              <ChevronRightIcon size={16} />
            </Link>
          </div>

          <div className="creators-spotlight-row">
            {SPOTLIGHT_CREATORS.map(creator => (
              <Link
                key={creator.slug}
                href={`/creators/${creator.slug}`}
                className="creator-spotlight-card"
              >
                <img
                  src={creator.avatar}
                  alt={creator.name}
                  className="creator-avatar"
                  loading="lazy"
                />
                <div>
                  <div className="creator-meta-name">
                    <span>{creator.name}</span>
                  </div>
                  <div className="creator-sub-count">
                    Verified Creator →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Section 4: Recommended / Trending dense 5-col grid (§5.3) */}
        <section className="homepage-section" style={{ marginTop: '2.5rem' }}>
          <div className="section-header-row">
            <h2 className="section-heading">
              <StarIcon className="section-heading-icon" size={19} filled={true} />
              <span>Recommended Trending Videos</span>
            </h2>
            <Link href="/best" className="section-view-all">
              <span>View best list</span>
              <ChevronRightIcon size={16} />
            </Link>
          </div>

          <TrendingFeedClient initialVideos={trendingVideos} />
        </section>

        {/* Section 5: "New" feed grid (§5.3) */}
        <section className="homepage-section" style={{ marginTop: '2.5rem' }}>
          <div className="section-header-row">
            <h2 className="section-heading">
              <SparklesIcon className="section-heading-icon" size={19} />
              <span>Latest New Releases</span>
            </h2>
            <Link href="/new" className="section-view-all">
              <span>All new releases</span>
              <ChevronRightIcon size={16} />
            </Link>
          </div>

          <div className="dense-video-grid">
            {newVideos.map(video => (
              <VideoCard key={video.vkey || video.id} video={video} />
            ))}
          </div>
        </section>

        {/* Section 6: Indian videos strip */}
        <section className="homepage-section" style={{ marginTop: '2.5rem' }}>
          <div className="section-header-row">
            <h2 className="section-heading">
              <FlameIcon className="section-heading-icon" size={19} />
              <span>Indian Videos</span>
            </h2>
            <Link href="/indian" className="section-view-all">
              <span>All Indian videos</span>
              <ChevronRightIcon size={16} />
            </Link>
          </div>

          <div className="dense-video-grid">
            {indianVideos.map(video => (
              <VideoCard key={video.vkey || video.id} video={video} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
