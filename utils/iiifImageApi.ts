/**
 * IIIF Image API 3.0 Utilities
 *
 * Comprehensive implementation of IIIF Image API 3.0 specification.
 * Provides URI building, parameter validation, info.json generation,
 * compliance level checking, and tile calculation utilities.
 *
 * @see https://iiif.io/api/image/3.0/
 */

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
  partOf?: Array<{ id: string; type: string; label?: Record<string, string[]> }>;
  seeAlso?: Array<{ id: string; type: string; label?: Record<string, string[]>; format?: string; profile?: string }>;
  service?: any[];
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
// Constants
// ============================================================================

export const IMAGE_API_CONTEXT = 'http://iiif.io/api/image/3/context.json';
export const IMAGE_API_PROTOCOL = 'http://iiif.io/api/image';

export const COMPLIANCE_LEVELS: Record<ImageApiProfile, {
  uri: string;
  requiredFeatures: ImageApiFeature[];
  requiredFormats: ImageFormat[];
  requiredQualities: ImageQuality[];
}> = {
  level0: {
    uri: 'http://iiif.io/api/image/3/level0.json',
    requiredFeatures: [],
    requiredFormats: ['jpg'],
    requiredQualities: ['default']
  },
  level1: {
    uri: 'http://iiif.io/api/image/3/level1.json',
    requiredFeatures: ['regionByPx', 'regionSquare', 'sizeByW', 'sizeByH', 'sizeByWh'],
    requiredFormats: ['jpg'],
    requiredQualities: ['default']
  },
  level2: {
    uri: 'http://iiif.io/api/image/3/level2.json',
    requiredFeatures: [
      'regionByPct', 'regionByPx', 'regionSquare',
      'sizeByConfinedWh', 'sizeByH', 'sizeByPct', 'sizeByW', 'sizeByWh',
      'rotationBy90s'
    ],
    requiredFormats: ['jpg', 'png'],
    requiredQualities: ['default', 'color', 'gray', 'bitonal']
  }
};

export const FORMAT_MIME_TYPES: Record<ImageFormat, string> = {
  jpg: 'image/jpeg',
  tif: 'image/tiff',
  png: 'image/png',
  gif: 'image/gif',
  jp2: 'image/jp2',
  pdf: 'application/pdf',
  webp: 'image/webp'
};

export const MIME_TO_FORMAT: Record<string, ImageFormat> = {
  'image/jpeg': 'jpg',
  'image/tiff': 'tif',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/jp2': 'jp2',
  'application/pdf': 'pdf',
  'image/webp': 'webp'
};

export const FEATURE_DESCRIPTIONS: Record<ImageApiFeature, string> = {
  baseUriRedirect: 'Base URI redirects to image information document',
  canonicalLinkHeader: 'Canonical image URI HTTP link header provided on image responses',
  cors: 'CORS HTTP headers provided on all responses',
  jsonldMediaType: 'JSON-LD media type provided when requested',
  mirroring: 'Image may be mirrored on vertical axis',
  profileLinkHeader: 'Profile HTTP link header provided on image responses',
  regionByPct: 'Regions may be requested by percentage',
  regionByPx: 'Regions may be requested by pixel dimensions',
  regionSquare: 'Square region may be requested',
  rotationArbitrary: 'Rotation may be requested using non-90 degree values',
  rotationBy90s: 'Rotation may be requested in multiples of 90 degrees',
  sizeByConfinedWh: 'Size may be requested in !w,h form',
  sizeByH: 'Size may be requested in ,h form',
  sizeByPct: 'Size may be requested in pct:n form',
  sizeByW: 'Size may be requested in w, form',
  sizeByWh: 'Size may be requested in w,h form',
  sizeUpscaling: 'Size prefixed with ^ may be requested'
};

// ============================================================================
// Validation Patterns
// ============================================================================

