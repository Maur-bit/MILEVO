import type { Metadata } from 'next';
import { AccountView } from '@/components/account/AccountView';

export const metadata: Metadata = { title: 'My Reviews' };

export default function AccountReviewsPage() {
  return <AccountView defaultTab="reviews" />;
}
