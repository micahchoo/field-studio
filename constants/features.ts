/**
 * Feature Flags
 *
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
  USE_PROGRESSIVE_DISCLOSURE: true,
  /** Enable simplified 3-mode UI consolidation (Phase 3) */
  USE_SIMPLIFIED_UI: true,
  /** Enable keyboard-based drag and drop (Phase 5) */
  USE_KEYBOARD_DND: false,
  /** Enable internationalization (i18n) framework (Phase 6) */
  USE_I18N: false,

  // ============================================================================
  // Phase 1: Memory Leak Fixes (P0 - Critical Stability)
  // ============================================================================
  /**
   * Enable worker blob URL cleanup on app shutdown
   * Prevents memory leaks from unreleased blob URLs in tileWorker.ts
   */
  USE_WORKER_URL_CLEANUP: true,
  /**
   * Enable automatic cleanup in useImageSource hook
   * Prevents memory leaks from blob URLs in imageSourceResolver.ts
   */
  USE_IMAGE_SOURCE_CLEANUP: true,
  /**
   * Enable file lifecycle management for _fileRef cleanup
   * Prevents memory leaks from large File objects in iiifBuilder.ts
   */
  USE_FILE_LIFECYCLE: true,

  // ============================================================================
  // Phase 2: Trash/Restore System (P0 - Data Safety)
  // ============================================================================
  /**
   * Enable trash/restore system for soft deletion
   * Replaces hard delete with recoverable trash
   */
  USE_TRASH_SYSTEM: true,
  /**
   * Enable auto-cleanup of trash items older than retention period
   */
  USE_TRASH_AUTO_CLEANUP: true,
  /**
   * Enable trash size limits to prevent storage bloat
   */
  USE_TRASH_SIZE_LIMITS: true,

  // ============================================================================
  // Phase 3: Enhanced Progress Indicators (P1 - UX)
  // ============================================================================
  /**
   * Enable enhanced granular progress tracking for ingest operations
   * Replaces simple callback-based progress with cancellable, detailed progress
   */
  USE_ENHANCED_PROGRESS: true,

  // ============================================================================
  // Phase 4: Worker Migration (P1 - Performance)
  // ============================================================================
  /**
   * Enable worker-based ingest processing
   * Moves CPU-intensive operations (createImageBitmap, generateDerivative,
   * calculateHash, extractMetadata) to web workers for improved performance
   */
  USE_WORKER_INGEST: true,
} as const;

/** Phase 2 Trash System feature flag exports */
export const USE_TRASH_SYSTEM = FEATURE_FLAGS.USE_TRASH_SYSTEM;
export const USE_TRASH_AUTO_CLEANUP = FEATURE_FLAGS.USE_TRASH_AUTO_CLEANUP;
export const USE_TRASH_SIZE_LIMITS = FEATURE_FLAGS.USE_TRASH_SIZE_LIMITS;

/** Performance feature flag exports for convenience */
export const USE_IMMER_CLONING = FEATURE_FLAGS.USE_IMMER_CLONING;
export const USE_WORKER_SEARCH = FEATURE_FLAGS.USE_WORKER_SEARCH;

/** Phase 1 Memory Leak Fix feature flag exports */
export const USE_WORKER_URL_CLEANUP = FEATURE_FLAGS.USE_WORKER_URL_CLEANUP;
export const USE_IMAGE_SOURCE_CLEANUP = FEATURE_FLAGS.USE_IMAGE_SOURCE_CLEANUP;
export const USE_FILE_LIFECYCLE = FEATURE_FLAGS.USE_FILE_LIFECYCLE;

/** Phase 3 Enhanced Progress feature flag export */
export const USE_ENHANCED_PROGRESS = FEATURE_FLAGS.USE_ENHANCED_PROGRESS;

/** Phase 4 Worker Migration feature flag export */
export const USE_WORKER_INGEST = FEATURE_FLAGS.USE_WORKER_INGEST;
