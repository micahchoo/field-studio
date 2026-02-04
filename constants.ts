
export const CONSTANTS = {
  APP_NAME: "IIIF Field Archive Studio",
  VERSION: "3.0.0",
  DEFAULT_LANGUAGE: "en",
  TOAST_DURATION: 3000,
};

/**
 * Feature Flags
 * Toggle experimental features or migration paths.
 */
export const FEATURE_FLAGS = {
  /** Use the new two-pane StagingWorkbench instead of the legacy wizard-based StagingArea */
  USE_NEW_STAGING: true,
  /** Use WCAG 2.1 AA compliant focus indicators with high contrast */
  USE_ACCESSIBLE_FOCUS: true,
  /** Use Immer for immutable state updates in vault (performance optimization) */
  USE_IMMER_CLONING: false,
  /** Use Web Worker for FlexSearch indexing (offloads from main thread) */
  USE_WORKER_SEARCH: false,
  /** Enable progressive disclosure abstraction levels (Phase 3) */
  USE_PROGRESSIVE_DISCLOSURE: false,
  /** Enable simplified 3-mode UI consolidation (Phase 3) */
  USE_SIMPLIFIED_UI: false,
  /** Enable keyboard-based drag and drop (Phase 5) */
  USE_KEYBOARD_DND: false,
  /** Enable internationalization (i18n) framework (Phase 6) */
  USE_I18N: false,
};

/** Performance feature flag exports for convenience */
export const {USE_IMMER_CLONING} = FEATURE_FLAGS;
export const {USE_WORKER_SEARCH} = FEATURE_FLAGS;

// =============================================================================
// Progressive Disclosure - UX Simplification (Phase 3)
// =============================================================================

import type { AbstractionLevel, CoreViewMode, UIAbstractionConfig } from './types';

/**
 * Default UI abstraction configuration
 * Used when no user preference is stored
 */
export const DEFAULT_ABSTRACTION_CONFIG: UIAbstractionConfig = {
  level: 'standard',
  showTechnicalIds: false,
  showRawIIIF: false,
  showAdvancedActions: false,
  simplifiedLabels: true
};

/**
 * Core view mode configurations
 * Maps each core mode to its UI characteristics
 */
export const CORE_VIEW_MODE_CONFIG: Record<CoreViewMode, {
  label: string;
  description: string;
  icon: string;
  sidebarVisible: boolean;
  inspectorVisible: boolean;
  toolbarMode: 'minimal' | 'standard' | 'full';
}> = {
  workspace: {
    label: 'Workspace',
    description: 'Browse and organize your archive',
    icon: 'workspace_premium',
    sidebarVisible: true,
    inspectorVisible: true,
    toolbarMode: 'full'
  },
  detail: {
    label: 'Detail',
    description: 'Inspect and edit item details',
    icon: 'edit_note',
    sidebarVisible: true,
    inspectorVisible: true,
    toolbarMode: 'standard'
  },
  preview: {
    label: 'Preview',
    description: 'Preview how your archive will appear',
    icon: 'preview',
    sidebarVisible: false,
    inspectorVisible: false,
    toolbarMode: 'minimal'
  }
};

/**
 * Legacy to core view mode mappings
 * For backward compatibility during migration
 */
export const LEGACY_TO_CORE_MODE_MAP: Record<string, CoreViewMode> = {
  'archive': 'workspace',
  'collections': 'workspace',
  'board': 'detail',
  'metadata': 'detail',
  'map': 'workspace',
  'spreadsheet': 'workspace',
  'timeline': 'workspace',
  'search': 'workspace',
  'viewer': 'preview'
};

// =============================================================================
// LANGUAGE & LOCALIZATION
// =============================================================================

export interface LanguageOption {
  code: string;
  label: string;
  nativeName?: string;
}

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
];

// =============================================================================
// CSV IMPORT/EXPORT CONFIGURATION
// =============================================================================

/**
 * IIIF properties supported for CSV import/export
 * Used by csvImporter and metadataTemplateService
 */
export const CSV_SUPPORTED_PROPERTIES: string[] = [
  'label',
  'summary',
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
  'rights',
  'navDate'
];

export interface CSVColumnDefinition {
  key: string;
  description: string;
  category: 'iiif' | 'dublin-core';
}

/**
 * Column definitions for CSV metadata template export
 * Keys match CSV_SUPPORTED_PROPERTIES for roundtrip compatibility
 */
