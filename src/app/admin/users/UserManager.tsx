'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';

type UserStatus = 'active' | 'suspended' | 'banned' | 'pending';
type UserRole = 'customer' | 'merchant' | 'admin';
type UserRecord = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  last_sign_in_at: string | null;
  updated_at: string | null;
  favorites_count: number;
  reports_count: number;
  reviews_count: number;
  merchant_stores: string | null;
  merchant_application_status: string | null;
};
type UserActivity = { type: string; label: string; created_at: string };
type MerchantStore = { id: string; name: string };
type UserDetail = Omit<UserRecord, 'merchant_stores'> & {
  merchant_stores: MerchantStore[];
  merchant_application_status: string | null;
};
type UserListResponse = { total: number; users: UserRecord[] };
type UserDetailResponse = { user: UserDetail; activity: UserActivity[] };
type SortOption = { sort: string; direction: 'asc' | 'desc'; label: string };
type PendingAction =
  | { kind: 'status'; status: Exclude<UserStatus, 'pending'> }
  | { kind: 'delete' };

const STATUS_FILTERS = ['all', 'active', 'suspended', 'banned', 'pending'] as const;
const ROLE_FILTERS = ['all', 'customer', 'merchant', 'admin'] as const;
const SORT_OPTIONS: SortOption[] = [
  { sort: 'joined', direction: 'desc', label: 'Newest joined' },
  { sort: 'joined', direction: 'asc', label: 'Oldest joined' },
  { sort: 'last_active', direction: 'desc', label: 'Recently active' },
  { sort: 'name', direction: 'asc', label: 'Name A–Z' },
  { sort: 'email', direction: 'asc', label: 'Email A–Z' },
  { sort: 'role', direction: 'asc', label: 'Role' },
  { sort: 'status', direction: 'asc', label: 'Status' },
];

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return 'Never';
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp)
    : 'Unknown';
}

function nameOf(user: Pick<UserRecord, 'full_name' | 'email'>) {
  return user.full_name?.trim() || user.email || 'Unnamed user';
}

function initials(user: Pick<UserRecord, 'full_name' | 'email'>) {
  const name = user.full_name?.trim();
  if (name) return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return user.email?.[0]?.toUpperCase() || '?';
}

function StatusPill({ status }: { status: UserStatus }) {
  const color = status === 'active'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
    : status === 'pending'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
      : status === 'suspended'
        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200'
        : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{humanize(status)}</span>;
}

