// src/services/affiliate.ts
export function buildGoUrl(storeSlug: string, offerId: string, sourcePage: string) {
  const params = new URLSearchParams({ src: sourcePage });
  return `/go/${storeSlug}/${offerId}?${params.toString()}`;
}

export function trackAffiliateClick({ slug, store }: { slug: string; store: string }) {
  if (typeof window === 'undefined') return;
  try {
    const key = 'milevo_affiliate_clicks_demo';
    const clicks = JSON.parse(localStorage.getItem(key) || '[]');
    clicks.push({ slug, store, at: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(clicks));
  } catch { /* demo counter only — never load-bearing */ }
}
