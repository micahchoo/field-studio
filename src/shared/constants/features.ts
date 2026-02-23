// Pure TypeScript — no Svelte-specific conversion

/**
 * Feature Flags
 *
 * Toggle experimental features or migration paths.
 */

export const FEATURE_FLAGS = {
  USE_NEW_STAGING: true,
  USE_ACCESSIBLE_FOCUS: true,
  USE_IMMER_CLONING: false,
  USE_WORKER_SEARCH: true,
  USE_PROGRESSIVE_DISCLOSURE: true,
  USE_SIMPLIFIED_UI: true,
  USE_KEYBOARD_DND: false,
  USE_I18N: false,

  // Phase 1: Memory Leak Fixes
  USE_WORKER_URL_CLEANUP: true,
  USE_IMAGE_SOURCE_CLEANUP: true,
  USE_FILE_LIFECYCLE: true,

  // Phase 2: Trash/Restore System
  USE_TRASH_SYSTEM: true,
  USE_TRASH_AUTO_CLEANUP: true,
  USE_TRASH_SIZE_LIMITS: true,

  // Phase 3: Enhanced Progress Indicators
  USE_ENHANCED_PROGRESS: true,

  // Phase 4: Worker Migration
  USE_WORKER_INGEST: false,
} as const;

export const { USE_TRASH_SYSTEM } = FEATURE_FLAGS;
export const { USE_TRASH_AUTO_CLEANUP } = FEATURE_FLAGS;
export const { USE_TRASH_SIZE_LIMITS } = FEATURE_FLAGS;
export const { USE_IMMER_CLONING } = FEATURE_FLAGS;
export const { USE_WORKER_SEARCH } = FEATURE_FLAGS;
export const { USE_WORKER_URL_CLEANUP } = FEATURE_FLAGS;
export const { USE_IMAGE_SOURCE_CLEANUP } = FEATURE_FLAGS;
export const { USE_FILE_LIFECYCLE } = FEATURE_FLAGS;
export const { USE_ENHANCED_PROGRESS } = FEATURE_FLAGS;
export const { USE_WORKER_INGEST } = FEATURE_FLAGS;
