import type { Metadata } from 'next';
import { AccountView } from '@/components/account/AccountView';

export const metadata: Metadata = { title: 'Saved Products' };

export default function AccountSavedPage() {
  return <AccountView defaultTab="saved" />;
}
