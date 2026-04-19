import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund & Dispute Policy',
  description:
    'Understand how disputes and refunds are handled on DASHR. Our peer-to-peer model and moderation guidelines explained clearly.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Refund & Dispute Policy | DASHR',
    description:
      'How DASHR handles order disputes, cancellations, and fraud on our SRM campus delivery platform.',
  },
};

export default function RefundPolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
