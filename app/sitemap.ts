import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dashr.app';

// Update these dates only when the respective page content actually changes.
// Using new Date() would incorrectly signal a modification on every deploy,
// wasting Google's crawl budget.
const LAST_MODIFIED = {
  home:         new Date('2026-04-19'),
  login:        new Date('2026-04-19'),
  legal:        new Date('2026-04-01'),
};

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      // / redirects to /login or /order — still worth indexing as the root
      url: `${APP_URL}/`,
      lastModified: LAST_MODIFIED.home,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      // Primary entry point — where users land and sign up
      url: `${APP_URL}/login`,
      lastModified: LAST_MODIFIED.login,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${APP_URL}/privacy`,
      lastModified: LAST_MODIFIED.legal,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${APP_URL}/terms`,
      lastModified: LAST_MODIFIED.legal,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${APP_URL}/refund-policy`,
      lastModified: LAST_MODIFIED.legal,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];
}

