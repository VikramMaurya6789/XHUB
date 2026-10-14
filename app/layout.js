import './globals.css';

export const metadata = {
  title: 'XHUB — Premium Video Streaming',
  description: 'Fast, high-quality video streaming and trending categories.',
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
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2220%22 fill=%22%23ff6b00%22/><text y=%22.75em%22 x=%2250%%22 text-anchor=%22middle%22 font-size=%2255%22 font-weight=%22900%22 fill=%22white%22>X</text></svg>"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
