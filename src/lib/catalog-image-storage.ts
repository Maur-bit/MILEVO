'use client';

import { createClient } from '@/lib/supabase/client';
import { CATALOG_IMAGE_BUCKET, getCatalogImageObjectPath } from '@/lib/catalog-image-path';

export async function removeCatalogImage(imageUrl: string) {
  const path = getCatalogImageObjectPath(imageUrl, process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!path) return null;
  const { error } = await createClient().storage.from(CATALOG_IMAGE_BUCKET).remove([path]);
  return error?.message ?? null;
}
