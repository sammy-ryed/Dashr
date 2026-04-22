import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dashr.app';

const LAST_MODIFIED = {
  landing:  new Date('2026-04-23'),
  login:    new Date('2026-04-19'),
  legal:    new Date('2026-04-01'),
};

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      // Public landing page — primary entry for unauthenticated users & Google crawl
      url: `${APP_URL}/`,
      lastModified: LAST_MODIFIED.landing,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      // Alternate landing route (canonical same as /)
      url: `${APP_URL}/landing`,
      lastModified: LAST_MODIFIED.landing,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${APP_URL}/login`,
      lastModified: LAST_MODIFIED.login,
      changeFrequency: 'monthly',
      priority: 0.8,
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
