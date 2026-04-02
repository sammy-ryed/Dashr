import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'DASHR — SRM Campus Delivery',
  description: 'Student-run hyperlocal delivery for SRM IST hostels. Order from anywhere on campus — a fellow student picks it up and drops it at your door.',
  keywords: ['SRM', 'delivery', 'campus', 'food delivery', 'hostel', 'DASHR'],
  authors: [{ name: 'DASHR Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f0f0f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
