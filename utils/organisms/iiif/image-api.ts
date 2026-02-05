/**
 * IIIF Image API 3.0 Utilities
 * Organism - depends on molecules
 */

import { MIME_TO_FORMAT, FORMAT_MIME_TYPES } from './image-api-constants';
import { getExtension, getMimeTypeString } from '../../molecules/media-detection';

// Re-export constants
export { MIME_TO_FORMAT, FORMAT_MIME_TYPES };

// ============================================================================
// Types
// ============================================================================

export type ImageApiProfile = 'level0' | 'level1' | 'level2';

export type ImageQuality = 'default' | 'color' | 'gray' | 'bitonal';

export type ImageFormat = 'jpg' | 'tif' | 'png' | 'gif' | 'jp2' | 'pdf' | 'webp';

export type RegionType = 'full' | 'square' | 'pixels' | 'percent';

export type SizeType = 'max' | 'width' | 'height' | 'percent' | 'widthHeight' | 'confined';

export interface RegionParams {
  type: RegionType;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export interface SizeParams {
  type: SizeType;
  upscale?: boolean;
  width?: number;
  height?: number;
  percent?: number;
  confined?: boolean;
}

export interface RotationParams {
  degrees: number;
  mirror: boolean;
}

export interface ImageRequestParams {
  region: string | RegionParams;
  size: string | SizeParams;
  rotation: string | RotationParams;
  quality: ImageQuality;
  format: ImageFormat;
}

export interface SizeInfo {
  type?: 'Size';
  width: number;
  height: number;
}

export interface TileInfo {
  type?: 'Tile';
  width: number;
  height?: number;
  scaleFactors: number[];
}

export interface ImageServiceInfo {
  '@context': string | string[];
  id: string;
  type: 'ImageService3';
  protocol: 'http://iiif.io/api/image';
  profile: ImageApiProfile;
  width: number;
  height: number;
  maxWidth?: number;
  maxHeight?: number;
  maxArea?: number;
  sizes?: SizeInfo[];
  tiles?: TileInfo[];
  preferredFormats?: ImageFormat[];
  rights?: string;
  extraQualities?: ImageQuality[];
  extraFormats?: ImageFormat[];
  extraFeatures?: ImageApiFeature[];
}

export type ImageApiFeature =
  | 'baseUriRedirect'
  | 'canonicalLinkHeader'
  | 'cors'
  | 'jsonldMediaType'
  | 'mirroring'
  | 'profileLinkHeader'
  | 'regionByPct'
  | 'regionByPx'
  | 'regionSquare'
  | 'rotationArbitrary'
  | 'rotationBy90s'
  | 'sizeByConfinedWh'
  | 'sizeByH'
  | 'sizeByPct'
  | 'sizeByW'
  | 'sizeByWh'
  | 'sizeUpscaling';

export interface TileRequest {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleFactor: number;
}

export interface ImageApiValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Parameter Validation
// ============================================================================

export function validateRegion(
  region: string | RegionParams
): ImageApiValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof region === 'string') {
    const validFormats = ['full', 'square', 'pct:', 'px:'];
    if (!validFormats.some((f) => region.startsWith(f) || region === f)) {
      errors.push(`Invalid region format: ${region}`);
    }
  } else {
    if (region.type === 'pixels' || region.type === 'percent') {
      if (region.x === undefined || region.y === undefined) {
        errors.push('Region x and y are required for pixel/percent regions');
      }
      if (region.w === undefined || region.h === undefined) {
        errors.push('Region width and height are required');
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateSize(
  size: string | SizeParams
): ImageApiValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof size === 'string') {
    const validPatterns = [
      /^max$/,
      /^\d+,$/,
      /^,\d+$/,
      /^\d+,\d+$/,
      /^!\d+,\d+$/,
      /^pct:\d+(\.\d+)?$/,
    ];
    if (!validPatterns.some((p) => p.test(size))) {
      errors.push(`Invalid size format: ${size}`);
    }
  } else {
    if (size.type === 'width' && !size.width) {
      errors.push('Width is required for width-constrained size');
    }
    if (size.type === 'height' && !size.height) {
      errors.push('Height is required for height-constrained size');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateRotation(rotation: string | RotationParams): ImageApiValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof rotation === 'string') {
    const match = rotation.match(/^!?\d+(\.\d+)?$/);
    if (!match) {
      errors.push(`Invalid rotation format: ${rotation}`);
    }
  } else {
    if (rotation.degrees < 0 || rotation.degrees >= 360) {
      errors.push('Rotation degrees must be between 0 and 360');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateQuality(
  quality: string,
  availableQualities: ImageQuality[] = ['default']
): ImageApiValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!availableQualities.includes(quality as ImageQuality)) {
    errors.push(`Quality '${quality}' is not available. Available: ${availableQualities.join(', ')}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateFormat(format: string): ImageApiValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const validFormats: ImageFormat[] = ['jpg', 'tif', 'png', 'gif', 'jp2', 'pdf', 'webp'];

  if (!validFormats.includes(format as ImageFormat)) {
    errors.push(`Invalid format: ${format}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// URI Building
// ============================================================================

export function formatRegion(region: RegionParams): string {
  switch (region.type) {
    case 'full':
      return 'full';
    case 'square':
      return 'square';
    case 'pixels':
      return `${region.x},${region.y},${region.w},${region.h}`;
    case 'percent':
      return `pct:${region.x},${region.y},${region.w},${region.h}`;
    default:
      return 'full';
  }
}

export function formatSize(size: SizeParams): string {
  switch (size.type) {
    case 'max':
      return 'max';
    case 'width':
      return `${size.width},`;
    case 'height':
      return `,${size.height}`;
    case 'widthHeight':
      return `${size.width},${size.height}`;
    case 'confined':
      return `!${size.width},${size.height}`;
    case 'percent':
      return `pct:${size.percent}`;
    default:
      return 'max';
  }
}

export function formatRotation(rotation: RotationParams): string {
  const prefix = rotation.mirror ? '!' : '';
  return `${prefix}${rotation.degrees}`;
}

export function buildImageUri(
  baseUri: string,
  params: ImageRequestParams
): string {
  const region =
    typeof params.region === 'string'
      ? params.region
      : formatRegion(params.region);
  const size =
    typeof params.size === 'string' ? params.size : formatSize(params.size);
  const rotation =
    typeof params.rotation === 'string'
      ? params.rotation
      : formatRotation(params.rotation);

  return `${baseUri}/${region}/${size}/${rotation}/${params.quality}.${params.format}`;
}

export function buildInfoUri(baseUri: string): string {
  return `${baseUri}/info.json`;
}

// ============================================================================
// Tile Calculation
// ============================================================================

export function calculateTileRequest(
  x: number,
  y: number,
  width: number,
  height: number,
  scaleFactor: number
): TileRequest {
  return {
    x,
    y,
    width,
    height,
    scaleFactor,
  };
}

export function calculateTileCount(
  imageWidth: number,
  imageHeight: number,
  tileWidth: number,
  tileHeight: number,
  scaleFactors: number[]
): number {
  let count = 0;

  for (const scale of scaleFactors) {
    const scaledWidth = Math.ceil(imageWidth / scale);
    const scaledHeight = Math.ceil(imageHeight / scale);

    const tilesX = Math.ceil(scaledWidth / tileWidth);
    const tilesY = Math.ceil(scaledHeight / tileHeight);

    count += tilesX * tilesY;
  }

  return count;
}

export function buildTileUri(
  baseUri: string,
  tile: TileRequest,
  quality: ImageQuality = 'default',
  format: ImageFormat = 'jpg'
): string {
  const region: RegionParams = {
    type: 'pixels',
    x: tile.x,
    y: tile.y,
    w: tile.width,
    h: tile.height,
  };

  const size: SizeParams = {
    type: 'widthHeight',
    width: Math.ceil(tile.width / tile.scaleFactor),
    height: Math.ceil(tile.height / tile.scaleFactor),
  };

  return buildImageUri(baseUri, {
    region,
    size,
    rotation: { degrees: 0, mirror: false },
    quality,
    format,
  });
}

// ============================================================================
// Info.json Generation
// ============================================================================

export function generateInfoJson(
  baseUri: string,
  width: number,
  height: number,
  profile: ImageApiProfile = 'level1'
): ImageServiceInfo {
  return {
    '@context': 'http://iiif.io/api/image/3/context.json',
    id: baseUri,
    type: 'ImageService3',
    protocol: 'http://iiif.io/api/image',
    profile,
    width,
    height,
  };
}

export function generateStandardSizes(
  width: number,
  height: number,
  maxSize = 1000
): SizeInfo[] {
  const sizes: SizeInfo[] = [];
  let currentWidth = width;
  let currentHeight = height;

  while (currentWidth > maxSize || currentHeight > maxSize) {
    currentWidth = Math.floor(currentWidth / 2);
    currentHeight = Math.floor(currentHeight / 2);
    sizes.push({
      type: 'Size',
      width: currentWidth,
      height: currentHeight,
    });
  }

  return sizes;
}

export function generateStandardTiles(
  width: number,
  height: number,
  tileSize = 512
): TileInfo {
  const scaleFactors: number[] = [1];
  let currentScale = 1;

  while (Math.ceil(width / currentScale) > tileSize ||
         Math.ceil(height / currentScale) > tileSize) {
    currentScale *= 2;
    scaleFactors.push(currentScale);
  }

  return {
    type: 'Tile',
    width: tileSize,
    height: tileSize,
    scaleFactors,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getImageMimeType(format: ImageFormat): string {
  return FORMAT_MIME_TYPES[format];
}

export function getFormatFromMime(mimeType: string): ImageFormat | null {
  return (MIME_TO_FORMAT[mimeType] as ImageFormat) || null;
}

export function calculateResultingSize(
  originalWidth: number,
  originalHeight: number,
  size: SizeParams
): { width: number; height: number } {
  switch (size.type) {
    case 'max':
      return { width: originalWidth, height: originalHeight };
    case 'width':
      return {
        width: size.width!,
        height: Math.round((originalHeight / originalWidth) * size.width!),
      };
    case 'height':
      return {
        width: Math.round((originalWidth / originalHeight) * size.height!),
        height: size.height!,
      };
    case 'widthHeight':
      return { width: size.width!, height: size.height! };
    case 'confined':
      const scaleX = size.width! / originalWidth;
      const scaleY = size.height! / originalHeight;
      const scale = Math.min(scaleX, scaleY);
      return {
        width: Math.round(originalWidth * scale),
        height: Math.round(originalHeight * scale),
      };
    case 'percent':
      return {
        width: Math.round(originalWidth * (size.percent! / 100)),
        height: Math.round(originalHeight * (size.percent! / 100)),
      };
    default:
      return { width: originalWidth, height: originalHeight };
  }
}

export function encodeIdentifier(identifier: string): string {
  return encodeURIComponent(identifier);
}

export function decodeIdentifier(encoded: string): string {
  return decodeURIComponent(encoded);
}

/**
 * Create minimal ImageService3 reference for embedding in Presentation API resources
 * Includes protocol property as required by IIIF Image API 3.0
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
  const service: {
    id: string;
    type: 'ImageService3';
    protocol: 'http://iiif.io/api/image';
    profile: ImageApiProfile;
    width?: number;
    height?: number;
  } = {
    id,
    type: 'ImageService3',
    protocol: IMAGE_API_PROTOCOL,
    profile,
  };

  if (width !== undefined) service.width = width;
  if (height !== undefined) service.height = height;

  return service;
}

/**
 * Check if an object is a valid ImageService3 reference
 */
export function isImageService3(
  service: unknown
): service is {
  id: string;
  type: 'ImageService3';
  profile: ImageApiProfile;
  protocol?: string;
  width?: number;
  height?: number;
} {
  if (!service || typeof service !== 'object') return false;
  const s = service as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    s.type === 'ImageService3' &&
    (s.profile === 'level0' || s.profile === 'level1' || s.profile === 'level2')
  );
}