export const VALIDATION_PATTERNS = {
  region: {
    full: /^full$/,
    square: /^square$/,
    pixels: /^(\d+),(\d+),(\d+),(\d+)$/,
    percent: /^pct:(\d+\.?\d*),(\d+\.?\d*),(\d+\.?\d*),(\d+\.?\d*)$/,
    combined: /^(full|square|(\d+),(\d+),(\d+),(\d+)|pct:(\d+\.?\d*),(\d+\.?\d*),(\d+\.?\d*),(\d+\.?\d*))$/
  },
  size: {
    max: /^\^?max$/,
    width: /^\^?(\d+),$/,
    height: /^\^?,(\d+)$/,
    percent: /^\^?pct:(\d+\.?\d*)$/,
    widthHeight: /^\^?(\d+),(\d+)$/,
    confined: /^\^?!(\d+),(\d+)$/,
    combined: /^\^?(max|(\d+),|,(\d+)|pct:(\d+\.?\d*)|(\d+),(\d+)|!(\d+),(\d+))$/
  },
  rotation: {
    simple: /^!?(\d+\.?\d*)$/
  },
  quality: /^(default|color|gray|bitonal)$/,
  format: /^(jpg|tif|png|gif|jp2|pdf|webp)$/
};

// ============================================================================
// Parameter Validation Functions
// ============================================================================

/**
 * Validate region parameter
 */
export function validateRegion(
  region: string,
  imageWidth?: number,
  imageHeight?: number
): { valid: boolean; error?: string; parsed?: RegionParams } {
  // Full
  if (VALIDATION_PATTERNS.region.full.test(region)) {
    return { valid: true, parsed: { type: 'full' } };
  }

  // Square
  if (VALIDATION_PATTERNS.region.square.test(region)) {
    return { valid: true, parsed: { type: 'square' } };
  }

  // Pixels
  const pixelMatch = region.match(VALIDATION_PATTERNS.region.pixels);
  if (pixelMatch) {
    const x = parseInt(pixelMatch[1], 10);
    const y = parseInt(pixelMatch[2], 10);
    const w = parseInt(pixelMatch[3], 10);
    const h = parseInt(pixelMatch[4], 10);

    if (w === 0 || h === 0) {
      return { valid: false, error: 'Region width and height must be greater than 0' };
    }

    if (imageWidth !== undefined && imageHeight !== undefined) {
      if (x >= imageWidth && y >= imageHeight) {
        return { valid: false, error: 'Region is entirely outside image bounds' };
      }
    }

    return { valid: true, parsed: { type: 'pixels', x, y, w, h } };
  }

  // Percent
  const pctMatch = region.match(VALIDATION_PATTERNS.region.percent);
  if (pctMatch) {
    const x = parseFloat(pctMatch[1]);
    const y = parseFloat(pctMatch[2]);
    const w = parseFloat(pctMatch[3]);
    const h = parseFloat(pctMatch[4]);

    if (w <= 0 || h <= 0) {
      return { valid: false, error: 'Region percentage width and height must be greater than 0' };
    }

    return { valid: true, parsed: { type: 'percent', x, y, w, h } };
  }

  return { valid: false, error: `Invalid region syntax: ${region}` };
}

/**
 * Validate size parameter
 */
