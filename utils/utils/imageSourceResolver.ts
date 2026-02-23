/**
 * Image Source Resolver — Stub for Svelte Migration
 *
 * TODO: Copy full implementation from React source at
 * field-studio/utils/imageSourceResolver.ts
 */

import type { IIIFCanvas, IIIFItem } from '@/src/shared/types';

/**
 * Resolve hierarchical thumbnail URLs for a canvas at the given width.
 * Returns array of candidate URLs in priority order.
 */
export function resolveHierarchicalThumbs(_canvas: IIIFCanvas | IIIFItem, _width: number): string[] {
  const canvas = _canvas as IIIFCanvas;
  if (canvas._blobUrl) return [canvas._blobUrl];
  if (canvas.thumbnail?.[0]?.id) return [canvas.thumbnail[0].id];
  return [];
}

/**
 * Resolve a single thumbnail URL for a canvas.
 */
export function resolveHierarchicalThumb(_item: IIIFItem, _size: number): string | null {
  const canvas = _item as IIIFCanvas;
  if (canvas._blobUrl) return canvas._blobUrl;
  if (canvas.thumbnail?.[0]?.id) return canvas.thumbnail[0].id;
  return null;
}
