/**
 * uiTerminology - Terminology Translation Layer
 *
 * Provides user-friendly terms for simple mode while maintaining
 * IIIF terminology in standard and advanced modes.
 * Part of Phase 3 UX Simplification: Progressive Disclosure.
 */

import type { AbstractionLevel } from '@/src/shared/types';

/**
 * Terminology mappings for each abstraction level
 */
export const TERMINOLOGY_MAP = {
  simple: {
    // IIIF Resource Types
    Collection: 'Album',
    Manifest: 'Item Group',
    Canvas: 'Page',
    Annotation: 'Note',
    AnnotationPage: 'Note Layer',
    Range: 'Chapter',
    AnnotationCollection: 'Note Collection',
    
    // UI Labels
    Archive: 'Library',
    archive: 'library',
    'Archive Explorer': 'Library Explorer',
    Inspector: 'Details',
    Metadata: 'Information',
    Label: 'Title',
    Summary: 'Description',
    Rights: 'License',
    Behavior: 'Display Mode',
    Structures: 'Table of Contents',
    viewingDirection: 'Reading Order',
    navDate: 'Date',
    navPlace: 'Location',
    requiredStatement: 'Attribution',
    provider: 'Source',
    seeAlso: 'Related Links',
    rendering: 'Downloads',
    thumbnail: 'Preview',
    
    // Actions
    Ingest: 'Import',
    ingest: 'import',
    Export: 'Save',
    export: 'save',
    Synthesize: 'Create',
    synthesize: 'create',
    Batch: 'Multiple',
    batch: 'multiple',
    
    // IIIF Concepts
    'IIIF Collection': 'Album',
    'IIIF Manifest': 'Item Group',
    'IIIF Canvas': 'Page',
    'W3C Web Annotation': 'Note',
    'painting': 'content',
    'supplementing': 'attachment',
    'commenting': 'comment',
    'tagging': 'tag',
    'identifying': 'identification',
    'describing': 'description',
    
    // View Modes
    workspace: 'Browse',
    detail: 'Edit',
    preview: 'View',
    
    // Staging Workbench
    'Source Manifests': 'Files',
    'Archive Layout': 'Organization',
    'Assign to Collection': 'Add to Album',
    'Create Collection': 'Create Album',
    'Unassigned': 'Not in Album',
  },
  standard: {
    // IIIF Resource Types - use standard IIIF terms
    Collection: 'Collection',
    Manifest: 'Manifest',
    Canvas: 'Canvas',
    Annotation: 'Annotation',
    AnnotationPage: 'Annotation Page',
    Range: 'Range',
    AnnotationCollection: 'Annotation Collection',
    
    // UI Labels
    Archive: 'Archive',
    archive: 'archive',
    'Archive Explorer': 'Archive Explorer',
    Inspector: 'Inspector',
    Metadata: 'Metadata',
    Label: 'Label',
    Summary: 'Summary',
    Rights: 'Rights',
    Behavior: 'Behavior',
    Structures: 'Structures',
    viewingDirection: 'Viewing Direction',
    navDate: 'Navigation Date',
    navPlace: 'Navigation Place',
    requiredStatement: 'Required Statement',
    provider: 'Provider',
    seeAlso: 'See Also',
    rendering: 'Rendering',
    thumbnail: 'Thumbnail',
    
    // Actions
    Ingest: 'Ingest',
    ingest: 'ingest',
    Export: 'Export',
    export: 'export',
    Synthesize: 'Synthesize',
    synthesize: 'synthesize',
    Batch: 'Batch',
    batch: 'batch',
    
    // IIIF Concepts
    'IIIF Collection': 'IIIF Collection',
    'IIIF Manifest': 'IIIF Manifest',
    'IIIF Canvas': 'IIIF Canvas',
    'W3C Web Annotation': 'W3C Web Annotation',
    'painting': 'painting',
    'supplementing': 'supplementing',
    'commenting': 'commenting',
    'tagging': 'tagging',
    'identifying': 'identifying',
    'describing': 'describing',
    
    // View Modes
    workspace: 'Workspace',
    detail: 'Detail',
    preview: 'Preview',
    
    // Staging Workbench
    'Source Manifests': 'Source Manifests',
    'Archive Layout': 'Archive Layout',
    'Assign to Collection': 'Assign to Collection',
    'Create Collection': 'Create Collection',
    'Unassigned': 'Unassigned',
  },
  advanced: {
    // In advanced mode, we show technical terms
    // Many are the same as standard but may include technical specifics
    Collection: 'Collection',
    Manifest: 'Manifest',
    Canvas: 'Canvas',
    Annotation: 'Annotation',
    AnnotationPage: 'AnnotationPage',
    Range: 'Range',
    AnnotationCollection: 'AnnotationCollection',
    
    // UI Labels
    Archive: 'Archive',
    archive: 'archive',
    'Archive Explorer': 'Archive Explorer',
    Inspector: 'Inspector',
    Metadata: 'Metadata',
    Label: 'label (IIIF)', // Show technical name
    Summary: 'summary (IIIF)',
    Rights: 'rights',
    Behavior: 'behavior',
    Structures: 'structures',
    viewingDirection: 'viewingDirection',
    navDate: 'navDate',
    navPlace: 'navPlace',
    requiredStatement: 'requiredStatement',
    provider: 'provider',
    seeAlso: 'seeAlso',
    rendering: 'rendering',
    thumbnail: 'thumbnail',
    
    // Actions
    Ingest: 'Ingest',
    ingest: 'ingest',
    Export: 'Export',
    export: 'export',
    Synthesize: 'Synthesize',
    synthesize: 'synthesize',
    Batch: 'Batch',
    batch: 'batch',
    
    // IIIF Concepts
    'IIIF Collection': 'sc:Collection',
    'IIIF Manifest': 'sc:Manifest',
    'IIIF Canvas': 'sc:Canvas',
    'W3C Web Annotation': 'oa:Annotation',
    'painting': 'sc:painting',
    'supplementing': 'sc:supplementing',
    'commenting': 'oa:commenting',
    'tagging': 'oa:tagging',
    'identifying': 'oa:identifying',
    'describing': 'oa:describing',
    
    // View Modes
    workspace: 'workspace',
    detail: 'detail',
    preview: 'preview',
    
    // Staging Workbench
    'Source Manifests': 'Source Manifests',
    'Archive Layout': 'Archive Layout',
    'Assign to Collection': 'Assign to Collection',
    'Create Collection': 'Create Collection',
    'Unassigned': 'Unassigned',
  }
} as const;

