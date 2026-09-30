import Link from 'next/link';
import Image from 'next/image';
import { PrivacySettingsButton } from '@/components/privacy/PrivacySettingsButton';

export function Footer() {
  return (
    <footer className="bg-[#1b1b1b] px-4 py-12 text-white md:px-6 md:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-12">
          <div className="max-w-sm">
            <Link href="/" aria-label="Milevo home" className="inline-flex items-center gap-2 font-display text-xl font-extrabold">
              <Image src="/milevo-logo.png" alt="" width={36} height={36} className="h-9 w-9 object-contain" />
              <span>Milevo</span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-gray-400">
              Compare products and prices from stores across Ghana before you buy.
            </p>
          </div>
          <div className="space-y-2">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">Explore</h2>
            <Link href="/category/all" className="block text-sm text-gray-200 transition-colors hover:text-white">Categories</Link>
            <Link href="/deals" className="block text-sm text-gray-200 transition-colors hover:text-white">Deals</Link>
            <Link href="/price-drops" className="block text-sm text-gray-200 transition-colors hover:text-white">Price drops</Link>
            <Link href="/search" className="block text-sm text-gray-200 transition-colors hover:text-white">Search products</Link>
          </div>
          <div className="space-y-2">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">Milevo</h2>
            <Link href="/about" className="block text-sm text-gray-200 transition-colors hover:text-white">About</Link>
            <Link href="/help" className="block text-sm text-gray-200 transition-colors hover:text-white">Help center</Link>
            <Link href="/contact" className="block text-sm text-gray-200 transition-colors hover:text-white">Contact</Link>
            <Link href="/report" className="block text-sm text-gray-200 transition-colors hover:text-white">Report a problem</Link>
            <Link href="/merchant-apply" className="block text-sm text-gray-200 transition-colors hover:text-white">For merchants</Link>
          </div>
          <div className="space-y-2">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">Legal & privacy</h2>
            <Link href="/privacy" className="block text-sm text-gray-200 transition-colors hover:text-white">Privacy</Link>
            <Link href="/terms" className="block text-sm text-gray-200 transition-colors hover:text-white">Terms</Link>
            <PrivacySettingsButton />
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-5">
          <p className="max-w-4xl text-xs leading-5 text-gray-400">
            Some retailer links may be affiliate links, and Milevo may receive compensation from qualifying actions.
            Prices and availability may change on the retailer&apos;s website.
          </p>
          <p className="mt-4 text-xs text-gray-500">© {new Date().getFullYear()} Milevo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
