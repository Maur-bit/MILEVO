// src/lib/jobs.ts
// Abstraction over Trigger.dev for the feed-ingestion pipeline (Part 11).
// Until a Trigger.dev project is configured, `runFeedImport` executes the
// demo importer synchronously and returns a result shaped exactly like a
// real job run would, so merchant/admin UI never has to know the difference.
//
// To go live: `npm install @trigger.dev/sdk`, define a
// `feed-import` task in trigger.config.ts, and replace the body of
// `runFeedImport` with `await tasks.trigger('feed-import', { feedId })`.

import { MERCHANT_FEED_ERRORS } from '@/data/merchantSeedData';

export interface FeedImportResult {
  status: 'success' | 'partial' | 'failed';
  productsReceived: number;
  productsCreated: number;
  productsUpdated: number;
  productsRemoved: number;
  errors: { sku: string; message: string }[];
}

const isConfigured = Boolean(process.env.TRIGGER_API_KEY);

export async function runFeedImport(feedId: string): Promise<FeedImportResult> {
  if (!isConfigured) {
    // Demo importer: pretend to process the configured feed URL and surface
    // the same seeded errors the merchant/admin UI already displays.
    return {
      status: MERCHANT_FEED_ERRORS.length > 0 ? 'partial' : 'success',
      productsReceived: 12842,
      productsCreated: 14,
      productsUpdated: 8421,
      productsRemoved: 6,
      errors: MERCHANT_FEED_ERRORS,
    };
  }
  throw new Error('Trigger.dev is configured but runFeedImport has not been wired to a real task yet.');
}
