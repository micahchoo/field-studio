/**
 * Image Source Resolver Service
 *
 * Unified strategy for resolving image URLs across all viewer components.
 * Provides a fallback chain to find the best available image source:
 * blob URL → fileRef → IIIF service → direct URL → thumbnail → placeholder
 *
 * This centralizes the image resolution logic that was previously duplicated
 * across Viewer.tsx, PolygonAnnotationTool.tsx, and other components.
 *
 * ## Memory Management (Phase 1 Fix)
 *
 * When using resolveImageSource(), blob URLs may be created that require
 * manual cleanup. Use one of these patterns:
 *
 * 1. **Recommended**: Use the `useImageSource()` hook which handles cleanup automatically
 * 2. **Manual cleanup**: Call `cleanupImageSource()` when the component unmounts
 * 3. **Effect cleanup**: Use `createSourceCleanup()` as a useEffect cleanup function
 *
 * @example
 * ```typescript
 * // Automatic cleanup with hook
 * const { source } = useImageSource(canvas, { preferredSize: 'medium' });
 *
 * // Manual cleanup
 * const source = resolveImageSource(canvas);
 * useEffect(() => {
 *   return () => cleanupImageSource(source);
 * }, [canvas]);
 * ```
 */

import { FEATURE_FLAGS } from '../constants/features';

import type {
  IIIFAnnotation,
  IIIFAnnotationBody,
  IIIFCanvas,
  IIIFExternalWebResource,
  IIIFItem
} from '@/src/shared/types';
import type { ImageApiProfile, ImageServiceInfo } from '../utils/iiifImageApi';

// ============================================================================
// Feature Flag Check
// ============================================================================

/**
 * Check if automatic cleanup warnings are enabled
 */
const isCleanupWarningEnabled = (): boolean => {
  return (FEATURE_FLAGS as Record<string, boolean>).USE_IMAGE_SOURCE_CLEANUP !== false;
};

// ============================================================================
// Cleanup Tracking (Phase 1 Memory Leak Fix)
// ============================================================================

/**
 * WeakSet to track cleaned up sources (prevents double cleanup)
 */
const cleanedSources = new WeakSet<ResolvedImageSource>();

/**
 * Check if a source has already been cleaned up
 */
export function isSourceCleaned(source: ResolvedImageSource): boolean {
  return cleanedSources.has(source);
}

// ============================================================================
// Types
// ============================================================================

export type ImageSourceType =
  | 'blob'           // Local blob URL (fastest)
  | 'iiif-level2'    // Full IIIF Image API (supports region, size, rotation)
  | 'iiif-level1'    // Basic IIIF Image API (supports size)
  | 'iiif-level0'    // Static IIIF (pre-generated sizes only)
  | 'static'         // Direct URL to static image
  | 'thumbnail'      // Thumbnail fallback
  | 'placeholder';   // No image available

export interface ResolvedImageSource {
  /** The URL to use for loading the image */
  url: string;
  /** The type of image source */
  type: ImageSourceType;
  /** Original image width (if known) */
  width?: number;
  /** Original image height (if known) */
  height?: number;
  /** IIIF service endpoint (if available) */
  serviceId?: string;
  /** IIIF profile level */
  profile?: ImageApiProfile;
  /** Whether this source supports region extraction */
  supportsRegion: boolean;
  /** Whether this source supports size parameters */
  supportsSizeParam: boolean;
  /** Whether this source supports rotation */
  supportsRotation: boolean;
  /** Whether this source supports quality parameters */
  supportsQuality: boolean;
  /** Available pre-generated sizes (for Level 0) */
  availableSizes?: Array<{ width: number; height: number }>;
  /** Blob reference for memory management */
  _blobRef?: string;
  /** Whether this URL needs cleanup on unmount */
  needsCleanup: boolean;
}

