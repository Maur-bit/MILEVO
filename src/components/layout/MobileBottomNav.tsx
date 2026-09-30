'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Icon, type IconName } from '@/components/ui/Icon';

const ITEMS = [
  { href: '/', icon: 'home', label: 'Home' },
  { href: '/search', icon: 'search', label: 'Search' },
  { href: '/deals', icon: 'tag', label: 'Deals' },
  { href: '/account/saved', icon: 'heart', label: 'Saved' },
  { href: '/account', icon: 'user', label: 'Account' },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-milevo-border bg-white pb-[env(safe-area-inset-bottom,0px)]">
      {ITEMS.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn('flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] min-h-touch transition-colors hover:bg-milevo-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-milevo-primary', active ? 'text-milevo-primary' : 'text-milevo-muted')}
          >
            <Icon name={item.icon as IconName} size={20} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
