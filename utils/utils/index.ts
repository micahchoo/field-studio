/**
 * Utilities Index — Stub for Svelte Migration
 *
 * TODO: Copy full implementation from React source at
 * field-studio/utils/index.ts
 *
 * This stub re-exports the functions and types needed by the export model services.
 * Each function has a minimal implementation sufficient for compilation.
 */

import type { IIIFItem, IIIFCanvas, IIIFManifest, LanguageMap } from '@/src/shared/types';

export { isValidViewingDirection, validateResource } from './iiifSchema';

// ============================================================================
// Image API Types
// ============================================================================

export type ImageApiProfile = 'level0' | 'level1' | 'level2';
export type ImageQuality = 'default' | 'color' | 'gray' | 'bitonal';
export type ImageFormat = 'jpg' | 'tif' | 'png' | 'gif' | 'jp2' | 'pdf' | 'webp';
export type ImageApiFeature = string;

export interface SizeInfo {
  width: number;
  height: number;
}

export interface TileInfo {
  width: number;
  scaleFactors: number[];
}

export interface ImageServiceInfo {
  '@context': string;
  id: string;
  type: 'ImageService3';
  protocol: string;
  profile: ImageApiProfile;
  width: number;
  height: number;
  sizes?: SizeInfo[];
  tiles?: TileInfo[];
  maxWidth?: number;
  maxHeight?: number;
  extraFeatures?: string[];
  extraFormats?: string[];
  extraQualities?: string[];
  rights?: string;
}

// ============================================================================
// Image API Constants
// ============================================================================

const IMAGE_API_CONTEXT = 'http://iiif.io/api/image/3/context.json';
export const IMAGE_API_PROTOCOL = 'http://iiif.io/api/image';

// ============================================================================
// Image API Functions
// ============================================================================

/**
 * Create minimal ImageService3 reference for embedding in Presentation API resources
 */
export function createImageServiceReference(
  id: string,
  profile: ImageApiProfile = 'level2',
  width?: number,
  height?: number
): {
  id: string;
  type: 'ImageService3';
  protocol: 'http://iiif.io/api/image';
  profile: ImageApiProfile;
  width?: number;
  height?: number;
} {
  const service: any = {
    id,
    type: 'ImageService3',
    protocol: IMAGE_API_PROTOCOL,
    profile
  };

  if (width !== undefined) service.width = width;
  if (height !== undefined) service.height = height;

  return service;
}

/**
 * Generate IIIF Image API 3.0 info.json
 */
export function generateInfoJson(
  id: string,
  width: number,
  height: number,
  profile: ImageApiProfile = 'level0',
  options?: {
    sizes?: SizeInfo[];
    tiles?: TileInfo[];
    maxWidth?: number;
    maxHeight?: number;
    extraFeatures?: string[];
    extraFormats?: string[];
    extraQualities?: string[];
    rights?: string;
  }
): ImageServiceInfo {
  const info: ImageServiceInfo = {
    '@context': IMAGE_API_CONTEXT,
    id,
    type: 'ImageService3',
    protocol: IMAGE_API_PROTOCOL,
    profile,
    width,
    height
  };

  if (options?.sizes) info.sizes = options.sizes;
  if (options?.tiles) info.tiles = options.tiles;
  if (options?.maxWidth) info.maxWidth = options.maxWidth;
  if (options?.maxHeight) info.maxHeight = options.maxHeight;
  if (options?.extraFeatures) info.extraFeatures = options.extraFeatures;
  if (options?.extraFormats) info.extraFormats = options.extraFormats;
  if (options?.extraQualities) info.extraQualities = options.extraQualities;
  if (options?.rights) info.rights = options.rights;

  return info;
}

/**
 * Generate standard sizes for Level 0 compliance
 */
export function generateStandardSizes(width: number, height: number, targetWidths?: number | number[]): SizeInfo[] {
  const widths = targetWidths || [150, 600, 1200];
  const aspectRatio = height / width;
  return (Array.isArray(widths) ? widths : [widths])
    .filter(w => w <= width)
    .map(w => ({
      width: w,
      height: Math.floor(w * aspectRatio)
    }));
}

/**
 * Generate standard tiles configuration
 */
export function generateStandardTiles(tileWidth: number = 512, scaleFactors: number[] = [1, 2, 4, 8]): TileInfo[] {
  return [{
    width: tileWidth,
    scaleFactors
  }];
}

