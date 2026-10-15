import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import SectionFeedClient from '@/components/SectionFeedClient';
import { StarIcon } from '@/components/Icons';
import { getFeed } from '@/lib/videos';

export const revalidate = 900;

export const metadata = {
  title: 'Best & Top Rated Videos — XHUB',
  description: 'Highest community approval ratings and most viewed scenes worldwide on XHUB.',
};

export default async function BestVideosPage() {
  const feed = await getFeed('best', 1).catch(() => []);
  const initialVideos = Array.isArray(feed) ? feed : (feed?.videos || []);

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <StarIcon size={22} className="section-heading-icon" filled={true} />
            <span>Best & Top Rated Videos</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Highest community approval ratings and most viewed scenes worldwide
          </p>
        </div>

        <SectionFeedClient initialVideos={initialVideos} section="best" showFilters={true} />
      </main>
      <Footer />
    </>
  );
}
