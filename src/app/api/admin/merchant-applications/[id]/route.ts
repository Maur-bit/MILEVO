import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdminRequest, readJson } from '@/lib/admin-api';
import { captureError } from '@/lib/monitoring';
import { createServiceRoleClient } from '@/lib/supabase/server';

const decisionSchema = z.object({ decision: z.enum(['approve', 'reject']) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await authorizeAdminRequest(request);
    if (!access.authorized) return access.response;
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Invalid merchant application.' }, { status: 400 });
    }
    const body = await readJson(request);
    if (body instanceof NextResponse) return body;
    const parsed = decisionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Choose approve or reject.' }, { status: 400 });

    const service = createServiceRoleClient();
    const { data: application, error: loadError } = await service
      .from('merchant_applications')
      .select('store_name')
      .eq('id', id)
      .eq('status', 'pending')
      .maybeSingle();
    if (loadError) throw new Error(`Unable to load merchant application: ${loadError.message}`);
    if (!application) return NextResponse.json({ error: 'Pending merchant application not found.' }, { status: 404 });

    const slugBase = application.store_name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 140) || 'store';
    const { data, error } = await service.rpc('review_merchant_application', {
      p_application_id: id,
      p_admin_id: access.user.id,
      p_decision: parsed.data.decision,
      p_store_slug: `${slugBase}-${id.slice(0, 8)}`,
    });
    if (error) throw new Error(`Unable to review merchant application: ${error.message}`);
    return NextResponse.json({ status: parsed.data.decision === 'approve' ? 'approved' : 'rejected', data });
  } catch (error) {
    captureError(error, { route: '/api/admin/merchant-applications/[id]' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to review merchant application.' }, { status: 500 });
  }
}
