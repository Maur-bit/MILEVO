import Image from 'next/image';
import Link from 'next/link';
import { HeroSearch } from '@/components/home/HeroSearch';
import { DealCard } from '@/components/product/ProductCard';
import { StoreCard } from '@/components/product/StoreCard';
import { Icon } from '@/components/ui/Icon';
import { HomeDataNotice } from '@/components/shared/HomeDataNotice';
import { CATEGORIES } from '@/data/seedData';
import { formatGHS } from '@/lib/utils';
import { captureError } from '@/lib/monitoring';
import { getDeals, getStores, searchProducts } from '@/services/products';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compare before you buy',
  description: "Find products, compare live prices across Ghana's stores, and see where to shop.",
  alternates: { canonical: '/' },
};

const benefits = [
  { icon: 'circle-dollar', title: 'Compare prices', text: 'See offers from multiple stores in one clear view.' },
  { icon: 'bar-chart', title: 'Track price history', text: 'Use price trends to shop at the right moment.' },
  { icon: 'shield', title: 'Shop with confidence', text: 'Review store details and offer availability before you go.' },
  { icon: 'refresh', title: 'Save time', text: 'Skip the tab-hopping and find a better deal faster.' },
] as const;

const steps = [
  ['01', 'Search', 'Find the product you want by name, brand, or model.'],
  ['02', 'Compare', 'See current prices and offers from different stores.'],
  ['03', 'Choose', 'Pick the offer that works for you and shop with confidence.'],
];

