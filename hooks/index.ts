/**
 * Hooks Index
 *
 * Central export point for all custom hooks.
 *
 * Categories:
 * - State Management: useIIIFEntity (Vault)
 * - App State: useAppSettings, useURLState
 * - UI State: useDialogState, useInspectorTabs, useResponsive
 */

// ============================================================================
// IIIF Entity Management (Vault)
// ============================================================================
export {
  VaultProvider,
  useVault,
  useRoot,
  useEntity,
  useHistory,
  useBulkOperations,
  useUndoRedoShortcuts,
} from './useIIIFEntity';

// ============================================================================
// Application State
// ============================================================================
export { useAppSettings } from './useAppSettings';
export { useURLState } from './useURLState';

// ============================================================================
// UI State
// ============================================================================
export { useDialogState, useDialogsState } from './useDialogState';
export { useInspectorTabs } from './useInspectorTabs';
export type { InspectorTab } from './useInspectorTabs';
export { useResponsive } from './useResponsive';