// ============================================================================
// IIIF Traversal Functions
// ============================================================================

/**
 * Find all items of a given type in the IIIF tree
 */
function findAllOfType<T extends IIIFItem>(root: IIIFItem, type: string): T[] {
  const results: T[] = [];

  const traverse = (item: IIIFItem) => {
    if (item.type === type) {
      results.push(item as T);
    }
    if (item.items) {
      for (const child of item.items) {
        traverse(child);
      }
    }
  };

  traverse(root);
  return results;
}

/**
 * Get all Canvas items in the tree
 */
export function getAllCanvases(root: IIIFItem): IIIFCanvas[] {
  return findAllOfType<IIIFCanvas>(root, 'Canvas');
}

/**
 * Get all Manifest items in the tree
 */
export function getAllManifests(root: IIIFItem): IIIFManifest[] {
  return findAllOfType<IIIFManifest>(root, 'Manifest');
}

// ============================================================================
// IIIF Type Helpers
// ============================================================================

/**
 * Check if a motivation is 'painting'
 */
export function isPaintingMotivation(motivation: string | string[]): boolean {
  if (Array.isArray(motivation)) {
    return motivation.includes('painting');
  }
  return motivation === 'painting';
}

/**
 * Create an IIIF language map from a string value
 */
export function createLanguageMap(value: string, language: string = 'none'): Record<string, string[]> {
  return { [language]: [value] };
}

/**
 * Format a Date object as ISO 8601 for IIIF navDate
 */
export function formatNavDate(date: Date): string {
  return date.toISOString();
}

/**
 * Validate that a string is a valid ISO 8601 date
 */
export function isValidNavDate(dateStr: string): boolean {
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

/**
 * Validate that a URI is a recognized Creative Commons or Rights Statements URI
 */
export function isValidRightsUri(uri: string): boolean {
  return uri.startsWith('http://creativecommons.org/') ||
         uri.startsWith('https://creativecommons.org/') ||
         uri.startsWith('http://rightsstatements.org/') ||
         uri.startsWith('https://rightsstatements.org/');
}

// ============================================================================
// Tree Traversal
// ============================================================================

/** Find a node by ID in a tree structure */
export function findNodeById(root: IIIFItem, id: string): IIIFItem | null {
  if (root.id === id) return root;

  const items = root.items as IIIFItem[] | undefined;
  if (items) {
    for (const child of items) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }

  // Check structures (ranges)
  const structures = (root as any).structures as IIIFItem[] | undefined;
  if (structures) {
    for (const range of structures) {
      const found = findNodeById(range, id);
      if (found) return found;
    }
  }

  return null;
}

// ============================================================================
// URI / ID Generation
// ============================================================================

/** Generate a UUID */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/** Generate a valid URI for an entity */
export function generateValidUri(base: string, type: string): string {
  return `${base}/${type.toLowerCase()}/${crypto.randomUUID().slice(0, 8)}`;
}

/** Normalize a URI (ensure HTTPS, remove trailing slashes) */
export function normalizeUri(uri: string): string {
  let normalized = uri.trim();
  if (normalized.startsWith('http://')) {
    normalized = normalized.replace('http://', 'https://');
  }
  return normalized.replace(/\/+$/, '');
}

/** Check if a string is a valid HTTP(S) URI */
export function isValidHttpUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// ============================================================================
// Content Type / MIME Helpers
// ============================================================================

export const DEFAULT_VIEWING_DIRECTION = 'left-to-right';

export function getContentTypeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    tif: 'image/tiff', tiff: 'image/tiff', webp: 'image/webp', svg: 'image/svg+xml',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4',
    mp4: 'video/mp4', webm: 'video/webm', pdf: 'application/pdf',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

export function getMimeType(filename: string): string {
  return getContentTypeFromFilename(filename);
}

export function isImageMimeType(mime: string): boolean {
  return mime.startsWith('image/');
}

export function isTimeBasedMimeType(mime: string): boolean {
  return mime.startsWith('audio/') || mime.startsWith('video/');
}

export function suggestBehaviors(type: string): string[] {
  const suggestions: Record<string, string[]> = {
    Manifest: ['individuals'],
    Collection: ['individuals'],
  };
  return suggestions[type] || [];
}
