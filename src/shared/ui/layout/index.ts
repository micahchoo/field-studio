/**
 * Layout System — Svelte 5
 *
 * 6-level hierarchy: Screen → Pane → Panel → Section → Field → Inline
 * Plus 7 primitives: Stack, Row, Scroll, Fill, Shelf, Center, Split
 */

// Primitives
export {
  Stack,
  Row,
  RowItem,
  Scroll,
  Fill,
  Shelf,
  Center,
  Split,
  SplitPanel,
  SplitContent,
} from './primitives';

// Composites
export {
  ScreenLayout,
  PaneLayout,
  PanelLayout,
  SectionLayout,
  FieldLayout,
  InlineLayout,
} from './composites';

// Presets
export { archiveSizes } from './presets/archive';
export { viewerSizes } from './presets/viewer';
export { boardSizes } from './presets/board';

// Types
export type {
  GapSize,
  Alignment,
  Justify,
  OverflowAxis,
  ShelfHeight,
  ShelfWidth,
} from './types';

export {
  gapClasses,
  alignClasses,
  justifyClasses,
  overflowClasses,
  shelfHeightClasses,
  shelfWidthClasses,
} from './types';

// Resizable action
export { resizable } from './actions/resizable';
export type { ResizableParams } from './actions/resizable';
