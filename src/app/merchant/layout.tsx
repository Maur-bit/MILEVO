import { PortalSidebar, type PortalNavItem } from '@/components/layout/PortalSidebar';
import { requireMerchant } from '@/lib/auth';
import { getMerchantContext } from '@/services/merchant';

const NAV = [
  { href: '/merchant', label: 'Dashboard', icon: 'dashboard' },
  { href: '/merchant/products', label: 'Products', icon: 'package' },
  { href: '/merchant/store-profile', label: 'Store Profile', icon: 'store' },
  { href: '/merchant/feeds', label: 'Feeds', icon: 'refresh' },
  { href: '/merchant/analytics', label: 'Analytics', icon: 'bar-chart' },
] satisfies PortalNavItem[];

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  await requireMerchant();
  const { stores } = await getMerchantContext();
  const title = stores.length ? `Merchant · ${stores.map((store) => store.name).join(', ')}` : 'Merchant';

  return (
    <div className="flex min-h-screen pb-0">
      <PortalSidebar title={title} items={NAV} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
