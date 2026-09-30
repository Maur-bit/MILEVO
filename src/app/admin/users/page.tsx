import type { Metadata } from 'next';
import { UserManager } from './UserManager';

export const metadata: Metadata = { title: 'User management' };

export default function AdminUsersPage() {
  return <UserManager />;
}
