/**
 * IIIF Image API Constants
 * Organism - constants only
 */

// ============================================================================
// MIME Type Mappings
// ============================================================================

export const FORMAT_MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  tif: 'image/tiff',
  png: 'image/png',
  gif: 'image/gif',
  jp2: 'image/jp2',
  pdf: 'application/pdf',
  webp: 'image/webp',
} as const;

export const MIME_TO_FORMAT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/tiff': 'tif',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/jp2': 'jp2',
  'application/pdf': 'pdf',
  'image/webp': 'webp',
} as const;

// ============================================================================
// Compliance Levels
// ============================================================================

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

export type ImageApiProfile = 'level0' | 'level1' | 'level2';

export type ImageQuality = 'default' | 'color' | 'gray' | 'bitonal';

export type ImageFormat = 'jpg' | 'tif' | 'png' | 'gif' | 'jp2' | 'pdf' | 'webp';

export interface ComplianceLevel {
  uri: string;
  requiredFeatures: ImageApiFeature[];
  requiredFormats: ImageFormat[];
  requiredQualities: ImageQuality[];
}

export const COMPLIANCE_LEVELS: Record<ImageApiProfile, ComplianceLevel> = {
  level0: {
    uri: 'http://iiif.io/api/image/3/level0.json',
    requiredFeatures: [],
    requiredFormats: ['jpg'],
    requiredQualities: ['default'],
  },
  level1: {
    uri: 'http://iiif.io/api/image/3/level1.json',
    requiredFeatures: [
      'regionByPx',
      'regionSquare',
      'sizeByW',
      'sizeByH',
      'sizeByWh',
    ],
    requiredFormats: ['jpg'],
    requiredQualities: ['default'],
  },
  level2: {
    uri: 'http://iiif.io/api/image/3/level2.json',
    requiredFeatures: [
      'regionByPct',
      'regionByPx',
      'regionSquare',
      'sizeByConfinedWh',
      'sizeByH',
      'sizeByPct',
      'sizeByW',
      'sizeByWh',
      'rotationBy90s',
    ],
    requiredFormats: ['jpg', 'png'],
    requiredQualities: ['default', 'color', 'gray', 'bitonal'],
  },
} as const;

// ============================================================================
// Feature Descriptions
// ============================================================================

export const FEATURE_DESCRIPTIONS: Record<ImageApiFeature, string> = {
  baseUriRedirect: 'Base URI redirects to image information document',
  canonicalLinkHeader: 'Canonical image URI HTTP link header provided',
  cors: 'CORS HTTP headers provided on all responses',
  jsonldMediaType: 'JSON-LD media type provided when requested',
  mirroring: 'Image may be mirrored on vertical axis',
  profileLinkHeader: 'Profile HTTP link header provided',
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
  sizeUpscaling: 'Size prefixed with ^ may be requested',
} as const;

// ============================================================================
// Image API Context and Protocol
// ============================================================================

export const IMAGE_API_CONTEXT = 'http://iiif.io/api/image/3/context.json';

export const IMAGE_API_PROTOCOL = 'http://iiif.io/api/image' as const;

// ============================================================================
// Validation Patterns
// ============================================================================

export const VALIDATION_PATTERNS = {
  region: {
    full: /^full$/,
    square: /^square$/,
    pixels: /^\d+,\d+,\d+,\d+$/,
    percent: /^pct:\d+(\.\d+)?,\d+(\.\d+)?,\d+(\.\d+)?,\d+(\.\d+)?$/,
  },
  size: {
    max: /^max$/,
    width: /^\d+,$/,
    height: /^,\d+$/,
    widthHeight: /^\d+,\d+$/,
    confined: /^!\d+,\d+$/,
    percent: /^pct:\d+(\.\d+)?$/,
  },
  rotation: {
    degrees: /^!?\d+(\.\d+)?$/,
  },
  quality: /^(default|color|gray|bitonal)$/,
  format: /^(jpg|tif|png|gif|jp2|pdf|webp)$/,
} as const;
