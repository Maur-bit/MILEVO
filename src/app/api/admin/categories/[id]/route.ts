import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdminRequest, readJson } from '@/lib/admin-api';
import { captureError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await authorizeAdminRequest(request);
    if (!access.authorized) return access.response;
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid category.' }, { status: 400 });
    const body = await readJson(request);
    if (body instanceof NextResponse) return body;
    const parsed = z.object({ name: z.string().trim().min(2).max(100) }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid category.' }, { status: 400 });
    const { data, error } = await access.supabase.from('categories')
      .update({ name: parsed.data.name }).eq('id', id).select('id').maybeSingle();
    if (error) throw new Error(`Unable to update category: ${error.message}`);
    if (!data) return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    captureError(error, { route: '/api/admin/categories/[id]' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update category.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await authorizeAdminRequest(request);
    if (!access.authorized) return access.response;
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid category.' }, { status: 400 });
    const { data, error } = await access.supabase.from('categories')
      .delete().eq('id', id).select('id').maybeSingle();
    if (error?.code === '23503') {
      return NextResponse.json({ error: 'This category is still used by products or child categories.' }, { status: 409 });
    }
    if (error) throw new Error(`Unable to delete category: ${error.message}`);
    if (!data) return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    captureError(error, { route: '/api/admin/categories/[id]' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to delete category.' }, { status: 500 });
  }
}
