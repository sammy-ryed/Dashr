import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Learn how DASHR collects, uses, and protects your personal data. We are committed to transparency and the security of SRM student information.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Privacy Policy | DASHR',
    description:
      'Read the DASHR Privacy Policy to understand how your data is handled on our SRM campus delivery platform.',
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
