import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdminRequest, readJson } from '@/lib/admin-api';
import { captureError } from '@/lib/monitoring';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

const userIdSchema = z.string().uuid();
const updateSchema = z.object({
  full_name: z.string().max(120).optional(),
  role: z.enum(['customer', 'merchant', 'admin']).optional(),
  status: z.enum(['active', 'suspended', 'banned']).optional(),
}).refine((value) => value.full_name !== undefined || value.role !== undefined || value.status !== undefined);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await authorizeAdminRequest(request, { readOnly: true });
    if (!access.authorized) return access.response;
    const rate = checkRateLimit(request, 'admin-user-read', 120, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many user lookups. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
      );
    }
    const { id } = await params;
    if (!userIdSchema.safeParse(id).success) {
      return NextResponse.json({ error: 'Invalid user identifier.' }, { status: 400 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'User management is not configured on this server.' }, { status: 503 });
    }

    const service = createServiceRoleClient();
    const { data, error } = await service.rpc('admin_user_management_detail', {
      p_admin_id: access.user.id,
      p_target_id: id,
    });
    if (error) throw new Error(`Unable to load user details: ${error.message}`);
    if (!data) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    captureError(error, { route: '/api/admin/users/[id]' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load user details.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let service: ReturnType<typeof createServiceRoleClient> | null = null;
  let previousStatus: string | null = null;
  let statusWasChanged = false;
  let targetId = '';
  try {
    const access = await authorizeAdminRequest(request);
    if (!access.authorized) return access.response;
    const { id } = await params;
    targetId = id;
    if (!userIdSchema.safeParse(id).success) {
      return NextResponse.json({ error: 'Invalid user identifier.' }, { status: 400 });
    }
    const body = await readJson(request);
    if (body instanceof NextResponse) return body;
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid user changes.' }, { status: 400 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'User management is not configured on this server.' }, { status: 503 });
    }

    service = createServiceRoleClient();
    const { data: profile, error: profileError } = await service
      .from('profiles')
      .select('full_name, role, account_status')
      .eq('id', id)
      .maybeSingle();
    if (profileError) throw new Error(`Unable to load user profile: ${profileError.message}`);
    if (!profile) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    previousStatus = profile.account_status;

    if (parsed.data.status && parsed.data.status !== profile.account_status) {
      const { error: authError } = await service.auth.admin.updateUserById(id, {
        ban_duration: parsed.data.status === 'active' ? 'none' : '876000h',
      });
      if (authError) throw new Error(`Unable to update sign-in access: ${authError.message}`);
      statusWasChanged = true;
    }

    const { data, error } = await service.rpc('admin_update_managed_user', {
      p_admin_id: access.user.id,
      p_target_id: id,
      p_update_name: parsed.data.full_name !== undefined,
      p_full_name: parsed.data.full_name ?? null,
      p_role: parsed.data.role ?? null,
      p_status: parsed.data.status ?? null,
    });
    if (error) throw new Error(`Unable to update user: ${error.message}`);
    return NextResponse.json({ user: data });
  } catch (error) {
    if (service && statusWasChanged && previousStatus) {
      const { error: rollbackError } = await service.auth.admin.updateUserById(targetId, {
        ban_duration: previousStatus === 'active' ? 'none' : '876000h',
      });
      if (rollbackError) {
        captureError(rollbackError, { route: '/api/admin/users/[id]', operation: 'restore-auth-status' });
      }
    }
    captureError(error, { route: '/api/admin/users/[id]', operation: 'update' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update user.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await authorizeAdminRequest(request);
    if (!access.authorized) return access.response;
    const { id } = await params;
    if (!userIdSchema.safeParse(id).success) {
      return NextResponse.json({ error: 'Invalid user identifier.' }, { status: 400 });
    }
    if (id === access.user.id) {
      return NextResponse.json({ error: 'You cannot delete your own administrator account.' }, { status: 403 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'User management is not configured on this server.' }, { status: 503 });
    }

    const service = createServiceRoleClient();
    const { data: profile, error: profileError } = await service
      .from('profiles')
      .select('role')
      .eq('id', id)
      .maybeSingle();
    if (profileError) throw new Error(`Unable to load user profile: ${profileError.message}`);
    if (!profile) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if (profile.role === 'admin') {
      return NextResponse.json(
        { error: 'Administrator accounts cannot be deleted here. Demote the account first, and retain the admin audit history.' },
        { status: 403 },
      );
    }
    const { count: storeMembershipCount, error: membershipError } = await service
      .from('store_users')
      .select('store_id', { count: 'exact', head: true })
      .eq('user_id', id);
    if (membershipError) throw new Error(`Unable to check merchant store ownership: ${membershipError.message}`);
    if (storeMembershipCount) {
      return NextResponse.json(
        { error: 'This user still has merchant store memberships. Transfer or remove those memberships before deleting the account.' },
        { status: 409 },
      );
    }
    const { count: auditHistoryCount, error: historyError } = await service
      .from('admin_actions')
      .select('id', { count: 'exact', head: true })
      .eq('admin_id', id);
    if (historyError) throw new Error(`Unable to check administrator audit history: ${historyError.message}`);
    if (auditHistoryCount) {
      return NextResponse.json(
        { error: 'This account has administrator audit history and cannot be deleted. The history must be retained.' },
        { status: 409 },
      );
    }

    const { data: audit, error: auditError } = await service
      .from('admin_actions')
      .insert({
        admin_id: access.user.id,
        action: 'USER_DELETE_REQUESTED',
        target_table: 'auth.users',
        target_id: id,
        details: { status: 'in_progress' },
      })
      .select('id')
      .single();
    if (auditError) throw new Error(`Unable to record the deletion audit event: ${auditError.message}`);

    try {
      const { error: productReviewError } = await service.from('product_reviews').delete().eq('user_id', id);
      if (productReviewError) throw new Error(`Unable to remove user reviews: ${productReviewError.message}`);
      const { error: storeReviewError } = await service.from('store_reviews').delete().eq('user_id', id);
      if (storeReviewError) throw new Error(`Unable to remove user store reviews: ${storeReviewError.message}`);
      const { error: clickError } = await service.from('affiliate_clicks').update({ user_id: null }).eq('user_id', id);
      if (clickError) throw new Error(`Unable to detach affiliate history: ${clickError.message}`);

      const { error: deleteError } = await service.auth.admin.deleteUser(id);
      if (deleteError) throw new Error(`Unable to delete user account: ${deleteError.message}`);

      const { error: completedAuditError } = await service
        .from('admin_actions')
        .update({ action: 'USER_DELETED', details: { status: 'completed' } })
        .eq('id', audit.id);
      if (completedAuditError) {
        captureError(completedAuditError, { route: '/api/admin/users/[id]', operation: 'complete-delete-audit' });
      }
      return NextResponse.json({ deleted: true });
    } catch (error) {
      const { error: auditUpdateError } = await service
        .from('admin_actions')
        .update({ action: 'USER_DELETE_FAILED', details: { status: 'failed' } })
        .eq('id', audit.id);
      if (auditUpdateError) captureError(auditUpdateError, { route: '/api/admin/users/[id]', operation: 'record-delete-failure' });
      throw error;
    }
  } catch (error) {
    captureError(error, { route: '/api/admin/users/[id]', operation: 'delete' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to delete user.' },
      { status: 500 },
    );
  }
}
