import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { convertPriceToGhs } from '@/lib/price-comparison';
import { availabilityFromStockQuantity } from '@/lib/availability';

const MAX_ROWS = 5000;
const BATCH_SIZE = 250;
const FX_PROVIDER = 'open.er-api.com';

export class FeedInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeedInputError';
  }
}

const REQUIRED_HEADERS = [
  'product_id',
  'sku',
  'title',
  'price',
  'currency',
  'stock_quantity',
  'category',
] as const;

const rowSchema = z.object({
  product_id: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(300),
  price: z.coerce.number().finite().positive().max(1_000_000_000),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  stock_quantity: z.coerce.number().int().min(0).max(2_147_483_647),
  category: z.string().trim().min(1).max(500),
  product_url: z.preprocess(
    (value) => typeof value === 'string' && !value.trim() ? undefined : value,
    z.string().trim().url().max(2048).refine(
      (value) => {
        const url = new URL(value);
        return (url.protocol === 'https:' || url.protocol === 'http:')
          && !url.username
          && !url.password;
      },
      'Product URL must use HTTP or HTTPS and must not contain login credentials.',
    ).optional(),
  ),
});

type CsvRecord = { line: number; values: string[] };
type ImportError = { sku: string; message: string; line: number };
type FeedRow = z.infer<typeof rowSchema> & { line: number };

interface ExchangeResponse {
  result: string;
  rates?: Record<string, number>;
  time_last_update_unix?: number;
  time_last_update_utc?: string;
}

interface StoreRecord {
  id: string;
  slug: string;
  website_url: string;
}

interface CategoryRecord {
  id: string;
  slug: string;
}

interface ProductRecord {
  id: string;
  slug: string;
}

interface VariantRecord {
  id: string;
  product_id: string;
  variant_label: string;
}

interface OfferRecord {
  id: string;
  product_variant_id: string;
  current_price: number;
  source_price: number;
  source_currency: string;
  fx_rate_to_ghs: number;
  fx_rate_at: string | null;
  fx_provider: string | null;
  last_checked_at: string;
}

export interface FeedImportSummary {
  status: 'success' | 'partial' | 'failed';
  productsReceived: number;
  productsCreated: number;
  productsUpdated: number;
  errors: ImportError[];
  rates: Record<string, number>;
  fxRateAt: string | null;
}