export const CSV_TEMPLATE_COLUMNS: CSVColumnDefinition[] = [
  // IIIF core properties
  { key: 'label', description: 'Human-readable title for the item (required)', category: 'iiif' },
  { key: 'summary', description: 'Brief description of the content', category: 'iiif' },
  { key: 'rights', description: 'License URL (e.g., https://creativecommons.org/licenses/by/4.0/)', category: 'iiif' },
  { key: 'navDate', description: 'Navigation date in ISO 8601 format (YYYY-MM-DD)', category: 'iiif' },
  { key: 'requiredStatement.value', description: 'Required attribution text', category: 'iiif' },

  // Dublin Core (metadata.* format for csvImporter compatibility)
  { key: 'metadata.title', description: 'Title of the resource', category: 'dublin-core' },
  { key: 'metadata.creator', description: 'Person or organization responsible for creating the content', category: 'dublin-core' },
  { key: 'metadata.date', description: 'Date associated with the resource (YYYY-MM-DD or YYYY)', category: 'dublin-core' },
  { key: 'metadata.description', description: 'Detailed description of the content', category: 'dublin-core' },
  { key: 'metadata.subject', description: 'Topic or keywords (semicolon-separated for multiple)', category: 'dublin-core' },
  { key: 'metadata.type', description: 'Nature of the resource (e.g., Image, Text, Dataset)', category: 'dublin-core' },
  { key: 'metadata.format', description: 'File format or medium', category: 'dublin-core' },
  { key: 'metadata.identifier', description: 'Unique identifier for the resource', category: 'dublin-core' },
  { key: 'metadata.source', description: 'Related resource from which this was derived', category: 'dublin-core' },
  { key: 'metadata.language', description: 'Language of the content (ISO 639-1 code)', category: 'dublin-core' },
  { key: 'metadata.coverage', description: 'Spatial or temporal coverage (location, time period)', category: 'dublin-core' },
  { key: 'metadata.rights', description: 'Copyright or access rights statement', category: 'dublin-core' },
  { key: 'metadata.publisher', description: 'Entity responsible for making the resource available', category: 'dublin-core' },
];

/**
 * Aliases for CSV column auto-detection
 * Maps common column names to their IIIF property equivalent
 */
export const CSV_COLUMN_ALIASES: Record<string, string> = {
  // Direct IIIF matches
  'label': 'label',
  'summary': 'summary',
  'rights': 'rights',
  'navdate': 'navDate',
  'navDate': 'navDate',
  'requiredstatement.value': 'requiredStatement.value',
  'requiredStatement.value': 'requiredStatement.value',
  'requiredstatement.label': 'requiredStatement.label',
  'requiredStatement.label': 'requiredStatement.label',

  // metadata.* format (from staging template)
  'metadata.title': 'metadata.title',
  'metadata.creator': 'metadata.creator',
  'metadata.date': 'metadata.date',
  'metadata.description': 'metadata.description',
  'metadata.subject': 'metadata.subject',
  'metadata.type': 'metadata.type',
  'metadata.format': 'metadata.format',
  'metadata.identifier': 'metadata.identifier',
  'metadata.source': 'metadata.source',
  'metadata.language': 'metadata.language',
  'metadata.coverage': 'metadata.coverage',
  'metadata.rights': 'metadata.rights',
  'metadata.publisher': 'metadata.publisher',

  // dc:* format aliases (legacy support)
  'dc:title': 'metadata.title',
  'dc:creator': 'metadata.creator',
  'dc:date': 'metadata.date',
  'dc:description': 'metadata.description',
  'dc:subject': 'metadata.subject',
  'dc:type': 'metadata.type',
  'dc:format': 'metadata.format',
  'dc:identifier': 'metadata.identifier',
  'dc:source': 'metadata.source',
  'dc:language': 'metadata.language',
  'dc:coverage': 'metadata.coverage',
  'dc:rights': 'metadata.rights',
  'dc:publisher': 'metadata.publisher',

  // Common friendly names
  'title': 'metadata.title',
  'creator': 'metadata.creator',
  'author': 'metadata.creator',
  'date': 'metadata.date',
  'description': 'metadata.description',
  'subject': 'metadata.subject',
  'keywords': 'metadata.subject',
  'tags': 'metadata.subject',
  'type': 'metadata.type',
  'format': 'metadata.format',
  'identifier': 'metadata.identifier',
  'source': 'metadata.source',
  'language': 'metadata.language',
  'coverage': 'metadata.coverage',
  'location': 'metadata.coverage',
  'publisher': 'metadata.publisher',
  'attribution': 'requiredStatement.value',
};

/**
 * Get CSV template columns filtered by category
 */
export function getCSVColumnsByCategory(category: 'iiif' | 'dublin-core' | 'both'): CSVColumnDefinition[] {
  if (category === 'both') return CSV_TEMPLATE_COLUMNS;
  return CSV_TEMPLATE_COLUMNS.filter(col => col.category === category);
}

