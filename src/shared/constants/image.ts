/**
 * Image Processing Constants — Stub for Svelte Migration
 *
 * TODO: Copy full implementation from React source at
 * field-studio/src/shared/constants/image.ts
 */

export { MIME_TYPE_MAP } from './index';

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
 * Default derivative sizes for quick access
 */
export const DEFAULT_DERIVATIVE_SIZES = [150, 600, 1200];

/**
 * Default ingest preferences
 */
export const DEFAULT_INGEST_PREFS = {
  defaultCanvasWidth: 2000,
  defaultCanvasHeight: 2000,
  defaultDuration: 100,
  thumbnailWidth: 250,
  thumbnailHeight: 250,
  maxFileSize: 100 * 1024 * 1024, // 100MB
};
