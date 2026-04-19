import './globals.css';
import type { Metadata, Viewport } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dashr.app';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
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
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f0f0f',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DASHR" />
        <meta name="application-name" content="DASHR" />
        <meta name="msapplication-TileColor" content="#0f0f0f" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="shortcut icon" type="image/png" href="/favicon-32x32.png" />
        {/* Google Fonts — preload to avoid render block */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap"
        />

        <script
          async
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
