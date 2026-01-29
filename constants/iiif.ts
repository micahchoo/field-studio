/**
 * IIIF Specification Constants
 *
 * Complete set of IIIF Presentation API 3.0 and Image API 3.0
 * specification constants and allowed values.
 */

export interface LanguageOption {
  code: string;
  label: string;
  nativeName?: string;
}

/**
 * IIIF Specification Contexts and Protocols
 */
export const IIIF_SPEC = {
  PRESENTATION_3: {
    CONTEXT: 'http://iiif.io/api/presentation/3/context.json',
  },
  IMAGE_3: {
    CONTEXT: 'http://iiif.io/api/image/3/context.json',
    PROTOCOL: 'http://iiif.io/api/image',
    PROFILES: {
      LEVEL0: 'level0',
      LEVEL1: 'level1',
      LEVEL2: 'level2'
    }
  },
  SEARCH_2: {
    CONTEXT: 'http://iiif.io/api/search/2/context.json',
    PROFILE: 'http://iiif.io/api/search/2/search'
  },
  AUTH_2: {
    CONTEXT: 'http://iiif.io/api/auth/2/context.json'
  },
  DISCOVERY_1: {
    CONTEXT: 'http://iiif.io/api/discovery/1/context.json'
  },
  CONTENT_STATE_1: {
    CONTEXT: 'http://iiif.io/api/content-state/1/context.json'
  }
} as const;

/**
 * IIIF Presentation API 3.0 Behavior Values
 * Spec: https://iiif.io/api/presentation/3.0/#behavior
 */
export interface BehaviorDefinition {
  value: string;
  label: string;
  description: string;
  category: 'layout' | 'time' | 'browsing' | 'page' | 'navigation';
}

export const BEHAVIOR_DEFINITIONS: Record<string, BehaviorDefinition> = {
  // Layout behaviors
  'multi-part': {
    value: 'multi-part',
    label: 'Multi-Part',
    description: 'The object is a multi-part work (e.g., multi-volume book). Display sub-collections as separate but related works.',
    category: 'layout'
  },
  'together': {
    value: 'together',
    label: 'Together',
    description: 'All sub-resources should be presented together (e.g., pages side-by-side or audio tracks mixed).',
    category: 'layout'
  },

  // Time-based behaviors
  'auto-advance': {
    value: 'auto-advance',
    label: 'Auto-Advance',
    description: 'Automatically move to next Canvas after current finishes (for A/V content or timed sequences).',
    category: 'time'
  },
  'no-auto-advance': {
    value: 'no-auto-advance',
    label: 'No Auto-Advance',
    description: 'Do not automatically advance; wait for user interaction before showing next Canvas.',
    category: 'time'
  },
  'repeat': {
    value: 'repeat',
    label: 'Repeat',
    description: 'Loop back to the start after reaching the end of the sequence.',
    category: 'time'
  },
  'no-repeat': {
    value: 'no-repeat',
    label: 'No Repeat',
    description: 'Stop at the end of the sequence; do not loop.',
    category: 'time'
  },

  // Collection browsing behaviors
  'unordered': {
    value: 'unordered',
    label: 'Unordered',
    description: 'Items have no inherent order; viewer may present them randomly or by other criteria.',
    category: 'browsing'
  },
  'individuals': {
    value: 'individuals',
    label: 'Individuals',
    description: 'Each Canvas should be presented individually (default for most manifests).',
    category: 'browsing'
  },
  'continuous': {
    value: 'continuous',
    label: 'Continuous',
    description: 'Present Canvases as a continuous scroll (like a scroll painting or comic strip).',
    category: 'browsing'
  },
  'paged': {
    value: 'paged',
    label: 'Paged',
    description: 'Display in a book-like paged interface with recto/verso page spreads.',
    category: 'browsing'
  },

  // Page layout behaviors
  'facing-pages': {
    value: 'facing-pages',
    label: 'Facing Pages',
    description: 'This Canvas represents one side of an opening; show with its facing page.',
    category: 'page'
  },
  'non-paged': {
    value: 'non-paged',
    label: 'Non-Paged',
    description: 'This Canvas should not be included in paged navigation (e.g., fold-out map).',
    category: 'page'
  },

  // Range navigation behaviors
  'sequence': {
    value: 'sequence',
    label: 'Sequence',
    description: 'This Range represents a navigable sequence in the table of contents.',
    category: 'navigation'
  },
  'thumbnail-nav': {
    value: 'thumbnail-nav',
    label: 'Thumbnail Nav',
    description: 'Display this Range\'s items as thumbnails in navigation controls.',
    category: 'navigation'
  },
  'no-nav': {
    value: 'no-nav',
    label: 'No Navigation',
    description: 'Exclude this Range from navigation structures (but still semantically meaningful).',
    category: 'navigation'
  },
  'hidden': {
    value: 'hidden',
    label: 'Hidden',
    description: 'Do not display this resource or its children in user-facing navigation.',
    category: 'navigation'
  }
} as const;

/**
 * Behavior options per resource type (IIIF spec compliant)
 */
export const BEHAVIOR_OPTIONS: Record<string, string[]> = {
  'Collection': ['multi-part', 'together', 'auto-advance', 'no-auto-advance', 'repeat', 'no-repeat', 'unordered', 'individuals', 'continuous', 'paged'],
  'Manifest': ['auto-advance', 'no-auto-advance', 'repeat', 'no-repeat', 'unordered', 'individuals', 'continuous', 'paged'],
  'Canvas': ['auto-advance', 'no-auto-advance', 'facing-pages', 'non-paged'],
  'Range': ['auto-advance', 'no-auto-advance', 'repeat', 'no-repeat', 'unordered', 'individuals', 'continuous', 'paged', 'sequence', 'thumbnail-nav', 'no-nav', 'hidden'],
  'AnnotationPage': ['hidden'],
  'AnnotationCollection': ['hidden'],
  'Content': []
} as const;

/**
 * Behavior conflict pairs - mutually exclusive behaviors
 */
export const BEHAVIOR_CONFLICTS: Array<[string, string]> = [
  ['auto-advance', 'no-auto-advance'],
  ['repeat', 'no-repeat'],
  ['individuals', 'continuous'],
  ['individuals', 'paged'],
  ['continuous', 'paged'],
  ['multi-part', 'together'],
  ['thumbnail-nav', 'no-nav'],
  ['thumbnail-nav', 'hidden'],
  ['no-nav', 'hidden']
] as const;

/**
 * Get conflicting behaviors for a given behavior value
 */
export function getConflictingBehaviors(behavior: string): string[] {
  const conflicts: string[] = [];
  for (const [a, b] of BEHAVIOR_CONFLICTS) {
    if (a === behavior) conflicts.push(b);
    if (b === behavior) conflicts.push(a);
  }
  return conflicts;
}

/**
 * Viewing directions (spec §3.5)
 */
export const VIEWING_DIRECTIONS = [
  'left-to-right',
  'right-to-left',
  'top-to-bottom',
  'bottom-to-top'
] as const;

/**
 * Motivation types for annotations
 */
export const MOTIVATION_TYPES = [
  'painting',
  'supplementing',
  'commenting',
  'tagging',
  'linking',
  'identifying',
  'describing',
  'highlighting',
  'bookmarking',
  'contentState',
] as const;

/**
 * TimeMode for AV content (spec §9.5)
 */
export const TIME_MODES = ['trim', 'scale', 'loop'] as const;

/**
 * Supported languages for metadata values
 */
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
  { code: 'none', label: 'Language-neutral', nativeName: undefined },
] as const;
