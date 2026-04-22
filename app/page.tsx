import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getUserSafe } from '@/lib/auth';
import LandingClient from './landing/LandingClient';

export { metadata } from './landing/page';

export default async function Home() {
  const supabase = await createClient();
  const user = await getUserSafe(supabase);

  // Unauthenticated → show landing page
  if (!user) {
    return <LandingClient />;
  }

  // Authenticated → redirect based on role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'admin') redirect('/admin');
  if (profile?.role === 'agent') redirect('/agent/dashboard');
  redirect('/order');
}
