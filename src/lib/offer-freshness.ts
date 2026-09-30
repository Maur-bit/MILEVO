export function offerFreshness(checkedAt: string, now = Date.now()): { label: string; stale: boolean } {
  const timestamp = Date.parse(checkedAt);
  if (!Number.isFinite(timestamp)) {
    if (/^(just now|\d+\s+(minute|hour|day)s?\s+ago)$/i.test(checkedAt)) {
      return { label: `Checked ${checkedAt}`, stale: /\bday/i.test(checkedAt) };
    }
    return { label: 'Last check time unavailable', stale: true };
  }

  const elapsed = now - timestamp;
  if (elapsed < -5 * 60_000) return { label: 'Last check time unavailable', stale: true };
  if (elapsed >= 24 * 60 * 60_000) {
    const days = Math.floor(elapsed / (24 * 60 * 60_000));
    const hours = Math.floor((elapsed % (24 * 60 * 60_000)) / (60 * 60_000));
    const age = days ? `${days} day${days === 1 ? '' : 's'}` : `${hours} hour${hours === 1 ? '' : 's'}`;
    return { label: `Potentially stale — last checked ${age} ago`, stale: true };
  }
  if (elapsed < 60_000) return { label: 'Checked just now', stale: false };
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return { label: `Checked ${minutes} minute${minutes === 1 ? '' : 's'} ago`, stale: false };
  const hours = Math.floor(minutes / 60);
  return { label: `Checked ${hours} hour${hours === 1 ? '' : 's'} ago`, stale: false };
}

export function bestKnownOfferId(
  offers: { offerId: string; total: number | null; inStock: boolean; lastChecked: string }[],
  now = Date.now(),
): string | null {
  const current = offers.filter((offer) =>
    offer.inStock && offer.total !== null && !offerFreshness(offer.lastChecked, now).stale,
  );
  if (current.length === 0) return null;
  return current.reduce((best, offer) =>
    (offer.total ?? Number.POSITIVE_INFINITY) < (best.total ?? Number.POSITIVE_INFINITY) ? offer : best,
  ).offerId;
}
