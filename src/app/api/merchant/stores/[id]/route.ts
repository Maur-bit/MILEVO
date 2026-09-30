import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeMerchantStoreRequest } from '@/lib/merchant-api';
import { captureError } from '@/lib/monitoring';

const storeProfileSchema = z.object({
  storeName: z.string().trim().min(2).max(120),
  websiteUrl: z.string().trim().url().max(2048).refine((value) => {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  }),
  about: z.string().trim().max(2000),
  contactEmail: z.union([z.string().trim().email().max(254), z.literal('')]),
  deliveryInfo: z.string().trim().max(1000),
  returnsInfo: z.string().trim().max(1000),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Invalid store.' }, { status: 400 });
    }
    const access = await authorizeMerchantStoreRequest(request, id);
    if (!access.authorized) return access.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid store profile request.' }, { status: 400 });
    }
    const parsed = storeProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Please review the store profile.' }, { status: 400 });
    }
    const { data, error } = await access.service
      .from('stores')
      .update({
        name: parsed.data.storeName,
        website_url: parsed.data.websiteUrl,
        about: parsed.data.about || null,
        contact_email: parsed.data.contactEmail || null,
        delivery_info: parsed.data.deliveryInfo || null,
        returns_info: parsed.data.returnsInfo || null,
      })
      .eq('id', id)
      .select('id, name, website_url, about, contact_email, delivery_info, returns_info')
      .maybeSingle();
    if (error) throw new Error(`Unable to update store profile: ${error.message}`);
    if (!data) return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
    return NextResponse.json({ store: data });
  } catch (error) {
    captureError(error, { route: '/api/merchant/stores/[id]' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update store profile.' }, { status: 500 });
  }
}
