export const CATALOG_IMAGE_BUCKET = 'catalog-images';

const imagePathPattern = /^(products|stores)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|avif)$/i;

export function getCatalogImageObjectPath(imageUrl: string, projectUrl: string | undefined) {
  if (!projectUrl) return null;
  try {
    const project = new URL(projectUrl);
    const image = new URL(imageUrl);
    const prefix = '/storage/v1/object/public/catalog-images/';
    if (image.origin !== project.origin || !image.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(image.pathname.slice(prefix.length));
    return imagePathPattern.test(path) ? path : null;
  } catch {
    return null;
  }
}