/**
 * Type for terminology keys
 */
export type TerminologyKey = keyof typeof TERMINOLOGY_MAP.simple;

/**
 * Get the appropriate term for a given key based on abstraction level
 *
 * @param key - The terminology key to look up
 * @param level - The current abstraction level
 * @returns The translated term
 *
 * @example
 * getTerm('Collection', 'simple') // 'Album'
 * getTerm('Collection', 'standard') // 'Collection'
 */
export function getTerm(key: string, level: AbstractionLevel): string {
  const map = TERMINOLOGY_MAP[level];
  return (map as Record<string, string>)[key] || key;
}

/**
 * Get multiple terms at once
 *
 * @param keys - Array of terminology keys
 * @param level - The current abstraction level
 * @returns Object with keys mapped to translated terms
 *
 * @example
 * getTerms(['Collection', 'Manifest'], 'simple')
 * // { Collection: 'Album', Manifest: 'Item Group' }
 */
export function getTerms<K extends string>(
  keys: K[],
  level: AbstractionLevel
): Record<K, string> {
  const result = {} as Record<K, string>;
  keys.forEach(key => {
    result[key] = getTerm(key, level) as string;
  });
  return result;
}

/**
 * Get resource type label with article prefix if appropriate
 *
 * @param type - The IIIF resource type
 * @param level - The current abstraction level
 * @param includeArticle - Whether to include "a/an" article
 * @returns The formatted label
 *
 * @example
 * getResourceTypeLabel('Collection', 'simple') // 'an Album'
 * getResourceTypeLabel('Manifest', 'simple', false) // 'Item Group'
 */
export function getResourceTypeLabel(
  type: string,
  level: AbstractionLevel,
  includeArticle: boolean = false
): string {
  const term = getTerm(type, level);
  
  if (!includeArticle) {
    return term;
  }
  
  // Determine article based on first letter
  const article = /^[aeiou]/i.test(term) ? 'an' : 'a';
  return `${article} ${term}`;
}

/**
 * Get tooltip/description for a term
 *
 * @param key - The terminology key
 * @returns Description string or null
 */
export function getTermDescription(key: string): string | null {
  const descriptions: Record<string, string> = {
    Collection: 'A curated group of IIIF Manifests (like a folder or album)',
    Manifest: 'A single IIIF resource describing a physical or digital object',
    Canvas: 'A single view or page within a Manifest',
    Annotation: 'A note, tag, or mark associated with a specific region',
    Range: 'A structural division like a chapter or section',
    Label: 'The primary name or title of the resource',
    Summary: 'A brief description of the resource content',
    Rights: 'License or rights statement URL',
    Behavior: 'How the resource should be presented in viewers',
  };
  
  return descriptions[key] || null;
}

/**
 * Format a count with the appropriate pluralized term
 *
 * @param count - The number of items
 * @param key - The terminology key
 * @param level - The current abstraction level
 * @returns Formatted string with count and pluralized term
 *
 * @example
 * formatCountWithTerm(5, 'Collection', 'simple') // '5 Albums'
 * formatCountWithTerm(1, 'Collection', 'simple') // '1 Album'
 */
export function formatCountWithTerm(
  count: number,
  key: string,
  level: AbstractionLevel
): string {
  const term = getTerm(key, level);
  const plural = count === 1 ? term : `${term}s`;
  return `${count} ${plural}`;
}

export default {
  TERMINOLOGY_MAP,
  getTerm,
  getTerms,
  getResourceTypeLabel,
  getTermDescription,
  formatCountWithTerm
};
