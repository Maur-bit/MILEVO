import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdminRequest, readJson } from '@/lib/admin-api';
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

function slugify(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const access = await authorizeAdminRequest(request);
    if (!access.authorized) return access.response;
    const body = await readJson(request);
    if (body instanceof NextResponse) return body;
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid product details.' }, { status: 400 });
    }
    const slug = slugify(parsed.data.name);
    if (!slug) return NextResponse.json({ error: 'Product name must include letters or numbers.' }, { status: 400 });

    const { data, error } = await access.supabase.from('products')
      .insert({ ...parsed.data, slug })
      .select('id, slug, name')
      .single();
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'A product with that name or slug already exists.' }, { status: 409 });
    }
    if (error) throw new Error(`Unable to create product: ${error.message}`);
    return NextResponse.json({ product: data }, { status: 201 });
  } catch (error) {
    captureError(error, { route: '/api/admin/products' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create product.' }, { status: 500 });
  }
}