export default async function HomePage() {
  const [trendingResult, dealsResult, storesResult] = await Promise.allSettled([
    searchProducts({}),
    getDeals(),
    getStores(),
  ]);
  const failedSources = [
    ['products', trendingResult],
    ['deals', dealsResult],
    ['stores', storesResult],
  ] as const;
  for (const [source, result] of failedSources) {
    if (result.status === 'rejected') {
      captureError(result.reason, { route: '/', source });
    }
  }

  const trending = trendingResult.status === 'fulfilled' ? trendingResult.value : [];
  const deals = dealsResult.status === 'fulfilled' ? dealsResult.value : [];
  const stores = storesResult.status === 'fulfilled' ? storesResult.value : [];
  const hasLoadError = failedSources.some(([, result]) => result.status === 'rejected');

  const visualProducts = trending.filter((product) => product.stores > 0).slice(0, 4);

  return (
    <div className="overflow-hidden">
      {hasLoadError && <div className="px-4 pt-5 md:px-6"><HomeDataNotice /></div>}
      <section className="relative isolate bg-milevo-bg px-4 py-12 md:px-6 md:py-16 lg:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full bg-orange-200/30 blur-3xl dark:bg-orange-500/10" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3.5 py-2 text-xs font-semibold tracking-wide text-milevo-primary shadow-sm dark:border-orange-900 dark:bg-white/5">
              <span className="h-1.5 w-1.5 rounded-full bg-milevo-primary" />
              Compare <span aria-hidden="true">·</span> Save <span aria-hidden="true">·</span> Shop smarter
            </p>
            <h1 className="max-w-[13ch] font-display text-4xl font-extrabold leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">
              Find the best price before you buy.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-milevo-muted sm:text-lg">
              Compare products and prices from stores across Ghana, all in one place.
            </p>
            <div className="mt-8 max-w-2xl">
              <HeroSearch />
              <p className="mt-3 text-xs text-milevo-muted">Search by product, brand, model, or browse a category.</p>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-milevo-muted">
              <span className="inline-flex items-center gap-2"><Icon name="check" size={16} className="text-milevo-success" />Compare store offers</span>
              <span className="inline-flex items-center gap-2"><Icon name="check" size={16} className="text-milevo-success" />Explore price history</span>
            </div>
          </div>

          <div className="relative mx-auto grid w-full max-w-xl grid-cols-2 gap-3 sm:gap-4">
            {visualProducts.map((product, index) => (
              <Link
                key={product.slug}
                href={`/product/${product.slug}`}
                className={`group relative overflow-hidden rounded-2xl border border-milevo-border bg-white p-3 shadow-[0_12px_36px_-24px_rgba(30,25,20,0.32)] transition-transform duration-200 hover:-translate-y-1 dark:bg-milevo-white sm:p-4 ${visualProducts.length === 1 ? 'col-span-2 mx-auto w-2/3 max-w-[22rem]' : ''} ${visualProducts.length === 3 && index === 2 ? 'col-span-2 mx-auto w-1/2' : ''} ${index === 1 && visualProducts.length > 1 ? 'mt-7' : ''} ${index === 2 && visualProducts.length > 2 ? '-mt-5' : ''}`}
              >
                <div className="relative mb-3 aspect-[1.25] overflow-hidden rounded-xl bg-[#fff4ea] dark:bg-[#242424]">
                  {product.images?.[0] ? (
                    <Image
                      src={product.images[0].url}
                      alt={product.images[0].altText || product.name}
                      fill
                      unoptimized
                      sizes="(max-width: 639px) 42vw, 260px"
                      className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-milevo-muted">
                      <Icon name="package" size={32} />
                    </span>
                  )}
                </div>
                <p className="line-clamp-1 text-xs font-medium text-milevo-muted">{product.brand}</p>
                <p className="mt-1 line-clamp-2 min-h-10 text-sm font-semibold leading-5">{product.name}</p>
                <p className="mt-2 text-sm font-bold">{formatGHS(product.price)}</p>
              </Link>
            ))}
            {!visualProducts.length && (
              <div className="col-span-2 flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-milevo-border bg-white/70 text-milevo-muted dark:bg-white/5">
                <div className="text-center">
                  <Icon name="package" size={32} className="mx-auto mb-2" />
                  <p className="text-sm">{trendingResult.status === 'rejected' ? 'Product listings are temporarily unavailable.' : 'Product listings will appear here as the catalog grows.'}</p>
                </div>
              </div>
            )}
            <div aria-hidden="true" className="absolute -bottom-8 -right-8 -z-10 h-36 w-36 rounded-full border-[18px] border-orange-100 dark:border-orange-950/60" />
          </div>
        </div>
      </section>

      <section className="px-4 py-14 md:px-6 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-milevo-primary">Explore</p>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Popular categories</h2>
              <p className="mt-2 text-sm text-milevo-muted sm:text-base">Browse top categories and find great deals on your favorite products.</p>
            </div>
            <Link href="/category/all" className="inline-flex items-center gap-1 text-sm font-semibold text-milevo-primary hover:underline">
              Browse all <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            {CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={`/search?category=${encodeURIComponent(category.slug)}`}
                className="group flex min-h-32 items-center gap-4 rounded-2xl border border-milevo-border bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-milevo-primary dark:bg-white/[0.03] sm:min-h-36 sm:flex-col sm:items-start sm:justify-between"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-milevo-primary transition-colors group-hover:bg-orange-100 dark:bg-orange-950/40 dark:group-hover:bg-orange-950/70">
                  <Icon name={category.icon} size={23} />
                </span>
                <span className="text-sm font-semibold sm:text-base">{category.name}</span>
                <Icon name="arrow-right" size={16} className="ml-auto text-milevo-muted group-hover:text-milevo-primary sm:hidden" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-milevo-bg px-4 py-14 md:px-6 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-milevo-primary">Worth a look</p>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Featured deals</h2>
              <p className="mt-2 text-sm text-milevo-muted sm:text-base">Top products. Better prices. Compare offers from stores.</p>
            </div>
            <Link href="/deals" className="inline-flex items-center gap-1 text-sm font-semibold text-milevo-primary hover:underline">
              View all deals <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          {deals.length ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {deals.slice(0, 4).map((product) => <DealCard key={product.slug} product={product} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-milevo-border bg-white p-7 text-center dark:bg-white/[0.03]">
              <p className="font-semibold">{dealsResult.status === 'rejected' ? 'Featured deals are temporarily unavailable.' : 'No qualifying price drops right now.'}</p>
              <p className="mt-1 text-sm text-milevo-muted">{dealsResult.status === 'rejected' ? 'Please try again in a moment.' : 'Browse the catalog to compare current store offers.'}</p>
              <Link href="/search" className="mt-4 inline-flex min-h-touch items-center justify-center rounded-lg bg-milevo-primary px-4 text-sm font-semibold text-[#171717] hover:bg-[#ff8a3d] dark:hover:bg-[#ff9a52]">Explore products</Link>
            </div>
          )}
        </div>
      </section>

      <section className="px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-milevo-primary">Why Milevo</p>
            <h2 className="max-w-[12ch] font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Smarter shopping starts here.</h2>
            <p className="mt-4 max-w-lg leading-7 text-milevo-muted">
              Milevo brings product offers and price context together, helping you make a more informed choice before you shop.
            </p>
            <Link href="/about" className="mt-6 inline-flex min-h-touch items-center gap-2 font-semibold text-milevo-primary hover:underline">
              Learn about Milevo <Icon name="arrow-right" size={17} />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <article key={benefit.title} className="rounded-2xl border border-milevo-border bg-white p-5 dark:bg-white/[0.03] sm:p-6">
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-milevo-primary dark:bg-orange-950/40">
                  <Icon name={benefit.icon} size={21} />
                </span>
                <h3 className="font-semibold">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-milevo-muted">{benefit.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-milevo-border bg-white px-4 py-14 dark:bg-white/[0.02] md:px-6 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-9 max-w-2xl text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-milevo-primary">Simple by design</p>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">How Milevo works</h2>
            <p className="mt-2 text-sm text-milevo-muted sm:text-base">Three steps to a more informed purchase.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map(([number, title, text], index) => (
              <article key={number} className="relative rounded-2xl border border-milevo-border bg-milevo-bg p-5 dark:bg-white/[0.03] sm:p-6">
                {index < steps.length - 1 && <span aria-hidden="true" className="absolute -right-3 top-1/2 z-10 hidden h-px w-6 bg-milevo-border md:block" />}
                <span className="font-display text-sm font-bold tracking-widest text-milevo-primary">{number}</span>
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-milevo-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {stores.length > 0 && (
        <section className="px-4 py-14 md:px-6 md:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-7 flex items-end justify-between">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-milevo-primary">Shop local</p>
                <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Popular stores</h2>
                <p className="mt-2 text-sm text-milevo-muted sm:text-base">Explore merchants with offers on Milevo.</p>
              </div>
            </div>
            <div className="card-row">
              {stores.slice(0, 8).map((store) => <StoreCard key={store.slug} store={store} />)}
            </div>
          </div>
        </section>
      )}

      <section className="px-4 pb-14 md:px-6 md:pb-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-3xl bg-milevo-primary px-6 py-9 text-[#171717] sm:px-10 sm:py-12 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#171717]/75">Make your next purchase count</p>
            <h2 className="mt-2 max-w-xl font-display text-2xl font-bold tracking-tight sm:text-3xl">Ready to find a better price?</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#171717]/85 sm:text-base">Start with a product search and compare available offers across stores.</p>
          </div>
          <Link href="/search" className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-lg bg-white px-5 font-semibold text-milevo-text transition-colors hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            Start comparing <Icon name="arrow-right" size={17} />
          </Link>
        </div>
      </section>
    </div>
  );
}
