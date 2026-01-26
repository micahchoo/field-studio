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

import { buildImageUri, type SizeParams } from './iiifImageApi';

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

  return buildImageUri(serviceId, {
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
  preferredWidth: number = 150
): string | null {
  if (!item) return null;

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
          return buildServiceUrl(serviceId, { width: preferredWidth });
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
  preferredWidth: number = 600
): string | null {
  if (!resource) return null;

  // Try to resolve as canvas first (has more information)
  if ('items' in resource || '_fileRef' in resource) {
    const result = resolveImageSource(resource as IIIFCanvasLike, {
      width: preferredWidth,
    });
    return result.url;
  }

  // Fall back to thumbnail resolution
  return resolveThumbUrl(resource as IIIFItemLike, preferredWidth);
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
 * Resolve a thumbnail for any IIIF item with cascading fallback.
 *
 * Resolution Priority:
 * 1. Explicit thumbnail property (if set on the item)
 * 2. For Manifests: First Canvas thumbnail
 * 3. For Collections: First Manifest's first Canvas
 * 4. null (caller can show placeholder)
 *
 * @param item - The IIIF item (Collection, Manifest, Canvas, etc.)
 * @param preferredWidth - Desired width for the thumbnail
 * @returns Resolved thumbnail URL or null
 */
export function resolveHierarchicalThumb(
  item: IIIFHierarchicalItem | null | undefined,
  preferredWidth: number = 150
): string | null {
  if (!item) return null;

  // 1. Check for explicit thumbnail on the item
  const directThumb = resolveThumbUrl(item, preferredWidth);
  if (directThumb) return directThumb;

  // 2. For Manifests, try first Canvas
  if (item.type === 'Manifest' && item.items && item.items.length > 0) {
    const firstCanvas = item.items[0];
    const canvasThumb = resolveHierarchicalThumb(firstCanvas, preferredWidth);
    if (canvasThumb) return canvasThumb;
  }

  // 3. For Collections, try first child (Manifest or Collection)
  if (item.type === 'Collection' && item.items && item.items.length > 0) {
    // Try first Manifest
    const firstManifest = item.items.find(child => child.type === 'Manifest');
    if (firstManifest) {
      const manifestThumb = resolveHierarchicalThumb(firstManifest, preferredWidth);
      if (manifestThumb) return manifestThumb;
    }

    // Try first Collection (nested)
    const firstCollection = item.items.find(child => child.type === 'Collection');
    if (firstCollection) {
      const collectionThumb = resolveHierarchicalThumb(firstCollection, preferredWidth);
      if (collectionThumb) return collectionThumb;
    }
  }

  // 4. For Canvases, we should have already found it via resolveThumbUrl
  // but try the canvas-specific resolution as fallback
  if (item.type === 'Canvas') {
    const result = resolveImageSource(item as IIIFCanvasLike, { width: preferredWidth });
    return result.url;
  }

  return null;
}
