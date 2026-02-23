/**
 * Terminology — Pure computation (Category 1)
 *
 * Replaces useTerminology React hook (pure computation portion).
 * Architecture doc §4 Cat 1: Pure Computation → plain function.
 *
 * The reactive TerminologyStore lives in src/shared/stores/terminology.svelte.ts
 * These are the framework-agnostic pure functions it delegates to.
 */

import type { AbstractionLevel } from '@/src/shared/types';

// ── Terminology Maps ──

export type TerminologyKey = string;

/** Simple mode: user-friendly terms for non-specialists */
const SIMPLE_TERMS: Record<string, string> = {
  Collection: 'Album',
  Manifest: 'Item',
  Canvas: 'Page',
  Range: 'Section',
  Annotation: 'Note',
  AnnotationPage: 'Notes Page',
  metadata: 'Details',
  label: 'Title',
  summary: 'Description',
  rights: 'License',
  requiredStatement: 'Credit',
  provider: 'Source',
  navDate: 'Date',
  behavior: 'Display Options',
  viewingDirection: 'Reading Direction',
  thumbnail: 'Preview Image',
  homepage: 'Website',
  seeAlso: 'Related Links',
  rendering: 'Downloads',
  service: 'Services',
  navPlace: 'Location',
};

/** Standard mode: IIIF-aligned terms for informed users */
const STANDARD_TERMS: Record<string, string> = {
  Collection: 'Collection',
  Manifest: 'Manifest',
  Canvas: 'Canvas',
  Range: 'Range',
  Annotation: 'Annotation',
  AnnotationPage: 'Annotation Page',
  metadata: 'Metadata',
  label: 'Label',
  summary: 'Summary',
  rights: 'Rights',
  requiredStatement: 'Required Statement',
  provider: 'Provider',
  navDate: 'Navigation Date',
  behavior: 'Behavior',
  viewingDirection: 'Viewing Direction',
  thumbnail: 'Thumbnail',
  homepage: 'Homepage',
  seeAlso: 'See Also',
  rendering: 'Rendering',
  service: 'Service',
  navPlace: 'navPlace',
};

/** Advanced mode: full IIIF Presentation API 3.0 terms */
const ADVANCED_TERMS: Record<string, string> = {
  ...STANDARD_TERMS, // Advanced uses standard + shows IDs/URIs
};

export const TERMINOLOGY_MAP: Record<AbstractionLevel, Record<string, string>> = {
  simple: SIMPLE_TERMS,
  standard: STANDARD_TERMS,
  advanced: ADVANCED_TERMS,
};

// ── Pure Functions ──

/** Get a single term for the given level */
export function getTerm(key: string, level: AbstractionLevel): string {
  return TERMINOLOGY_MAP[level][key] ?? STANDARD_TERMS[key] ?? key;
}

/** Get multiple terms at once */
export function getTerms<K extends string>(keys: K[], level: AbstractionLevel): Record<K, string> {
  const result = {} as Record<K, string>;
  for (const k of keys) {
    result[k] = getTerm(k, level);
  }
  return result;
}

/** Get the display label for a resource type */
export function getResourceTypeLabel(
  type: string,
  level: AbstractionLevel,
  includeArticle = false
): string {
  const label = getTerm(type, level);
  if (!includeArticle) return label;
  const vowels = ['A', 'E', 'I', 'O', 'U'];
  const article = vowels.includes(label.charAt(0).toUpperCase()) ? 'an' : 'a';
  return `${article} ${label}`;
}

/** Get a description/tooltip for a term (only standard+ levels have these) */
export function getTermDescription(key: string): string | null {
  const descriptions: Record<string, string> = {
    Collection: 'An ordered list of Manifests or other Collections',
    Manifest: 'A description of the structure and layout of a single object',
    Canvas: 'A virtual container that represents a page or view',
    Range: 'An additional grouping of Canvases (e.g. chapters, sections)',
    Annotation: 'Content associated with a Canvas (images, text, comments)',
    AnnotationPage: 'An ordered list of Annotations',
  };
  return descriptions[key] ?? null;
}

/** Format a count with pluralized term: "5 Pages" */
export function formatCount(count: number, key: string, level: AbstractionLevel): string {
  const term = getTerm(key, level);
  if (count === 1) return `1 ${term}`;
  // Simple pluralization
  return `${count} ${term}${term.endsWith('s') ? '' : 's'}`;
}
