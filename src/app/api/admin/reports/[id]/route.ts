import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdminRequest, readJson } from '@/lib/admin-api';
import { captureError } from '@/lib/monitoring';

const reportStatusSchema = z.object({ status: z.enum(['pending', 'resolved']) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await authorizeAdminRequest(request);
    if (!access.authorized) return access.response;
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Invalid report.' }, { status: 400 });
    }
    const body = await readJson(request);
    if (body instanceof NextResponse) return body;
    const parsed = reportStatusSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Choose a valid report status.' }, { status: 400 });
    const { data, error } = await access.supabase.from('problem_reports')
      .update({ status: parsed.data.status })
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw new Error(`Unable to update problem report: ${error.message}`);
    if (!data) return NextResponse.json({ error: 'Problem report not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    captureError(error, { route: '/api/admin/reports/[id]' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update problem report.' }, { status: 500 });
  }
}
