import { MetadataRoute } from 'next';

const locales = ['fr', 'en', 'es', 'pt', 'ar', 'de', 'zh'];
const host = 'https://transconnekt.com';

const routes = [
  '',
  '/services',
  '/how-it-works',
  '/why-us',
  '/testimonials',
  '/contact',
  '/fleet',
  '/offers'
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.flatMap((route) =>
    locales.map((locale) => {
      const url = `${host}/${locale}${route}`;
      return {
        url,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1.0 : 0.8,
      };
    })
  );
}