/**
 * Centralized IIIF Configuration
 * Defines base URL patterns, ID generation rules, and ingest conventions.
 */
export const IIIF_CONFIG = {
  /**
   * Base URL configuration
   * Note: Runtime base URL is determined by window.location if not specified
   */
  BASE_URL: {
    DEFAULT: 'http://localhost/iiif',
    LEGACY_DOMAINS: ['archive.local', 'example.org'],
    PATH_SEGMENT: 'iiif'
  },
  
  /**
   * ID Generation Patterns
   */
  ID_PATTERNS: {
    MANIFEST: (baseUrl: string, uuid: string) => `${baseUrl}/manifest/${uuid}`,
    COLLECTION: (baseUrl: string, uuid: string) => `${baseUrl}/collection/${uuid}`,
    CANVAS: (manifestId: string, index: number) => `${manifestId}/canvas/${index}`,
    RANGE: (baseUrl: string, uuid: string) => `${baseUrl}/range/${uuid}`,
    ANNOTATION_PAGE: (parentId: string, type: string) => `${parentId}/page/${type}`,
    ANNOTATION: (parentId: string, id: string) => `${parentId}/annotation/${id}`,
    SEARCH_SERVICE: (baseUrl: string, resourceId: string) => `${baseUrl}/search/${resourceId}`,
    IMAGE_SERVICE: (baseUrl: string, assetId: string) => `${baseUrl}/image/${assetId}`
  },

  /**
   * Ingest Conventions
   */
  INGEST: {
    COLLECTION_PREFIX: '_',
    ROOT_NAME: 'root',
    ROOT_DISPLAY_NAME: 'My Archive',
    LOOSE_FILES_Dir_NAME: 'Files',
    META_FILE: 'info.yml'
  }
};

/**
 * IIIF Specification Constants
 * Central source for Contexts, Protocols, and standard URIs
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
};

export const METADATA_TEMPLATES = {
  RESEARCHER: ["Location", "Site Phase", "Artifact Type", "Material", "Findings"],
  ARCHIVIST: ["Title", "Creator", "Date", "Format", "Rights", "Identifier", "Language", "Source", "Description"],
  DEVELOPER: ["Identifier", "Technical Note", "Linked Data URI", "Image Service Profile"]
};

/**
 * Metadata Field Complexity Levels
 *
 * Defines which IIIF resource properties are visible at each complexity level.
 * This enables progressive disclosure of metadata fields based on user expertise.
 *
 * Levels:
 * - simple: Core fields only (label, summary, thumbnail)
 * - standard: Common archival fields (+ metadata, rights, navDate)
 * - advanced: Full spec access (+ behavior, viewingDirection, provider, services)
 */
export type MetadataComplexity = 'simple' | 'standard' | 'advanced';

export interface FieldDefinition {
  key: string;
  label: string;
  description: string;
  minLevel: MetadataComplexity;
  category: 'core' | 'descriptive' | 'technical' | 'structural';
}

export const METADATA_FIELD_DEFINITIONS: FieldDefinition[] = [
  // Core fields (always visible)
  { key: 'label', label: 'Label', description: 'Human-readable name', minLevel: 'simple', category: 'core' },
  { key: 'summary', label: 'Summary', description: 'Brief description', minLevel: 'simple', category: 'core' },
  { key: 'thumbnail', label: 'Thumbnail', description: 'Preview image', minLevel: 'simple', category: 'core' },

  // Standard fields (standard and above)
  { key: 'metadata', label: 'Metadata', description: 'Descriptive key-value pairs', minLevel: 'standard', category: 'descriptive' },
  { key: 'rights', label: 'Rights', description: 'License or rights statement URL', minLevel: 'standard', category: 'descriptive' },
  { key: 'requiredStatement', label: 'Attribution', description: 'Required attribution text', minLevel: 'standard', category: 'descriptive' },
  { key: 'navDate', label: 'Navigation Date', description: 'Date for timeline navigation', minLevel: 'standard', category: 'descriptive' },
  { key: 'provider', label: 'Provider', description: 'Institution or person providing resource', minLevel: 'standard', category: 'descriptive' },

  // Advanced fields (advanced only)
  { key: 'behavior', label: 'Behavior', description: 'Presentation hints for viewers', minLevel: 'advanced', category: 'technical' },
  { key: 'viewingDirection', label: 'Viewing Direction', description: 'Reading order (LTR, RTL, etc.)', minLevel: 'advanced', category: 'technical' },
  { key: 'services', label: 'Services', description: 'Linked API services', minLevel: 'advanced', category: 'technical' },
  { key: 'seeAlso', label: 'See Also', description: 'Related external resources', minLevel: 'advanced', category: 'technical' },
  { key: 'rendering', label: 'Rendering', description: 'Alternate representations (PDF, etc.)', minLevel: 'advanced', category: 'technical' },
  { key: 'partOf', label: 'Part Of', description: 'Parent collection reference', minLevel: 'advanced', category: 'structural' },
  { key: 'start', label: 'Start Canvas', description: 'Initial canvas to display', minLevel: 'advanced', category: 'structural' },
  { key: 'structures', label: 'Structures', description: 'Table of contents (Ranges)', minLevel: 'advanced', category: 'structural' },
];

