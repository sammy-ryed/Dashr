import type { Metadata } from 'next';
import LandingClient from './LandingClient';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dashr.app';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: 'DASHR — Campus Delivery by Students, for Students',
  description:
    'Too lazy to walk? DASHR delivers anything on campus to your hostel room — powered by fellow students who actually need money. Live at SRM Chennai and MAHE Bengaluru.',
  keywords: [
    // Brand
    'DASHR', 'DASHR app', 'campus delivery', 'hostel delivery', 'student delivery service',
    // SRM / Chennai
    'SRM delivery', 'SRM IST delivery', 'SRM food delivery', 'SRM campus app',
    'SRM Kattankulathur', 'DASHR Chennai', 'campus delivery Chennai', 'deliver to hostel SRM',
    // MAHE / Bengaluru
    'MAHE delivery', 'MAHE Bengaluru delivery', 'Manipal Bengaluru delivery',
    'DASHR Bangalore', 'DASHR Bengaluru', 'campus delivery Bangalore',
    'hostel delivery MAHE', 'Yelahanka campus delivery',
  ],
  authors: [{ name: 'DASHR Team' }],
  alternates: { canonical: `${APP_URL}/` },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: `${APP_URL}/`,
    siteName: 'DASHR',
    title: 'DASHR — Campus Delivery by Students',
    description: 'Order literally anything on campus and a verified student will deliver it to your hostel room. Live at SRM Chennai & MAHE Bengaluru.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'DASHR — Campus Delivery' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@dashr_app',
    creator: '@dashr_app',
    title: 'DASHR — Campus Delivery',
    description: 'Order anything on campus. Fellow students deliver it. SRM Chennai & MAHE Bengaluru.',
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
