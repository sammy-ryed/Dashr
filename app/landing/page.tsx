import type { Metadata } from 'next';
import LandingClient from './LandingClient';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dashr.app';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: 'DASHR',
  description:
    'Too lazy to walk? DASHR delivers anything on SRM campus to your hostel room, powered by fellow students who actually need money. No cap.',
  keywords: [
    'SRM delivery', 'SRM IST delivery', 'campus delivery', 'hostel delivery',
    'DASHR', 'SRM food delivery', 'SRM campus app', 'student delivery service',
    'SRM Kattankulathur', 'deliver to hostel',
  ],
  authors: [{ name: 'DASHR Team' }],
  alternates: { canonical: `${APP_URL}/` },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: `${APP_URL}/`,
    siteName: 'DASHR',
    title: 'DASHR',
    description: 'Order literally anything on SRM campus and a verified student will deliver it to your hostel room.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'DASHR — SRM Campus Delivery' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@dashr_srm',
    creator: '@dashr_srm',
    title: 'DASHR',
    description: 'Order anything on SRM campus. Fellow students deliver it. No cap.',
    images: ['/og-image.png'],
  },
  other: {
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:type': 'image/png',
  },
};


export default function LandingPage() {
  return <LandingClient />;
}