export interface ImageSourceResolverOptions {
  /** Preferred image size */
  preferredSize?: 'thumbnail' | 'medium' | 'full';
  /** Require deep zoom capability (IIIF Level 2) */
  requireDeepZoom?: boolean;
  /** Fall back to thumbnail if primary source fails */
  fallbackToThumbnail?: boolean;
  /** Custom placeholder URL */
  placeholderUrl?: string;
  /** Skip IIIF service check (use direct URL) */
  skipIIIFService?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23f0f0f0" width="200" height="200"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy="0.3em" fill="%23999" font-family="system-ui" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';

const IIIF_PROFILE_CAPABILITIES: Record<ImageApiProfile, {
  supportsRegion: boolean;
  supportsSizeParam: boolean;
  supportsRotation: boolean;
  supportsQuality: boolean;
}> = {
  level0: {
    supportsRegion: false,
    supportsSizeParam: false,
    supportsRotation: false,
    supportsQuality: false
  },
  level1: {
    supportsRegion: true,
    supportsSizeParam: true,
    supportsRotation: false,
    supportsQuality: false
  },
  level2: {
    supportsRegion: true,
    supportsSizeParam: true,
    supportsRotation: true,
    supportsQuality: true
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract the painting annotation body from a canvas
 */
export function getPaintingBody(canvas: IIIFCanvas): IIIFExternalWebResource | null {
  const firstPage = canvas.items?.[0];
  if (!firstPage) return null;

  const firstAnnotation = firstPage.items?.[0];
  if (!firstAnnotation) return null;

  const {body} = firstAnnotation;
  if (!body) return null;

  // Handle array of bodies
  if (Array.isArray(body)) {
    return body.find(b => b.type === 'Image') as IIIFExternalWebResource || null;
  }

  // Single body
  if ((body as IIIFExternalWebResource).type === 'Image') {
    return body as IIIFExternalWebResource;
  }

  return null;
}

/**
 * Extract IIIF Image service from annotation body
 */
export function getImageService(body: IIIFExternalWebResource): {
  id: string;
  profile: ImageApiProfile;
  width?: number;
  height?: number;
  sizes?: Array<{ width: number; height: number }>;
} | null {
  if (!body.service) return null;

  const services = Array.isArray(body.service) ? body.service : [body.service];

  for (const service of services) {
    // Check for IIIF Image API service
    const type = service.type || service['@type'];
    if (type === 'ImageService3' || type === 'ImageService2' ||
        type?.includes('ImageService')) {

      // Determine profile level
      let profile: ImageApiProfile = 'level2'; // Default to most capable
      const profileValue = service.profile;

      if (typeof profileValue === 'string') {
        if (profileValue.includes('level0')) profile = 'level0';
        else if (profileValue.includes('level1')) profile = 'level1';
        else if (profileValue.includes('level2')) profile = 'level2';
      } else if (Array.isArray(profileValue)) {
        const profileStr = profileValue.join(' ');
        if (profileStr.includes('level0')) profile = 'level0';
        else if (profileStr.includes('level1')) profile = 'level1';
      }

      return {
        id: service.id || service['@id'],
        profile,
        width: service.width,
        height: service.height,
        sizes: service.sizes
      };
    }
  }

  return null;
}

/**
 * Extract thumbnail from a canvas
 */
export function getThumbnailUrl(canvas: IIIFCanvas | IIIFItem): string | null {
  if (!canvas.thumbnail || canvas.thumbnail.length === 0) return null;

  const thumb = canvas.thumbnail[0];
  return thumb.id || null;
}

/**
 * Check if a string is a valid URL
 */
function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return str.startsWith('blob:') || str.startsWith('data:');
  }
}

// ============================================================================
// Main Resolver
// ============================================================================

/**
 * Resolve the best image source for a canvas
 *
 * Resolution chain:
 * 1. Check for _blobUrl (local blob)
 * 2. Check for _fileRef → create object URL
 * 3. Check for IIIF Image API service
 * 4. Check for direct body.id URL
 * 5. Check for thumbnail
 * 6. Return placeholder
 */
export function resolveImageSource(
  canvas: IIIFCanvas | null,
  options: ImageSourceResolverOptions = {}
): ResolvedImageSource {
  const {
    preferredSize = 'full',
    requireDeepZoom = false,
    fallbackToThumbnail = true,
    placeholderUrl = DEFAULT_PLACEHOLDER,
    skipIIIFService = false
  } = options;

  // Return placeholder if no canvas
  if (!canvas) {
    return createPlaceholderSource(placeholderUrl);
  }

  // 1. Check for blob URL (fastest - already created)
  if (canvas._blobUrl && isValidUrl(canvas._blobUrl)) {
    return {
      url: canvas._blobUrl,
      type: 'blob',
      width: canvas.width,
      height: canvas.height,
      supportsRegion: false,
      supportsSizeParam: false,
      supportsRotation: false,
      supportsQuality: false,
      _blobRef: canvas._blobUrl,
      needsCleanup: false // Already managed elsewhere
    };
  }

  // 2. Check for file reference
  if (canvas._fileRef && canvas._fileRef instanceof Blob) {
    try {
      const blobUrl = URL.createObjectURL(canvas._fileRef);
      return {
        url: blobUrl,
        type: 'blob',
        width: canvas.width,
        height: canvas.height,
        supportsRegion: false,
        supportsSizeParam: false,
        supportsRotation: false,
        supportsQuality: false,
        _blobRef: blobUrl,
        needsCleanup: true // Caller must revoke
      };
    } catch (e) {
      console.warn('Failed to create blob URL from fileRef:', e);
      // Fall through to other options
    }
  }

  // Get the painting body
  const paintingBody = getPaintingBody(canvas);

  // 3. Check for IIIF Image service
  if (paintingBody && !skipIIIFService) {
    const service = getImageService(paintingBody);

    if (service) {
      // Skip Level 0 if deep zoom required
      if (requireDeepZoom && service.profile === 'level0') {
        // Fall through to direct URL
      } else {
        const capabilities = IIIF_PROFILE_CAPABILITIES[service.profile];
        const sourceType: ImageSourceType =
          service.profile === 'level2' ? 'iiif-level2' :
          service.profile === 'level1' ? 'iiif-level1' : 'iiif-level0';

        // Build appropriate URL based on preferred size
        let url = service.id;
        if (service.profile !== 'level0') {
          // For Level 1/2, we can request specific sizes
          if (preferredSize === 'thumbnail') {
            url = `${service.id}/full/,150/0/default.jpg`;
          } else if (preferredSize === 'medium') {
            url = `${service.id}/full/,600/0/default.jpg`;
          } else {
            url = `${service.id}/full/max/0/default.jpg`;
          }
        } else {
          // Level 0: use full image or pick from available sizes
          if (service.sizes && service.sizes.length > 0 && preferredSize !== 'full') {
            // Find appropriate size
            const targetWidth = preferredSize === 'thumbnail' ? 150 : 600;
            const bestSize = service.sizes.reduce((best, size) => {
              const diff = Math.abs(size.width - targetWidth);
              const bestDiff = Math.abs(best.width - targetWidth);
              return diff < bestDiff ? size : best;
            }, service.sizes[0]);
            url = `${service.id}/full/${bestSize.width},${bestSize.height}/0/default.jpg`;
          } else {
            url = `${service.id}/full/max/0/default.jpg`;
          }
        }

        return {
          url,
          type: sourceType,
          width: service.width || paintingBody.width || canvas.width,
          height: service.height || paintingBody.height || canvas.height,
          serviceId: service.id,
          profile: service.profile,
          ...capabilities,
          availableSizes: service.sizes,
          needsCleanup: false
        };
      }
    }
  }

  // 4. Check for direct URL on painting body
  if (paintingBody?.id && isValidUrl(paintingBody.id)) {
    return {
      url: paintingBody.id,
      type: 'static',
      width: paintingBody.width || canvas.width,
      height: paintingBody.height || canvas.height,
      supportsRegion: false,
      supportsSizeParam: false,
      supportsRotation: false,
      supportsQuality: false,
      needsCleanup: false
    };
  }

  // 5. Check for thumbnail
  if (fallbackToThumbnail) {
    const thumbnailUrl = getThumbnailUrl(canvas);
    if (thumbnailUrl) {
      return {
        url: thumbnailUrl,
        type: 'thumbnail',
        supportsRegion: false,
        supportsSizeParam: false,
        supportsRotation: false,
        supportsQuality: false,
        needsCleanup: false
      };
    }
  }

  // 6. Return placeholder
  return createPlaceholderSource(placeholderUrl);
}

/**
 * Create a placeholder source
 */
function createPlaceholderSource(url: string): ResolvedImageSource {
  return {
    url,
    type: 'placeholder',
    supportsRegion: false,
    supportsSizeParam: false,
    supportsRotation: false,
    supportsQuality: false,
    needsCleanup: false
  };
}

/**
 * Resolve image source from an annotation body directly
 * Useful for annotation tools that work with bodies not canvases
 */
export function resolveBodySource(
  body: IIIFExternalWebResource | IIIFAnnotationBody | null,
  options: ImageSourceResolverOptions = {}
): ResolvedImageSource {
  if (!body) {
    return createPlaceholderSource(options.placeholderUrl || DEFAULT_PLACEHOLDER);
  }

  // Check if it's an image type body
  if ('type' in body && body.type !== 'Image') {
    return createPlaceholderSource(options.placeholderUrl || DEFAULT_PLACEHOLDER);
  }

  const imageBody = body as IIIFExternalWebResource;

  // Check for IIIF service
  if (!options.skipIIIFService) {
    const service = getImageService(imageBody);
    if (service) {
      const capabilities = IIIF_PROFILE_CAPABILITIES[service.profile];
      const sourceType: ImageSourceType =
        service.profile === 'level2' ? 'iiif-level2' :
        service.profile === 'level1' ? 'iiif-level1' : 'iiif-level0';

      return {
        url: `${service.id}/full/max/0/default.jpg`,
        type: sourceType,
        width: service.width || imageBody.width,
        height: service.height || imageBody.height,
        serviceId: service.id,
        profile: service.profile,
        ...capabilities,
        availableSizes: service.sizes,
        needsCleanup: false
      };
    }
  }

  // Use direct URL
  if (imageBody.id && isValidUrl(imageBody.id)) {
    return {
      url: imageBody.id,
      type: 'static',
      width: imageBody.width,
      height: imageBody.height,
      supportsRegion: false,
      supportsSizeParam: false,
      supportsRotation: false,
      supportsQuality: false,
      needsCleanup: false
    };
  }

  return createPlaceholderSource(options.placeholderUrl || DEFAULT_PLACEHOLDER);
}

/**
 * Build a IIIF Image API request URL
 * Only works for Level 1/2 services
 */
export function buildIIIFImageUrl(
  source: ResolvedImageSource,
  params: {
    region?: string;
    size?: string;
    rotation?: number;
    quality?: string;
    format?: string;
  } = {}
): string {
  if (!source.serviceId || source.type === 'iiif-level0') {
    return source.url; // Can't modify Level 0 or non-IIIF
  }

  const {
    region = 'full',
    size = 'max',
    rotation = 0,
    quality = 'default',
    format = 'jpg'
  } = params;

  // Validate capabilities
  const actualRegion = source.supportsRegion ? region : 'full';
  const actualSize = source.supportsSizeParam ? size : 'max';
  const actualRotation = source.supportsRotation ? rotation : 0;
  const actualQuality = source.supportsQuality ? quality : 'default';

  return `${source.serviceId}/${actualRegion}/${actualSize}/${actualRotation}/${actualQuality}.${format}`;
}

/**
 * Clean up a resolved image source
 * Should be called when component unmounts
 *
 * Phase 1 Memory Leak Fix: Now tracks cleaned sources to prevent double cleanup
 * and provides better error handling.
 */
export function cleanupImageSource(source: ResolvedImageSource | null): boolean {
  if (!source) return false;

  // Prevent double cleanup
  if (cleanedSources.has(source)) {
    if (isCleanupWarningEnabled()) {
      console.warn('[imageSourceResolver] Source already cleaned up, skipping');
    }
    return false;
  }

  if (source.needsCleanup && source._blobRef) {
    try {
      URL.revokeObjectURL(source._blobRef);
      cleanedSources.add(source);

      if (isCleanupWarningEnabled()) {
        console.log('[imageSourceResolver] Cleaned up blob URL:', `${source._blobRef.substring(0, 50)}...`);
      }

      return true;
    } catch (e) {
      // Ignore cleanup errors but log in dev
      if (isCleanupWarningEnabled()) {
        console.warn('[imageSourceResolver] Failed to cleanup blob URL:', e);
      }
    }
  }

  return false;
}

// ============================================================================
// React Hook Utilities
// ============================================================================

/**
 * Create an effect cleanup function for image sources
 */
export function createSourceCleanup(source: ResolvedImageSource | null): () => void {
  return () => cleanupImageSource(source);
}