/**
 * Get visible fields for a given complexity level
 */
export function getVisibleFields(level: MetadataComplexity): FieldDefinition[] {
  const levelOrder: MetadataComplexity[] = ['simple', 'standard', 'advanced'];
  const levelIndex = levelOrder.indexOf(level);

  return METADATA_FIELD_DEFINITIONS.filter(field => {
    const fieldLevelIndex = levelOrder.indexOf(field.minLevel);
    return fieldLevelIndex <= levelIndex;
  });
}

/**
 * Check if a field should be visible at a given complexity level
 */
export function isFieldVisible(fieldKey: string, level: MetadataComplexity): boolean {
  const field = METADATA_FIELD_DEFINITIONS.find(f => f.key === fieldKey);
  if (!field) return true; // Unknown fields are always visible

  const levelOrder: MetadataComplexity[] = ['simple', 'standard', 'advanced'];
  const levelIndex = levelOrder.indexOf(level);
  const fieldLevelIndex = levelOrder.indexOf(field.minLevel);

  return fieldLevelIndex <= levelIndex;
}

/**
 * Get fields grouped by category for a given complexity level
 */
export function getFieldsByCategory(level: MetadataComplexity): Record<string, FieldDefinition[]> {
  const visible = getVisibleFields(level);
  return visible.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, FieldDefinition[]>);
}

export const DUBLIN_CORE_MAP: Record<string, string> = {
  'title': 'dc:title',
  'creator': 'dc:creator',
  'subject': 'dc:subject',
  'description': 'dc:description',
  'publisher': 'dc:publisher',
  'contributor': 'dc:contributor',
  'date': 'dc:date',
  'type': 'dc:type',
  'format': 'dc:format',
  'identifier': 'dc:identifier',
  'source': 'dc:source',
  'language': 'dc:language',
  'relation': 'dc:relation',
  'coverage': 'dc:coverage',
  'rights': 'dc:rights',
  'location': 'dc:coverage', // Common mapping for field work
  'gps': 'dc:coverage'
};

export const RIGHTS_OPTIONS = [
  { label: "No Rights Reserved (CC0)", value: "https://creativecommons.org/publicdomain/zero/1.0/" },
  { label: "Attribution (CC BY 4.0)", value: "https://creativecommons.org/licenses/by/4.0/" },
  { label: "Attribution-NonCommercial (CC BY-NC 4.0)", value: "https://creativecommons.org/licenses/by-nc/4.0/" },
  { label: "In Copyright", value: "http://rightsstatements.org/vocab/InC/1.0/" },
  { label: "Copyright Not Evaluated", value: "http://rightsstatements.org/vocab/CNE/1.0/" },
  { label: "No Known Copyright", value: "http://rightsstatements.org/vocab/NKC/1.0/" }
];

export const VIEWING_DIRECTIONS = [
  "left-to-right",
  "right-to-left",
  "top-to-bottom",
  "bottom-to-top"
];

