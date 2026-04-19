import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dashr.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/privacy', '/terms', '/refund-policy'],
        disallow: [
          '/admin',
          '/agent/',
          '/order/',
          '/orders',
          '/banned',
          '/onboarding',
          '/profile',
          '/api/',
          '/auth/',
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
