/**
 * Shared Constants
 */

// Re-export sub-modules
export * from './canopyTemplates';
export * from './accessibility';
// csv.ts re-exports CSV_COLUMN_ALIASES and CSV_SUPPORTED_PROPERTIES (superset)
export * from './csv';
export * from './errors';
export * from './features';
export * from './helpContent';
export * from './iiifSpecs';
export * from './shortcuts';
export * from './ui';
export * from './viewport';
export {
  type DerivativePreset,
  DERIVATIVE_PRESETS,
  DEFAULT_DERIVATIVE_PRESET,
  getDerivativePreset,
  DEFAULT_DERIVATIVE_SIZES,
} from './image';
export {
  BEHAVIOR_DEFINITIONS,
  BEHAVIOR_CONFLICTS,
  getConflictingBehaviors,
  VIEWING_DIRECTIONS,
  MOTIVATION_TYPES,
  TIME_MODES,
  SUPPORTED_LANGUAGES,
  type BehaviorDefinition,
  type LanguageOption,
} from './iiif';
export {
  RIGHTS_OPTIONS,
  DUBLIN_CORE_MAP,
  METADATA_FIELD_DEFINITIONS,
  getVisibleFields,
  type MetadataComplexity,
  type FieldDefinition,
} from './metadata';

// ============================================================================
// Image Quality
// ============================================================================

export const IMAGE_QUALITY = {
  preview: 0.7,
  thumbnail: 0.6,
  full: 0.92,
};

// ============================================================================
// MIME Type Map
// ============================================================================

export const MIME_TYPE_MAP: Record<string, { mime: string; motivation: string; type: string; format: string }> = {
  jpg:  { mime: 'image/jpeg',       motivation: 'painting',     type: 'Image',   format: 'image/jpeg' },
  jpeg: { mime: 'image/jpeg',       motivation: 'painting',     type: 'Image',   format: 'image/jpeg' },
  png:  { mime: 'image/png',        motivation: 'painting',     type: 'Image',   format: 'image/png' },
  gif:  { mime: 'image/gif',        motivation: 'painting',     type: 'Image',   format: 'image/gif' },
  tif:  { mime: 'image/tiff',       motivation: 'painting',     type: 'Image',   format: 'image/tiff' },
  tiff: { mime: 'image/tiff',       motivation: 'painting',     type: 'Image',   format: 'image/tiff' },
  webp: { mime: 'image/webp',       motivation: 'painting',     type: 'Image',   format: 'image/webp' },
  svg:  { mime: 'image/svg+xml',    motivation: 'painting',     type: 'Image',   format: 'image/svg+xml' },
  avif: { mime: 'image/avif',       motivation: 'painting',     type: 'Image',   format: 'image/avif' },
  bmp:  { mime: 'image/bmp',        motivation: 'painting',     type: 'Image',   format: 'image/bmp' },
  mp3:  { mime: 'audio/mpeg',       motivation: 'painting',     type: 'Sound',   format: 'audio/mpeg' },
  wav:  { mime: 'audio/wav',        motivation: 'painting',     type: 'Sound',   format: 'audio/wav' },
  ogg:  { mime: 'audio/ogg',        motivation: 'painting',     type: 'Sound',   format: 'audio/ogg' },
  m4a:  { mime: 'audio/mp4',        motivation: 'painting',     type: 'Sound',   format: 'audio/mp4' },
  aac:  { mime: 'audio/aac',        motivation: 'painting',     type: 'Sound',   format: 'audio/aac' },
  flac: { mime: 'audio/flac',       motivation: 'painting',     type: 'Sound',   format: 'audio/flac' },
  mp4:  { mime: 'video/mp4',        motivation: 'painting',     type: 'Video',   format: 'video/mp4' },
  webm: { mime: 'video/webm',       motivation: 'painting',     type: 'Video',   format: 'video/webm' },
  mov:  { mime: 'video/quicktime',  motivation: 'painting',     type: 'Video',   format: 'video/quicktime' },
  pdf:  { mime: 'application/pdf',  motivation: 'supplementing', type: 'Text',   format: 'application/pdf' },
  txt:  { mime: 'text/plain',       motivation: 'supplementing', type: 'Text',   format: 'text/plain' },
  xml:  { mime: 'application/xml',  motivation: 'supplementing', type: 'Dataset', format: 'application/xml' },
  json: { mime: 'application/json', motivation: 'supplementing', type: 'Dataset', format: 'application/json' },
  csv:  { mime: 'text/csv',         motivation: 'supplementing', type: 'Dataset', format: 'text/csv' },
  yml:  { mime: 'text/yaml',        motivation: 'metadata',     type: 'Dataset', format: 'text/yaml' },
  yaml: { mime: 'text/yaml',        motivation: 'metadata',     type: 'Dataset', format: 'text/yaml' },
  glb:  { mime: 'model/gltf-binary', motivation: 'painting',   type: 'Model',   format: 'model/gltf-binary' },
  gltf: { mime: 'model/gltf+json',  motivation: 'painting',     type: 'Model',   format: 'model/gltf+json' },
};

