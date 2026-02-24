/**
 * imageSourceResolver — Stub for Svelte migration
 *
 * Resolves IIIF image sources from canvas objects for rendering.
 * Full implementation deferred to canvas entity migration.
 *
 * Original: src/utils/imageSourceResolver.ts
 */

import type { IIIFCanvas } from '@/src/shared/types';

export interface ImageSource {
  url: string;
  width?: number;
  height?: number;
  type: 'iiif' | 'plain' | 'video' | 'audio';
}

/**
 * Resolve the primary image source from a canvas.
 * Returns null if no image body can be found.
 */
export function resolveImageSource(canvas: IIIFCanvas): ImageSource | null {
  // TYPE_DEBT: canvas.items[0].items[0] chain needs IIIFAnnotationPage/IIIFAnnotation narrowing.
  // Deferred: body shape varies across TextualBody/ExternalWebResource/Choice; id/@id access unsafe without narrowing.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = (canvas as any).items?.[0]?.items?.[0]?.body;
  if (!body) return null;
  const url = body.id ?? body['@id'];
  if (!url) return null;
  return {
    url,
    width: body.width ?? canvas.width,
    height: body.height ?? canvas.height,
    type: 'plain',
  };
}

/**
 * Resolve hierarchical thumbnails from a canvas or collection.
 * Used by ArchiveGrid for fast thumbnail rendering.
 */
export function resolveHierarchicalThumbs(
  item: IIIFCanvas | Record<string, unknown>,
  maxCount = 4
): string[] {
  const results: string[] = [];
  // TYPE_DEBT: thumbnail/items accessed dynamically; IIIFCanvas|Record<string,unknown> union makes
  // direct property access unsafe without narrowing each branch. Deferred: same root cause as items/service any[].
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const thumb = (item as any).thumbnail;
  if (thumb) {
    const thumbs = Array.isArray(thumb) ? thumb : [thumb];
    for (const t of thumbs.slice(0, maxCount)) {
      const url = typeof t === 'string' ? t : t?.id;
      if (url) results.push(url);
    }
  }
  if (results.length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (item as any).items?.[0]?.items?.[0]?.body;
    if (body?.id) results.push(body.id);
  }
  return results.slice(0, maxCount);
}