/**
 * IIIF Presentation API 3.0 Behavior Values
 * Spec: https://iiif.io/api/presentation/3.0/#behavior
 *
 * Behaviors are grouped by category:
 * - Layout: multi-part, together
 * - Time-based: auto-advance, no-auto-advance, repeat, no-repeat
 * - Collection browsing: unordered, individuals, continuous, paged
 * - Page layout: facing-pages, non-paged
 * - Range navigation: sequence, thumbnail-nav, no-nav, hidden
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
};

// Behavior options per resource type (IIIF spec compliant)
export const BEHAVIOR_OPTIONS: Record<string, string[]> = {
  'Collection': ['multi-part', 'together', 'auto-advance', 'no-auto-advance', 'repeat', 'no-repeat', 'unordered', 'individuals', 'continuous', 'paged'],
  'Manifest': ['auto-advance', 'no-auto-advance', 'repeat', 'no-repeat', 'unordered', 'individuals', 'continuous', 'paged'],
  'Canvas': ['auto-advance', 'no-auto-advance', 'facing-pages', 'non-paged'],
  'Range': ['auto-advance', 'no-auto-advance', 'repeat', 'no-repeat', 'unordered', 'individuals', 'continuous', 'paged', 'sequence', 'thumbnail-nav', 'no-nav', 'hidden'],
  'AnnotationPage': ['hidden'],
  'AnnotationCollection': ['hidden'],
  'Content': []
};

// Behavior conflict pairs - mutually exclusive behaviors
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
];

// Get conflicting behaviors for a given behavior value
export function getConflictingBehaviors(behavior: string): string[] {
  const conflicts: string[] = [];
  for (const [a, b] of BEHAVIOR_CONFLICTS) {
    if (a === behavior) conflicts.push(b);
    if (b === behavior) conflicts.push(a);
  }
  return conflicts;
}

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
};

export const DEFAULT_INGEST_PREFS = {
  defaultCanvasWidth: 2000,
  defaultCanvasHeight: 2000,
  defaultDuration: 100,
  thumbnailWidth: 250,
  thumbnailHeight: 250,
  maxFileSize: 100 * 1024 * 1024, // 100MB
};

/**
 * Image processing quality settings
 * Centralizes JPEG/WebP quality values to avoid 0.8 vs 0.85 inconsistency
 */
export const IMAGE_QUALITY = {
  /** JPEG quality for thumbnails and previews */
  jpeg: 0.85,
  /** WebP quality (slightly higher since WebP compresses better) */
  webp: 0.85,
  /** Lower quality for quick previews during ingest */
  preview: 0.8,
};

export const DEFAULT_MAP_CONFIG = {
  tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; OpenStreetMap contributors',
  defaultZoom: 2,
  defaultCenter: [20, 0] as [number, number]
};

export const DEFAULT_ZOOM_CONFIG = {
  min: 0.1,
  max: 5,
  step: 0.1
};

// ============================================================================
// Derivative Presets (WAX-compatible)
// ============================================================================

/**
 * Derivative preset configuration for image size generation.
 * Replaces hardcoded [150, 600, 1200] values throughout the codebase.
 *
 * : DEFAULT_VARIANTS = { 'thumbnail' => 250, 'fullwidth' => 1140 }
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
   * Optimized for static Jekyll sites
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
   * Default preset for Field Studio exports
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
   * Minimal derivatives, server generates others
   */
  'level2-dynamic': {
    name: 'level2-dynamic',
    label: 'Level 2 Dynamic',
    description: 'Minimal derivatives for Level 2 image server deployment',
    thumbnailWidth: 150,
    sizes: [150],
    fullWidth: 0,  // Server generates on demand
    tileSize: 512,
    scaleFactors: [1, 2, 4, 8, 16]
  },

  /**
   * Mobile-optimized preset - smaller sizes for bandwidth efficiency
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
   * Archive quality preset - larger sizes for preservation
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
};

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
 * Default derivative sizes (for backwards compatibility)
 * @deprecated Use getDerivativePreset() instead
 */
export const DEFAULT_DERIVATIVE_SIZES = [150, 600, 1200];

/**
 * Default background generation sizes (for backwards compatibility)
 * @deprecated Use getDerivativePreset().sizes instead
 */
export const DEFAULT_BACKGROUND_SIZES = [600, 1200];

// ============================================================================
// Structure View Visual Hierarchy
// ============================================================================

/**
 * Visual hierarchy configuration for the Structure view.
 * Emphasizes the Manifest > Canvas > AnnotationPage relationship.
 */
export type VisualProminence = 'primary' | 'secondary' | 'tertiary' | 'reference' | 'minimal';
export type CardSize = 'large' | 'medium' | 'badge' | 'container' | 'inline';

export interface VisualHierarchyConfig {
  prominence: VisualProminence;
  cardSize: CardSize;
  showThumbnail: boolean;
  showChildCount?: boolean;
  showAnnotationCount?: boolean;
  showCount?: boolean;
  showReferenceIndicator?: boolean;
}

export const STRUCTURE_VISUAL_HIERARCHY: Record<string, VisualHierarchyConfig> = {
  Manifest: {
    prominence: 'primary',
    cardSize: 'large',
    showThumbnail: true,
    showChildCount: true
  },
  Canvas: {
    prominence: 'secondary',
    cardSize: 'medium',
    showThumbnail: true,
    showAnnotationCount: true
  },
  AnnotationPage: {
    prominence: 'tertiary',
    cardSize: 'badge',
    showThumbnail: false,
    showCount: true
  },
  Collection: {
    prominence: 'reference',
    cardSize: 'container',
    showThumbnail: true,
    showReferenceIndicator: true
  },
  Annotation: {
    prominence: 'minimal',
    cardSize: 'inline',
    showThumbnail: false
  },
  Range: {
    prominence: 'tertiary',
    cardSize: 'badge',
    showThumbnail: false,
    showChildCount: true
  }
};

