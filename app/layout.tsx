import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DASHR — SRM Campus Delivery',
  description: 'Student-run hyperlocal delivery for SRM IST hostels. Order from anywhere on campus.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