// ============================================================================
// IIIF Spec Constants
// ============================================================================

export const IIIF_SPEC = {
  CONTEXT: 'http://iiif.io/api/presentation/3/context.json',
  PRESENTATION_3: {
    CONTEXT: 'http://iiif.io/api/presentation/3/context.json',
    TYPE: 'http://iiif.io/api/presentation/3',
  },
  SEARCH_2: {
    CONTEXT: 'http://iiif.io/api/search/2/context.json',
  },
  IMAGE_3: {
    CONTEXT: 'http://iiif.io/api/image/3/context.json',
    PROTOCOL: 'http://iiif.io/api/image',
  },
  AUTH_2: {
    CONTEXT: 'http://iiif.io/api/auth/2/context.json',
  },
  BEHAVIORS: {
    MANIFEST: ['auto-advance', 'no-auto-advance', 'continuous', 'paged', 'individuals', 'unordered', 'multi-part', 'together', 'sequence', 'thumbnail-nav', 'no-nav'],
    CANVAS: ['auto-advance', 'no-auto-advance', 'facing-pages', 'non-paged'],
    COLLECTION: ['auto-advance', 'no-auto-advance', 'continuous', 'individuals', 'multi-part', 'together', 'unordered'],
    RANGE: ['auto-advance', 'no-auto-advance', 'no-nav', 'thumbnail-nav'],
    ANNOTATION: [],
    ANNOTATION_COLLECTION: ['hidden'],
  },
  VIEWING_DIRECTIONS: ['left-to-right', 'right-to-left', 'top-to-bottom', 'bottom-to-top'] as const,
};

// ============================================================================
// Core Constants
// ============================================================================

export const DEFAULT_INGEST_PREFS = {
  preferredLanguage: 'en',
  generateThumbnails: true,
  extractMetadata: true,
  detectSequences: true,
  defaultCanvasWidth: 1000,
  defaultCanvasHeight: 1000,
};

// ============================================================================
// File Type Detection Helpers
// ============================================================================

export function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ['jpg','jpeg','png','gif','tif','tiff','webp','svg','avif'].includes(ext);
}

export function isAudioFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ['mp3','wav','ogg','m4a','aac','flac'].includes(ext);
}

export function isVideoFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ['mp4','webm'].includes(ext);
}

export function isSvgFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.svg');
}

export function isRasterImage(filename: string): boolean {
  return isImageFile(filename) && !isSvgFile(filename);
}

export function resolveFileFormat(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return MIME_TYPE_MAP[ext]?.mime || 'application/octet-stream';
}

export const IIIF_CONFIG = {
  DEFAULT_CONTEXT: 'http://iiif.io/api/presentation/3/context.json',
  IMAGE_API_VERSION: 3,
  SEARCH_API_VERSION: 2,
};

// ============================================================================
// Resource Type Visual Config
// ============================================================================

export interface ResourceTypeConfig {
  icon: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

export const RESOURCE_TYPE_CONFIG: Record<string, ResourceTypeConfig> = {
  'Collection':     { icon: 'folder',        colorClass: 'text-amber-600',   bgClass: 'bg-amber-100',   borderClass: 'border-amber-200' },
  'Manifest':       { icon: 'menu_book',      colorClass: 'text-emerald-600', bgClass: 'bg-emerald-100', borderClass: 'border-emerald-200' },
  'Canvas':         { icon: 'crop_original',  colorClass: 'text-blue-500',    bgClass: 'bg-blue-100',    borderClass: 'border-blue-200' },
  'Range':          { icon: 'segment',        colorClass: 'text-indigo-500',  bgClass: 'bg-indigo-100',  borderClass: 'border-indigo-200' },
  'AnnotationPage': { icon: 'layers',         colorClass: 'text-purple-500',  bgClass: 'bg-purple-100',  borderClass: 'border-purple-200' },
  'Annotation':     { icon: 'chat_bubble',    colorClass: 'text-teal-500',    bgClass: 'bg-teal-100',    borderClass: 'border-teal-200' },
  'Content':        { icon: 'image',          colorClass: 'text-slate-500',   bgClass: 'bg-slate-100',   borderClass: 'border-slate-200' },
};
