/**
 * StagingView Organism
 *
 * Main organism for the staging feature.
 * Provides a two-pane workbench for importing and organizing IIIF resources.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props from FieldModeTemplate (no hook calls)
 * - Composes molecules: ViewContainer, Toolbar, EmptyState, FilterInput
 * - Domain logic delegated to model/
 * - No prop-drilling of fieldMode
 *
 * IDEAL OUTCOME: Users can drag manifests from source to collections, reorder canvases, merge similar files
 * FAILURE PREVENTED: Lost work via state management, confusing UI via clear visual separation
 *
 * LEGACY NOTE: This is the refactored version of components/staging/StagingWorkbench.tsx
 * The original component mixed drag-drop logic, keyboard navigation, and UI concerns.
 * This organism focuses on composition while the model handles business logic.
 *
 * DECOMPOSITION NOTES:
 * - SourcePane: Should become a shared molecule or feature-specific molecule
 *   - Handles manifest list display with drag handles
 *   - Keyboard navigation for accessibility
 *   - Selection state management
 *
 * - CanvasItem/CollectionCard: Should become shared molecules
 *   - CanvasItem: Thumbnail + label for individual canvases
 *   - CollectionCard: Card representing a target collection
 *
 * - Drag-drop logic: Should be extracted to shared/lib hooks
 *   - useDragDrop: Generic drag-drop hook
 *   - useKeyboardDragDrop: Keyboard-based drag-drop (already exists in hooks/)
 *
 * TODO FOR FULL REFACTOR:
 * 1. Create SourcePane molecule with drag-drop capabilities
 * 2. Create CanvasItem and CollectionCard shared molecules
 * 3. Extract drag-drop hooks to shared/lib
 * 4. Implement keyboard navigation for accessibility
 * 5. Add checkpoint/resume functionality
 * 6. Create SendToCollectionModal molecule
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { IIIFCollection, IIIFItem } from '@/types';
import { ViewContainer } from '@/src/shared/ui/molecules/ViewContainer';
import { FilterInput } from '@/src/shared/ui/molecules/FilterInput';
import { Toolbar } from '@/src/shared/ui/molecules/Toolbar';
import { EmptyState } from '@/src/shared/ui/molecules/EmptyState';
import { Button } from '@/src/shared/ui/atoms';
import {
  createCollectionFromManifests,
  selectAllSourceManifests,
  selectTotalCanvasCount,
  type SourceManifest,
  type SourceManifests,
} from '../../model';

export interface StagingViewProps {
  /** Root IIIF item (for context) */
  root: IIIFItem | null;
  /** Source manifests (left pane) - optional, will use root if not provided */
  sourceManifests?: SourceManifests;
  /** Target collections (right pane) - optional */
  targetCollections?: IIIFCollection[];
  /** Contextual styles from template */
  cx: {
    surface: string;
    text: string;
    accent: string;
    border: string;
    divider: string;
    headerBg: string;
    textMuted: string;
    input: string;
    label: string;
    active: string;
    inactive: string;
  };
  /** Current field mode */
  fieldMode: boolean;
  /** Called when manifests are added to a collection */
  onAddToCollection: (manifestIds: string[], collectionId: string) => void;
  /** Called when a new collection is created */
  onCreateCollection: (label: string, manifestIds: string[]) => void;
  /** Called when canvases are reordered within a manifest */
  onReorderCanvases: (manifestId: string, newOrder: string[]) => void;
  /** Called when source manifests are removed */
  onRemoveFromSource: (manifestIds: string[]) => void;
  /** Called when similar files should be merged */
  onMergeManifests?: (sourceIds: string[], targetId: string) => void;
}

/**
 * StagingView Organism
 *
 * @example
 * <FieldModeTemplate>
 *   {({ cx, fieldMode }) => (
 *     <StagingView
 *       sourceManifests={sourceManifests}
 *       targetCollections={collections}
 *       cx={cx}
 *       fieldMode={fieldMode}
 *       onAddToCollection={handleAdd}
 *       onCreateCollection={handleCreate}
 *       onReorderCanvases={handleReorder}
 *       onRemoveFromSource={handleRemove}
 *     />
 *   )}
 * </FieldModeTemplate>
 */