export async function importCsvFeed(
  supabase: SupabaseClient,
  input: { storeId: string; content: string },
): Promise<FeedImportSummary> {
  const storeResult = await supabase
    .from('stores')
    .select('id, slug, website_url')
    .eq('id', input.storeId)
    .maybeSingle();
  if (storeResult.error) throw new Error(`Unable to load selected store: ${storeResult.error.message}`);
  if (!storeResult.data) throw new Error('The selected store does not exist.');
  const store = storeResult.data as StoreRecord;

  const feed = await ensureManualFeed(supabase, store.id);
  const runResult = await supabase
    .from('feed_runs')
    .insert({ feed_id: feed.id, status: 'running' })
    .select('id')
    .single();
  if (runResult.error) throw new Error(`Unable to start feed import: ${runResult.error.message}`);

  const runId = runResult.data.id;
  let productsReceived = 0;
  let productsCreated = 0;
  let productsUpdated = 0;
  const errors: ImportError[] = [];
  const rates: Record<string, number> = { GHS: 1 };
  let fxRateAt: string | null = null;

  try {
    const parsed = parseCsv(input.content);
    const missingHeaders = REQUIRED_HEADERS.filter((name) => !parsed.headers.includes(name));
    if (missingHeaders.length > 0) {
      throw new FeedInputError(`Missing required CSV columns: ${missingHeaders.join(', ')}.`);
    }
    if (parsed.records.length > MAX_ROWS) {
      throw new FeedInputError(`CSV files may contain at most ${MAX_ROWS} data rows.`);
    }
    if (parsed.records.length === 0) throw new FeedInputError('CSV file contains no product rows.');
    productsReceived = parsed.records.length;

    const seenSkus = new Set<string>();
    const validRows: FeedRow[] = [];
    for (const record of parsed.records) {
      const values = toObject(parsed.headers, record.values);
      const sku = (values.sku ?? '').trim();
      if (record.values.length !== parsed.headers.length) {
        errors.push({ line: record.line, sku, message: 'The row has a different number of columns than the header.' });
        continue;
      }

      const row = rowSchema.safeParse(values);
      if (!row.success) {
        errors.push({
          line: record.line,
          sku,
          message: row.error.issues.map((issue) => issue.message).join('; '),
        });
        continue;
      }
      if (seenSkus.has(row.data.sku)) {
        errors.push({ line: record.line, sku: row.data.sku, message: 'Duplicate SKU in this CSV file.' });
        continue;
      }
      seenSkus.add(row.data.sku);
      validRows.push({ ...row.data, line: record.line });
    }

    const foreignCurrencies = [...new Set(validRows.map((row) => row.currency).filter((value) => value !== 'GHS'))];
    if (foreignCurrencies.length > 0) {
      const response = await fetch('https://open.er-api.com/v6/latest/USD', {
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`Exchange-rate service returned HTTP ${response.status}.`);
      const exchange = (await response.json()) as ExchangeResponse;
      if (exchange.result !== 'success' || !exchange.rates?.GHS) {
        throw new Error('Unable to load the current USD/GHS exchange rate.');
      }
      const unixTimestamp = exchange.time_last_update_unix;
      const timestampMs = typeof unixTimestamp === 'number' && Number.isFinite(unixTimestamp)
        ? unixTimestamp * 1000
        : exchange.time_last_update_utc
          ? Date.parse(exchange.time_last_update_utc)
          : Number.NaN;
      if (!Number.isFinite(timestampMs)) {
        throw new Error('The exchange-rate service did not provide a valid rate timestamp.');
      }
      fxRateAt = new Date(timestampMs).toISOString();
      for (const currency of foreignCurrencies) {
        const usdRate = exchange.rates[currency];
        if (typeof usdRate === 'number' && Number.isFinite(usdRate) && usdRate > 0) {
          const rateToGhs = exchange.rates.GHS / usdRate;
          if (Number.isFinite(rateToGhs) && rateToGhs > 0) rates[currency] = rateToGhs;
        }
      }
    }

    const importableRows = validRows.filter((row) => {
      if (rates[row.currency] !== undefined) return true;
      errors.push({
        line: row.line,
        sku: row.sku,
        message: `No exchange rate is available for ${row.currency}.`,
      });
      return false;
    });

    const categoryIds = await ensureCategories(
      supabase,
      [...new Set(importableRows.map((row) => row.category))],
    );
    const rowsByProductSlug = new Map<string, FeedRow>();
    for (const row of importableRows) {
      rowsByProductSlug.set(productSlug(store.slug, row.product_id), row);
    }

    const productSlugs = [...rowsByProductSlug.keys()];
    const existingProducts = productSlugs.length
      ? await supabase.from('products').select('slug').in('slug', productSlugs)
      : { data: [], error: null };
    if (existingProducts.error) throw new Error(`Unable to check imported products: ${existingProducts.error.message}`);
    const existingSlugs = new Set((existingProducts.data ?? []).map((row) => row.slug));

    const productPayload = [...rowsByProductSlug.entries()].map(([slug, row]) => ({
      slug,
      name: row.title,
      category_id: categoryIds.get(row.category)!,
      brand_id: null,
      mpn: row.product_id,
    }));
    const productsResult = productPayload.length
      ? await supabase.from('products').upsert(productPayload, { onConflict: 'slug' }).select('id, slug')
      : { data: [], error: null };
    if (productsResult.error) throw new Error(`Unable to save imported products: ${productsResult.error.message}`);
    const products = (productsResult.data ?? []) as ProductRecord[];
    const productBySlug = new Map(products.map((product) => [product.slug, product.id]));
    productsCreated = productPayload.filter((product) => !existingSlugs.has(product.slug)).length;
    productsUpdated = productPayload.length - productsCreated;

    const productIds = [...new Set(products.map((product) => product.id))];
    const existingVariants = productIds.length
      ? await supabase
          .from('product_variants')
          .select('id, product_id, variant_label')
          .in('product_id', productIds)
      : { data: [], error: null };
    if (existingVariants.error) {
      throw new Error(`Unable to load product variants: ${existingVariants.error.message}`);
    }
    const variantByKey = new Map(
      ((existingVariants.data ?? []) as VariantRecord[])
        .map((variant) => [`${variant.product_id}:${variant.variant_label}`, variant.id]),
    );
    const variantPayload = [...new Map(importableRows.map((row) => {
      const productId = productBySlug.get(productSlug(store.slug, row.product_id));
      if (!productId) throw new Error(`The imported product ${row.product_id} was not saved.`);
      const variantLabel = row.title;
      const key = `${productId}:${variantLabel}`;
      return [key, { product_id: productId, variant_label: variantLabel }] as const;
    })).entries()]
      .filter(([key]) => !variantByKey.has(key))
      .map(([, value]) => value);
    if (variantPayload.length > 0) {
      const createdVariants = await supabase
        .from('product_variants')
        .upsert(variantPayload, { onConflict: 'product_id,variant_label' })
        .select('id, product_id, variant_label');
      if (createdVariants.error) {
        throw new Error(`Unable to save product variants: ${createdVariants.error.message}`);
      }
      for (const variant of (createdVariants.data ?? []) as VariantRecord[]) {
        variantByKey.set(`${variant.product_id}:${variant.variant_label}`, variant.id);
      }
    }

    const checkedAt = new Date().toISOString();
    const offerPayload = importableRows.map((row) => {
      const productId = productBySlug.get(productSlug(store.slug, row.product_id));
      const variantId = productId ? variantByKey.get(`${productId}:${row.title}`) : undefined;
      if (!variantId) throw new Error(`The SKU ${row.sku} has no product variant.`);
      return {
        product_variant_id: variantId,
        store_id: store.id,
        merchant_sku: row.sku,
        product_url: row.product_url || store.website_url,
        condition: 'new' as const,
        in_stock: row.stock_quantity > 0,
        availability: availabilityFromStockQuantity(row.stock_quantity),
        stock_quantity: row.stock_quantity,
        current_price: convertPriceToGhs(row.price, rates[row.currency]),
        currency: 'GHS',
        source_price: row.price,
        source_currency: row.currency,
        fx_rate_to_ghs: rates[row.currency],
        fx_rate_at: row.currency === 'GHS' ? null : fxRateAt,
        fx_provider: row.currency === 'GHS' ? null : FX_PROVIDER,
        last_checked_at: checkedAt,
      };
    });
    const offersResult = offerPayload.length
      ? await supabase
          .from('offers')
          .upsert(offerPayload, { onConflict: 'store_id,merchant_sku' })
          .select('id, product_variant_id, current_price, source_price, source_currency, fx_rate_to_ghs, fx_rate_at, fx_provider, last_checked_at')
      : { data: [], error: null };
    if (offersResult.error) throw new Error(`Unable to save product offers: ${offersResult.error.message}`);
    const offers = (offersResult.data ?? []) as OfferRecord[];

    const stockByVariant = new Map<string, { in_stock: boolean; availability: string; stock_quantity: number }>();
    for (const row of importableRows) {
      const productId = productBySlug.get(productSlug(store.slug, row.product_id));
      const variantId = productId ? variantByKey.get(`${productId}:${row.title}`) : undefined;
      if (variantId) {
        stockByVariant.set(variantId, {
          in_stock: row.stock_quantity > 0,
          availability: availabilityFromStockQuantity(row.stock_quantity),
          stock_quantity: row.stock_quantity,
        });
      }
    }
    const inventoryResult = await batchRows(
      offers.map((offer) => ({
        offer_id: offer.id,
        ...(stockByVariant.get(offer.product_variant_id) ?? {
          in_stock: false,
          availability: 'unknown',
          stock_quantity: null,
        }),
        checked_at: checkedAt,
      })),
      (rows) => supabase.from('inventory_status').upsert(rows, { onConflict: 'offer_id' }),
    );
    if (inventoryResult) throw new Error(`Unable to save inventory status: ${inventoryResult}`);

    const priceLogError = await batchRows(
      offers.map((offer) => ({
        offer_id: offer.id,
        price: offer.current_price,
        source_price: offer.source_price,
        source_currency: offer.source_currency,
        fx_rate_to_ghs: offer.fx_rate_to_ghs,
        fx_rate_at: offer.fx_rate_at,
        fx_provider: offer.fx_provider,
        recorded_at: offer.last_checked_at,
      })),
      (rows) => supabase.from('offer_prices').insert(rows),
    );
    if (priceLogError) throw new Error(`Unable to save price history: ${priceLogError}`);

    await saveDailyPriceHistory(supabase, offers);

    const errorWrite = await batchRows(
      errors.map((error) => ({
        feed_run_id: runId,
        merchant_sku: error.sku || null,
        error_message: `Line ${error.line}: ${error.message}`.slice(0, 2000),
      })),
      (rows) => supabase.from('feed_errors').insert(rows),
    );
    if (errorWrite) throw new Error(`Unable to save feed errors: ${errorWrite}`);

    const status = errors.length === 0 ? 'success' : errors.length === productsReceived ? 'failed' : 'partial';
    const finishedAt = new Date().toISOString();
    const { error: finishError } = await supabase
      .from('feed_runs')
      .update({
        status,
        products_received: productsReceived,
        products_created: productsCreated,
        products_updated: productsUpdated,
        error_count: errors.length,
        finished_at: finishedAt,
      })
      .eq('id', runId);
    if (finishError) throw new Error(`Unable to finish feed import: ${finishError.message}`);

    const { error: feedUpdateError } = await supabase
      .from('merchant_feeds')
      .update({ last_run_at: finishedAt })
      .eq('id', feed.id);
    if (feedUpdateError) throw new Error(`Unable to update feed status: ${feedUpdateError.message}`);

    return { status, productsReceived, productsCreated, productsUpdated, errors, rates, fxRateAt };
  } catch (error) {
    const failureMessage = error instanceof Error ? error.message : 'Unknown feed import error.';
    const { error: updateError } = await supabase
      .from('feed_runs')
      .update({
        status: 'failed',
        products_received: productsReceived,
        products_created: productsCreated,
        products_updated: productsUpdated,
        error_count: errors.length + 1,
        finished_at: new Date().toISOString(),
      })
      .eq('id', runId);
    if (updateError) {
      throw new Error(`${failureMessage} Unable to record failed run: ${updateError.message}`);
    }
    throw error;
  }
}

async function ensureManualFeed(supabase: SupabaseClient, storeId: string) {
  const existing = await supabase
    .from('merchant_feeds')
    .select('id')
    .eq('store_id', storeId)
    .eq('feed_url', 'upload://manual-csv')
    .limit(1)
    .maybeSingle();
  if (existing.error) throw new Error(`Unable to load feed configuration: ${existing.error.message}`);
  if (existing.data) return existing.data;

  const created = await supabase
    .from('merchant_feeds')
    .insert({
      store_id: storeId,
      feed_url: 'upload://manual-csv',
      format: 'csv',
      update_frequency_minutes: 0,
    })
    .select('id')
    .single();
  if (created.error) throw new Error(`Unable to create feed configuration: ${created.error.message}`);
  return created.data;
}

async function ensureCategories(supabase: SupabaseClient, categoryPaths: string[]) {
  const ids = new Map<string, string>();
  const prefixes = new Map<number, Map<string, { name: string; parentSlug: string | null }>>();
  for (const categoryPath of categoryPaths) {
    const segments = categoryPath.split('>').map((part) => part.trim()).filter(Boolean);
    if (segments.length === 0) throw new FeedInputError('Category path cannot be empty.');
    let parentSlug: string | null = null;
    const pathParts: string[] = [];
    segments.forEach((name, index) => {
      pathParts.push(toSlug(name));
      const slug = categorySlug(pathParts);
      const level = prefixes.get(index) ?? new Map();
      level.set(slug, { name, parentSlug });
      prefixes.set(index, level);
      parentSlug = slug;
    });
  }

  for (const categories of prefixes.values()) {
    const slugs = [...categories.keys()];
    const existing = await supabase.from('categories').select('id, slug').in('slug', slugs);
    if (existing.error) throw new Error(`Unable to load categories: ${existing.error.message}`);
    for (const category of (existing.data ?? []) as CategoryRecord[]) ids.set(category.slug, category.id);

    const missing = [...categories.entries()]
      .filter(([slug]) => !ids.has(slug))
      .map(([slug, category]) => ({
        slug,
        name: category.name,
        parent_id: category.parentSlug ? ids.get(category.parentSlug) ?? null : null,
      }));
    const saved = await batchRows(
      missing,
      (rows) => supabase.from('categories').upsert(rows, { onConflict: 'slug' }),
    );
    if (saved) throw new Error(`Unable to create categories: ${saved}`);

    if (missing.length > 0) {
      const refreshed = await supabase.from('categories').select('id, slug').in('slug', slugs);
      if (refreshed.error) throw new Error(`Unable to verify categories: ${refreshed.error.message}`);
      for (const category of (refreshed.data ?? []) as CategoryRecord[]) ids.set(category.slug, category.id);
    }
  }

  const categoryIds = new Map<string, string>();
  for (const path of categoryPaths) {
    const segments = path.split('>').map((part) => part.trim()).filter(Boolean);
    const slug = categorySlug(segments.map(toSlug));
    const id = ids.get(slug);
    if (!id) throw new Error(`Unable to resolve category path "${path}".`);
    categoryIds.set(path, id);
  }
  return categoryIds;
}

async function saveDailyPriceHistory(supabase: SupabaseClient, offers: OfferRecord[]) {
  const variantIds = [...new Set(offers.map((offer) => offer.product_variant_id))];
  if (variantIds.length === 0) return;

  const { data, error } = await supabase
    .from('offers')
    .select('product_variant_id, current_price')
    .in('product_variant_id', variantIds);
  if (error) throw new Error(`Unable to calculate daily price history: ${error.message}`);

  const pricesByVariant = new Map<string, number[]>();
  for (const offer of data ?? []) {
    const prices = pricesByVariant.get(offer.product_variant_id) ?? [];
    prices.push(Number(offer.current_price));
    pricesByVariant.set(offer.product_variant_id, prices);
  }
  const today = new Date().toISOString().slice(0, 10);
  const rows = [...pricesByVariant.entries()].map(([product_variant_id, prices]) => ({
    product_variant_id,
    day: today,
    min_price: Math.min(...prices),
    max_price: Math.max(...prices),
    avg_price: prices.reduce((total, price) => total + price, 0) / prices.length,
  }));
  const writeError = await batchRows(
    rows,
    (batch) => supabase.from('price_history').upsert(batch, { onConflict: 'product_variant_id,day' }),
  );
  if (writeError) throw new Error(`Unable to save daily price history: ${writeError}`);
}

async function batchRows<T>(
  rows: T[],
  write: (batch: T[]) => PromiseLike<{ error: { message: string } | null }>,
) {
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const { error } = await write(rows.slice(offset, offset + BATCH_SIZE));
    if (error) return error.message;
  }
  return null;
}

