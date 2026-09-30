'use client';

import { usePathname } from 'next/navigation';
import { MobileBottomNav } from './MobileBottomNav';

export function ConditionalBottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith('/merchant') || pathname.startsWith('/admin')) return null;
  return <MobileBottomNav />;
}
