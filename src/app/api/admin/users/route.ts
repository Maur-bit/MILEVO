import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdminRequest } from '@/lib/admin-api';
import { captureError } from '@/lib/monitoring';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

const querySchema = z.object({
  search: z.string().trim().max(200).default(''),
  status: z.enum(['all', 'active', 'suspended', 'banned', 'pending']).default('all'),
  role: z.enum(['all', 'customer', 'merchant', 'admin']).default('all'),
  sort: z.enum(['joined', 'last_active', 'name', 'email', 'role', 'status']).default('joined'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const access = await authorizeAdminRequest(request, { readOnly: true });
    if (!access.authorized) return access.response;

    const rate = checkRateLimit(request, 'admin-user-read', 120, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many user searches. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
      );
    }

    const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid user search or pagination options.' }, { status: 400 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'User management is not configured on this server.' }, { status: 503 });
    }

    const service = createServiceRoleClient();
    const { data, error } = await service.rpc('admin_user_management_list', {
      p_admin_id: access.user.id,
      p_search: parsed.data.search,
      p_status: parsed.data.status,
      p_role: parsed.data.role,
      p_sort: parsed.data.sort,
      p_direction: parsed.data.direction,
      p_page: parsed.data.page,
      p_page_size: parsed.data.pageSize,
    });
    if (error) throw new Error(`Unable to load users: ${error.message}`);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    captureError(error, { route: '/api/admin/users' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load users.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
