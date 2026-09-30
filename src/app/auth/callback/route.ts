import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function safeNextPath(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value
    : '/account';
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const nextPath = safeNextPath(url.searchParams.get('next'));

  if (!code) {
    url.pathname = '/login';
    url.search = new URLSearchParams({ error: 'confirmation' }).toString();
    return NextResponse.redirect(url);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    url.pathname = '/login';
    url.search = new URLSearchParams({ error: 'confirmation' }).toString();
    return NextResponse.redirect(url);
  }

  url.pathname = nextPath;
  url.search = '';
  return NextResponse.redirect(url);
}
