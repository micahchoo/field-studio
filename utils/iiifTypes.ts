/**
 * IIIF Presentation API 3.0 Value Types and MIME Mapping
 *
 * Defines value type validators, MIME type mappings, content resource types,
 * and helper functions for working with IIIF value types.
 *
 * @see https://iiif.io/api/presentation/3.0/
 */

// ============================================================================
// Content Resource Types
// ============================================================================

export type ContentResourceType = 'Image' | 'Video' | 'Sound' | 'Text' | 'Dataset' | 'Model';

export const CONTENT_RESOURCE_TYPES: Record<ContentResourceType, {
  description: string;
  htmlElement?: string;
  mimePatterns: string[];
}> = {
  Image: {
    description: '2D visual resources',
    htmlElement: 'img',
    mimePatterns: ['image/*']
  },
  Video: {
    description: 'Moving images with/without audio',
    htmlElement: 'video',
    mimePatterns: ['video/*']
  },
  Sound: {
    description: 'Auditory resources',
    htmlElement: 'audio',
    mimePatterns: ['audio/*']
  },
  Text: {
    description: 'Resources primarily intended to be read',
    mimePatterns: ['text/*', 'application/pdf']
  },
  Dataset: {
    description: 'Data not intended for direct human rendering',
    mimePatterns: ['application/json', 'application/xml', 'application/ld+json']
  },
  Model: {
    description: '3D+ models for human interaction',
    mimePatterns: ['model/*', 'application/gltf+json']
  }
};

// ============================================================================
// MIME Type Mapping
// ============================================================================

/**
 * File extension to MIME type mapping
 */
export const MIME_TYPE_MAP: Record<string, string> = {
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',

  // Video
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.m4v': 'video/x-m4v',

  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4',
  '.weba': 'audio/webm',

  // Text
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.csv': 'text/csv',
  '.md': 'text/markdown',
  '.vtt': 'text/vtt',
  '.srt': 'text/srt',

  // Documents
  '.pdf': 'application/pdf',
  '.epub': 'application/epub+zip',

  // Data
  '.xml': 'application/xml',
  '.json': 'application/json',
  '.jsonld': 'application/ld+json',
  '.rdf': 'application/rdf+xml',

  // 3D Models
  '.gltf': 'model/gltf+json',
  '.glb': 'model/gltf-binary',
  '.obj': 'model/obj',
  '.stl': 'model/stl',
  '.usdz': 'model/vnd.usdz+zip'
};

/**
 * Get MIME type from file extension
 */
export function getMimeType(filename: string): string | null {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return MIME_TYPE_MAP[ext] || null;
}

/**
 * Get file extension from MIME type
 */
export function getExtensionForMime(mimeType: string): string | null {
  for (const [ext, mime] of Object.entries(MIME_TYPE_MAP)) {
    if (mime === mimeType) return ext;
  }
  return null;
}

/**
 * Determine content resource type from MIME type
 */
export function getContentTypeFromMime(mimeType: string): ContentResourceType {
  const type = mimeType.split('/')[0];

  switch (type) {
    case 'image':
      return 'Image';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Sound';
    case 'text':
      return 'Text';
    case 'model':
      return 'Model';
    default:
      // Special cases
      if (mimeType === 'application/pdf') return 'Text';
      if (mimeType.includes('json') || mimeType.includes('xml')) return 'Dataset';
      return 'Dataset';
  }
}

/**
 * Determine content resource type from filename
 */
export function getContentTypeFromFilename(filename: string): ContentResourceType {
  const mime = getMimeType(filename);
  return mime ? getContentTypeFromMime(mime) : 'Dataset';
}

/**
 * Check if MIME type is for an image
 */
export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Check if MIME type is for video
 */
