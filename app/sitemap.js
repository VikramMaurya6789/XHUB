import { POPULAR_CATEGORIES, SPOTLIGHT_CREATORS } from '@/lib/videos';

export default function sitemap() {
  const baseUrl = 'https://xhub-rouge.vercel.app';
  const now = new Date();

  const staticRoutes = [
    '',
    '/best',
    '/new',
    '/indian',
    '/shorts',
    '/categories',
    '/creators',
    '/channels',
    '/pornstars',
    '/celebrities',
    '/parental-controls',
    '/trust-safety',
    '/content-removal',
    '/terms',
    '/privacy',
    '/dmca',
    '/contact',
    '/2257',
  ].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: route === '' ? 1.0 : 0.8,
  }));

  const categoryRoutes = POPULAR_CATEGORIES.map(cat => ({
    url: `${baseUrl}/categories/${cat.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const creatorRoutes = SPOTLIGHT_CREATORS.map(creator => ({
    url: `${baseUrl}/creators/${creator.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...creatorRoutes];
}
