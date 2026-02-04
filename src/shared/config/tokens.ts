/**
 * Design Tokens & Configuration
 *
 * Single source of truth for all magic numbers, timing values, constraints, and configuration.
 * Re-exports design tokens from designSystem.ts and adds application-specific constants.
 *
 * PRINCIPLE: No hardcoded values in component source code.
 * All values live here for consistency and maintainability.
 */

// Design tokens (from existing designSystem.ts)
export { COLORS, SPACING, LAYOUT, TOUCH_TARGETS, INTERACTION } from '../../designSystem';

// ============================================================================
// INPUT & FORM CONSTRAINTS
// ============================================================================

/**
 * Input field constraints and sizing
 * These were previously hardcoded in components — now centralized
 */
export const INPUT_CONSTRAINTS = {
  /** Default max length for text inputs (FilterInput, DebouncedInput, etc.) */
  maxLengthDefault: 500,

  /** Default debounce delay for inputs (300ms = user perception of "instant") */
  debounceMs: 300,

  /** Width presets for input fields */
  width: {
    /** Default filter/search input width */
    filter: 'w-64',
    /** Wider search field variant */
    search: 'w-96',
  },

  /** Touch target sizing for interactive elements */
  touchTarget: {
    /** Clear button margin in input fields */
    clearButton: 0.5,
  },
} as const;

// ============================================================================
// UI TIMING & ANIMATION
// ============================================================================

/**
 * Timing values for interactions and animations
 * Ensures consistent feel across the application
 */
export const UI_TIMING = {
  /** Standard debounce delay for user input (300ms) */
  debounce: 300,

  /** CSS transition duration for smooth property changes (200ms) */
  transition: 200,

  /** Keyframe animation duration (300ms) */
  animation: 300,

  /** Tooltip/popover delay (500ms before appearing) */
  tooltipDelay: 500,

  /** Rapid click detection threshold (300ms) */
  clickThreshold: 300,
} as const;

// ============================================================================
// STORAGE & QUOTA
// ============================================================================

/**
 * Storage and database constraints
 * Used by storage service and quota monitoring
 */
export const STORAGE_CONSTRAINTS = {
  /** IndexedDB database name */
  dbName: 'biiif-archive-db',

  /** LRU cache size for tiles (500MB) */
  tileCacheSize: 500 * 1024 * 1024,

  /** Storage warning threshold (90% of quota) */
  warningThreshold: 0.9,

  /** Storage critical threshold (95% of quota) */
  criticalThreshold: 0.95,

  /** Batch size for bulk operations */
  batchSize: 100,
} as const;

// ============================================================================
// GRID & LAYOUT
// ============================================================================

/**
 * Grid and layout dimensions
 */
export const GRID_CONSTRAINTS = {
  /** Default grid item size for archives and collections */
  itemSize: 200,

  /** Grid gap between items */
  gap: 16,

  /** Min items visible before virtualization kicks in */
  virtualizationThreshold: 50,

  /** Items to render outside visible viewport (buffer) */
  overscan: 10,
} as const;

// ============================================================================
// SEARCH & FILTERING
// ============================================================================

/**
 * Search and filtering behavior
 */
export const SEARCH_CONSTRAINTS = {
  /** Debounce for search input (same as general INPUT debounce) */
  debounceMs: 300,

  /** Max results to display in search dropdown */
  maxResults: 20,

  /** Min characters before search executes */
  minChars: 2,

  /** Fuzzy match threshold (0-1, higher = stricter) */
  fuzzyThreshold: 0.6,
} as const;

// ============================================================================
// IMPORT & EXPORT
// ============================================================================

/**
 * File import/export constraints
 */
export const FILE_CONSTRAINTS = {
  /** Max file size for direct import (100MB) */
  maxFileSize: 100 * 1024 * 1024,

  /** Max files in single import batch */
  maxBatchFiles: 500,

  /** Timeout for file processing (30 seconds) */
  processingTimeout: 30000,
} as const;

// ============================================================================
// VALIDATION & ERROR HANDLING
// ============================================================================

/**
 * Validation constraints and error behavior
 */
export const VALIDATION_CONSTRAINTS = {
  /** Max IIIF hierarchy depth */
  maxHierarchyDepth: 10,

  /** Min items for bulk operations warning */
  bulkOperationThreshold: 100,

  /** Validation error message max length */
  errorMessageMaxLength: 200,
} as const;

// ============================================================================
// TYPE GUARDS & EXPORTS
// ============================================================================

/**
 * Ensure all constants are readonly to prevent accidental mutations
 */
export type InputConstraints = typeof INPUT_CONSTRAINTS;
export type UiTiming = typeof UI_TIMING;
export type StorageConstraints = typeof STORAGE_CONSTRAINTS;
export type GridConstraints = typeof GRID_CONSTRAINTS;
export type SearchConstraints = typeof SEARCH_CONSTRAINTS;
export type FileConstraints = typeof FILE_CONSTRAINTS;
export type ValidationConstraints = typeof VALIDATION_CONSTRAINTS;
