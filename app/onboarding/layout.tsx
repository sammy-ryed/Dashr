import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Set Up Your Account',
  description: 'Complete your DASHR profile to start placing orders or delivering on campus.',
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
