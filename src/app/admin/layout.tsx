import { PortalSidebar, type PortalNavItem } from '@/components/layout/PortalSidebar';
import { requireAdmin } from '@/lib/auth';

const NAV = [
  { href: '/admin', label: 'Overview', icon: 'dashboard' },
  { href: '/admin/users', label: 'Users', icon: 'users' },
  { href: '/admin/stores', label: 'Stores', icon: 'store' },
  { href: '/admin/merchant-applications', label: 'Merchant Applications', icon: 'users' },
  { href: '/admin/products', label: 'Products', icon: 'package' },
  { href: '/admin/categories', label: 'Categories', icon: 'tag' },
  { href: '/admin/matching', label: 'Product Matching', icon: 'link' },
  { href: '/admin/feeds', label: 'Feed Monitoring', icon: 'refresh' },
  { href: '/admin/reviews', label: 'Review Moderation', icon: 'shield' },
  { href: '/admin/reports', label: 'Problem Reports', icon: 'shield' },
  { href: '/admin/affiliate-analytics', label: 'Affiliate Analytics', icon: 'circle-dollar' },
] satisfies PortalNavItem[];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <PortalSidebar title="Admin" items={NAV} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
