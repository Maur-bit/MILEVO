import type { Metadata } from 'next';
import { AccountView } from '@/components/account/AccountView';

export const metadata: Metadata = { title: 'My Account' };

export default function AccountPage() {
  return <AccountView defaultTab="saved" />;
}
