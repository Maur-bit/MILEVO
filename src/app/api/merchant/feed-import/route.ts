import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { captureError } from '@/lib/monitoring';
import { FeedInputError, importCsvFeed } from '@/lib/feed-import';
import { authorizeMerchantStoreRequest } from '@/lib/merchant-api';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const requestSchema = z.object({ storeId: z.string().uuid() });

export async function POST(request: NextRequest) {
  let route = '/api/merchant/feed-import';
  try {
    if (request.headers.get('origin') !== request.nextUrl.origin) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_FILE_BYTES + 64 * 1024) {
      return NextResponse.json({ error: 'CSV files must be smaller than 5 MB.' }, { status: 413 });
    }
    const form = await request.formData();
    const values = requestSchema.safeParse({ storeId: form.get('storeId') });
    if (!values.success) return NextResponse.json({ error: 'Choose a valid store.' }, { status: 400 });

    const access = await authorizeMerchantStoreRequest(request, values.data.storeId);
    if (!access.authorized) return access.response;
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Select a CSV file to import.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'CSV files must be smaller than 5 MB.' }, { status: 413 });
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'Upload a .csv file.' }, { status: 400 });
    }

    const summary = await importCsvFeed(access.service, {
      storeId: values.data.storeId,
      content: await file.text(),
    });
    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof FeedInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    captureError(error, { route });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Feed import failed.' }, { status: 500 });
  }
}
