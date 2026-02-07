/**
 * IIIF type definitions and guards
 * Organism - depends on atoms
 */

import type { ContentResourceType } from '../../atoms/media-types';

// Re-export for use by other iiif modules
export type { ContentResourceType } from '../../atoms/media-types';

// ============================================================================
// Type Definitions
// ============================================================================

export type LanguageMap = Record<string, string[]>;

export interface MetadataEntry {
  label: LanguageMap;
  value: LanguageMap;
}

export interface Agent {
  id: string;
  type: 'Agent';
  label: LanguageMap;
  homepage?: ExternalResource[];
  logo?: ContentResource[];
  seeAlso?: ExternalResource[];
}

export interface Reference {
  id: string;
  type: string;
  label?: LanguageMap;
}

export interface ExternalResource {
  id: string;
  type: string;
  label?: LanguageMap;
  format?: string;
  profile?: string;
  language?: string[];
}

export interface ContentResource {
  id: string;
  type: ContentResourceType;
  format?: string;
  width?: number;
  height?: number;
  duration?: number;
  label?: LanguageMap;
  service?: unknown[];
}

export type IIIFResourceType =
  | 'Collection'
  | 'Manifest'
  | 'Canvas'
  | 'Range'
  | 'AnnotationPage'
  | 'AnnotationCollection'
  | 'Annotation'
  | 'ContentResource'
  | 'Agent'
  | 'SpecificResource'
  | 'Choice'
  | 'TextualBody';

export type ViewingDirection =
  | 'left-to-right'
  | 'right-to-left'
  | 'top-to-bottom'
  | 'bottom-to-top';

export type TimeMode = 'trim' | 'scale' | 'loop';

export type IIIFBehavior =
  | 'auto-advance'
  | 'no-auto-advance'
  | 'repeat'
  | 'no-repeat'
  | 'unordered'
  | 'individuals'
  | 'continuous'
  | 'paged'
  | 'facing-pages'
  | 'non-paged'
  | 'multi-part'
  | 'together'
  | 'sequence'
  | 'thumbnail-nav'
  | 'no-nav'
  | 'hidden';

export type IIIFMotivation =
  | 'painting'
  | 'supplementing'
  | 'commenting'
  | 'tagging'
  | 'linking'
  | 'identifying'
  | 'describing'
  | 'classifying'
  | 'bookmarking'
  | 'highlighting'
  | 'replying'
  | 'editing'
  | 'questioning'
  | 'assessing'
  | 'moderating';

// ============================================================================
// Type Guards
// ============================================================================

export function isValidLanguageMap(value: unknown): value is LanguageMap {
  if (!value || typeof value !== 'object') return false;

  for (const [key, values] of Object.entries(value)) {
    if (typeof key !== 'string') return false;
    if (!Array.isArray(values)) return false;
    if (!values.every((v) => typeof v === 'string')) return false;
  }

  return true;
}

export function isValidMetadataEntry(entry: unknown): entry is MetadataEntry {
  if (!entry || typeof entry !== 'object') return false;
  const e = entry as unknown as Record<string, unknown>;
  return isValidLanguageMap(e.label) && isValidLanguageMap(e.value);
}

export function isValidAgent(agent: unknown): agent is Agent {
  if (!agent || typeof agent !== 'object') return false;
  const a = agent as unknown as Record<string, unknown>;

  if (typeof a.id !== 'string') return false;
  if (a.type !== 'Agent') return false;
  if (!isValidLanguageMap(a.label)) return false;

  return true;
}

export function isValidReference(ref: unknown): ref is Reference {
  if (!ref || typeof ref !== 'object') return false;
  const r = ref as unknown as Record<string, unknown>;

  if (typeof r.id !== 'string') return false;
  if (typeof r.type !== 'string') return false;
  if (r.label !== undefined && !isValidLanguageMap(r.label)) return false;

  return true;
}

export function isValidExternalResource(
  resource: unknown
): resource is ExternalResource {
  if (!resource || typeof resource !== 'object') return false;
  const r = resource as unknown as Record<string, unknown>;

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

const _CONTENT_RESOURCE_TYPES = new Set(['Image', 'Video', 'Sound', 'Text', 'Dataset', 'Model']);

export function isValidContentResource(
  resource: unknown
): resource is ContentResource {
  if (!resource || typeof resource !== 'object') return false;
  const r = resource as unknown as Record<string, unknown>;

  if (typeof r.id !== 'string') return false;
  if (!_CONTENT_RESOURCE_TYPES.has(r.type as string)) return false;

  if (r.format !== undefined && typeof r.format !== 'string') return false;
  if (r.width !== undefined && (typeof r.width !== 'number' || r.width <= 0))
    return false;
  if (r.height !== undefined && (typeof r.height !== 'number' || r.height <= 0))
    return false;
  if (
    r.duration !== undefined &&
    (typeof r.duration !== 'number' || r.duration <= 0)
  )
    return false;
  if (r.label !== undefined && !isValidLanguageMap(r.label)) return false;

  return true;
}

// ============================================================================
// Helper Functions
// ============================================================================

export function createLanguageMap(
  value: string,
  language = 'none'
): LanguageMap {
  return { [language]: [value] };
}

export function getLanguageValue(
  map: LanguageMap | undefined,
  preferredLanguage = 'en'
): string {
  if (!map) return '';

  const fallbacks = [preferredLanguage, 'en', 'none', '@none'];

  for (const lang of fallbacks) {
    const values = map[lang];
    if (values?.length > 0 && values[0]) {
      return values[0];
    }
  }

  // Last resort: first non-empty value
  for (const values of Object.values(map)) {
    if (values?.length > 0 && values[0]) {
      return values[0];
    }
  }

  return '';
}

export function createMetadataEntry(
  label: string,
  value: string,
  language = 'none'
): MetadataEntry {
  return {
    label: createLanguageMap(label, language),
    value: createLanguageMap(value, language),
  };
}

// ============================================================================
// Constants
// ============================================================================

export const IIIF_MOTIVATIONS: IIIFMotivation[] = [
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
  'moderating',
];

const _MOTIVATION_SET = new Set<string>(IIIF_MOTIVATIONS);

export function isValidMotivation(motivation: string): boolean {
  return _MOTIVATION_SET.has(motivation);
}

export function isPaintingMotivation(
  motivation: string | string[]
): boolean {
  if (Array.isArray(motivation)) {
    return motivation.includes('painting');
  }
  return motivation === 'painting';
}

export function isValidNavDate(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') return false;

  const isoPattern =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/;
  if (!isoPattern.test(dateString)) return false;

  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

export function formatNavDate(date: Date): string {
  // Direct substring is faster than regex for a predictable format
  const iso = date.toISOString();
  return iso.substring(0, 19) + 'Z';
}

export function isValidDimension(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function isValidDuration(value: unknown): value is number {
  return typeof value === 'number' && value > 0;
}

export function isValidHttpUri(uri: string): boolean {
  if (!uri || typeof uri !== 'string') return false;
  return uri.startsWith('http://') || uri.startsWith('https://');
}

export function hasFragmentIdentifier(uri: string): boolean {
  return uri.includes('#');
}

export function isValidId(
  id: string,
  resourceType: string
): { valid: boolean; error?: string } {
  if (!id) {
    return { valid: false, error: 'ID is required' };
  }

  if (!isValidHttpUri(id)) {
    return { valid: false, error: 'ID must be a valid HTTP(S) URI' };
  }

  if (resourceType === 'Canvas' && hasFragmentIdentifier(id)) {
    return {
      valid: false,
      error: 'Canvas ID must not contain a fragment identifier',
    };
  }

  return { valid: true };
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
