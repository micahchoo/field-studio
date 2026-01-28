/**
 * Image Source Resolver
 *
 * Unified image URL resolution for IIIF resources.
 * Provides consistent priority-based resolution across all image viewing components.
 *
 * Priority order for resolving image sources:
 * 1. IIIF Image Service (if available) - construct proper URL
 * 2. Thumbnail array (thumbnail[0].id)
 * 3. Painting annotation body (items[0].items[0].body.id)
 * 4. Blob URL (_blobUrl)
 * 5. File reference (_fileRef) - returns the reference for blob creation
 */

import { IIIFImageService, type SizeParams } from './iiifImageApi';
import { getDerivativePreset, DEFAULT_DERIVATIVE_PRESET } from '../constants';
import { isCanvas } from '../types';

// ============================================================================
// Types
// ============================================================================

/** Minimal IIIF Canvas interface for image resolution */
export interface IIIFCanvasLike {
  id?: string;
  width?: number;
  height?: number;
  thumbnail?: Array<{
    id?: string;
    type?: string;
    service?: Array<{
      id?: string;
      '@id'?: string;
      type?: string;
      '@type'?: string;
      profile?: string | string[];
    }>;
  }>;
  items?: Array<{
    items?: Array<{
      body?: {
        id?: string;
        type?: string;
        format?: string;
        service?: Array<{
          id?: string;
          '@id'?: string;
          type?: string;
          '@type'?: string;
          profile?: string | string[];
        }>;
      } | Array<{
        id?: string;
        type?: string;
        format?: string;
        service?: Array<{
          id?: string;
          '@id'?: string;
          type?: string;
          '@type'?: string;
          profile?: string | string[];
        }>;
      }>;
    }>;
  }>;
  // Field Studio internal properties
  _blobUrl?: string;
  _fileRef?: File;
}

/** Minimal IIIF item interface for thumbnail resolution */
export interface IIIFItemLike {
  id?: string;
  type?: string;
  thumbnail?: Array<{
    id?: string;
    type?: string;
    service?: Array<{
      id?: string;
      '@id'?: string;
      type?: string;
      '@type'?: string;
      profile?: string | string[];
    }>;
  }>;
  // Field Studio internal properties
  _blobUrl?: string;
  _thumbUrl?: string;
}

/** Result of image source resolution */
export interface ImageSourceResult {
  /** Resolved URL to the image */
  url: string | null;
  /** Whether the source has an image service (supports deep zoom) */
  hasService: boolean;
  /** Image service ID if available */
  serviceId?: string;
  /** Service profile if available */
  serviceProfile?: string;
  /** Whether URL is a blob URL (local file) */
  isBlob: boolean;
  /** File reference if available (for blob creation) */
  fileRef?: File;
}

