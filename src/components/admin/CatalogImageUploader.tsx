'use client';

import { useId, useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { CATALOG_IMAGE_BUCKET, getCatalogImageObjectPath } from '@/lib/catalog-image-path';
import { createClient } from '@/lib/supabase/client';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
} as const;

type ImageType = keyof typeof IMAGE_TYPES;

function isImageType(type: string): type is ImageType {
  return Object.prototype.hasOwnProperty.call(IMAGE_TYPES, type);
}

export function CatalogImageUploader({
  entity,
  entityId,
  label,
  currentUrl,
  onUploaded,
}: {
  entity: 'products' | 'stores';
  entityId: string;
  label: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => Promise<void>;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function upload(file: File | undefined) {
    if (!file) return;
    setError('');
    setNotice('');
    if (!isImageType(file.type)) {
      setError('Choose a JPEG, PNG, WebP, or AVIF image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Images must be 5 MB or smaller.');
      return;
    }

    setBusy(true);
    const extension = IMAGE_TYPES[file.type];
    const objectPath = `${entity}/${entityId}/${crypto.randomUUID()}.${extension}`;
    const supabase = createClient();
    try {
      const { error: uploadError } = await supabase.storage.from(CATALOG_IMAGE_BUCKET).upload(objectPath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

      const { data } = supabase.storage.from(CATALOG_IMAGE_BUCKET).getPublicUrl(objectPath);
      try {
        await onUploaded(data.publicUrl);
      } catch (cause) {
        const { error: cleanupError } = await supabase.storage.from(CATALOG_IMAGE_BUCKET).remove([objectPath]);
        const causeMessage = cause instanceof Error ? cause.message : 'Unable to save image details.';
        if (cleanupError) throw new Error(`${causeMessage} The uploaded file could not be cleaned up: ${cleanupError.message}`);
        throw cause;
      }

      setNotice('Image uploaded successfully.');
      if (currentUrl) {
        const previousPath = getCatalogImageObjectPath(currentUrl, process.env.NEXT_PUBLIC_SUPABASE_URL);
        if (previousPath) {
          const { error: cleanupError } = await supabase.storage.from(CATALOG_IMAGE_BUCKET).remove([previousPath]);
          if (cleanupError) {
            setNotice(`Image updated, but the previous file could not be removed: ${cleanupError.message}`);
          }
        }
      }
      if (input.current) input.current.value = '';
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Image upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {currentUrl && (
        <Image src={currentUrl} alt={`${label} preview`} width={96} height={96} unoptimized className="h-24 w-24 rounded-md border border-milevo-border bg-milevo-bg object-contain" />
      )}
      <input
        ref={input}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        aria-label={`Choose ${label.toLowerCase()} file`}
        className="sr-only"
        disabled={busy}
        onChange={(event) => void upload(event.target.files?.[0])}
      />
      <Button type="button" variant="secondary" disabled={busy} loading={busy} loadingText="Uploading…"
        onClick={() => input.current?.click()}>
        {currentUrl ? 'Replace image' : 'Choose image'}
      </Button>
      <p className="text-xs text-milevo-muted">JPEG, PNG, WebP, or AVIF; up to 5 MB.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {notice && <p role="status" className="text-sm text-milevo-success">{notice}</p>}
    </div>
  );
}
