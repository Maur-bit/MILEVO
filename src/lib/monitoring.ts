import * as Sentry from '@sentry/nextjs';

const isConfigured = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN);

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage.getItem('milevo-analytics-consent') !== 'yes') return;
    } catch {
      return;
    }
  }

  if (isConfigured) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
    return;
  }

  console.error('[monitoring]', error, context);
}
