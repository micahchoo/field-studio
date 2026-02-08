/**
 * Staging Feature
 *
 * Public API for the staging feature slice.
 *
 * Provides:
 * - StagingView: Main organism for the two-pane import workbench
 * - Model: Source manifest operations, collection creation, similarity detection
 *
 * ATOMIC REFACTOR STATUS: Phase 4d - Partially Implemented
 *
 * This feature slice follows the Atomic Design + FSD architecture:
 * - Organisms receive context via props from FieldModeTemplate (no hook calls)
 * - Molecules from shared/ui/molecules are composed here
 * - Domain logic is centralized in model/
 * - Zero prop-drilling of fieldMode
 *
 * DECOMPOSITION NOTES:
 * - StagingView organism: New refactored version of StagingWorkbench
 *   - Uses ViewContainer, FilterInput, Toolbar, EmptyState molecules
 *   - Two-pane layout with source manifests and target collections
 *   - Still needs: Full drag-drop implementation, keyboard navigation
 *
 * - Model layer: Extracted from scattered logic in old components
 *   - SourceManifests type and operations
 *   - createSourceManifest: Convert IIIF to staging format
 *   - add/remove/reorder operations
 *   - createCollectionFromManifests: Build IIIF collections
 *   - mergeSourceManifests: Combine similar files
 *   - findSimilarFilenames: Detect potential merges
 *
 * TODO FOR FULL REFACTOR:
 * 1. Implement full drag-drop with useDragDrop hook (shared/lib)
 * 2. Add keyboard navigation for accessibility
 * 3. Create SourcePane molecule (extract from current inline code)
 * 4. Create CanvasItem and CollectionCard shared molecules
 * 5. Add checkpoint/resume functionality
 * 6. Implement SendToCollectionModal molecule
 * 7. Add similarity detection UI for merging files
 *
 * @module features/staging
 */

export { StagingView } from './ui/organisms/StagingView';
export type { StagingViewProps } from './ui/organisms/StagingView';

export { SourcePane } from './ui/molecules/SourcePane';
export type { SourcePaneProps } from './ui/molecules/SourcePane';

export { SourceTreePane } from './ui/molecules/SourceTreePane';
export type { SourceTreePaneProps } from './ui/molecules/SourceTreePane';

export { FileTreeNode } from './ui/atoms/FileTreeNode';
export type { FileTreeNodeProps } from './ui/atoms/FileTreeNode';

export * from './model';