function toSlug(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 160) || 'item';
}

function productSlug(storeSlug: string, productId: string) {
  const value = `${toSlug(storeSlug)}-${toSlug(productId)}`;
  return `feed-${value.slice(0, 165)}-${hashSuffix(`${storeSlug}:${productId}`)}`;
}

function categorySlug(path: string[]) {
  const value = path.join('-');
  return `feed-${value.slice(0, 165)}-${hashSuffix(path.join('\u001f'))}`;
}

function hashSuffix(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function toObject(headers: string[], values: string[]) {
  return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
}

function parseCsv(text: string): { headers: string[]; records: CsvRecord[] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = text.charCodeAt(0) === 0xfeff ? 1 : 0; index < text.length; index += 1) {
    const character = text[index];
    if (inQuotes) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      if (field.length > 0) throw new FeedInputError('Invalid CSV: quote inside an unquoted field.');
      inQuotes = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      row.push(field);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      if (rows.length > MAX_ROWS + 1) {
        throw new FeedInputError(`CSV files may contain at most ${MAX_ROWS} data rows.`);
      }
      row = [];
      field = '';
      if (character === '\r' && text[index + 1] === '\n') index += 1;
    } else {
      field += character;
    }
  }

  if (inQuotes) throw new FeedInputError('Invalid CSV: quoted field was not closed.');
  row.push(field);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  if (rows.length === 0) throw new FeedInputError('CSV file is empty.');
  if (rows.length > MAX_ROWS + 1) {
    throw new FeedInputError(`CSV files may contain at most ${MAX_ROWS} data rows.`);
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  if (headers.some((header) => !header)) throw new FeedInputError('CSV header names cannot be empty.');
  if (new Set(headers).size !== headers.length) throw new FeedInputError('CSV header names must be unique.');

  return {
    headers,
    records: rows.slice(1).map((values, index) => ({ line: index + 2, values })),
  };
}