export function validateSize(
  size: string,
  regionWidth?: number,
  regionHeight?: number,
  supportsUpscaling: boolean = false
): { valid: boolean; error?: string; parsed?: SizeParams } {
  const hasUpscalePrefix = size.startsWith('^');
  const sizeWithoutPrefix = hasUpscalePrefix ? size.substring(1) : size;

  if (hasUpscalePrefix && !supportsUpscaling) {
    return { valid: false, error: 'Upscaling (^ prefix) is not supported' };
  }

  // Max
  if (sizeWithoutPrefix === 'max') {
    return { valid: true, parsed: { type: 'max', upscale: hasUpscalePrefix } };
  }

  // Width only
  const widthMatch = sizeWithoutPrefix.match(/^(\d+),$/);
  if (widthMatch) {
    const width = parseInt(widthMatch[1], 10);
    if (!hasUpscalePrefix && regionWidth !== undefined && width > regionWidth) {
      return { valid: false, error: 'Requested width exceeds region width without upscale prefix' };
    }
    return { valid: true, parsed: { type: 'width', width, upscale: hasUpscalePrefix } };
  }

  // Height only
  const heightMatch = sizeWithoutPrefix.match(/^,(\d+)$/);
  if (heightMatch) {
    const height = parseInt(heightMatch[1], 10);
    if (!hasUpscalePrefix && regionHeight !== undefined && height > regionHeight) {
      return { valid: false, error: 'Requested height exceeds region height without upscale prefix' };
    }
    return { valid: true, parsed: { type: 'height', height, upscale: hasUpscalePrefix } };
  }

  // Percent
  const pctMatch = sizeWithoutPrefix.match(/^pct:(\d+\.?\d*)$/);
  if (pctMatch) {
    const percent = parseFloat(pctMatch[1]);
    if (!hasUpscalePrefix && percent > 100) {
      return { valid: false, error: 'Percentage exceeds 100% without upscale prefix' };
    }
    return { valid: true, parsed: { type: 'percent', percent, upscale: hasUpscalePrefix } };
  }

  // Confined (!w,h)
  const confinedMatch = sizeWithoutPrefix.match(/^!(\d+),(\d+)$/);
  if (confinedMatch) {
    const width = parseInt(confinedMatch[1], 10);
    const height = parseInt(confinedMatch[2], 10);
    return { valid: true, parsed: { type: 'confined', width, height, confined: true, upscale: hasUpscalePrefix } };
  }

  // Width and height (w,h)
  const whMatch = sizeWithoutPrefix.match(/^(\d+),(\d+)$/);
  if (whMatch) {
    const width = parseInt(whMatch[1], 10);
    const height = parseInt(whMatch[2], 10);
    if (!hasUpscalePrefix && regionWidth !== undefined && regionHeight !== undefined) {
      if (width > regionWidth || height > regionHeight) {
        return { valid: false, error: 'Requested dimensions exceed region dimensions without upscale prefix' };
      }
    }
    return { valid: true, parsed: { type: 'widthHeight', width, height, upscale: hasUpscalePrefix } };
  }

  return { valid: false, error: `Invalid size syntax: ${size}` };
}

/**
 * Validate rotation parameter
 */
export function validateRotation(
  rotation: string,
  supportsArbitrary: boolean = false,
  supportsMirroring: boolean = true
): { valid: boolean; error?: string; parsed?: RotationParams } {
  const match = rotation.match(VALIDATION_PATTERNS.rotation.simple);
  if (!match) {
    return { valid: false, error: `Invalid rotation syntax: ${rotation}` };
  }

  const mirror = rotation.startsWith('!');
  const degrees = parseFloat(match[1]);

  if (mirror && !supportsMirroring) {
    return { valid: false, error: 'Mirroring is not supported' };
  }

  if (degrees < 0 || degrees > 360) {
    return { valid: false, error: 'Rotation must be between 0 and 360 degrees' };
  }

  if (!supportsArbitrary && degrees % 90 !== 0) {
    return { valid: false, error: 'Only 90-degree rotations are supported' };
  }

  return { valid: true, parsed: { degrees, mirror } };
}

/**
 * Validate quality parameter
 */
export function validateQuality(
  quality: string,
  supportedQualities: ImageQuality[] = ['default']
): { valid: boolean; error?: string } {
  if (!VALIDATION_PATTERNS.quality.test(quality)) {
    return { valid: false, error: `Invalid quality: ${quality}` };
  }

  if (!supportedQualities.includes(quality as ImageQuality)) {
    return { valid: false, error: `Quality "${quality}" not supported. Supported: ${supportedQualities.join(', ')}` };
  }

  return { valid: true };
}

/**
 * Validate format parameter
 */
export function validateFormat(
  format: string,
  supportedFormats: ImageFormat[] = ['jpg']
): { valid: boolean; error?: string } {
  if (!VALIDATION_PATTERNS.format.test(format)) {
    return { valid: false, error: `Invalid format: ${format}` };
  }

  if (!supportedFormats.includes(format as ImageFormat)) {
    return { valid: false, error: `Format "${format}" not supported. Supported: ${supportedFormats.join(', ')}` };
  }

  return { valid: true };
}

/**
 * Validate complete image request URI parameters
 */
