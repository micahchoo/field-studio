/**
 * IIIF Specification Constants
 *
 * The canonical IIIF_SPEC is defined in ./index.ts.
 * This module re-exports it and houses CSV / behavior helpers.
 */

export { IIIF_SPEC } from './index';

// ============================================================================
// Behavior Types & Definitions
// ============================================================================

export interface BehaviorDefinition {
  value: string;
  label: string;
  description: string;
  category: 'layout' | 'time' | 'browsing' | 'page' | 'navigation';
}

export const BEHAVIOR_DEFINITIONS: Record<string, BehaviorDefinition> = {
  'multi-part': { value: 'multi-part', label: 'Multi-Part', description: 'The object is a multi-part work.', category: 'layout' },
  'together': { value: 'together', label: 'Together', description: 'All sub-resources should be presented together.', category: 'layout' },
  'auto-advance': { value: 'auto-advance', label: 'Auto-Advance', description: 'Automatically move to next Canvas after current finishes.', category: 'time' },
  'no-auto-advance': { value: 'no-auto-advance', label: 'No Auto-Advance', description: 'Do not automatically advance.', category: 'time' },
  'repeat': { value: 'repeat', label: 'Repeat', description: 'Loop back to the start after reaching the end.', category: 'time' },
  'no-repeat': { value: 'no-repeat', label: 'No Repeat', description: 'Stop at the end; do not loop.', category: 'time' },
  'unordered': { value: 'unordered', label: 'Unordered', description: 'Items have no inherent order.', category: 'browsing' },
  'individuals': { value: 'individuals', label: 'Individuals', description: 'Each Canvas should be presented individually.', category: 'browsing' },
  'continuous': { value: 'continuous', label: 'Continuous', description: 'Present Canvases as a continuous scroll.', category: 'browsing' },
  'paged': { value: 'paged', label: 'Paged', description: 'Display in a book-like paged interface.', category: 'browsing' },
  'facing-pages': { value: 'facing-pages', label: 'Facing Pages', description: 'This Canvas represents one side of an opening.', category: 'page' },
  'non-paged': { value: 'non-paged', label: 'Non-Paged', description: 'This Canvas should not be in paged navigation.', category: 'page' },
  'sequence': { value: 'sequence', label: 'Sequence', description: 'This Range represents a navigable sequence.', category: 'navigation' },
  'thumbnail-nav': { value: 'thumbnail-nav', label: 'Thumbnail Nav', description: 'Display items as thumbnails in navigation.', category: 'navigation' },
  'no-nav': { value: 'no-nav', label: 'No Navigation', description: 'Exclude from navigation structures.', category: 'navigation' },
  'hidden': { value: 'hidden', label: 'Hidden', description: 'Do not display in user-facing navigation.', category: 'navigation' },
} as const;

export const BEHAVIOR_CONFLICTS: Array<[string, string]> = [
  ['auto-advance', 'no-auto-advance'],
  ['repeat', 'no-repeat'],
  ['individuals', 'continuous'],
  ['individuals', 'paged'],
  ['continuous', 'paged'],
  ['multi-part', 'together'],
  ['thumbnail-nav', 'no-nav'],
  ['thumbnail-nav', 'hidden'],
  ['no-nav', 'hidden'],
] as const;

export function getConflictingBehaviors(behavior: string): string[] {
  const conflicts: string[] = [];
  for (const [a, b] of BEHAVIOR_CONFLICTS) {
    if (a === behavior) conflicts.push(b);
    if (b === behavior) conflicts.push(a);
  }
  return conflicts;
}

// ============================================================================
// Viewing Direction
// ============================================================================

export interface LanguageOption {
  code: string;
  label: string;
  nativeName?: string;
}

export const VIEWING_DIRECTIONS = [
  { value: 'left-to-right', label: 'Left to Right' },
  { value: 'right-to-left', label: 'Right to Left' },
  { value: 'top-to-bottom', label: 'Top to Bottom' },
  { value: 'bottom-to-top', label: 'Bottom to Top' },
] as const;

