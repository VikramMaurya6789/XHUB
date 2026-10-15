import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import SectionFeedClient from '@/components/SectionFeedClient';
import SectionGrid from '@/components/SectionGrid';
import BecauseYouWatched from '@/components/BecauseYouWatched';
import {
  FlameIcon,
  SparklesIcon,
  StarIcon,
  UserIcon,
  ChevronRightIcon,
  FilmIcon,
  GlobeIcon
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
  const indianFeed = (Array.isArray(indianData) ? indianData : indianData?.videos || []);
  const indianVideos = indianFeed.slice(0, 5);

  // "Trending in India": curated geo section — deterministic top-viewed slice
  // of the Indian feed (all-time most watched), distinct from the newest-first
  // "Indian Videos" strip above.
  const numViews = v => {
    const n = v?.views;
    return typeof n === 'number' ? n : parseInt(String(n || '0').replace(/[^0-9]/g, ''), 10) || 0;
  };
  const trendingIndiaVideos = [...indianFeed]
    .sort((a, b) => numViews(b) - numViews(a))
    .slice(0, 12);

  return (
    <>
      <AgeGate />
      <Header />

      <main className="page-wrapper">
        {/* Section 1: Featured / Hot strip (§5.3) — shuffleable */}
        <SectionGrid
          title="Featured & Hot Videos"
          icon={<FlameIcon className="section-heading-icon" size={20} />}
          viewAllHref="/best"
          viewAllLabel="View all hot"
          videos={featuredVideos}
          priority={true}
        />

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

          <SectionFeedClient initialVideos={trendingVideos} section="trending" showShuffle={true} />
        </section>

        {/* Section 5: "New" feed grid (§5.3) — shuffleable */}
        <SectionGrid
          title="Latest New Releases"
          icon={<SparklesIcon className="section-heading-icon" size={19} />}
          viewAllHref="/new"
          viewAllLabel="All new releases"
          videos={newVideos}
          style={{ marginTop: '2.5rem' }}
        />

        {/* Section 6: Indian videos strip — shuffleable */}
        <SectionGrid
          title="Indian Videos"
          icon={<FlameIcon className="section-heading-icon" size={19} />}
          viewAllHref="/indian"
          viewAllLabel="All Indian videos"
          videos={indianVideos}
          style={{ marginTop: '2.5rem' }}
        />

        {/* Section 7: Trending in India — curated geo section (all-time most watched Indian videos) */}
        <section className="homepage-section" style={{ marginTop: '2.5rem' }}>
          <div className="section-header-row">
            <h2 className="section-heading">
              <GlobeIcon className="section-heading-icon" size={19} />
              <span>Trending in India</span>
            </h2>
            <Link href="/indian" className="section-view-all">
              <span>All Indian videos</span>
              <ChevronRightIcon size={16} />
            </Link>
          </div>

          <SectionFeedClient initialVideos={trendingIndiaVideos} section="indian" />
        </section>

        {/* Section 8: Because you watched — recommendations from watch history (hidden when empty) */}
        <BecauseYouWatched />
      </main>

      <Footer />
    </>
  );
}