/** Options for image resolution */
export interface ResolveImageOptions {
  /** Preferred width for the image (used with image service) */
  width?: number;
  /** Preferred height for the image (used with image service) */
  height?: number;
  /** Whether to return full size if dimensions not specified */
  fullSize?: boolean;
  /** Quality preference ('default', 'color', 'gray', 'bitonal') */
  quality?: string;
  /** Format preference ('jpg', 'png', 'webp', 'gif') */
  format?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a service is an IIIF Image API service
 */
function isImageService(service: any): boolean {
  if (!service) return false;
  const type = service.type || service['@type'];
  return (
    type === 'ImageService3' ||
    type === 'ImageService2' ||
    type === 'ImageService1' ||
    type === 'iiif:ImageService2' ||
    type?.includes('ImageService')
  );
}

/**
 * Get the service ID from a service object
 */
function getServiceId(service: any): string | undefined {
  return service?.id || service?.['@id'];
}

/**
 * Get the service profile from a service object
 */
function getServiceProfile(service: any): string | undefined {
  const profile = service?.profile;
  if (Array.isArray(profile)) {
    return profile[0];
  }
  return profile;
}

/**
 * Find an image service in a service array
 */
function findImageService(services?: any[]): any | undefined {
  if (!services || !Array.isArray(services)) return undefined;
  return services.find(isImageService);
}

/**
 * Build an image URL from a service
 */
function buildServiceUrl(
  serviceId: string,
  options: ResolveImageOptions = {}
): string {
  const { width, height, fullSize = false, quality = 'default', format = 'jpg' } = options;

  // Determine size parameter
  let size: SizeParams;
  if (fullSize || (!width && !height)) {
    size = { type: 'max' };
  } else if (width && height) {
    size = { type: 'confined', width, height, confined: true };
  } else if (width) {
    size = { type: 'width', width };
  } else if (height) {
    size = { type: 'height', height };
  } else {
    size = { type: 'max' };
  }

  // Use the new IIIFImageService class for robust URI building
  // Parse baseUri and identifier from serviceId
  const parts = serviceId.split('/');
  const identifier = parts.pop() || '';
  const baseUri = parts.join('/');

  const service = new IIIFImageService({
    baseUri,
    identifier,
    width: 0, // Not strictly needed for basic URI building if not canonicalizing
    height: 0
  });

  return service.buildImageUri({
    region: { type: 'full' },
    size,
    rotation: { degrees: 0, mirror: false },
    quality: quality as any,
    format: format as any,
  });
}

// ============================================================================
// Main Resolution Functions
// ============================================================================

/**
 * Resolve the best image source for a canvas
 *
 * Priority order:
 * 1. IIIF Image Service (if available)
 * 2. Thumbnail array (thumbnail[0].id)
 * 3. Painting annotation body
 * 4. Blob URL (_blobUrl)
 * 5. File reference (_fileRef)
 */
export function resolveImageSource(
  canvas: IIIFCanvasLike | null | undefined,
  options: ResolveImageOptions = {}
): ImageSourceResult {
  const result: ImageSourceResult = {
    url: null,
    hasService: false,
    isBlob: false,
  };

  if (!canvas) return result;

  // 1. Check for image service on the canvas body
  const body = canvas.items?.[0]?.items?.[0]?.body;
  const bodyObj = Array.isArray(body) ? body[0] : body;

  if (bodyObj?.service) {
    const service = findImageService(bodyObj.service);
    if (service) {
      const serviceId = getServiceId(service);
      if (serviceId) {
        result.hasService = true;
        result.serviceId = serviceId;
        result.serviceProfile = getServiceProfile(service);
        result.url = buildServiceUrl(serviceId, options);
        return result;
      }
    }
  }

  // 2. Check thumbnail for service
  const thumbnail = canvas.thumbnail?.[0];
  if (thumbnail?.service) {
    const service = findImageService(thumbnail.service);
    if (service) {
      const serviceId = getServiceId(service);
      if (serviceId) {
        result.hasService = true;
        result.serviceId = serviceId;
        result.serviceProfile = getServiceProfile(service);
        result.url = buildServiceUrl(serviceId, options);
        return result;
      }
    }
  }

  // 3. Use thumbnail URL directly
  if (thumbnail?.id) {
    result.url = thumbnail.id;
    return result;
  }

  // 4. Use body URL directly
  if (bodyObj?.id) {
    result.url = bodyObj.id;
    return result;
  }

  // 5. Check for blob URL (Field Studio internal)
  if (canvas._blobUrl) {
    result.url = canvas._blobUrl;
    result.isBlob = true;
    return result;
  }

  // 6. Check for file reference (Field Studio internal)
  if (canvas._fileRef) {
    result.fileRef = canvas._fileRef;
    return result;
  }

  return result;
}

/**
 * Resolve a thumbnail URL for a IIIF item (Collection, Manifest, Canvas, etc.)
 *
 * Priority order:
 * 1. _thumbUrl (cached thumbnail)
 * 2. Thumbnail with service (construct sized URL)
 * 3. Thumbnail URL directly
 * 4. _blobUrl (local file)
 */
export function resolveThumbUrl(
  item: IIIFItemLike | null | undefined,
  preferredWidth?: number
): string | null {
  if (!item) return null;
  const width = preferredWidth || getDerivativePreset().thumbnailWidth;

  // 1. Check for cached thumbnail URL
  if (item._thumbUrl) {
    return item._thumbUrl;
  }

  // 2. Check for thumbnail
  const thumbnail = item.thumbnail?.[0];

  if (thumbnail) {
    // 2a. Check for image service on thumbnail
    if (thumbnail.service) {
      const service = findImageService(thumbnail.service);
      if (service) {
        const serviceId = getServiceId(service);
        if (serviceId) {
          return buildServiceUrl(serviceId, { width });
        }
      }
    }

    // 2b. Use thumbnail URL directly
    if (thumbnail.id) {
      return thumbnail.id;
    }
  }

  // 3. Check for blob URL
  if (item._blobUrl) {
    return item._blobUrl;
  }

  return null;
}

/**
 * Resolve the best preview image for a resource
 * Attempts to get a reasonably-sized image for preview purposes
 */
export function resolvePreviewUrl(
  resource: IIIFCanvasLike | IIIFItemLike | null | undefined,
  preferredWidth?: number
): string | null {
  if (!resource) return null;
  const width = preferredWidth || 600; // Default preview width

  // Try to resolve as canvas first (has more information)
  if ('items' in resource || '_fileRef' in resource) {
    const result = resolveImageSource(resource as IIIFCanvasLike, {
      width,
    });
    return result.url;
  }

  // Fall back to thumbnail resolution
  return resolveThumbUrl(resource as IIIFItemLike, width);
}

/**
 * Check if a resource has a deep zoom capable image service
 */
export function hasDeepZoomCapability(
  canvas: IIIFCanvasLike | null | undefined
): boolean {
  if (!canvas) return false;

  const body = canvas.items?.[0]?.items?.[0]?.body;
  const bodyObj = Array.isArray(body) ? body[0] : body;

  if (bodyObj?.service) {
    const service = findImageService(bodyObj.service);
    if (service) return true;
  }

  const thumbnail = canvas.thumbnail?.[0];
  if (thumbnail?.service) {
    const service = findImageService(thumbnail.service);
    if (service) return true;
  }

  return false;
}

/**
 * Get the image service info for a canvas (for OpenSeadragon or similar)
 */
export function getImageServiceInfo(
  canvas: IIIFCanvasLike | null | undefined
): { serviceId: string; profile: string } | null {
  if (!canvas) return null;

  const body = canvas.items?.[0]?.items?.[0]?.body;
  const bodyObj = Array.isArray(body) ? body[0] : body;

  if (bodyObj?.service) {
    const service = findImageService(bodyObj.service);
    if (service) {
      const serviceId = getServiceId(service);
      const profile = getServiceProfile(service);
      if (serviceId) {
        return {
          serviceId,
          profile: profile || 'level1',
        };
      }
    }
  }

  const thumbnail = canvas.thumbnail?.[0];
  if (thumbnail?.service) {
    const service = findImageService(thumbnail.service);
    if (service) {
      const serviceId = getServiceId(service);
      const profile = getServiceProfile(service);
      if (serviceId) {
        return {
          serviceId,
          profile: profile || 'level1',
        };
      }
    }
  }

  return null;
}

// ============================================================================
// Hierarchical Thumbnail Resolution (for Manifests and Collections)
// ============================================================================

/** Extended item interface for hierarchical resolution */
interface IIIFHierarchicalItem extends IIIFItemLike {
  items?: IIIFHierarchicalItem[];
}

/**
 * Recursively find the first N leaf-node canvases in a IIIF hierarchy.
 * Used for generating aggregated thumbnails for Collections and Manifests.
 * 
 * @param item - The starting IIIF item
 * @param limit - Maximum number of canvases to find (default: 4)
 * @param depth - Internal recursion depth tracking
 */
export function resolveLeafCanvases(
  item: IIIFHierarchicalItem | null | undefined,
  limit: number = 4,
  depth: number = 0
): IIIFItemLike[] {
  if (!item || depth > 10) return [];
  
  if (isCanvas(item as any)) {
    return [item];
  }

  const results: IIIFItemLike[] = [];
  const children = item.items || [];
  
  for (const child of children) {
    const leaves = resolveLeafCanvases(child, limit - results.length, depth + 1);
    results.push(...leaves);
    if (results.length >= limit) break;
  }

  return results.slice(0, limit);
}

/**
 * Resolve up to 4 thumbnail URLs for a IIIF resource (Collection, Manifest, or Canvas).
 *
 * @param item - The IIIF item
 * @param preferredWidth - Desired width for the thumbnails
 * @returns Array of resolved thumbnail URLs
 */
export function resolveHierarchicalThumbs(
  item: IIIFHierarchicalItem | null | undefined,
  preferredWidth?: number
): string[] {
  if (!item) return [];
  const width = preferredWidth || getDerivativePreset().thumbnailWidth;

  // If item has a direct thumbnail, use it as the primary (single) thumbnail
  const directThumb = resolveThumbUrl(item, width);
  if (directThumb) return [directThumb];

  // Otherwise, find leaf canvases and resolve their thumbnails
  const leaves = resolveLeafCanvases(item, 4);
  return leaves
    .map(leaf => resolveThumbUrl(leaf, width))
    .filter((url): url is string => url !== null);
}

/**
 * Resolve a single thumbnail URL for any IIIF item with cascading fallback.
 * Maintains backward compatibility while using the new hierarchical logic.
 */
export function resolveHierarchicalThumb(
  item: IIIFHierarchicalItem | null | undefined,
  preferredWidth?: number
): string | null {
  const width = preferredWidth || getDerivativePreset().thumbnailWidth;
  const thumbs = resolveHierarchicalThumbs(item, width);
  return thumbs.length > 0 ? thumbs[0] : null;
}
