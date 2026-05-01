import './globals.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Courier_Prime } from 'next/font/google';
import { headers } from 'next/headers';
import ThemeBootstrap from '@/components/ThemeBootstrap';
import { getThemeBootstrapScript } from '@/lib/theme-preferences';
import { CollegeProvider } from '@/lib/college-context';
import { getCollegeConfig } from '@/lib/colleges';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dashr.app';
const courierPrime = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-courier-prime',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  applicationName: 'DASHR',
  title: {
    default: 'DASHR',
    template: '%s | DASHR',
  },
  description:
    'DASHR is a student-run campus delivery platform. Order food, stationery, or anything on campus and have a verified student dasher drop it at your hostel room. No walking required.',
  authors: [{ name: 'DASHR Team' }],
  category: 'food delivery',
  alternates: { canonical: APP_URL },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: APP_URL,
    siteName: 'DASHR',
    title: 'DASHR',
    description: 'Order anything on campus and a verified student dasher will deliver it to your hostel room. No walking. No excuses.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'DASHR — Campus Delivery' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DASHR',
    description: 'Order anything on campus. Fellow students deliver it. No cap.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  icons: [
    { rel: 'icon', url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    { rel: 'icon', url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    { rel: 'apple-touch-icon', url: '/apple-touch-icon.png', sizes: '180x180' },
  ],
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'DASHR' },
  formatDetection: { telephone: false },
  other: {
    'msapplication-TileColor': '#0f0f0f',
    'msapplication-config': '/browserconfig.xml',
    'og:image:type': 'image/png',
    'og:image:width': '1200',
    'og:image:height': '630',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f0f0f',
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const slug = headersList.get('x-college-slug') ?? 'srm';
  const college = getCollegeConfig(slug);

  // JSON-LD structured data for location-based Google indexing
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `DASHR — ${college.fullName}`,
    description: college.seoDescription,
    url: APP_URL,
    image: `${APP_URL}/og-image.png`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: college.city,
      addressRegion: college.region,
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: college.geoPosition.split(';')[0],
      longitude: college.geoPosition.split(';')[1],
    },
    areaServed: {
      '@type': 'Place',
      name: college.fullName,
      address: {
        '@type': 'PostalAddress',
        addressLocality: college.city,
        addressRegion: college.region,
        addressCountry: 'IN',
      },
    },
    serviceType: 'Campus Delivery Service',
    priceRange: '₹20-₹100',
  };

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Location-based geo meta tags for Google indexing */}
        <meta name="geo.region" content={`IN-${college.region === 'Tamil Nadu' ? 'TN' : college.region === 'Karnataka' ? 'KA' : college.region}`} />
        <meta name="geo.placename" content={college.city} />
        <meta name="geo.position" content={college.geoPosition} />
        <meta name="ICBM" content={college.geoICBM} />
        <meta name="keywords" content={college.seoKeywords.join(', ')} />
      </head>
      <body className={courierPrime.variable}>
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: getThemeBootstrapScript() }}
        />
        <ThemeBootstrap />
        <CollegeProvider slug={slug}>
          {children}
        </CollegeProvider>
        {/* JSON-LD structured data — placed in body per Next.js docs recommendation */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
        <Script id="dashr-sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) {
              window.addEventListener('load', function () {
                navigator.serviceWorker.register('/sw.js').catch(function () {});
              });
            }`}
        </Script>
      </body>
    </html>
  );
}
