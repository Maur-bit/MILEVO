import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdminRequest, readJson } from '@/lib/admin-api';
import { captureError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';

const storeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  website: z.string().trim().url().max(2048).refine(
    (value) => {
      const url = new URL(value);
      return (url.protocol === 'https:' || url.protocol === 'http:')
        && !url.username
        && !url.password;
    },
    'Website must use HTTP or HTTPS and must not contain login credentials.',
  ),
  about: z.string().trim().max(5000).nullable().optional(),
  contact_email: z.string().trim().email().max(254).nullable().optional(),
  delivery_info: z.string().trim().max(2000).nullable().optional(),
  logo_url: z.string().trim().url().max(2048).refine((value) => {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  }, 'Store image URL must use HTTP or HTTPS and must not contain login credentials.').nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const access = await authorizeAdminRequest(request);
    if (!access.authorized) return access.response;
    const body = await readJson(request);
    if (body instanceof NextResponse) return body;
    const payload = storeSchema.safeParse(body);
    if (!payload.success) {
      return NextResponse.json({ error: payload.error.issues[0]?.message ?? 'Invalid store details.' }, { status: 400 });
    }
    const website = new URL(payload.data.website);
    if (website.username || website.password) {
      return NextResponse.json({ error: 'Store website must not contain login credentials.' }, { status: 400 });
    }
    const slug = payload.data.name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (!slug) return NextResponse.json({ error: 'Store name must include letters or numbers.' }, { status: 400 });

    const { data, error } = await access.supabase
      .from('stores')
      .insert({
        slug,
        name: payload.data.name,
        website_url: website.toString(),
        about: payload.data.about ?? null,
        contact_email: payload.data.contact_email ?? null,
        delivery_info: payload.data.delivery_info ?? null,
        logo_url: payload.data.logo_url ?? null,
        overall_rating: 0,
        review_count: 0,
      })
      .select('id, slug, name')
      .single();
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'A store with that name or slug already exists.' }, { status: 409 });
    }
    if (error) throw new Error(`Unable to create store: ${error.message}`);

    return NextResponse.json({ store: data }, { status: 201 });
  } catch (error) {
    captureError(error, { route: '/api/admin/stores' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create store.' },
      { status: 500 },
    );
  }
}
