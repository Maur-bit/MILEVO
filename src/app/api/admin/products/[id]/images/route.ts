import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdminRequest, readJson } from '@/lib/admin-api';
import { CATALOG_IMAGE_BUCKET, getCatalogImageObjectPath } from '@/lib/catalog-image-path';
import { captureError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';

const imageSchema = z.object({
  url: z.string().trim().url().max(2048).refine((value) => {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  }, 'Image URL must use HTTP or HTTPS and must not contain login credentials.'),
  alt_text: z.string().trim().max(250).nullable(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await authorizeAdminRequest(request);
    if (!access.authorized) return access.response;
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid product.' }, { status: 400 });
    const body = await readJson(request);
    if (body instanceof NextResponse) return body;
    const parsed = imageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid image details.' }, { status: 400 });
    }
    const { data, error } = await access.supabase.from('product_images')
      .insert({ product_id: id, ...parsed.data })
      .select('id, url, alt_text, position')
      .single();
    if (error) throw new Error(`Unable to add product image: ${error.message}`);
    return NextResponse.json({ image: data }, { status: 201 });
  } catch (error) {
    captureError(error, { route: '/api/admin/products/[id]/images' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to add product image.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await authorizeAdminRequest(request);
    if (!access.authorized) return access.response;
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid product.' }, { status: 400 });
    const body = await readJson(request);
    if (body instanceof NextResponse) return body;
    const parsed = z.object({ imageId: z.string().uuid() }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid image.' }, { status: 400 });
    const { data: image, error: selectError } = await access.supabase.from('product_images')
      .select('id, url').eq('id', parsed.data.imageId).eq('product_id', id).maybeSingle();
    if (selectError) throw new Error(`Unable to load product image: ${selectError.message}`);
    if (!image) return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
    const { error } = await access.supabase.from('product_images')
      .delete().eq('id', image.id);
    if (error) throw new Error(`Unable to remove product image: ${error.message}`);

    const objectPath = getCatalogImageObjectPath(image.url, process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (objectPath) {
      const { error: storageError } = await access.supabase.storage.from(CATALOG_IMAGE_BUCKET).remove([objectPath]);
      if (storageError) {
        return NextResponse.json({ success: true, warning: `Image record removed, but stored file cleanup failed: ${storageError.message}` });
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    captureError(error, { route: '/api/admin/products/[id]/images' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to remove product image.' }, { status: 500 });
  }
}
