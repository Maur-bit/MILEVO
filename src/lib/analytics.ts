import posthog from 'posthog-js';

type AnalyticsEvent =
  | { name: 'product_viewed'; slug: string }
  | { name: 'search_performed' }
  | { name: 'search_filters_applied'; resultCount: number }
  | { name: 'offer_clicked'; slug: string; store: string }
  | { name: 'price_alert_created'; slug: string; targetPrice: number }
  | { name: 'product_saved'; slug: string }
  | { name: 'review_submitted'; slug: string; rating: number }
  | { name: 'user_signed_in' }
  | { name: 'user_registered' };

const isConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST
);

let identifiedUserId: string | null = null;

function hasAnalyticsConsent() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('milevo-analytics-consent') === 'yes';
  } catch {
    return false;
  }
}

export function track(event: AnalyticsEvent) {
  if (!isConfigured || !hasAnalyticsConsent()) return;

  posthog.capture(event.name, event);
}

export function captureException(error: unknown) {
  if (!isConfigured || !hasAnalyticsConsent()) return;

  posthog.captureException(error);
}

export function identifyUser(userId: string, properties: { email?: string } = {}) {
  if (!isConfigured || !hasAnalyticsConsent() || identifiedUserId === userId) return;

  if (identifiedUserId) posthog.reset();

  posthog.identify(userId, properties);
  identifiedUserId = userId;
}

export function resetUser() {
  if (!isConfigured || !hasAnalyticsConsent() || !identifiedUserId) return;

  posthog.reset();
  identifiedUserId = null;
}
