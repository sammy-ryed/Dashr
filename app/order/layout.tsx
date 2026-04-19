import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Place an Order',
  description:
    'Order food, stationery, or anything from around SRM campus. Set your pickup spot, commission, and a dasher will handle the rest.',
  robots: { index: false, follow: false },
};

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