export function validateImageRequest(
  params: {
    region: string;
    size: string;
    rotation: string;
    quality: string;
    format: string;
  },
  imageInfo?: Partial<ImageServiceInfo>
): ImageApiValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const profile = imageInfo?.profile || 'level0';
  const level = COMPLIANCE_LEVELS[profile];

  const supportsUpscaling = imageInfo?.extraFeatures?.includes('sizeUpscaling') || false;
  const supportsArbitrary = imageInfo?.extraFeatures?.includes('rotationArbitrary') || false;
  const supportsMirroring = imageInfo?.extraFeatures?.includes('mirroring') ||
                           level.requiredFeatures.includes('mirroring') || profile === 'level2';

  // Validate region
  const regionResult = validateRegion(params.region, imageInfo?.width, imageInfo?.height);
  if (!regionResult.valid) errors.push(regionResult.error!);

  // Validate size
  const sizeResult = validateSize(params.size, imageInfo?.width, imageInfo?.height, supportsUpscaling);
  if (!sizeResult.valid) errors.push(sizeResult.error!);

  // Validate rotation
  const rotationResult = validateRotation(params.rotation, supportsArbitrary, supportsMirroring);
  if (!rotationResult.valid) errors.push(rotationResult.error!);

  // Validate quality
  const supportedQualities = [...level.requiredQualities, ...(imageInfo?.extraQualities || [])];
  const qualityResult = validateQuality(params.quality, supportedQualities);
  if (!qualityResult.valid) errors.push(qualityResult.error!);

  // Validate format
  const supportedFormats = [...level.requiredFormats, ...(imageInfo?.extraFormats || [])];
  const formatResult = validateFormat(params.format, supportedFormats);
  if (!formatResult.valid) errors.push(formatResult.error!);

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// URI Building Functions
// ============================================================================

/**
 * Build IIIF Image API request URI
 */
export function buildImageUri(
  baseUri: string,
  params: ImageRequestParams
): string {
  const region = typeof params.region === 'string' ? params.region : formatRegion(params.region);
  const size = typeof params.size === 'string' ? params.size : formatSize(params.size);
  const rotation = typeof params.rotation === 'string' ? params.rotation : formatRotation(params.rotation);

  return `${baseUri}/${region}/${size}/${rotation}/${params.quality}.${params.format}`;
}

/**
 * Build info.json URI
 */
export function buildInfoUri(baseUri: string): string {
  return `${baseUri}/info.json`;
}

/**
 * Format region params to string
 */
export function formatRegion(params: RegionParams): string {
  switch (params.type) {
    case 'full':
      return 'full';
    case 'square':
      return 'square';
    case 'pixels':
      return `${params.x},${params.y},${params.w},${params.h}`;
    case 'percent':
      return `pct:${params.x},${params.y},${params.w},${params.h}`;
    default:
      return 'full';
  }
}

/**
 * Format size params to string
 */
export function formatSize(params: SizeParams): string {
  const prefix = params.upscale ? '^' : '';

  switch (params.type) {
    case 'max':
      return `${prefix}max`;
    case 'width':
      return `${prefix}${params.width},`;
    case 'height':
      return `${prefix},${params.height}`;
    case 'percent':
      return `${prefix}pct:${params.percent}`;
    case 'widthHeight':
      return `${prefix}${params.width},${params.height}`;
    case 'confined':
      return `${prefix}!${params.width},${params.height}`;
    default:
      return `${prefix}max`;
  }
}

/**
 * Format rotation params to string
 */
export function formatRotation(params: RotationParams): string {
  const prefix = params.mirror ? '!' : '';
  const degrees = Number.isInteger(params.degrees) ? params.degrees.toString() : params.degrees.toFixed(1);
  return `${prefix}${degrees}`;
}

/**
 * Parse image request URI into components
 */
export function parseImageUri(uri: string): {
  baseUri: string;
  identifier: string;
  region: string;
  size: string;
  rotation: string;
  quality: string;
  format: string;
} | null {
  // Match pattern: {base}/{identifier}/{region}/{size}/{rotation}/{quality}.{format}
  const match = uri.match(/^(.+?)\/([^\/]+)\/([^\/]+)\/([^\/]+)\/([^\/]+)\/([^\.]+)\.(\w+)$/);
  if (!match) return null;

  return {
    baseUri: `${match[1]}/${match[2]}`,
    identifier: match[2],
    region: match[3],
    size: match[4],
    rotation: match[5],
    quality: match[6],
    format: match[7]
  };
}

