import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account Suspended',
  description: 'Your DASHR account has been suspended. Submit an appeal to have it reviewed.',
  robots: { index: false, follow: false },
};

export default function BannedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