/**
 * Get visual hierarchy config for a resource type
 */
export function getVisualHierarchy(type: string): VisualHierarchyConfig {
  return STRUCTURE_VISUAL_HIERARCHY[type] || {
    prominence: 'minimal',
    cardSize: 'inline',
    showThumbnail: false
  };
}

/**
 * Card size dimensions for the Structure view grid
 */
export const STRUCTURE_CARD_SIZES: Record<CardSize, { minWidth: number; aspectRatio: string }> = {
  large: { minWidth: 200, aspectRatio: '3/4' },
  medium: { minWidth: 150, aspectRatio: '1/1' },
  badge: { minWidth: 80, aspectRatio: '1/1' },
  container: { minWidth: 250, aspectRatio: 'auto' },
  inline: { minWidth: 0, aspectRatio: 'auto' }
};

// ============================================================================
// Resource Type Configuration
// ============================================================================

export const RESOURCE_TYPE_CONFIG: Record<string, { icon: string; colorClass: string; bgClass: string; borderClass: string; label: string; metaphor: string }> = {
  'Collection': {
    icon: 'folder',
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-100',
    borderClass: 'border-amber-200',
    label: 'Collection',
    metaphor: 'Literary Genres'
  },
  'Manifest': { 
    icon: 'menu_book', 
    colorClass: 'text-emerald-600', 
    bgClass: 'bg-emerald-100', 
    borderClass: 'border-emerald-200', 
    label: 'Manifest',
    metaphor: 'Book'
  },
  'Canvas': { 
    icon: 'crop_original', 
    colorClass: 'text-blue-500', 
    bgClass: 'bg-blue-100', 
    borderClass: 'border-blue-200', 
    label: 'Canvas',
    metaphor: 'Page'
  },
  'Range': { 
    icon: 'segment', 
    colorClass: 'text-indigo-500', 
    bgClass: 'bg-indigo-100', 
    borderClass: 'border-indigo-200', 
    label: 'Range',
    metaphor: 'Table of Contents'
  },
  'AnnotationPage': { 
    icon: 'layers', 
    colorClass: 'text-purple-500', 
    bgClass: 'bg-purple-100', 
    borderClass: 'border-purple-200', 
    label: 'Annotation Page',
    metaphor: 'Transparent overlay on page'
  },
  'Annotation': { 
    icon: 'chat_bubble', 
    colorClass: 'text-teal-500', 
    bgClass: 'bg-teal-100', 
    borderClass: 'border-teal-200', 
    label: 'Annotation',
    metaphor: 'Note / Mark on the transparent overlay'
  },
  'Content': { 
    icon: 'image', 
    colorClass: 'text-slate-500', 
    bgClass: 'bg-slate-100', 
    borderClass: 'border-slate-200', 
    label: 'Content',
    metaphor: 'The actual thing made with ink on the page'
  },
  'AnnotationCollection': {
    icon: 'collections_bookmark',
    colorClass: 'text-pink-500',
    bgClass: 'bg-pink-100',
    borderClass: 'border-pink-200',
    label: 'Annotation Collection',
    metaphor: 'Collections of one/many persons annotations on a single page, book or genre'
  }
};

// ============================================================================
// Accessibility & Motion Preferences
// ============================================================================

/**
 * Reduced Motion Preferences
 * Respects user system preferences for motion
 */
