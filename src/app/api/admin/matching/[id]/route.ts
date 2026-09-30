import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdminRequest, readJson } from '@/lib/admin-api';
import { captureError } from '@/lib/monitoring';

const decisionSchema = z.object({ status: z.enum(['confirmed', 'rejected']) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await authorizeAdminRequest(request);
    if (!access.authorized) return access.response;
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Invalid product match.' }, { status: 400 });
    }
    const body = await readJson(request);
    if (body instanceof NextResponse) return body;
    const parsed = decisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Choose a valid match decision.' }, { status: 400 });
    }
    const { data, error } = await access.supabase
      .from('product_matches')
      .update({
        status: parsed.data.status,
        reviewed_by: access.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();
    if (error) throw new Error(`Unable to update product match: ${error.message}`);
    if (!data) return NextResponse.json({ error: 'This match has already been reviewed.' }, { status: 409 });
    return NextResponse.json({ success: true });
  } catch (error) {
    captureError(error, { route: '/api/admin/matching/[id]' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update product match.' }, { status: 500 });
  }
}
