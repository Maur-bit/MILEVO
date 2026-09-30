'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SignOutButton } from './SignOutButton';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ThemeToggle } from './ThemeToggle';

export interface PortalNavItem {
  href?: string;
  label: string;
  icon: IconName;
  soon?: boolean;
}

export function PortalSidebar({ title, items, backHref = '/' }: { title: string; items: PortalNavItem[]; backHref?: string }) {
  const pathname = usePathname();
  return (
    <>
      <aside className="hidden w-[220px] shrink-0 bg-milevo-ink py-4 text-white md:block">
        <div className="flex items-center justify-between px-4 pb-4">
          <Link href="/" aria-label="Milevo home" className="inline-flex items-center gap-2 font-display text-lg font-extrabold">
            <Image src="/milevo-logo.png" alt="" width={36} height={36} />
            <span>Milevo</span>
          </Link>
          <ThemeToggle />
        </div>
        <div className="mb-3 border-b border-white/20 px-4 pb-4 text-xs text-gray-400">{title}</div>
        {items.map((item) => item.soon || !item.href ? (
          <span key={item.label} className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-600">
            <Icon name={item.icon} size={18} /> {item.label} <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-400">soon</span>
          </span>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            className={cn('flex items-center gap-2.5 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white',
              pathname === item.href && 'border-r-2 border-milevo-primary bg-milevo-primary/15 text-milevo-primary')}
          >
            <Icon name={item.icon} size={18} /> {item.label}
          </Link>
        ))}
        <Link href={backHref} className="mt-4 flex items-center gap-2.5 border-t border-white/20 px-4 py-3 text-sm text-gray-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-milevo-primary">
          <Icon name="arrow-left" size={18} /> Back to site
        </Link>
        <SignOutButton />
      </aside>
      <div className="flex items-center border-b border-milevo-border bg-milevo-ink md:hidden">
        <nav className="flex min-w-0 flex-1 overflow-x-auto">
          {items.filter((i) => i.href).map((item) => (
            <Link
              key={item.href}
              href={item.href!}
              className={cn('whitespace-nowrap px-4 py-3 text-sm text-gray-300', pathname === item.href && 'text-milevo-primary')}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="shrink-0 px-1"><ThemeToggle /></div>
      </div>
      <div className="border-b border-milevo-border bg-milevo-ink md:hidden">
        <SignOutButton />
      </div>
    </>
  );
}
