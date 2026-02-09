/**
 * Shared Library Hooks
 *
 * Generic, reusable, domain-agnostic hooks that can be used by any feature.
 * These hooks have zero knowledge of IIIF, manifests, canvases, or business logic.
 */

// Debouncing
export { useDebouncedValue } from './useDebouncedValue';
export { useDebouncedCallback } from './useDebouncedCallback';

// Responsive
export { useResponsive } from './useResponsive';
export type { ResponsiveState } from './useResponsive';

// Dialog State
export { useDialogState, useDialogsState } from './useDialogState';
export type { DialogControls } from './useDialogState';

// Persistence
export { usePersistedTab } from './usePersistedTab';

// Accessibility
export { useFocusTrap } from './useFocusTrap';
export type { UseFocusTrapOptions } from './useFocusTrap';
export {
  useReducedMotion,
  useMotionDuration,
  useMotionTransitions
} from './useReducedMotion';

// Drag & Drop
export { useDragDrop } from './useDragDrop';

// Keyboard Navigation
export { useKeyboardNav } from './useKeyboardNav';

// Contextual Styling
export { useContextualStyles } from './useContextualStyles';
export type { ContextualClassNames } from './useContextualStyles';

// Shared Selection
export { useSharedSelection } from './useSharedSelection';
export type { UseSharedSelectionReturn } from './useSharedSelection';

// IIIF Traversal
export { useIIIFTraversal } from './useIIIFTraversal';
export type { UseIIIFTraversalReturn } from './useIIIFTraversal';

// Grid Virtualization
export { useGridVirtualization } from './useGridVirtualization';
export type { UseGridVirtualizationOptions, UseGridVirtualizationReturn } from './useGridVirtualization';

// Viewport Hooks
export { useViewport } from './useViewport';
export type { UseViewportReturn, UseViewportOptions } from './useViewport';

export { useViewportKeyboard } from './useViewportKeyboard';
export type { UseViewportKeyboardReturn, UseViewportKeyboardOptions } from './useViewportKeyboard';

export { usePanZoomGestures } from './usePanZoomGestures';
export type { UsePanZoomGesturesReturn, UsePanZoomGesturesOptions } from './usePanZoomGestures';

// Cross-View Pipeline
export { usePipeline, usePipelineStore } from './usePipeline';
export type { PipelineState, PipelineOrigin, PipelineIntent } from './usePipeline';

// App Settings (moved from app/providers for FSD compliance)
export { useAppSettings } from './useAppSettings';
export type { UseAppSettingsReturn } from './useAppSettings';

// Terminology (moved from app/providers for FSD compliance)
export { useTerminology, useTerminologyWithLevel } from './useTerminology';
export type { UseTerminologyOptions, UseTerminologyReturn } from './useTerminology';

// Network Status
export { useNetworkStatus } from './useNetworkStatus';

// Auth Status
export { useAuthStatus } from './useAuthStatus';
export type { AuthStatusResult } from './useAuthStatus';
