import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith('/') && !params.next.startsWith('//') && !params.next.includes('\\')
    ? params.next
    : '/account';
  const notice = params.error === 'admin'
    ? 'This account does not have administrator access. Sign out and log in with an administrator account.'
    : params.error === 'confirmation'
      ? 'That confirmation link is invalid or has expired. Please request a new one.'
      : null;

  return <LoginForm nextPath={nextPath} notice={notice} />;
}
