import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getUserSafe } from '@/lib/auth';

export default async function Home() {
  const supabase = await createClient();
  const user = await getUserSafe(supabase);

  if (!user) redirect('/login');

  // Fetch role and redirect appropriately
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'admin') redirect('/admin');
  if (profile?.role === 'agent') redirect('/agent/dashboard');
  redirect('/order');
}
