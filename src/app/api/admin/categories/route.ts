import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdminRequest, readJson } from '@/lib/admin-api';
import { captureError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';

const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  parent_id: z.string().uuid().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const access = await authorizeAdminRequest(request);
    if (!access.authorized) return access.response;
    const body = await readJson(request);
    if (body instanceof NextResponse) return body;
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid category.' }, { status: 400 });

    const slug = parsed.data.name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) return NextResponse.json({ error: 'Category name must include letters or numbers.' }, { status: 400 });
    const { data, error } = await access.supabase.from('categories')
      .insert({ name: parsed.data.name, parent_id: parsed.data.parent_id, slug })
      .select('id, name, slug, parent_id')
      .single();
    if (error?.code === '23505') return NextResponse.json({ error: 'A category with that name or slug already exists.' }, { status: 409 });
    if (error) throw new Error(`Unable to create category: ${error.message}`);
    return NextResponse.json({ category: data }, { status: 201 });
  } catch (error) {
    captureError(error, { route: '/api/admin/categories' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create category.' }, { status: 500 });
  }
}
