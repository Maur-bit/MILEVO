import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdminRequest, readJson } from '@/lib/admin-api';
import { CATALOG_IMAGE_BUCKET, getCatalogImageObjectPath } from '@/lib/catalog-image-path';
import { captureError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';

const productSchema = z.object({
  name: z.string().trim().min(2).max(180),
  category_id: z.string().uuid(),
  brand_id: z.string().uuid().nullable(),
  description: z.string().trim().max(10000).nullable(),
  gtin: z.string().trim().max(64).nullable(),
  mpn: z.string().trim().max(120).nullable(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await authorizeAdminRequest(request);
    if (!access.authorized) return access.response;
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid product.' }, { status: 400 });
    const body = await readJson(request);
    if (body instanceof NextResponse) return body;
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid product details.' }, { status: 400 });
    }

    const { data, error } = await access.supabase.from('products')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw new Error(`Unable to update product: ${error.message}`);
    if (!data) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    captureError(error, { route: '/api/admin/products/[id]' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update product.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await authorizeAdminRequest(request);
    if (!access.authorized) return access.response;
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid product.' }, { status: 400 });
    const { data: images, error: imageError } = await access.supabase.from('product_images').select('url').eq('product_id', id);
    if (imageError) throw new Error(`Unable to load product images before deletion: ${imageError.message}`);
    const { data, error } = await access.supabase.from('products')
      .delete().eq('id', id).select('id').maybeSingle();
    if (error) throw new Error(`Unable to delete product: ${error.message}`);
    if (!data) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    const objectPaths = (images ?? [])
      .map(({ url }) => getCatalogImageObjectPath(url, process.env.NEXT_PUBLIC_SUPABASE_URL))
      .filter((path): path is string => path !== null);
    if (objectPaths.length) {
      const { error: storageError } = await access.supabase.storage.from(CATALOG_IMAGE_BUCKET).remove(objectPaths);
      if (storageError) {
        return NextResponse.json({ success: true, warning: `Product deleted, but image file cleanup failed: ${storageError.message}` });
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    captureError(error, { route: '/api/admin/products/[id]' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to delete product.' }, { status: 500 });
  }
}
