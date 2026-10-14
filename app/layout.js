export const metadata = { title: 'XHUB', description: 'Video streaming' };
export default function RootLayout({ children }) {
  return <html lang="en"><body style={{ margin: 0, background: '#000' }}>{children}</body></html>;
}
