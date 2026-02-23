/**
 * Board Design Atoms — Barrel Exports
 *
 * Re-exports all atom components and their prop types for the board-design feature.
 *
 * Usage:
 *   import AlignmentGuideLine from './atoms/AlignmentGuideLine.svelte';
 *   import { TYPE_CONFIG } from './atoms/TypeBadge.svelte';  // module-level exports
 *
 * Note: Svelte components are default exports from .svelte files.
 * Named type exports are listed here for consumer convenience.
 *
 * @module features/board-design/ui/atoms
 */

// Components (default exports from .svelte files — import directly)
export { default as AlignmentGuideLine } from './AlignmentGuideLine.svelte';
export { default as BoardNode } from './BoardNode.svelte';
export { default as CanvasGrid } from './CanvasGrid.svelte';
export { default as CanvasItem } from './CanvasItem.svelte';
export { default as ConnectionLine } from './ConnectionLine.svelte';
export { default as ConnectionTypeBadge } from './ConnectionTypeBadge.svelte';
export { default as ContentTypeIcon } from './ContentTypeIcon.svelte';
export { default as ItemBadge } from './ItemBadge.svelte';
export { default as MetadataTooltip } from './MetadataTooltip.svelte';
export { default as MiniMap } from './MiniMap.svelte';
export { default as NodeHandle } from './NodeHandle.svelte';
export { default as RangeFilmstrip } from './RangeFilmstrip.svelte';
export { default as SelectionBox } from './SelectionBox.svelte';
export { default as ToolDivider } from './ToolDivider.svelte';
export { default as TypeBadge } from './TypeBadge.svelte';

// Re-export model types used by atom props (convenience)
export type {
  BoardItem,
  BoardItemMeta,
  ConnectionType,
  IIIFContentType,
  AnchorSide,
} from '../../model';