export const StagingView: React.FC<StagingViewProps> = ({
  root,
  sourceManifests: externalSourceManifests,
  targetCollections: externalTargetCollections = [],
  cx,
  fieldMode,
  onAddToCollection,
  onCreateCollection,
  onReorderCanvases,
  onRemoveFromSource,
  onMergeManifests,
}) => {
  // Use provided sourceManifests or create empty default
  const sourceManifests = externalSourceManifests ?? { byId: {}, allIds: [] };
  const targetCollections = externalTargetCollections;
  // Local UI state
  const [filter, setFilter] = useState('');
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null
  );
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // Derived state from model
  const allSourceManifests = useMemo(
    () => selectAllSourceManifests(sourceManifests),
    [sourceManifests]
  );
  const totalCanvases = useMemo(
    () => selectTotalCanvasCount(sourceManifests),
    [sourceManifests]
  );

  // Filter source manifests
  const filteredManifests = useMemo(() => {
    if (!filter.trim()) return allSourceManifests;
    const lowerFilter = filter.toLowerCase();
    return allSourceManifests.filter(
      (m) =>
        m.label.toLowerCase().includes(lowerFilter) ||
        m.canvases.some((c) => c.label.toLowerCase().includes(lowerFilter))
    );
  }, [allSourceManifests, filter]);

  // Selection handlers
  const toggleSelection = useCallback((id: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedSourceIds(filteredManifests.map((m) => m.id));
  }, [filteredManifests]);

  const clearSelection = useCallback(() => {
    setSelectedSourceIds([]);
  }, []);

  // Handle creating a new collection
  const handleCreateCollection = useCallback(() => {
    if (newCollectionName.trim() && selectedSourceIds.length > 0) {
      onCreateCollection(newCollectionName.trim(), selectedSourceIds);
      setNewCollectionName('');
      setIsCreatingCollection(false);
      clearSelection();
    }
  }, [
    newCollectionName,
    selectedSourceIds,
    onCreateCollection,
    clearSelection,
  ]);

  // Empty state when no sources
  if (allSourceManifests.length === 0) {
    return (
      <EmptyState
        icon="cloud_upload"
        title="No Sources Loaded"
        message="Import files or manifests to begin staging"
        action={{
          label: 'Import Files',
          onClick: () => {
            // TODO: Trigger import dialog
            console.log('Open import dialog');
          },
        }}
        cx={cx}
        fieldMode={fieldMode}
      />
    );
  }

  return (
    <ViewContainer
      title="Staging Area"
      icon="move_to_inbox"
      className={cx.surface}
      cx={cx}
      fieldMode={fieldMode}
      header={
        <div className="flex items-center gap-4 w-full">
          {/* Stats */}
          <div className={`text-sm ${cx.textMuted}`}>
            {allSourceManifests.length} manifests • {totalCanvases} items
          </div>

          {/* Filter */}
          <FilterInput
            value={filter}
            onChange={setFilter}
            placeholder="Filter sources..."
            cx={cx}
            fieldMode={fieldMode}
          />

          {/* Selection info */}
          {selectedSourceIds.length > 0 && (
            <div className={`text-sm ${cx.textMuted}`}>
              {selectedSourceIds.length} selected
            </div>
          )}

          {/* Actions */}
          <Toolbar className="ml-auto">
            {selectedSourceIds.length > 0 && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreatingCollection(true)}
                >
                  Create Collection
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={clearSelection}
                >
                  Clear Selection
                </Button>
              </>
            )}
            <Button variant="secondary" size="sm" onClick={selectAll}>
              Select All
            </Button>
          </Toolbar>
        </div>
      }
    >
      <div className="flex h-full gap-4">
        {/* Source Pane (Left) */}
        <div
          className={`flex-1 ${cx.headerBg} rounded-lg border ${cx.border} overflow-hidden flex flex-col`}
        >
          <div
            className={`px-4 py-3 border-b ${cx.border} ${cx.headerBg} flex justify-between items-center`}
          >
            <h3 className={`font-medium ${cx.text}`}>Source Manifests</h3>
            <span className={`text-xs ${cx.textMuted}`}>
              {filteredManifests.length} shown
            </span>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {filteredManifests.length === 0 ? (
              <div className={`text-center py-8 ${cx.textMuted}`}>
                No manifests match your filter
              </div>
            ) : (
              <div className="space-y-2">
                {filteredManifests.map((manifest) => (
                  <div
                    key={manifest.id}
                    onClick={() => toggleSelection(manifest.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSourceIds.includes(manifest.id)
                        ? `${cx.active} border-current`
                        : `${cx.headerBg} ${cx.border} hover:${cx.surface}`
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Selection checkbox */}
                      <div
                        className={`w-4 h-4 rounded border ${
                          selectedSourceIds.includes(manifest.id)
                            ? cx.accent
                            : cx.border
                        }`}
                      >
                        {selectedSourceIds.includes(manifest.id) && (
                          <svg
                            className="w-4 h-4 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Manifest info */}
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${cx.text}`}>
                          {manifest.label}
                        </div>
                        <div className={`text-xs ${cx.textMuted}`}>
                          {manifest.canvases.length} items
                        </div>
                      </div>

                      {/* Thumbnail preview (first canvas) */}
                      {manifest.canvases[0]?.thumbnail && (
                        <img
                          src={manifest.canvases[0].thumbnail}
                          alt=""
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Target Pane (Right) */}
        <div
          className={`w-80 ${cx.headerBg} rounded-lg border ${cx.border} overflow-hidden flex flex-col`}
        >
          <div
            className={`px-4 py-3 border-b ${cx.border} ${cx.headerBg} flex justify-between items-center`}
          >
            <h3 className={`font-medium ${cx.text}`}>Collections</h3>
            <span className={`text-xs ${cx.textMuted}`}>
              {targetCollections.length}
            </span>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {targetCollections.length === 0 ? (
              <div className={`text-center py-8 ${cx.textMuted}`}>
                <p className="mb-4">No collections yet</p>
                <p className="text-sm">
                  Select manifests on the left and click "Create
                  Collection"
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {targetCollections.map((collection) => (
                  <div
                    key={collection.id}
                    onClick={() => setActiveCollectionId(collection.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      activeCollectionId === collection.id
                        ? `${cx.active} border-current`
                        : `${cx.headerBg} ${cx.border} hover:${cx.surface}`
                    }`}
                  >
                    <div className={`font-medium ${cx.text}`}>
                      {collection.label?.en?.[0] || 'Untitled Collection'}
                    </div>
                    <div className={`text-xs ${cx.textMuted}`}>
                      {collection.items?.length || 0} manifests
                    </div>

                    {/* Add selected button */}
                    {activeCollectionId === collection.id &&
                      selectedSourceIds.length > 0 && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCollection(
                              selectedSourceIds,
                              collection.id
                            );
                            clearSelection();
                          }}
                        >
                          Add {selectedSourceIds.length} to Collection
                        </Button>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Collection Modal */}
      {isCreatingCollection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className={`${cx.surface} rounded-lg shadow-xl p-6 w-96 max-w-[90vw]`}
          >
            <h3 className={`text-lg font-medium mb-4 ${cx.text}`}>
              Create Collection
            </h3>
            <p className={`text-sm ${cx.textMuted} mb-4`}>
              Create a new collection with {selectedSourceIds.length} selected
              manifests
            </p>
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name..."
              className={`w-full px-3 py-2 rounded border ${cx.input} ${cx.border} mb-4`}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsCreatingCollection(false);
                  setNewCollectionName('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim()}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </ViewContainer>
  );
};
