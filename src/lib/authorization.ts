export function hasMerchantPortalAccess(role: string | null | undefined): boolean {
  return role === 'merchant' || role === 'admin';
}

export function canManageMerchantStore(
  role: string | null | undefined,
  isStoreMember: boolean,
): boolean {
  return role === 'merchant' && isStoreMember;
}