export function isVideoMime(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

/**
 * Check if MIME type is for audio
 */
export function isAudioMime(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

/**
 * Check if MIME type is time-based (video or audio)
 */
export function isTimeBasedMime(mimeType: string): boolean {
  return isVideoMime(mimeType) || isAudioMime(mimeType);
}

/**
 * Check if MIME type is visual (image or video)
 */
export function isVisualMime(mimeType: string): boolean {
  return isImageMime(mimeType) || isVideoMime(mimeType);
}

// ============================================================================
// LanguageMap Value Type
// ============================================================================

export type LanguageMap = Record<string, string[]>;

/**
 * Validate a LanguageMap structure
 */
export function isValidLanguageMap(value: unknown): value is LanguageMap {
  if (!value || typeof value !== 'object') return false;

  for (const [key, values] of Object.entries(value)) {
    if (typeof key !== 'string') return false;
    if (!Array.isArray(values)) return false;
    if (!values.every(v => typeof v === 'string')) return false;
  }

  return true;
}

/**
 * Create a LanguageMap from a simple string
 */
export function createLanguageMap(value: string, language: string = 'none'): LanguageMap {
  return { [language]: [value] };
}

/**
 * Get the first value from a LanguageMap with fallback chain
 */
export function getLanguageValue(
  map: LanguageMap | undefined,
  preferredLanguage: string = 'en'
): string {
  if (!map) return '';

  const fallbacks = [preferredLanguage, 'en', 'none', '@none'];

  for (const lang of fallbacks) {
    const values = map[lang];
    if (values && values.length > 0 && values[0]) {
      return values[0];
    }
  }

  // Last resort: first non-empty value
  for (const values of Object.values(map)) {
    if (values && values.length > 0 && values[0]) {
      return values[0];
    }
  }

  return '';
}

// ============================================================================
// MetadataEntry Value Type
// ============================================================================

export interface MetadataEntry {
  label: LanguageMap;
  value: LanguageMap;
}

/**
 * Validate a MetadataEntry structure
 */
export function isValidMetadataEntry(entry: unknown): entry is MetadataEntry {
  if (!entry || typeof entry !== 'object') return false;
  const e = entry as any;
  return isValidLanguageMap(e.label) && isValidLanguageMap(e.value);
}

/**
 * Create a MetadataEntry
 */
export function createMetadataEntry(
  label: string,
  value: string,
  language: string = 'none'
): MetadataEntry {
  return {
    label: createLanguageMap(label, language),
    value: createLanguageMap(value, language)
  };
}

// ============================================================================
// Agent Value Type
// ============================================================================

export interface Agent {
  id: string;
  type: 'Agent';
  label: LanguageMap;
  homepage?: ExternalResource[];
  logo?: ContentResource[];
  seeAlso?: ExternalResource[];
}

/**
 * Validate an Agent structure
 */
export function isValidAgent(agent: unknown): agent is Agent {
  if (!agent || typeof agent !== 'object') return false;
  const a = agent as any;

  if (typeof a.id !== 'string') return false;
  if (a.type !== 'Agent') return false;
  if (!isValidLanguageMap(a.label)) return false;

  return true;
}

// ============================================================================
// Reference Value Type
// ============================================================================

export interface Reference {
  id: string;
  type: string;
  label?: LanguageMap;
}

/**
 * Validate a Reference structure
 */
export function isValidReference(ref: unknown): ref is Reference {
  if (!ref || typeof ref !== 'object') return false;
  const r = ref as any;

  if (typeof r.id !== 'string') return false;
  if (typeof r.type !== 'string') return false;
  if (r.label !== undefined && !isValidLanguageMap(r.label)) return false;

  return true;
}

// ============================================================================
// ExternalResource Value Type
// ============================================================================

export interface ExternalResource {
  id: string;
  type: string;
  label?: LanguageMap;
  format?: string;
  profile?: string;
  language?: string[];
}

/**
 * Validate an ExternalResource structure
 */
export function isValidExternalResource(resource: unknown): resource is ExternalResource {
  if (!resource || typeof resource !== 'object') return false;
  const r = resource as any;

  if (typeof r.id !== 'string') return false;
  if (typeof r.type !== 'string') return false;
  if (r.label !== undefined && !isValidLanguageMap(r.label)) return false;
  if (r.format !== undefined && typeof r.format !== 'string') return false;
  if (r.profile !== undefined && typeof r.profile !== 'string') return false;
  if (r.language !== undefined) {
    if (!Array.isArray(r.language)) return false;
    if (!r.language.every((l: unknown) => typeof l === 'string')) return false;
  }

  return true;
}

// ============================================================================
// ContentResource Value Type
// ============================================================================

export interface ContentResource {
  id: string;
  type: ContentResourceType;
  format?: string;
  width?: number;
  height?: number;
  duration?: number;
  label?: LanguageMap;
  service?: any[];
}

/**
 * Validate a ContentResource structure
 */
export function isValidContentResource(resource: unknown): resource is ContentResource {
  if (!resource || typeof resource !== 'object') return false;
  const r = resource as any;

  if (typeof r.id !== 'string') return false;
  if (!['Image', 'Video', 'Sound', 'Text', 'Dataset', 'Model'].includes(r.type)) return false;

  if (r.format !== undefined && typeof r.format !== 'string') return false;
  if (r.width !== undefined && (typeof r.width !== 'number' || r.width <= 0)) return false;
  if (r.height !== undefined && (typeof r.height !== 'number' || r.height <= 0)) return false;
  if (r.duration !== undefined && (typeof r.duration !== 'number' || r.duration <= 0)) return false;
  if (r.label !== undefined && !isValidLanguageMap(r.label)) return false;

  return true;
}

// ============================================================================
// URI Validation
// ============================================================================

/**
 * Check if a string is a valid HTTP(S) URI
 */
export function isValidHttpUri(uri: string): boolean {
  if (!uri || typeof uri !== 'string') return false;
  return uri.startsWith('http://') || uri.startsWith('https://');
}

/**
 * Check if a URI contains a fragment identifier
 */
export function hasFragmentIdentifier(uri: string): boolean {
  return uri.includes('#');
}

/**
 * Validate an ID for a specific resource type
 */
export function isValidId(id: string, resourceType: string): { valid: boolean; error?: string } {
  if (!id) {
    return { valid: false, error: 'ID is required' };
  }

  if (!isValidHttpUri(id)) {
    return { valid: false, error: 'ID must be a valid HTTP(S) URI' };
  }

  // Canvas-specific: must not contain fragment identifier
  if (resourceType === 'Canvas' && hasFragmentIdentifier(id)) {
    return { valid: false, error: 'Canvas ID must not contain a fragment identifier' };
  }

  return { valid: true };
}

// ============================================================================
// DateTime Validation (navDate)
// ============================================================================

/**
 * Check if a string is a valid xsd:dateTime format
 * Preferred: UTC with Z indicator (2010-01-01T00:00:00Z)
 * Alternative: offset +/-hh:mm
 */
export function isValidNavDate(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') return false;

  // ISO 8601 with timezone pattern
  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/;
  if (!isoPattern.test(dateString)) return false;

  // Check if it's a valid date
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Format a Date to IIIF navDate format (UTC)
 */
export function formatNavDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// ============================================================================
// Rights URI Validation
// ============================================================================

const CREATIVE_COMMONS_PATTERN = /^https?:\/\/creativecommons\.org\/licenses\/.+/;
const RIGHTS_STATEMENTS_PATTERN = /^https?:\/\/rightsstatements\.org\/vocab\/.+/;

/**
 * Check if a rights URI is from a known rights registry
 */
export function isKnownRightsUri(uri: string): boolean {
  return CREATIVE_COMMONS_PATTERN.test(uri) || RIGHTS_STATEMENTS_PATTERN.test(uri);
}

/**
 * Validate a rights value
 */
export function isValidRightsUri(uri: string): { valid: boolean; warning?: string } {
  if (!isValidHttpUri(uri)) {
    return { valid: false };
  }

  if (!isKnownRightsUri(uri)) {
    return {
      valid: true,
      warning: 'Rights URI is not from Creative Commons or RightsStatements.org'
    };
  }

  return { valid: true };
}

// ============================================================================
// Dimension Validation
// ============================================================================

/**
 * Check if a value is a valid positive integer (for dimensions)
 */
export function isValidDimension(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Check if a value is a valid positive float (for duration)
 */
export function isValidDuration(value: unknown): value is number {
  return typeof value === 'number' && value > 0;
}

// ============================================================================
// Service Type Validation
// ============================================================================

export const LEGACY_SERVICE_TYPES: Record<string, string> = {
  'ImageService1': 'IIIF Image API version 1',
  'ImageService2': 'IIIF Image API version 2',
  'ImageService3': 'IIIF Image API version 3',
  'SearchService1': 'IIIF Search API version 1',
  'SearchService2': 'IIIF Search API version 2',
  'AutoCompleteService1': 'IIIF Search API version 1 AutoComplete',
  'AuthCookieService1': 'IIIF Authentication API version 1',
  'AuthTokenService1': 'IIIF Authentication API version 1',
  'AuthLogoutService1': 'IIIF Authentication API version 1',
  'AuthProbeService2': 'IIIF Authentication API version 2',
  'AuthAccessService2': 'IIIF Authentication API version 2',
  'AuthAccessTokenService2': 'IIIF Authentication API version 2',
  'AuthLogoutService2': 'IIIF Authentication API version 2'
};

/**
 * Check if a service type is a known IIIF service type
 */
export function isKnownServiceType(type: string): boolean {
  return type in LEGACY_SERVICE_TYPES;
}

// ============================================================================
// Motivation Validation
// ============================================================================

export const IIIF_MOTIVATIONS = [
  'painting',
  'supplementing',
  'commenting',
  'tagging',
  'linking',
  'identifying',
  'describing',
  'classifying',
  'bookmarking',
  'highlighting',
  'replying',
  'editing',
  'questioning',
  'assessing',
  'moderating'
] as const;

export type IIIFMotivation = typeof IIIF_MOTIVATIONS[number];

/**
 * Check if a motivation value is valid
 */
export function isValidMotivation(motivation: string): boolean {
  return IIIF_MOTIVATIONS.includes(motivation as IIIFMotivation);
}

/**
 * Check if motivation is painting (primary content)
 */
export function isPaintingMotivation(motivation: string | string[]): boolean {
  if (Array.isArray(motivation)) {
    return motivation.includes('painting');
  }
  return motivation === 'painting';
}

// ============================================================================
// UUID Generation
// ============================================================================

/**
 * Generate a UUID v4 for IIIF resource IDs
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
