import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-milevo-primary">404 · Page not found</p>
      <h1 className="mt-2 font-display text-3xl">We couldn&apos;t find that page.</h1>
      <p className="mt-3 text-milevo-muted">The link may be outdated, or the page may have moved.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="inline-flex min-h-touch items-center justify-center rounded-md bg-milevo-primary px-4 py-2 text-sm font-semibold text-[#171717] hover:bg-[#ff8a3d] dark:hover:bg-[#ff9a52]">Go to home</Link>
        <Link href="/search" className="inline-flex min-h-touch items-center justify-center rounded-md border border-milevo-border bg-milevo-white px-4 py-2 text-sm font-semibold hover:bg-milevo-bg">Search products</Link>
      </div>
    </section>
  );
}
