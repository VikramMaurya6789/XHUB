'use client';
import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

export default function Player({ streams, embedUrl, poster, title }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [useEmbed, setUseEmbed] = useState(!streams?.length && Boolean(embedUrl));
  const [isLoading, setIsLoading] = useState(true);

  // Default direct URL if streams provided
  const directUrl = (() => {
    if (!streams?.length) return null;
    return (
      streams.find(s => String(s.quality) === '720') ||
      streams.find(s => String(s.quality) === '480') ||
      streams[0]
    )?.url;
  })();

  useEffect(() => {
    if (useEmbed) {
      setIsLoading(false);
      return;
    }

    const video = videoRef.current;
    if (!video || !directUrl) {
      if (embedUrl) setUseEmbed(true);
      return;
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = directUrl.includes('.m3u8');
    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false });
      hlsRef.current = hls;
      hls.loadSource(directUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => setIsLoading(false));
      hls.on(Hls.Events.ERROR, () => {
        // Fallback to embed if HLS stream errors
        if (embedUrl) setUseEmbed(true);
      });
    } else {
      video.src = directUrl;
      video.onloadeddata = () => setIsLoading(false);
      video.onerror = () => {
        if (embedUrl) setUseEmbed(true);
      };
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [directUrl, useEmbed, embedUrl]);

  return (
    <div className="player-wrapper">
      {useEmbed || !directUrl ? (
        <iframe
          src={embedUrl}
          title={title || 'Video Player'}
          className="player-iframe"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      ) : (
        <video
          ref={videoRef}
          poster={poster}
          controls
          playsInline
          className="hls-video-element"
        />
      )}
    </div>
  );
}