export const MOTIVATION_TYPES = [
  'painting', 'supplementing', 'commenting', 'tagging', 'linking',
  'identifying', 'describing', 'highlighting', 'bookmarking', 'contentState',
] as const;

export const TIME_MODES = ['trim', 'scale', 'loop'] as const;

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'de', label: 'German', nativeName: 'Deutsch' },
  { code: 'fr', label: 'French', nativeName: 'Français' },
  { code: 'es', label: 'Spanish', nativeName: 'Español' },
  { code: 'it', label: 'Italian', nativeName: 'Italiano' },
  { code: 'ja', label: 'Japanese', nativeName: '日本語' },
  { code: 'zh', label: 'Chinese', nativeName: '中文' },
  { code: 'ar', label: 'Arabic', nativeName: 'العربية' },
  { code: 'pt', label: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', label: 'Russian', nativeName: 'Русский' },
  { code: 'none', label: 'Language-neutral' },
] as const;

// ============================================================================
// CSV Helpers
// ============================================================================

/** CSV column header aliases -> IIIF property mappings */
export const CSV_COLUMN_ALIASES: Record<string, string> = {
  // Direct IIIF properties
  'label': 'label',
  'summary': 'summary',
  'rights': 'rights',
  'navDate': 'navDate',
  'navdate': 'navDate',
  // Dublin Core mappings
  'title': 'metadata.title',
  'Title': 'metadata.title',
  'creator': 'metadata.creator',
  'Creator': 'metadata.creator',
  'author': 'metadata.creator',
  'Author': 'metadata.creator',
  'date': 'metadata.date',
  'Date': 'metadata.date',
  'description': 'metadata.description',
  'Description': 'metadata.description',
  'subject': 'metadata.subject',
  'Subject': 'metadata.subject',
  'source': 'metadata.source',
  'Source': 'metadata.source',
  'type': 'metadata.type',
  'Type': 'metadata.type',
  'format': 'metadata.format',
  'Format': 'metadata.format',
  'identifier': 'metadata.identifier',
  'Identifier': 'metadata.identifier',
  'language': 'metadata.language',
  'Language': 'metadata.language',
  'coverage': 'metadata.coverage',
  'Coverage': 'metadata.coverage',
  'publisher': 'metadata.publisher',
  'Publisher': 'metadata.publisher',
  // Attribution
  'attribution': 'requiredStatement.value',
  'Attribution': 'requiredStatement.value',
  'attribution_label': 'requiredStatement.label',
  'attribution_value': 'requiredStatement.value',
};

/** All IIIF properties supported for CSV import/export */
export const CSV_SUPPORTED_PROPERTIES: string[] = [
  'label',
  'summary',
  'rights',
  'navDate',
  'metadata.title',
  'metadata.creator',
  'metadata.date',
  'metadata.description',
  'metadata.subject',
  'metadata.rights',
  'metadata.source',
  'metadata.type',
  'metadata.format',
  'metadata.identifier',
  'metadata.language',
  'metadata.coverage',
  'metadata.publisher',
  'requiredStatement.label',
  'requiredStatement.value',
];

/** Behavior options for manifest/canvas/collection/range editing UI */
export const BEHAVIOR_OPTIONS = {
  MANIFEST: ['auto-advance', 'no-auto-advance', 'continuous', 'paged', 'individuals', 'unordered', 'multi-part', 'together', 'sequence', 'thumbnail-nav', 'no-nav'],
  CANVAS: ['auto-advance', 'no-auto-advance', 'facing-pages', 'non-paged'],
  COLLECTION: ['auto-advance', 'no-auto-advance', 'continuous', 'individuals', 'multi-part', 'together', 'unordered'],
  RANGE: ['auto-advance', 'no-auto-advance', 'no-nav', 'thumbnail-nav'],
} as const;
