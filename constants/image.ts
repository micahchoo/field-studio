/**
 * Image Processing Constants
 * 
 * Derivative presets, quality settings, and image pipeline configuration.
 */

/**
 * Derivative preset configuration for image size generation.
 */
export interface DerivativePreset {
  /** Unique preset identifier */
  name: string;
  /** Human-readable label */
  label: string;
  /** Description of use case */
  description: string;
  /** Thumbnail width (smallest size) */
  thumbnailWidth: number;
  /** Standard derivative widths to generate */
  sizes: number[];
  /** Full-width size for detail views */
  fullWidth: number;
  /** Tile size for deep zoom (Level 0) */
  tileSize: number;
  /** Scale factors for tile pyramid */
  scaleFactors: number[];
}

/**
 * Named derivative presets for different use cases
 */
export const DERIVATIVE_PRESETS: Record<string, DerivativePreset> = {
  /**
   * WAX-compatible preset - matches minicomp/wax defaults
   */
  'wax-compatible': {
    name: 'wax-compatible',
    label: 'WAX Compatible',
    description: 'Matches minicomp/wax defaults for static Jekyll sites',
    thumbnailWidth: 250,
    sizes: [250, 1140],
    fullWidth: 1140,
    tileSize: 256,
    scaleFactors: [1, 2, 4, 8]
  },

  /**
   * Level 0 static preset - pre-generated sizes for serverless deployment
   */
  'level0-static': {
    name: 'level0-static',
    label: 'Level 0 Static',
    description: 'Pre-generated sizes for static/serverless hosting (default)',
    thumbnailWidth: 150,
    sizes: [150, 600, 1200],
    fullWidth: 1200,
    tileSize: 512,
    scaleFactors: [1, 2, 4, 8]
  },

  /**
   * Level 2 dynamic preset - relies on image server for on-demand sizing
   */
  'level2-dynamic': {
    name: 'level2-dynamic',
    label: 'Level 2 Dynamic',
    description: 'Minimal derivatives for Level 2 image server deployment',
    thumbnailWidth: 150,
    sizes: [150],
    fullWidth: 0,
    tileSize: 512,
    scaleFactors: [1, 2, 4, 8, 16]
  },

  /**
   * Mobile-optimized preset
   */
  'mobile-optimized': {
    name: 'mobile-optimized',
    label: 'Mobile Optimized',
    description: 'Smaller derivatives optimized for mobile viewing',
    thumbnailWidth: 100,
    sizes: [100, 400, 800],
    fullWidth: 800,
    tileSize: 256,
    scaleFactors: [1, 2, 4]
  },

  /**
   * Archive quality preset
   */
  'archive-quality': {
    name: 'archive-quality',
    label: 'Archive Quality',
    description: 'Larger derivatives for archival and print use',
    thumbnailWidth: 250,
    sizes: [250, 800, 1600, 3200],
    fullWidth: 3200,
    tileSize: 512,
    scaleFactors: [1, 2, 4, 8, 16]
  }
} as const;

/**
 * Default derivative preset name
 */
export const DEFAULT_DERIVATIVE_PRESET = 'level0-static';

/**
 * Get a derivative preset by name, with fallback to default
 */
export function getDerivativePreset(name?: string): DerivativePreset {
  if (name && DERIVATIVE_PRESETS[name]) {
    return DERIVATIVE_PRESETS[name];
  }
  return DERIVATIVE_PRESETS[DEFAULT_DERIVATIVE_PRESET];
}

/**
 * Image processing quality settings
 */
export const IMAGE_QUALITY = {
  /** JPEG quality for thumbnails and previews */
  jpeg: 0.85,
  /** WebP quality (slightly higher since WebP compresses better) */
  webp: 0.85,
  /** Lower quality for quick previews during ingest */
  preview: 0.8,
} as const;

/**
 * MIME type mappings for file extensions
 */
export const MIME_TYPE_MAP: Record<string, { type: string; format: string; motivation: string }> = {
  'jpg': { type: 'Image', format: 'image/jpeg', motivation: 'painting' },
  'jpeg': { type: 'Image', format: 'image/jpeg', motivation: 'painting' },
  'png': { type: 'Image', format: 'image/png', motivation: 'painting' },
  'webp': { type: 'Image', format: 'image/webp', motivation: 'painting' },
  'gif': { type: 'Image', format: 'image/gif', motivation: 'painting' },
  'mp3': { type: 'Sound', format: 'audio/mpeg', motivation: 'painting' },
  'wav': { type: 'Sound', format: 'audio/wav', motivation: 'painting' },
  'mp4': { type: 'Video', format: 'video/mp4', motivation: 'painting' },
  'txt': { type: 'Text', format: 'text/plain', motivation: 'supplementing' },
  'json': { type: 'Dataset', format: 'application/json', motivation: 'supplementing' },
  'glb': { type: 'Model', format: 'model/gltf-binary', motivation: 'painting' },
} as const;

/**
 * Legacy default derivative sizes (for backwards compatibility)
 * @deprecated Use getDerivativePreset() instead
 */
export const DEFAULT_DERIVATIVE_SIZES = [150, 600, 1200];

/**
 * Legacy background generation sizes (for backwards compatibility)
 * @deprecated Use getDerivativePreset().sizes instead
 */
export const DEFAULT_BACKGROUND_SIZES = [600, 1200];
