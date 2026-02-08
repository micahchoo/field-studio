/**
 * Board Design Feature
 *
 * Public API for the board-design feature slice.
 *
 * Provides:
 * - BoardView: Main organism for designing boards with IIIF resources
 * - Board model: State management, selectors, and helpers
 * - Types: BoardItem, Connection, BoardState, etc.
 *
 * @module features/board-design
 */

export { BoardView } from './ui/organisms/BoardView';
export { BoardHeader } from './ui/organisms/BoardHeader';
export { BoardToolbar } from './ui/organisms/BoardToolbar';
export { BoardCanvas } from './ui/organisms/BoardCanvas';

export type {
  BoardViewProps,
} from './ui/organisms/BoardView';

export type {
  BoardHeaderProps,
} from './ui/organisms/BoardHeader';

export type {
  BoardToolbarProps,
} from './ui/organisms/BoardToolbar';

export type {
  BoardCanvasProps,
} from './ui/organisms/BoardCanvas';

export * from './model';
export { useBoardVault } from './hooks/useBoardVault';
export type { UseBoardVaultOptions, UseBoardVaultReturn } from './hooks/useBoardVault';
export {
  boardStateToManifest,
  manifestToBoardState,
  generateBoardId,
  isBoardManifest,
} from './model/iiif-bridge';