// ============================================================================
// Info.json Validation and Generation
// ============================================================================

/**
 * Validate info.json structure
 */
export function validateInfoJson(info: any): ImageApiValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required properties
  if (!info['@context']) {
    errors.push('@context is required');
  } else if (typeof info['@context'] === 'string') {
    if (info['@context'] !== IMAGE_API_CONTEXT) {
      warnings.push(`@context should be "${IMAGE_API_CONTEXT}"`);
    }
  } else if (Array.isArray(info['@context'])) {
    if (!info['@context'].includes(IMAGE_API_CONTEXT)) {
      errors.push(`@context array must include "${IMAGE_API_CONTEXT}"`);
    }
    if (info['@context'][info['@context'].length - 1] !== IMAGE_API_CONTEXT) {
      warnings.push('@context array should end with Image API context');
    }
  }

  if (!info.id) {
    errors.push('id is required');
  } else if (typeof info.id !== 'string' || !info.id.startsWith('http')) {
    errors.push('id must be a valid HTTP(S) URI');
  } else if (info.id.endsWith('/')) {
    warnings.push('id should not have a trailing slash');
  }

  if (!info.type) {
    errors.push('type is required');
  } else if (info.type !== 'ImageService3') {
    errors.push('type must be "ImageService3"');
  }

  if (!info.protocol) {
    errors.push('protocol is required');
  } else if (info.protocol !== IMAGE_API_PROTOCOL) {
    errors.push(`protocol must be "${IMAGE_API_PROTOCOL}"`);
  }

  if (!info.profile) {
    errors.push('profile is required');
  } else if (!['level0', 'level1', 'level2'].includes(info.profile)) {
    errors.push('profile must be "level0", "level1", or "level2"');
  }

  if (typeof info.width !== 'number' || info.width <= 0) {
    errors.push('width must be a positive integer');
  }

  if (typeof info.height !== 'number' || info.height <= 0) {
    errors.push('height must be a positive integer');
  }

  // Optional properties validation
  if (info.maxWidth !== undefined && (typeof info.maxWidth !== 'number' || info.maxWidth <= 0)) {
    errors.push('maxWidth must be a positive integer');
  }

  if (info.maxHeight !== undefined && (typeof info.maxHeight !== 'number' || info.maxHeight <= 0)) {
    errors.push('maxHeight must be a positive integer');
  }

  if (info.maxArea !== undefined && (typeof info.maxArea !== 'number' || info.maxArea <= 0)) {
    errors.push('maxArea must be a positive integer');
  }

  // Level 0 requires sizes if not supporting arbitrary sizes
  if (info.profile === 'level0' && (!info.sizes || info.sizes.length === 0) && (!info.tiles || info.tiles.length === 0)) {
    warnings.push('Level 0 servers should provide sizes or tiles array');
  }

  // Validate sizes array
  if (info.sizes) {
    if (!Array.isArray(info.sizes)) {
      errors.push('sizes must be an array');
    } else {
      info.sizes.forEach((size: any, i: number) => {
        if (typeof size.width !== 'number' || size.width <= 0) {
          errors.push(`sizes[${i}].width must be a positive integer`);
        }
        if (typeof size.height !== 'number' || size.height <= 0) {
          errors.push(`sizes[${i}].height must be a positive integer`);
        }
      });
    }
  }

  // Validate tiles array
  if (info.tiles) {
    if (!Array.isArray(info.tiles)) {
      errors.push('tiles must be an array');
    } else {
      info.tiles.forEach((tile: any, i: number) => {
        if (typeof tile.width !== 'number' || tile.width <= 0) {
          errors.push(`tiles[${i}].width must be a positive integer`);
        }
        if (tile.height !== undefined && (typeof tile.height !== 'number' || tile.height <= 0)) {
          errors.push(`tiles[${i}].height must be a positive integer`);
        }
        if (!Array.isArray(tile.scaleFactors) || tile.scaleFactors.length === 0) {
          errors.push(`tiles[${i}].scaleFactors must be a non-empty array of integers`);
        }
      });
    }
  }

  // Validate extraFeatures
  if (info.extraFeatures) {
    if (!Array.isArray(info.extraFeatures)) {
      errors.push('extraFeatures must be an array');
    } else {
      const validFeatures = Object.keys(FEATURE_DESCRIPTIONS);
      info.extraFeatures.forEach((feature: string) => {
        if (!validFeatures.includes(feature)) {
          warnings.push(`Unknown feature: ${feature}`);
        }
      });
    }

    // sizeUpscaling requires maxWidth or maxArea
    if (info.extraFeatures.includes('sizeUpscaling')) {
      if (info.maxWidth === undefined && info.maxArea === undefined) {
        errors.push('sizeUpscaling feature requires maxWidth or maxArea to be specified');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate minimal info.json for a given profile level
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
    extraFeatures?: ImageApiFeature[];
    extraFormats?: ImageFormat[];
    extraQualities?: ImageQuality[];
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
export function generateStandardSizes(width: number, height: number, targetWidths: number[] = [150, 600, 1200]): SizeInfo[] {
  const aspectRatio = height / width;
  return targetWidths
    .filter(w => w <= width) // Don't generate sizes larger than original
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
// Tile Calculation Functions
// ============================================================================

/**
 * Calculate tile parameters for a given position and scale
 */
export function calculateTileRequest(
  fullWidth: number,
  fullHeight: number,
  tileWidth: number,
  tileHeight: number,
  scaleFactor: number,
  tileX: number,
  tileY: number
): TileRequest {
  // Region in full image coordinates
  const x = tileX * tileWidth * scaleFactor;
  const y = tileY * tileHeight * scaleFactor;
  const w = Math.min(tileWidth * scaleFactor, fullWidth - x);
  const h = Math.min(tileHeight * scaleFactor, fullHeight - y);

  return { x, y, width: w, height: h, scaleFactor };
}

/**
 * Calculate number of tiles for a given scale factor
 */
export function calculateTileCount(
  fullWidth: number,
  fullHeight: number,
  tileWidth: number,
  tileHeight: number,
  scaleFactor: number
): { columns: number; rows: number } {
  const scaledWidth = Math.ceil(fullWidth / scaleFactor);
  const scaledHeight = Math.ceil(fullHeight / scaleFactor);

  return {
    columns: Math.ceil(scaledWidth / tileWidth),
    rows: Math.ceil(scaledHeight / tileHeight)
  };
}

/**
 * Build tile request URI
 */
export function buildTileUri(
  baseUri: string,
  tile: TileRequest,
  format: ImageFormat = 'jpg',
  quality: ImageQuality = 'default'
): string {
  const region = `${tile.x},${tile.y},${tile.width},${tile.height}`;
  const tileWidth = Math.ceil(tile.width / tile.scaleFactor);
  const tileHeight = Math.ceil(tile.height / tile.scaleFactor);
  const size = `${tileWidth},${tileHeight}`;

  return `${baseUri}/${region}/${size}/0/${quality}.${format}`;
}

/**
 * Get all tile URIs for a given scale factor
 */
export function getAllTileUris(
  baseUri: string,
  fullWidth: number,
  fullHeight: number,
  tileWidth: number,
  tileHeight: number,
  scaleFactor: number,
  format: ImageFormat = 'jpg',
  quality: ImageQuality = 'default'
): string[] {
  const { columns, rows } = calculateTileCount(fullWidth, fullHeight, tileWidth, tileHeight, scaleFactor);
  const uris: string[] = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const tile = calculateTileRequest(fullWidth, fullHeight, tileWidth, tileHeight, scaleFactor, x, y);
      uris.push(buildTileUri(baseUri, tile, format, quality));
    }
  }

  return uris;
}

// ============================================================================
// Compliance Checking
// ============================================================================

/**
 * Check if an info.json meets a specific compliance level
 */
export function checkComplianceLevel(info: ImageServiceInfo, targetLevel: ImageApiProfile): {
  compliant: boolean;
  missingFeatures: ImageApiFeature[];
  missingFormats: ImageFormat[];
  missingQualities: ImageQuality[];
} {
  const level = COMPLIANCE_LEVELS[targetLevel];
  const declaredProfile = info.profile;
  const profileLevel = COMPLIANCE_LEVELS[declaredProfile];

  // Gather all supported features
  const supportedFeatures = new Set([
    ...profileLevel.requiredFeatures,
    ...(info.extraFeatures || [])
  ]);

  const supportedFormats = new Set([
    ...profileLevel.requiredFormats,
    ...(info.extraFormats || [])
  ]);

  const supportedQualities = new Set([
    ...profileLevel.requiredQualities,
    ...(info.extraQualities || [])
  ]);

  const missingFeatures = level.requiredFeatures.filter(f => !supportedFeatures.has(f));
  const missingFormats = level.requiredFormats.filter(f => !supportedFormats.has(f));
  const missingQualities = level.requiredQualities.filter(q => !supportedQualities.has(q));

  return {
    compliant: missingFeatures.length === 0 && missingFormats.length === 0 && missingQualities.length === 0,
    missingFeatures,
    missingFormats,
    missingQualities
  };
}

/**
 * Get features required for a profile level
 */
export function getFeaturesForProfile(profile: ImageApiProfile): ImageApiFeature[] {
  return [...COMPLIANCE_LEVELS[profile].requiredFeatures];
}

/**
 * Get formats required for a profile level
 */
export function getFormatsForProfile(profile: ImageApiProfile): ImageFormat[] {
  return [...COMPLIANCE_LEVELS[profile].requiredFormats];
}

/**
 * Get qualities required for a profile level
 */
export function getQualitiesForProfile(profile: ImageApiProfile): ImageQuality[] {
  return [...COMPLIANCE_LEVELS[profile].requiredQualities];
}

// ============================================================================
// Service Reference on Content Resources
// ============================================================================

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
 * Check if an object is a valid ImageService3 reference
 */
export function isImageService3(service: any): service is {
  id: string;
  type: 'ImageService3';
  profile: ImageApiProfile;
  protocol?: string;
  width?: number;
  height?: number;
} {
  return (
    service &&
    typeof service === 'object' &&
    typeof service.id === 'string' &&
    service.type === 'ImageService3' &&
    ['level0', 'level1', 'level2'].includes(service.profile)
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get MIME type for format
 */
export function getImageMimeType(format: ImageFormat): string {
  return FORMAT_MIME_TYPES[format];
}

/**
 * Get format from MIME type
 */
export function getFormatFromMime(mimeType: string): ImageFormat | null {
  return MIME_TO_FORMAT[mimeType] || null;
}

/**
 * Calculate resulting dimensions after size operation
 */
export function calculateResultingSize(
  regionWidth: number,
  regionHeight: number,
  sizeParams: SizeParams
): { width: number; height: number } {
  const aspectRatio = regionHeight / regionWidth;

  switch (sizeParams.type) {
    case 'max':
      return { width: regionWidth, height: regionHeight };

    case 'width':
      return {
        width: sizeParams.width!,
        height: Math.round(sizeParams.width! * aspectRatio)
      };

    case 'height':
      return {
        width: Math.round(sizeParams.height! / aspectRatio),
        height: sizeParams.height!
      };

    case 'percent':
      return {
        width: Math.round(regionWidth * sizeParams.percent! / 100),
        height: Math.round(regionHeight * sizeParams.percent! / 100)
      };

    case 'widthHeight':
      return {
        width: sizeParams.width!,
        height: sizeParams.height!
      };

    case 'confined':
      const scaleW = sizeParams.width! / regionWidth;
      const scaleH = sizeParams.height! / regionHeight;
      const scale = Math.min(scaleW, scaleH);
      return {
        width: Math.round(regionWidth * scale),
        height: Math.round(regionHeight * scale)
      };

    default:
      return { width: regionWidth, height: regionHeight };
  }
}

/**
 * Encode identifier for use in URI
 */
export function encodeIdentifier(identifier: string): string {
  return encodeURIComponent(identifier);
}

/**
 * Decode identifier from URI
 */
export function decodeIdentifier(encoded: string): string {
  return decodeURIComponent(encoded);
}
