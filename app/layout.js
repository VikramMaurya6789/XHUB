import './globals.css';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import { MiniPlayerProvider } from '@/components/MiniPlayerProvider';
import OfflineBanner from '@/components/OfflineBanner';
import ParentalGate from '@/components/ParentalGate';

export const metadata = {
  title: 'XHUB — Premium Video Streaming',
  description: 'Fast, high-quality video streaming and trending categories.',
  other: {
    rating: 'RTA-5042-1996-1400-1577-RTA',
    RATING: 'RTA-5042-1996-1400-1577-RTA',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a0a0c',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="RATING" content="RTA-5042-1996-1400-1577-RTA" />
        {/* PWA */}
        <meta name="theme-color" content="#0a0a0c" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="XHUB" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2220%22 fill=%22%23ff6b00%22/><text y=%22.75em%22 x=%2250%%22 text-anchor=%22middle%22 font-size=%2255%22 font-weight=%22900%22 fill=%22white%22>X</text></svg>"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(!document.cookie.includes('xhub_age_ok=1')&&localStorage.getItem('xhub_age_ok')!=='1'){document.documentElement.classList.add('age-gate-pending');}}catch(e){}`,
          }}
        />
      </head>
      <body>
        <ServiceWorkerRegister />
        <OfflineBanner />
        <ParentalGate />
        <MiniPlayerProvider>{children}</MiniPlayerProvider>
      </body>
    </html>
  );
}
