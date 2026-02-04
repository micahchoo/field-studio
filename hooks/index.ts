/**
 * Hooks Index
 *
 * Central export point for all custom hooks.
 *
 * Categories:
 * - State Management: useIIIFEntity (Vault)
 * - Vault Selectors: useVaultSelectors (Memoized derived state)
 * - App State: useAppSettings, useURLState
 * - UI State: useDialogState, useInspectorTabs, useResponsive
 * - Progressive Disclosure: useAbstractionLevel, useTerminology (Phase 3)
 */

// ============================================================================
// IIIF Entity Management (Vault)
// ============================================================================
export {
  VaultProvider,
  useVault,
  useVaultState,
  useVaultDispatch,
  useVaultOptional,
  useVaultStateOptional,
  useVaultDispatchOptional,
  useRoot,
  useEntity,
  useHistory,
  useBulkOperations,
  useUndoRedoShortcuts,
} from './useIIIFEntity';

// ============================================================================
// Vault Selectors (Memoized Derived State)
// ============================================================================
export {
  useEntity as useVaultEntity,
  useEntityLabel,
  useEntityChildren,
  useEntityAncestors,
  useEntityTree,
  useEntitiesByType,
  useValidationSummary,
  useSelectedEntities,
  useEntityPath,
  useEntityDescendants,
  useEntityExists,
  useEntityParent,
  useEntityType,
} from './useVaultSelectors';

export type {
  NormalizedEntity,
  TreeNode,
  ValidationSummary,
} from './useVaultSelectors';

// ============================================================================
// Application State
// ============================================================================
export { useAppSettings } from './useAppSettings';
export { useURLState } from './useURLState';

// ============================================================================
// User Intent Context (Phase 1: UI Simplification)
// ============================================================================
export {
  UserIntentProvider,
  useUserIntentState,
  useUserIntentDispatch,
  useUserIntent,
  useUserIntentOptional,
  useIsEditing,
  useIsFieldMode,
  useIntentMicrocopy,
} from './useUserIntent';
export type {
  UserIntent,
  UserIntentState,
  UserIntentActions,
} from './useUserIntent';

// ============================================================================
// Resource Context (Phase 1: UI Simplification)
// ============================================================================
export {
  ResourceContextProvider,
  useResourceContextState,
  useResourceContextDispatch,
  useResourceContext,
  useResourceContextOptional,
  useHasResource,
  useIsCanvas,
  useIsManifest,
  useIsCollection,
  useResourceMicrocopy,
} from './useResourceContext';
export type {
  IIIFResourceType,
  EditHistory,
  CollaborationStatus,
  AccessibilitySettings,
  ResourceContextState,
  ResourceContextActions,
} from './useResourceContext';

// ============================================================================
// Contextual Microcopy (Phase 1: UI Simplification)
// ============================================================================
export {
  useContextualMicrocopy,
  useValidationMicrocopy,
} from './useContextualMicrocopy';
export type {
  ContextualMicrocopyOptions,
  ContextualMicrocopyResult,
} from './useContextualMicrocopy';

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

// ============================================================================
// Shared State & Navigation (UX Improvements)
// ============================================================================
export { useSharedSelection } from './useSharedSelection';
export { useNavigationGuard } from './useNavigationGuard';

// ============================================================================
// Progressive Disclosure (Phase 3 UX Simplification)
// ============================================================================
export {
  useAbstractionLevel,
  type UseAbstractionLevelReturn
} from './useAbstractionLevel';
export {
  useTerminology,
  useTerminologyWithLevel,
  type UseTerminologyOptions,
  type UseTerminologyReturn
} from './useTerminology';

// ============================================================================
// Virtualization
// ============================================================================
export {
  useVirtualization,
  useGridVirtualization
} from './useVirtualization';
export type {
  UseVirtualizationOptions,
  UseVirtualizationReturn,
  UseGridVirtualizationOptions,
  UseGridVirtualizationReturn
} from './useVirtualization';

// ============================================================================
// Tree Virtualization (Performance Optimization)
// ============================================================================
export {
  useTreeVirtualization
} from './useTreeVirtualization';
export type {
  FlattenedTreeNode,
  UseTreeVirtualizationOptions,
  UseTreeVirtualizationReturn
} from './useTreeVirtualization';

// ============================================================================
// IIIF Traversal
// ============================================================================
export { useIIIFTraversal } from './useIIIFTraversal';
export type { UseIIIFTraversalReturn } from './useIIIFTraversal';

// ============================================================================
// Command Palette History
// ============================================================================
export { useCommandHistory } from './useCommandHistory';
export type { CommandHistoryEntry } from './useCommandHistory';

// ============================================================================
// Breadcrumb Navigation
// ============================================================================
export { useBreadcrumbPath, useBreadcrumbPathFromRoot } from './useBreadcrumbPath';
export type { BreadcrumbSegment, UseBreadcrumbPathOptions } from './useBreadcrumbPath';

// ============================================================================
// Resizable Panels
// ============================================================================
export { useResizablePanel } from './useResizablePanel';
export type {
  ResizablePanelConfig,
  ResizablePanelState,
  ResizablePanelActions,
  UseResizablePanelReturn
} from './useResizablePanel';

// ============================================================================
// Accessibility & Motion
// ============================================================================
export {
  useReducedMotion,
  useMotionDuration,
  useMotionTransitions
} from './useReducedMotion';
export {
  useFocusTrap
} from './useFocusTrap';
export type {
  UseFocusTrapOptions
} from './useFocusTrap';
export {
  useKeyboardDragDrop
} from './useKeyboardDragDrop';

// ============================================================================
// Phase 2: Contextual Styling & Component Extraction Hooks
// ============================================================================
export { useContextualStyles } from './useContextualStyles';
export type { ContextualClassNames } from './useContextualStyles';

export { useDebouncedValue } from './useDebouncedValue';

export { usePersistedTab } from './usePersistedTab';

export { useInspectorValidation } from './useInspectorValidation';

export { useMetadataEditor } from './useMetadataEditor';

export { useLayerHistory, buildCanvasFromLayers } from './useLayerHistory';
export type { PlacedResource } from './useLayerHistory';

// ============================================================================
// Utility Hooks
// ============================================================================
export { useDebouncedCallback } from './useDebouncedCallback';

// ============================================================================
// Phase 1: Memory Leak Fixes - Image Source Management
// ============================================================================
export {
  useImageSource,
  useMultipleImageSources,
} from './useImageSource';
export type {
  UseImageSourceOptions,
  UseImageSourceResult,
  UseMultipleImageSourcesResult,
} from './useImageSource';

// ============================================================================
// Phase 3: Enhanced Progress Indicators (P1 - UX)
// ============================================================================
export {
  useIngestProgress,
  formatETA,
  formatSpeed,
} from './useIngestProgress';
export type {
  IngestControls,
  AggregateProgress,
  UseIngestProgressReturn,
} from './useIngestProgress';
