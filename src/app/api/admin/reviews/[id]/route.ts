import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdminRequest, readJson } from '@/lib/admin-api';
import { captureError } from '@/lib/monitoring';

const reviewActionSchema = z.object({ action: z.enum(['approve', 'remove']) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await authorizeAdminRequest(request);
    if (!access.authorized) return access.response;
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Invalid review.' }, { status: 400 });
    }
    const body = await readJson(request);
    if (body instanceof NextResponse) return body;
    const parsed = reviewActionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Choose a valid review action.' }, { status: 400 });

    const result = parsed.data.action === 'approve'
      ? await access.supabase.from('product_reviews').update({ is_approved: true }).eq('id', id).eq('is_approved', false).select('id').maybeSingle()
      : await access.supabase.from('product_reviews').delete().eq('id', id).eq('is_approved', false).select('id').maybeSingle();
    if (result.error) throw new Error(`Unable to moderate review: ${result.error.message}`);
    if (!result.data) return NextResponse.json({ error: 'Review not found or already moderated.' }, { status: 409 });
    return NextResponse.json({ success: true });
  } catch (error) {
    captureError(error, { route: '/api/admin/reviews/[id]' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to moderate review.' }, { status: 500 });
  }
}
