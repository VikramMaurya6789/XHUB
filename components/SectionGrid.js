'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import VideoCard from '@/components/VideoCard';
import { ChevronRightIcon, ShuffleIcon } from '@/components/Icons';
import { filterDiscoveryVideos, shuffleArray, useDiscoveryVersion } from '@/lib/discovery';

/**
 * Homepage video section: title row with a shuffle button + discovery-filtered
 * video grid. Shuffle uses Fisher-Yates over the current (filtered) list.
 */
export default function SectionGrid({
  title,
  icon = null,
  viewAllHref = null,
  viewAllLabel = null,
  videos = [],
  priority = false,
  style = null,
}) {
  const version = useDiscoveryVersion();
  const [shuffled, setShuffled] = useState(null);

  // Reset to original order when the server-provided list changes.
  useEffect(() => {
    setShuffled(null);
  }, [videos]);

  const shown = useMemo(() => {
    const base = shuffled || videos;
    return filterDiscoveryVideos(base);
  }, [shuffled, videos, version]);

  const handleShuffle = () => {
    setShuffled(shuffleArray(filterDiscoveryVideos(videos)));
  };

  return (
    <section className="homepage-section" style={style}>
      <div className="section-header-row">
        <h2 className="section-heading">
          {icon}
          <span>{title}</span>
          <button
            type="button"
            onClick={handleShuffle}
            className="section-shuffle-btn"
            title="Shuffle this section"
            aria-label={`Shuffle ${title}`}
          >
            <ShuffleIcon size={14} />
            <span>Shuffle</span>
          </button>
        </h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="section-view-all">
            <span>{viewAllLabel}</span>
            <ChevronRightIcon size={16} />
          </Link>
        )}
      </div>

      <div className="dense-video-grid">
        {shown.map(video => (
          <VideoCard key={video.vkey || video.id} video={video} priority={priority} />
        ))}
      </div>
    </section>
  );
}
