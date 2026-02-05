/**
 * Image Source Resolver
 * Organism - depends on traversal and media-detection
 */

import { findAllOfType } from './traversal';
import {
  getMimeType,
  getMimeTypeString,
  isImageMimeType,
  isVisualMimeType,
} from '../../molecules/media-detection';
import type { IIIFItem } from '../../../types';

// ============================================================================
// Types
// ============================================================================

export interface IIIFCanvasLike {
  id: string;
  type: 'Canvas';
  items?: IIIFItem[];
  thumbnail?: ImageSourceResult[];
}

export interface IIIFItemLike {
  id: string;
  type: string;
  items?: IIIFItemLike[];
}

export interface ImageSourceResult {
  id: string;
  type: string;
  format?: string;
  width?: number;
  height?: number;
  service?: unknown;
}

export interface ResolveImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  preferredFormat?: string;
}

// ============================================================================
// Resolution Functions
// ============================================================================

/**
 * Resolve image source from a Canvas
 */
export function resolveImageSource(
  canvas: IIIFCanvasLike,
  options: ResolveImageOptions = {}
): ImageSourceResult | undefined {
  const { maxWidth } = options;

  // Check for thumbnail first
  if (canvas.thumbnail && canvas.thumbnail.length > 0) {
    return canvas.thumbnail[0];
  }

  // Look in painting annotations
  if (canvas.items && canvas.items.length > 0) {
    const annotationPage = canvas.items[0];
    const ap = annotationPage as Record<string, unknown>;
    const items = ap.items as IIIFItem[] | undefined;

    if (items && items.length > 0) {
      const annotation = items[0];
      const a = annotation as Record<string, unknown>;
      const body = a.body as ImageSourceResult | undefined;

      if (body) {
        return {
          ...body,
          width: maxWidth || body.width,
        };
      }
    }
  }

  return undefined;
}

/**
 * Resolve thumbnail URL for any resource
 */
export function resolveThumbUrl(
  item: IIIFItemLike,
  defaultSize = 200
): string | undefined {
  const i = item as Record<string, unknown>;

  // Direct thumbnail
  if (i.thumbnail && Array.isArray(i.thumbnail) && i.thumbnail.length > 0) {
    const thumb = i.thumbnail[0] as ImageSourceResult;
    return thumb.id;
  }

  // For Manifest, get first Canvas thumbnail
  if (item.type === 'Manifest' && item.items && item.items.length > 0) {
    const firstCanvas = item.items[0] as IIIFCanvasLike;
    const source = resolveImageSource(firstCanvas);
    if (source) {
      return source.id;
    }
  }

  // For Collection, get first Manifest thumbnail
  if (item.type === 'Collection' && item.items && item.items.length > 0) {
    const firstManifest = item.items[0] as IIIFItemLike;
    return resolveThumbUrl(firstManifest, defaultSize);
  }

  return undefined;
}

/**
 * Resolve preview URL (larger than thumbnail)
 */
export function resolvePreviewUrl(
  item: IIIFItemLike,
  size = 800
): string | undefined {
  return resolveThumbUrl(item, size);
}

/**
 * Resolve hierarchical thumbnails for Collection/Manifest
 */
export function resolveHierarchicalThumbs(
  item: IIIFItemLike,
  maxDepth = 2
): Array<{ id: string; thumbUrl: string | undefined }> {
  const results: Array<{ id: string; thumbUrl: string | undefined }> = [];

  const process = (current: IIIFItemLike, depth: number) => {
    if (depth > maxDepth) return;

    results.push({
      id: current.id,
      thumbUrl: resolveThumbUrl(current),
    });

    if (current.items) {
      current.items.forEach((child) => process(child, depth + 1));
    }
  };

  process(item, 0);
  return results;
}

/**
 * Resolve thumbnail for a single item with fallbacks
 */
export function resolveHierarchicalThumb(item: IIIFItemLike): string | undefined {
  // Try the item itself
  let url = resolveThumbUrl(item);
  if (url) return url;

  // Try children
  if (item.items && item.items.length > 0) {
    for (const child of item.items) {
      url = resolveThumbUrl(child);
      if (url) return url;
    }
  }

  return undefined;
}

// ============================================================================
// Deep Zoom Capability
// ============================================================================

/**
 * Check if a Canvas has deep zoom capability (Image Service)
 */
export function hasDeepZoomCapability(canvas: IIIFCanvasLike): boolean {
  const source = resolveImageSource(canvas);
  if (!source) return false;

  // Check for IIIF Image Service
  if (source.service && Array.isArray(source.service)) {
    return source.service.some(
      (s) =>
        (s as Record<string, string>).type === 'ImageService2' ||
        (s as Record<string, string>).type === 'ImageService3'
    );
  }

  return false;
}

/**
 * Get Image Service info from a Canvas
 */
export function getImageServiceInfo(
  canvas: IIIFCanvasLike
): Record<string, unknown> | undefined {
  const source = resolveImageSource(canvas);
  if (!source?.service) return undefined;

  if (Array.isArray(source.service) && source.service.length > 0) {
    return source.service[0] as Record<string, unknown>;
  }

  return undefined;
}

// ============================================================================
// Leaf Canvas Resolution
// ============================================================================

/**
 * Resolve all leaf Canvases from a resource
 */
export function resolveLeafCanvases(item: IIIFItemLike): IIIFCanvasLike[] {
  if (item.type === 'Canvas') {
    return [item as IIIFCanvasLike];
  }

  if (item.type === 'Manifest') {
    return (item.items as IIIFCanvasLike[]) || [];
  }

  if (item.type === 'Collection' && item.items) {
    const canvases: IIIFCanvasLike[] = [];
    for (const child of item.items) {
      canvases.push(...resolveLeafCanvases(child));
    }
    return canvases;
  }

  return [];
}

// ============================================================================
// MIME Type Helpers
// ============================================================================

/**
 * Check if Canvas content is an image
 */
export function isCanvasImage(canvas: IIIFCanvasLike): boolean {
  const source = resolveImageSource(canvas);
  if (!source?.format) return false;
  return isImageMimeType(source.format);
}

/**
 * Check if Canvas content is visual (image or video)
 */
export function isCanvasVisual(canvas: IIIFCanvasLike): boolean {
  const source = resolveImageSource(canvas);
  if (!source?.format) return false;
  return isVisualMimeType(source.format);
}

/**
 * Get Canvas content MIME type
 */
export function getCanvasMimeType(canvas: IIIFCanvasLike): string {
  const source = resolveImageSource(canvas);
  return source?.format || 'application/octet-stream';
}
