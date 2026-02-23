/**
 * Canvas Composer Model -- Types only (deferred hook conversion)
 *
 * Domain-specific types for the canvas composition feature.
 * The full useComposer hook conversion is DEFERRED because it depends on:
 *   - useViewport (shared/lib/hooks) -- viewport/pan-zoom state
 *   - usePanZoomGestures (shared/actions) -- gesture handling
 *   - useViewportKeyboard (shared/actions) -- keyboard controls
 *   - useLayerHistory (shared/lib/hooks) -- undo/redo layer management
 *
 * These dependencies are partially migrated:
 *   - layerHistory.svelte.ts exists (Cat 2 store)
 *   - panZoomGestures.ts exists (Cat 3 action)
 *   - viewportKeyboard.ts exists (Cat 3 action)
 * But useViewport has not been converted to a reactive class yet.
 *
 * SOURCE: React codebase src/features/viewer/model/composer.ts
 * MIGRATION STATUS: Types only. useComposer hook deferred.
 *
 * FUTURE MIGRATION PLAN:
 * When useViewport is available as a reactive class (ViewportStore),
 * create composer.svelte.ts with a ComposerStore class that:
 *   - Holds $state for dimensions, activeId, bgMode, sidebarTab, resize state
 *   - Uses LayerHistoryStore for undo/redo layer management
 *   - References ViewportStore for pan/zoom state
 *   - Methods: addResourceLayer, addTextLayer, moveLayer, removeLayer,
 *     toggleLayerLock, updateLayerOpacity, alignActive, handleSave,
 *     startResize, endResize, updateResize
 *   - DOM refs (containerRef) live in the component
 *   - Gesture/keyboard actions (panZoomGestures, viewportKeyboard)
 *     applied in the component via use:panZoomGestures / use:viewportKeyboard
 */

import type { IIIFCanvas, IIIFItem } from '@/src/shared/types';

// Re-export PlacedResource from layerHistory for consumers of this module
export type { PlacedResource } from '@/src/shared/lib/hooks/layerHistory.svelte';

// ============================================================================
// Types
// ============================================================================

/** Background rendering mode for the composer canvas area */
export type BackgroundMode = 'grid' | 'dark' | 'light';

/** Sidebar panel tabs in the composer UI */
export type SidebarTab = 'layers' | 'library';

/** Canvas dimensions (width x height) for the composition */
export interface ComposerDimensions {
  w: number;
  h: number;
}

/**
 * State shape for the canvas composer.
 *
 * In the React version this was part of UseComposerReturn.
 * In the Svelte version, this will become $state fields inside
 * ComposerStore (when fully migrated).
 */
export interface ComposerState {
  /** Canvas dimensions */
  dimensions: ComposerDimensions;
  /** Currently selected layer ID (null if none) */
  activeId: string | null;
  /** Background mode for the canvas area */
  bgMode: BackgroundMode;
  /** Active sidebar tab */
  sidebarTab: SidebarTab;
  /** Whether a resize drag is in progress */
  isResizing: boolean;
  /** Handle identifier for active resize (e.g., 'ne', 'sw', 'e') */
  resizeHandle: string | null;
}

/**
 * Alignment options for positioning the active layer
 * relative to the canvas dimensions.
 */
export type AlignmentType = 'center' | 'top' | 'left' | 'fill';

// ============================================================================
// NOTE: UseComposerReturn is NOT included here.
// The React-specific interface with React.RefObject, ReturnType<typeof useViewport>,
// and React.MouseEvent handlers does not translate to Svelte.
//
// When the ComposerStore is created (composer.svelte.ts), its public API
// will be defined by the class's public methods and accessor properties,
// following the same pattern as AnnotationToolStore and ViewerStore.
// ============================================================================