export const REDUCED_MOTION = {
  /**
   * Check if user prefers reduced motion
   * Uses matchMedia API to detect system preference
   */
  prefersReducedMotion: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  /**
   * Get animation duration based on user preference
   * @param normalDuration - Duration in ms for normal animation
   * @returns Duration in ms (0 if reduced motion preferred)
   */
  getDuration: (normalDuration: number): number => {
    if (typeof window === 'undefined') return normalDuration;
    return REDUCED_MOTION.prefersReducedMotion() ? 0 : normalDuration;
  },

  /**
   * Animation durations used throughout the app
   */
  DURATIONS: {
    /** Fast transitions (buttons, hover states) */
    fast: 150,
    /** Normal transitions (modals, panels) */
    normal: 300,
    /** Slow transitions (page transitions) */
    slow: 500,
    /** Stagger delay for lists */
    stagger: 50
  },

  /**
   * CSS classes for transitions respecting motion preferences
   * Use these instead of hardcoded transition classes
   */
  TRANSITIONS: {
    /** Default transition */
    default: 'transition-all motion-reduce:transition-none',
    /** Colors only (opacity, background, border) */
    colors: 'transition-colors motion-reduce:transition-none',
    /** Transform only (scale, translate, rotate) */
    transform: 'transition-transform motion-reduce:transition-none',
    /** Opacity only */
    opacity: 'transition-opacity motion-reduce:transition-none'
  },

  /**
   * Easing curves for consistent animations
   */
  EASING: {
    default: 'ease-out',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
};

// ============================================================================
// Responsive Breakpoints
// ============================================================================

/**
 * Responsive breakpoint configuration
 * Centralizes breakpoint values for consistent responsive behavior
 */
export const BREAKPOINTS = {
  /** Mobile portrait */
  xs: 320,
  /** Mobile landscape */
  sm: 640,
  /** Tablet portrait */
  md: 768,
  /** Tablet landscape / Small desktop */
  lg: 1024,
  /** Desktop */
  xl: 1280,
  /** Large desktop */
  '2xl': 1536
};

/**
 * Tailwind-compatible breakpoint strings for use in className
 */
export const BP = {
  xs: 'xs:',
  sm: 'sm:',
  md: 'md:',
  lg: 'lg:',
  xl: 'xl:',
  '2xl': '2xl:'
};

/**
 * Check if viewport matches a breakpoint
 * @param breakpoint - Breakpoint name or pixel value
 * @returns boolean indicating if viewport matches
 */
export function isMinBreakpoint(breakpoint: keyof typeof BREAKPOINTS | number): boolean {
  if (typeof window === 'undefined') return false;
  const width = typeof breakpoint === 'number' ? breakpoint : BREAKPOINTS[breakpoint];
  return window.innerWidth >= width;
}

/**
 * Check if viewport is below a breakpoint
 * @param breakpoint - Breakpoint name or pixel value
 * @returns boolean indicating if viewport is below
 */
export function isMaxBreakpoint(breakpoint: keyof typeof BREAKPOINTS | number): boolean {
  if (typeof window === 'undefined') return false;
  const width = typeof breakpoint === 'number' ? breakpoint : BREAKPOINTS[breakpoint];
  return window.innerWidth < width;
}

// ============================================================================
// Keyboard Navigation
// ============================================================================

/**
 * Keyboard shortcut configuration
 * Centralizes keyboard navigation patterns
 */
export const KEYBOARD = {
  /** Key codes for common navigation */
  KEYS: {
    ESCAPE: 'Escape',
    ENTER: 'Enter',
    SPACE: ' ',
    TAB: 'Tab',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    HOME: 'Home',
    END: 'End',
    PAGE_UP: 'PageUp',
    PAGE_DOWN: 'PageDown',
    DELETE: 'Delete',
    BACKSPACE: 'Backspace'
  },

  /**
   * Focus management utilities
   */
  FOCUS: {
    /** CSS class for visible focus indicator */
    visibleClass: 'focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2',
    /** CSS class for focus within containers */
    withinClass: 'focus-within:ring-2 focus-within:ring-sky-500 focus-within:ring-offset-2'
  },

  /**
   * Common keyboard handler patterns
   */
  HANDLERS: {
    /** Close on Escape */
    escape: (handler: () => void) => (e: KeyboardEvent) => {
      if (e.key === 'Escape') handler();
    },
    /** Submit on Enter (not with modifiers) */
    enter: (handler: () => void) => (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handler();
      }
    },
    /** Arrow key navigation */
    arrow: (
      handlers: { up?: () => void; down?: () => void; left?: () => void; right?: () => void }
    ) => (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': handlers.up?.(); break;
        case 'ArrowDown': handlers.down?.(); break;
        case 'ArrowLeft': handlers.left?.(); break;
        case 'ArrowRight': handlers.right?.(); break;
      }
    }
  }
};

// ============================================================================
// Empty State Configuration
// ============================================================================

/**
 * Empty state presets for common scenarios
 * Ensures consistent messaging across the app
 */
export const EMPTY_STATES = {
  /** No items in a collection/view */
  NO_ITEMS: {
    icon: 'inbox',
    title: 'No Items',
    message: 'This area is empty. Add items to get started.',
    actionLabel: 'Add Item'
  },

  /** No search results */
  NO_RESULTS: {
    icon: 'search_off',
    title: 'No Results',
    message: 'No items match your search. Try different terms or filters.',
    actionLabel: 'Clear Filters'
  },

  /** No selection */
  NO_SELECTION: {
    icon: 'touch_app',
    title: 'Nothing Selected',
    message: 'Select an item from the list to view details and edit.',
    actionLabel: undefined
  },

  /** Error state */
  ERROR: {
    icon: 'error_outline',
    title: 'Something Went Wrong',
    message: 'We encountered an error. Please try again or contact support.',
    actionLabel: 'Retry'
  },

  /** Loading state placeholder */
  LOADING: {
    icon: 'hourglass_empty',
    title: 'Loading...',
    message: 'Please wait while we load your data.',
    actionLabel: undefined
  },

  /** No data (for imports/uploads) */
  NO_DATA: {
    icon: 'cloud_upload',
    title: 'No Data Yet',
    message: 'Import files or create new items to populate this view.',
    actionLabel: 'Import'
  },

  /** Empty canvas/board */
  EMPTY_CANVAS: {
    icon: 'crop_free',
    title: 'Empty Canvas',
    message: 'Drag items here or use the toolbar to add content.',
    actionLabel: 'Add Content'
  }
};

