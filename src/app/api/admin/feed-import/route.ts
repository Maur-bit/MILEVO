import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdminRequest } from '@/lib/admin-api';
import { FeedInputError, importCsvFeed } from '@/lib/feed-import';
import { captureError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const requestSchema = z.object({ storeId: z.string().uuid() });

export async function POST(request: NextRequest) {
  try {
    const access = await authorizeAdminRequest(request);
    if (!access.authorized) return access.response;

    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_FILE_BYTES + 64 * 1024) {
      return NextResponse.json({ error: 'CSV files must be smaller than 5 MB.' }, { status: 413 });
    }
    const form = await request.formData();
    const requestValues = requestSchema.safeParse({ storeId: form.get('storeId') });
    if (!requestValues.success) {
      return NextResponse.json({ error: 'Choose a valid store.' }, { status: 400 });
    }
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

    const content = await file.text();
    const summary = await importCsvFeed(access.supabase, { storeId: requestValues.data.storeId, content });
    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof FeedInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    captureError(error, { route: '/api/admin/feed-import' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Feed import failed.' },
      { status: 500 },
    );
  }
}
