import { getVideo } from '@/lib/videos';
import WatchClient from '@/components/WatchClient';

export async function generateMetadata({ params }) {
  const { vkey } = await params;
  try {
    const video = await getVideo(vkey);
    if (!video) {
      return {
        title: 'Video Unavailable — XHUB',
        description: 'The requested video is unavailable on XHUB.',
      };
    }

    const title = `${video.title} — XHUB`;
    const description = video.description || `Watch ${video.title} in HD quality on XHUB.`;
    const imageUrl = video.thumbSrcset?.['1280'] || video.thumb;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'video.other',
        images: imageUrl ? [{ url: imageUrl, width: 1280, height: 720 }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: imageUrl ? [imageUrl] : [],
      },
    };
  } catch (e) {
    return {
      title: 'XHUB — Premium Video Streaming',
    };
  }
}

export default async function WatchPage({ params }) {
  const { vkey } = await params;
  let initialVideo = null;
  let initialError = null;

  try {
    initialVideo = await getVideo(vkey);
    if (!initialVideo) {
      initialError = 'Video not found or streaming unavailable';
    }
  } catch (err) {
    initialError = err.message || 'Video not found or streaming unavailable';
  }

  return (
    <WatchClient
      vkey={vkey}
      initialVideo={initialVideo}
      initialError={initialError}
    />
  );
}
