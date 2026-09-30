import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdminRequest, readJson } from '@/lib/admin-api';
import { captureError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';

const storeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  website: z.string().trim().url().max(2048).refine((value) => {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  }, 'Website must use HTTP or HTTPS and must not contain login credentials.'),
  about: z.string().trim().max(5000).nullable(),
  contact_email: z.string().trim().email().max(254).nullable(),
  delivery_info: z.string().trim().max(2000).nullable(),
  logo_url: z.string().trim().url().max(2048).refine((value) => {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  }, 'Store image URL must use HTTP or HTTPS and must not contain login credentials.').nullable(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await authorizeAdminRequest(request);
    if (!access.authorized) return access.response;
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid store.' }, { status: 400 });
    const body = await readJson(request);
    if (body instanceof NextResponse) return body;
    const parsed = storeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid store details.' }, { status: 400 });
    const { data, error } = await access.supabase.from('stores')
      .update({
        name: parsed.data.name,
        website_url: parsed.data.website,
        about: parsed.data.about,
        contact_email: parsed.data.contact_email,
        delivery_info: parsed.data.delivery_info,
        logo_url: parsed.data.logo_url,
      })
      .eq('id', id).select('id').maybeSingle();
    if (error?.code === '23505') return NextResponse.json({ error: 'A store with that name already exists.' }, { status: 409 });
    if (error) throw new Error(`Unable to update store: ${error.message}`);
    if (!data) return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    captureError(error, { route: '/api/admin/stores/[id]' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update store.' }, { status: 500 });
  }
}
