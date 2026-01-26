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

// ============================================================================
// Viewport Management
// ============================================================================
export { useViewport } from './useViewport';
export type { UseViewportOptions, UseViewportReturn } from './useViewport';
export { usePanZoomGestures } from './usePanZoomGestures';
export type { UsePanZoomGesturesOptions, UsePanZoomGesturesReturn } from './usePanZoomGestures';
export { useViewportKeyboard } from './useViewportKeyboard';
export type { UseViewportKeyboardOptions, UseViewportKeyboardReturn } from './useViewportKeyboard';

// ============================================================================
// Structure View
// ============================================================================
export { useStructureKeyboard, STRUCTURE_KEYBOARD_SHORTCUTS } from './useStructureKeyboard';
export type { UseStructureKeyboardOptions, UseStructureKeyboardResult } from './useStructureKeyboard';