// ============================================================================
// Loading State Configuration
// ============================================================================

/**
 * Loading state presets for consistent UX
 */
export const LOADING_STATES = {
  /** Skeleton configuration */
  SKELETON: {
    /** Base pulse animation class */
    pulseClass: 'animate-pulse motion-reduce:animate-none',
    /** Background color */
    bgClass: 'bg-slate-200 dark:bg-slate-700',
    /** Rounded corners */
    roundedClass: 'rounded-md'
  },

  /** Spinner sizes */
  SPINNER: {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4'
  },

  /** Delay before showing loading state (prevents flash) */
  DEBOUNCE_MS: 200,

  /** Maximum time to show loading before showing error */
  TIMEOUT_MS: 30000
};

// ============================================================================
// Error Handling Configuration
// ============================================================================

/**
 * Error handling patterns and messages
 */
export const ERROR_HANDLING = {
  /** Default error messages by category */
  MESSAGES: {
    /** Generic errors */
    generic: 'An unexpected error occurred. Please try again.',
    /** Network errors */
    network: 'Connection failed. Please check your internet connection.',
    /** Validation errors */
    validation: 'Please check your input and try again.',
    /** Not found errors */
    notFound: 'The requested item could not be found.',
    /** Permission errors */
    permission: 'You do not have permission to perform this action.',
    /** Timeout errors */
    timeout: 'The operation timed out. Please try again.',
    /** Parse errors */
    parse: 'Could not process the file. It may be corrupted or in an unexpected format.'
  },

  /** Retry configuration */
  RETRY: {
    /** Number of retry attempts */
    maxAttempts: 3,
    /** Delay between retries in ms */
    delayMs: 1000,
    /** Exponential backoff multiplier */
    backoffMultiplier: 2
  },

  /** Error boundary fallback config */
  FALLBACK: {
    title: 'Something went wrong',
    description: 'We apologize for the inconvenience. The error has been logged.',
    actionLabel: 'Reload Application'
  }
};

// ============================================================================
// Accessibility Labels & ARIA Patterns
// ============================================================================

/**
 * Common aria-label values for consistent accessibility
 */
export const ARIA_LABELS = {
  /** Navigation */
  close: 'Close',
  goBack: 'Go back',
  goForward: 'Go forward',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',

  /** Actions */
  save: 'Save changes',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  create: 'Create new',
  duplicate: 'Duplicate',
  move: 'Move',

  /** Selection */
  select: 'Select',
  selectAll: 'Select all',
  deselectAll: 'Deselect all',
  clearSelection: 'Clear selection',

  /** Search & Filter */
  search: 'Search',
  clearSearch: 'Clear search',
  filter: 'Filter results',
  clearFilters: 'Clear all filters',

  /** View controls */
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  resetZoom: 'Reset zoom',
  fullscreen: 'Enter fullscreen',
  exitFullscreen: 'Exit fullscreen',

  /** Navigation */
  previous: 'Previous',
  next: 'Next',
  first: 'First',
  last: 'Last',

  /** Misc */
  expand: 'Expand',
  collapse: 'Collapse',
  moreOptions: 'More options',
  loading: 'Loading',
  help: 'Help'
};

/**
 * ARIA live region configurations
 */
export const ARIA_LIVE = {
  /** For important updates that should be announced immediately */
  assertive: { 'aria-live': 'assertive', 'aria-atomic': 'true' },
  /** For non-critical updates */
  polite: { 'aria-live': 'polite', 'aria-atomic': 'true' },
  /** For status updates */
  status: { role: 'status', 'aria-live': 'polite' },
  /** For alerts */
  alert: { role: 'alert', 'aria-live': 'assertive' }
};

/**
 * Focus trap configuration for modals/dialogs
 */
export const FOCUS_TRAP = {
  /** Selector for focusable elements */
  focusableSelector: 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  /** Initial delay before focusing first element */
  focusDelay: 50
};
