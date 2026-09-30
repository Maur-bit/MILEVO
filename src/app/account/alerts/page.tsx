import type { Metadata } from 'next';
import { AccountView } from '@/components/account/AccountView';

export const metadata: Metadata = { title: 'Price Alerts' };

export default function AccountAlertsPage() {
  return <AccountView defaultTab="alerts" />;
}
