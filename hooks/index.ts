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

/**
 * @deprecated Import from '@/src/app/providers' instead.
 * This export is kept for backwards compatibility during migration.
 * Organisms should receive settings via props from FieldModeTemplate, not import directly.
 */
export { useAppSettings } from '@/src/app/providers';

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
// UI State (shared hooks from FSD location)
// ============================================================================
export { useDialogState, useDialogsState, useResponsive } from '@/src/shared/lib/hooks';
export { useInspectorTabs } from './useInspectorTabs';
export type { InspectorTab } from './useInspectorTabs';

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
// List Filtering & Sorting
// ============================================================================
export { useListFilter } from './useListFilter';
export type {
  SortConfig,
  SortDirection,
  UseListFilterOptions,
  UseListFilterReturn,
} from './useListFilter';

// ============================================================================
// Selection Management
// ============================================================================
export { useSelection } from './useSelection';
export type {
  UseSelectionOptions,
  UseSelectionReturn,
} from './useSelection';

// ============================================================================
// Progressive Disclosure (Phase 3 UX Simplification)
// ============================================================================
export {
  useAbstractionLevel,
  type UseAbstractionLevelReturn
} from './useAbstractionLevel';

/**
 * @deprecated Import from '@/src/app/providers' instead.
 * This export is kept for backwards compatibility during migration.
 * Organisms should receive terminology via props from FieldModeTemplate, not import directly.
 */
export {
  useTerminology,
  useTerminologyWithLevel,
  type UseTerminologyOptions,
  type UseTerminologyReturn
} from '@/src/app/providers';

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
// Accessibility & Motion (from shared)
// ============================================================================
export {
  useReducedMotion,
  useMotionDuration,
  useMotionTransitions,
  useFocusTrap,
} from '@/src/shared/lib/hooks';
export type { UseFocusTrapOptions } from '@/src/shared/lib/hooks';
export { useKeyboardDragDrop } from './useKeyboardDragDrop';

// ============================================================================
// Shared UI Hooks (from shared)
// ============================================================================
export { useContextualStyles, useDebouncedValue, usePersistedTab } from '@/src/shared/lib/hooks';
export type { ContextualClassNames } from '@/src/shared/lib/hooks';

export { useInspectorValidation } from './useInspectorValidation';

export { useMetadataEditor } from './useMetadataEditor';

export { useLayerHistory, buildCanvasFromLayers } from './useLayerHistory';
export type { PlacedResource } from './useLayerHistory';

// ============================================================================
// Utility Hooks (from shared)
// ============================================================================
export { useDebouncedCallback } from '@/src/shared/lib/hooks';

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
