import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Read the DASHR Terms of Service. Understand your rights and responsibilities as a Customer or Dasher on our SRM campus delivery platform.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Terms of Service | DASHR',
    description:
      'The rules that govern use of DASHR — the student-run delivery platform at SRM IST.',
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
