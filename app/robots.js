export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: 'https://xhub-rouge.vercel.app/sitemap.xml',
  };
}
