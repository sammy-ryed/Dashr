import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description:
    'Sign in to DASHR with your SRM email. Order from campus canteens, shops, and hostels, or become a dasher and earn while you study.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Sign In to DASHR',
    description:
      'SRM campus delivery powered by students. Sign in to place orders or start earning as a dasher.',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
