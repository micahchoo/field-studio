/**
 * UI Terminology - Progressive Disclosure
 * Organism - depends on atoms (no IIIF dependencies)
 */

import type { ContentResourceType } from '../../atoms/media-types';

// ============================================================================
// Type Definitions
// ============================================================================

export type AbstractionLevel = 'simple' | 'standard' | 'advanced';

export type TerminologyKey =
  // Resource Types
  | 'Collection'
  | 'Manifest'
  | 'Canvas'
  | 'Annotation'
  | 'AnnotationPage'
  | 'Range'
  | 'AnnotationCollection'
  // UI Labels
  | 'Archive'
  | 'archive'
  | 'Archive Explorer'
  | 'Inspector'
  | 'Metadata'
  | 'Label'
  | 'Summary'
  | 'Rights'
  | 'Behavior'
  | 'Structures'
  | 'viewingDirection'
  | 'navDate'
  | 'navPlace'
  | 'requiredStatement'
  | 'provider'
  | 'seeAlso'
  | 'rendering'
  | 'thumbnail'
  // Actions
  | 'Ingest'
  | 'ingest'
  | 'Export'
  | 'export'
  | 'Synthesize'
  | 'synthesize'
  | 'Batch'
  | 'batch'
  // IIIF Concepts
  | 'IIIF Collection'
  | 'IIIF Manifest'
  | 'IIIF Canvas'
  | 'W3C Web Annotation'
  | 'painting'
  | 'supplementing'
  | 'commenting'
  | 'tagging'
  | 'identifying'
  | 'describing'
  // View Modes
  | 'workspace'
  | 'detail'
  | 'preview'
  // Staging
  | 'Source Manifests'
  | 'Archive Layout'
  | 'Assign to Collection'
  | 'Create Collection'
  | 'Unassigned';

// ============================================================================
// Terminology Maps
// ============================================================================

export const TERMINOLOGY_MAP: Record<AbstractionLevel, Record<string, string>> = {
  simple: {
    // Resource Types
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
    painting: 'content',
    supplementing: 'attachment',
    commenting: 'comment',
    tagging: 'tag',
    identifying: 'identification',
    describing: 'description',
    // View Modes
    workspace: 'Browse',
    detail: 'Edit',
    preview: 'View',
    // Staging
    'Source Manifests': 'Files',
    'Archive Layout': 'Organization',
    'Assign to Collection': 'Add to Album',
    'Create Collection': 'Create Album',
    Unassigned: 'Not in Album',
  },
  standard: {
    // Resource Types
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
    painting: 'painting',
    supplementing: 'supplementing',
    commenting: 'commenting',
    tagging: 'tagging',
    identifying: 'identifying',
    describing: 'describing',
    // View Modes
    workspace: 'Workspace',
    detail: 'Detail',
    preview: 'Preview',
    // Staging
    'Source Manifests': 'Source Manifests',
    'Archive Layout': 'Archive Layout',
    'Assign to Collection': 'Assign to Collection',
    'Create Collection': 'Create Collection',
    Unassigned: 'Unassigned',
  },
  advanced: {
    // Same as standard but with technical specifics
    ...{},
  },
};

// Initialize advanced as copy of standard
TERMINOLOGY_MAP.advanced = { ...TERMINOLOGY_MAP.standard };

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a term for the specified abstraction level
 */
export function getTerm(
  key: TerminologyKey,
  level: AbstractionLevel = 'standard'
): string {
  return TERMINOLOGY_MAP[level][key] || TERMINOLOGY_MAP.standard[key] || key;
}

/**
 * Get multiple terms at once
 */
export function getTerms(
  keys: TerminologyKey[],
  level: AbstractionLevel = 'standard'
): Record<TerminologyKey, string> {
  const result = {} as Record<TerminologyKey, string>;
  for (const key of keys) {
    result[key] = getTerm(key, level);
  }
  return result;
}

/**
 * Get resource type label
 */
export function getResourceTypeLabel(
  type: string,
  level: AbstractionLevel = 'standard'
): string {
  const key = type as TerminologyKey;
  return getTerm(key, level);
}

/**
 * Get term description (if available)
 */
export function getTermDescription(_key: TerminologyKey): string {
  // TODO: Add descriptions for terms
  return '';
}

/**
 * Format a count with the appropriate term
 */
export function formatCountWithTerm(
  count: number,
  key: TerminologyKey,
  level: AbstractionLevel = 'standard'
): string {
  const term = getTerm(key, level);
  const pluralTerm = count === 1 ? term : `${term}s`;
  return `${count} ${pluralTerm}`;
}

/**
 * Get all terms for a level
 */
export function getAllTerms(
  level: AbstractionLevel = 'standard'
): Record<string, string> {
  return { ...TERMINOLOGY_MAP[level] };
}

/**
 * Check if a term exists
 */
export function hasTerm(key: string, level: AbstractionLevel = 'standard'): boolean {
  return key in TERMINOLOGY_MAP[level];
}