function UserAvatar({ user, size = 'md' }: { user: Pick<UserRecord, 'full_name' | 'email' | 'avatar_url'>; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-16 w-16 text-xl' : size === 'sm' ? 'h-9 w-9 text-xs' : 'h-10 w-10 text-sm';
  return (
    <div role="img" aria-label={`${nameOf(user)} avatar`} className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-milevo-primary/20 font-bold text-milevo-ink ${sizeClass}`}>
      {user.avatar_url
        ? <Image src={user.avatar_url} alt="" width={size === 'lg' ? 64 : size === 'sm' ? 36 : 40} height={size === 'lg' ? 64 : size === 'sm' ? 36 : 40} unoptimized referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        : initials(user)}
    </div>
  );
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? 'The request could not be completed.');
  return result;
}

export function UserManager() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const [role, setRole] = useState<(typeof ROLE_FILTERS)[number]>('all');
  const [sortOption, setSortOption] = useState('joined:desc');
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailReload, setDetailReload] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('customer');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const sort = useMemo(() => SORT_OPTIONS.find((option) => `${option.sort}:${option.direction}` === sortOption) ?? SORT_OPTIONS[0], [sortOption]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      search,
      status,
      role,
      sort: sort.sort,
      direction: sort.direction,
      page: String(page),
      pageSize: String(pageSize),
    });
    setLoading(true);
    setError(null);
    void fetch(`/api/admin/users?${params}`, { signal: controller.signal, cache: 'no-store' })
      .then(readApiResponse<UserListResponse>)
      .then((result) => {
        setUsers(result.users);
        setTotal(result.total);
        if (page > 1 && result.total <= (page - 1) * pageSize) {
          setPage(Math.max(1, Math.ceil(result.total / pageSize)));
        }
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Unable to load users.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [search, status, role, sort, page, pageSize, refreshKey]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    const controller = new AbortController();
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    void fetch(`/api/admin/users/${selectedId}`, { signal: controller.signal, cache: 'no-store' })
      .then(readApiResponse<UserDetailResponse>)
      .then((result) => {
        setDetail(result);
        setEditName(result.user.full_name ?? '');
        setEditRole(result.user.role);
        setEditing(false);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setDetailError(cause instanceof Error ? cause.message : 'Unable to load user details.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [selectedId, detailReload]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await readApiResponse(await fetch(`/api/admin/users/${detail.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: editName, role: editRole }),
      }));
      setEditing(false);
      setDetailReload((value) => value + 1);
      refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Unable to save user details.');
    } finally {
      setBusy(false);
    }
  }

  async function runAction() {
    if (!detail || !pendingAction || busy) return;
    if (pendingAction.kind === 'delete' && deleteConfirmation !== 'DELETE') return;
    setBusy(true);
    setActionError(null);
    try {
      if (pendingAction.kind === 'delete') {
        await readApiResponse(await fetch(`/api/admin/users/${detail.user.id}`, { method: 'DELETE' }));
        setPendingAction(null);
        setSelectedId(null);
        refresh();
        return;
      }
      await readApiResponse(await fetch(`/api/admin/users/${detail.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: pendingAction.status }),
      }));
      setPendingAction(null);
      setDeleteConfirmation('');
      setDetailReload((value) => value + 1);
      refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Unable to complete this action.');
    } finally {
      setBusy(false);
    }
  }

  const selectedStatus = detail?.user.status;
  const confirmationTitle = pendingAction?.kind === 'delete'
    ? 'Delete user?'
    : pendingAction?.status === 'suspended'
      ? 'Suspend user?'
      : pendingAction?.status === 'banned'
        ? 'Ban user?'
        : pendingAction?.status === 'active' && selectedStatus === 'banned'
          ? 'Unban user?'
          : 'Unsuspend user?';
  const confirmationDescription = pendingAction?.kind === 'delete'
    ? 'This action cannot be easily undone. The account and associated personal data will be removed; audit history and anonymous reports are retained.'
    : pendingAction?.status === 'suspended'
      ? 'This will prevent the user from accessing their Milevo account until they are unsuspended.'
      : pendingAction?.status === 'banned'
        ? 'This will block the user from signing in until an administrator unbans them.'
        : 'This will restore the user’s ability to sign in and use their account.';

  function openStatusAction(nextStatus: Exclude<UserStatus, 'pending'>) {
    setActionError(null);
    setPendingAction({ kind: 'status', status: nextStatus });
  }

  return (
    <section className="min-w-0">
      <header className="border-b border-milevo-border p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">User management</h1>
            <p className="mt-1 text-sm text-milevo-muted">View and manage registered Milevo users.</p>
          </div>
          <Button type="button" variant="secondary" onClick={refresh} loading={loading} loadingText="Refreshing…">
            <Icon name="refresh" size={16} className="mr-2" /> Refresh
          </Button>
        </div>
      </header>

      <div className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-3 rounded-lg border border-milevo-border bg-white p-3 dark:bg-[#202020] sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_160px_180px_120px]">
          <label className="relative block">
            <span className="sr-only">Search users by name, email, or ID</span>
            <Icon name="search" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-milevo-muted" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search name, email, or user ID"
              className="min-h-touch w-full rounded-md border border-milevo-border bg-white pl-10 pr-3 text-sm dark:bg-[#1b1b1b]"
            />
          </label>
          <label className="text-xs font-medium text-milevo-muted">
            <span className="sr-only">Filter by status</span>
            <select value={status} onChange={(event) => { setStatus(event.target.value as (typeof STATUS_FILTERS)[number]); setPage(1); }} className="min-h-touch w-full rounded-md border border-milevo-border bg-white px-3 text-sm text-milevo-text dark:bg-[#1b1b1b]">
              {STATUS_FILTERS.map((item) => <option key={item} value={item}>{item === 'all' ? 'All statuses' : humanize(item)}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-milevo-muted">
            <span className="sr-only">Filter by role</span>
            <select value={role} onChange={(event) => { setRole(event.target.value as (typeof ROLE_FILTERS)[number]); setPage(1); }} className="min-h-touch w-full rounded-md border border-milevo-border bg-white px-3 text-sm text-milevo-text dark:bg-[#1b1b1b]">
              {ROLE_FILTERS.map((item) => <option key={item} value={item}>{item === 'all' ? 'All roles' : humanize(item)}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-milevo-muted">
            <span className="sr-only">Sort users</span>
            <select value={sortOption} onChange={(event) => { setSortOption(event.target.value); setPage(1); }} className="min-h-touch w-full rounded-md border border-milevo-border bg-white px-3 text-sm text-milevo-text dark:bg-[#1b1b1b]">
              {SORT_OPTIONS.map((item) => <option key={`${item.sort}:${item.direction}`} value={`${item.sort}:${item.direction}`}>{item.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-milevo-muted">
            <span className="sr-only">Page size</span>
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="min-h-touch w-full rounded-md border border-milevo-border bg-white px-3 text-sm text-milevo-text dark:bg-[#1b1b1b]">
              {[10, 20, 50].map((size) => <option key={size} value={size}>{size} per page</option>)}
            </select>
          </label>
        </div>

        <div className="flex items-center justify-between text-sm text-milevo-muted">
          <span>{total.toLocaleString()} {total === 1 ? 'user' : 'users'}</span>
          {loading && <span role="status">Loading users…</span>}
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            <p role="alert">{error}</p>
            <Button type="button" variant="secondary" className="mt-3" onClick={refresh}>Try again</Button>
          </div>
        ) : loading && users.length === 0 ? (
          <div className="space-y-3" aria-label="Loading user list">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-lg bg-milevo-bg dark:bg-white/10" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-lg border border-milevo-border bg-white px-5 py-14 text-center dark:bg-[#202020]">
            <h2 className="font-semibold">No users found</h2>
            <p className="mt-1 text-sm text-milevo-muted">Try changing your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-lg border border-milevo-border bg-white dark:bg-[#202020] xl:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                  <thead className="bg-milevo-bg text-xs uppercase tracking-wide text-milevo-muted dark:bg-white/5">
                    <tr>
                      <th className="px-4 py-3 font-semibold">User</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Date joined</th>
                      <th className="px-4 py-3 font-semibold">Last active</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-milevo-border">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-milevo-bg/60 dark:hover:bg-white/5">
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => setSelectedId(user.id)} className="flex min-w-0 items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-milevo-primary">
                            <UserAvatar user={user} />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">{nameOf(user)}</span>
                              <span className="block max-w-[260px] truncate text-xs text-milevo-muted">{user.email ?? user.id}</span>
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3 capitalize">{user.role}</td>
                        <td className="px-4 py-3"><StatusPill status={user.status} /></td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(user.created_at)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(user.last_sign_in_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button type="button" size="sm" variant="secondary" onClick={() => setSelectedId(user.id)}>View</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="space-y-3 xl:hidden">
              {users.map((user) => (
                <article key={user.id} className="rounded-lg border border-milevo-border bg-white p-4 dark:bg-[#202020]">
                  <button type="button" onClick={() => setSelectedId(user.id)} className="flex w-full items-center gap-3 text-left">
                    <UserAvatar user={user} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{nameOf(user)}</span>
                      <span className="block truncate text-xs text-milevo-muted">{user.email ?? user.id}</span>
                    </span>
                    <Icon name="chevron-right" size={18} className="text-milevo-muted" />
                  </button>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-milevo-border pt-3 text-xs">
                    <StatusPill status={user.status} />
                    <span className="capitalize text-milevo-muted">{user.role}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-milevo-muted">
                    <span>Joined: {formatDate(user.created_at)}</span>
                    <span>Last active: {formatDate(user.last_sign_in_at)}</span>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-milevo-border pt-4">
          <p className="text-xs text-milevo-muted">
            {total === 0 ? 'No matching users' : `Page ${Math.min(page, totalPages)} of ${totalPages} · ${total.toLocaleString()} users`}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              <Icon name="chevron-left" size={16} className="mr-1" /> Previous
            </Button>
            <Button type="button" variant="secondary" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
              Next <Icon name="chevron-right" size={16} className="ml-1" />
            </Button>
          </div>
        </footer>
      </div>

      <Dialog open={Boolean(selectedId)} onOpenChange={(open) => { if (!open && !busy) setSelectedId(null); }}>
        <DialogContent className="max-h-[90vh] w-[min(760px,94vw)] overflow-y-auto dark:bg-[#202020]">
          <DialogTitle className="pr-10">User details</DialogTitle>
          {detailLoading && <div className="py-16 text-center text-sm text-milevo-muted">Loading user details…</div>}
          {detailError && <p role="alert" className="py-8 text-sm text-red-600">{detailError}</p>}
          {detail && (
            <>
              <div className="mt-4 flex flex-wrap items-start gap-4 border-b border-milevo-border pb-5">
                <UserAvatar user={detail.user} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-lg font-bold">{nameOf(detail.user)}</h2>
                  <p className="break-all text-sm text-milevo-muted">{detail.user.email ?? 'No email address'}</p>
                  <p className="mt-1 break-all font-mono text-xs text-milevo-muted">ID: {detail.user.id}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusPill status={detail.user.status} />
                    <span className="rounded-full bg-milevo-bg px-2.5 py-1 text-xs font-semibold capitalize dark:bg-white/10">{detail.user.role}</span>
                  </div>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={() => setEditing((value) => !value)}>
                  {editing ? 'Cancel edit' : 'Edit profile'}
                </Button>
              </div>

              {editing && (
                <form onSubmit={saveProfile} className="my-4 grid gap-3 rounded-lg border border-milevo-border p-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Full name
                    <input maxLength={120} value={editName} onChange={(event) => setEditName(event.target.value)} className="mt-1 min-h-touch w-full rounded-md border border-milevo-border bg-white px-3 text-sm dark:bg-[#1b1b1b]" />
                  </label>
                  <label className="text-sm font-medium">
                    Role
                    <select value={editRole} onChange={(event) => setEditRole(event.target.value as UserRole)} className="mt-1 min-h-touch w-full rounded-md border border-milevo-border bg-white px-3 text-sm dark:bg-[#1b1b1b]">
                      {ROLE_FILTERS.filter((item): item is UserRole => item !== 'all').map((item) => <option key={item} value={item}>{humanize(item)}</option>)}
                    </select>
                    <span className="mt-1 block text-xs font-normal text-milevo-muted">Merchant access requires an existing store membership; new merchants must be approved.</span>
                  </label>
                  <Button type="submit" loading={busy} loadingText="Saving…" className="sm:col-span-2">Save changes</Button>
                </form>
              )}

              {actionError && <p role="alert" className="my-3 text-sm text-red-600">{actionError}</p>}
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <InfoItem label="Date registered" value={formatDate(detail.user.created_at)} />
                <InfoItem label="Last login" value={formatDate(detail.user.last_sign_in_at)} />
                <InfoItem label="Last profile update" value={formatDate(detail.user.updated_at)} />
                <InfoItem label="Favorites" value={String(detail.user.favorites_count)} />
                <InfoItem label="Reports submitted" value={String(detail.user.reports_count)} />
                <InfoItem label="Reviews submitted" value={String(detail.user.reviews_count)} />
              </div>

              {(detail.user.role === 'merchant' || detail.user.merchant_application_status || detail.user.merchant_stores.length > 0) && (
                <div className="mt-5 rounded-lg border border-milevo-border p-4">
                  <h3 className="text-sm font-semibold">Merchant status</h3>
                  {detail.user.merchant_application_status && (
                    <p className="mt-1 text-sm text-milevo-muted">Latest application: {humanize(detail.user.merchant_application_status)}</p>
                  )}
                  {detail.user.merchant_stores.length > 0
                    ? <ul className="mt-2 list-inside list-disc text-sm">{detail.user.merchant_stores.map((store) => <li key={store.id}>{store.name}</li>)}</ul>
                    : <p className="mt-1 text-sm text-milevo-muted">No store memberships.</p>}
                </div>
              )}

              <div className="mt-5">
                <h3 className="text-sm font-semibold">Recent activity</h3>
                {detail.activity.length ? (
                  <ol className="mt-2 divide-y divide-milevo-border rounded-lg border border-milevo-border">
                    {detail.activity.map((item, index) => (
                      <li key={`${item.type}:${item.created_at}:${index}`} className="flex flex-wrap justify-between gap-2 px-3 py-2.5 text-sm">
                        <span>{item.label}</span><time className="text-xs text-milevo-muted">{formatDate(item.created_at)}</time>
                      </li>
                    ))}
                  </ol>
                ) : <p className="mt-2 text-sm text-milevo-muted">No activity records are available.</p>}
              </div>

              <div className="mt-5 border-t border-milevo-border pt-4">
                <h3 className="text-sm font-semibold">Account actions</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {detail.user.status === 'active' || detail.user.status === 'pending' ? (
                    <Button type="button" variant="secondary" size="sm" onClick={() => openStatusAction('suspended')}>Suspend</Button>
                  ) : (
                    <Button type="button" variant="secondary" size="sm" onClick={() => openStatusAction('active')}>{detail.user.status === 'banned' ? 'Unban' : 'Unsuspend'}</Button>
                  )}
                  {detail.user.status !== 'banned' && <Button type="button" variant="secondary" size="sm" onClick={() => openStatusAction('banned')}>Ban</Button>}
                  <Button type="button" variant="secondary" size="sm" className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30" onClick={() => { setDeleteConfirmation(''); setPendingAction({ kind: 'delete' }); }}>
                    Delete account
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open && !busy) { setPendingAction(null); setActionError(null); } }}>
        <DialogContent className="dark:bg-[#202020]">
          <DialogTitle>{confirmationTitle}</DialogTitle>
          <p className="mt-3 text-sm leading-6 text-milevo-muted">{confirmationDescription}</p>
          {pendingAction?.kind === 'delete' && (
            <label className="mt-4 block text-sm font-medium">
              Type DELETE to confirm
              <input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} className="mt-1 min-h-touch w-full rounded-md border border-milevo-border bg-white px-3 dark:bg-[#1b1b1b]" autoComplete="off" />
            </label>
          )}
          {actionError && <p role="alert" className="mt-3 text-sm text-red-600">{actionError}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setPendingAction(null)}>Cancel</Button>
            <Button
              type="button"
              className={pendingAction?.kind === 'delete' || pendingAction?.status === 'banned' ? 'bg-red-700 text-white hover:bg-red-800' : ''}
              disabled={pendingAction?.kind === 'delete' && deleteConfirmation !== 'DELETE'}
              loading={busy}
              loadingText="Working…"
              onClick={() => void runAction()}
            >
              {pendingAction?.kind === 'delete' ? 'Delete user' : pendingAction?.status === 'active' ? 'Restore access' : humanize(pendingAction?.status ?? '')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-milevo-border p-3">
    <p className="text-xs text-milevo-muted">{label}</p>
    <p className="mt-1 break-words text-sm font-semibold">{value}</p>
  </div>;
}
