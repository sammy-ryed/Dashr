import './globals.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Courier_Prime } from 'next/font/google';
import ThemeBootstrap from '@/components/ThemeBootstrap';
import { getThemeBootstrapScript } from '@/lib/theme-preferences';

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
    default: 'DASHR — Campus Delivery for SRM Students',
    template: '%s | DASHR',
  },
  description:
    'DASHR is a student-run delivery service at SRM IST. Order food, stationery, or anything on campus and have a fellow student drop it to your hostel room.',
  keywords: ['SRM delivery', 'campus delivery', 'SRM IST', 'hostel delivery', 'DASHR', 'SRM food delivery'],
  authors: [{ name: 'DASHR' }],
  // Canonical URL — tells Google the definitive address for this page
  alternates: {
    canonical: APP_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: APP_URL,
    siteName: 'DASHR',
    title: 'DASHR — Campus Delivery for SRM Students',
    description:
      'Order anything on or around SRM IST campus and a verified student dasher will deliver it to your hostel room.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'DASHR — SRM Campus Delivery',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DASHR — Campus Delivery for SRM Students',
    description:
      'Order from anywhere on SRM campus and get it delivered to your hostel door by a fellow student.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  icons: [
    { rel: 'icon', url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    { rel: 'icon', url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    { rel: 'apple-touch-icon', url: '/apple-touch-icon.png', sizes: '180x180' },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DASHR',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'msapplication-TileColor': '#0f0f0f',
    'msapplication-config': '/browserconfig.xml',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f0f0f',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={courierPrime.variable}>
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: getThemeBootstrapScript(),
          }}
        />
        <ThemeBootstrap />
        {children}
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
