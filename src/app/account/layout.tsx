import { requireUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured()) await requireUser('/account');
  return children;
}
