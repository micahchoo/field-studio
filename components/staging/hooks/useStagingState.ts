
import { useCallback, useMemo, useState } from 'react';
import {
  ArchiveCollection,
  ArchiveLayout,
  SourceManifest,
  SourceManifests,
  StagingState
} from '../../../types';
import {
  addManifestsToCollection,
  createCollection,
  createInitialArchiveLayout,
  deleteCollection,
  findManifest,
  getAllCollections,
  moveCollection,
  removeManifestsFromCollection,
  renameCollection,
  updateCanvasOrder
} from '../../../services/stagingService';

export interface UseStagingStateReturn {
  state: StagingState;

  // Selection
  selectedIds: string[];
  toggleSelection: (id: string) => void;
  selectRange: (fromId: string, toId: string, allIds: string[]) => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;

  // Focus
  focusedPane: 'source' | 'archive';
  setFocusedPane: (pane: 'source' | 'archive') => void;

  // Collection operations
  createNewCollection: (name: string, parentId?: string | null) => string;
  addToCollection: (collectionId: string, manifestIds?: string[]) => void;
  removeFromCollection: (collectionId: string, manifestIds: string[]) => void;
  renameCollectionAction: (collectionId: string, newName: string) => void;
  deleteCollectionAction: (collectionId: string) => void;
  moveCollectionAction: (collectionId: string, newParentId: string) => void;

  // Canvas reordering
  reorderCanvases: (manifestId: string, newOrder: string[]) => void;

  // Getters
  getManifest: (id: string) => SourceManifest | undefined;
  getCollection: (id: string) => ArchiveCollection | undefined;
  getAllCollectionsList: () => ArchiveCollection[];
  unassignedManifests: SourceManifest[];
  hasUnassigned: boolean;

  // Archive layout for export
  archiveLayout: ArchiveLayout;
  sourceManifests: SourceManifests;
}

export function useStagingState(initialSourceManifests: SourceManifests): UseStagingStateReturn {
  const [sourceManifests, setSourceManifests] = useState<SourceManifests>(initialSourceManifests);
  const [archiveLayout, setArchiveLayout] = useState<ArchiveLayout>(() =>
    createInitialArchiveLayout(initialSourceManifests)
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedPane, setFocusedPane] = useState<'source' | 'archive'>('source');

  // Selection operations
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectRange = useCallback((fromId: string, toId: string, allIds: string[]) => {
    const fromIndex = allIds.indexOf(fromId);
    const toIndex = allIds.indexOf(toId);
    if (fromIndex === -1 || toIndex === -1) return;

    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    const rangeIds = allIds.slice(start, end + 1);

    setSelectedIds(prev => {
      const next = new Set(prev);
      rangeIds.forEach(id => next.add(id));
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  // Collection operations
  const createNewCollection = useCallback((name: string, parentId?: string | null): string => {
    const { layout, newCollectionId } = createCollection(archiveLayout, parentId || null, name);
    setArchiveLayout(layout);
    return newCollectionId;
  }, [archiveLayout]);

  const addToCollection = useCallback((collectionId: string, manifestIds?: string[]) => {
    const idsToAdd = manifestIds || Array.from(selectedIds);
    if (idsToAdd.length === 0) return;

    setArchiveLayout(prev => addManifestsToCollection(prev, collectionId, idsToAdd));
    if (!manifestIds) {
      clearSelection();
    }
  }, [selectedIds, clearSelection]);

  const removeFromCollection = useCallback((collectionId: string, manifestIds: string[]) => {
    setArchiveLayout(prev => removeManifestsFromCollection(prev, collectionId, manifestIds));
  }, []);

  const renameCollectionAction = useCallback((collectionId: string, newName: string) => {
    setArchiveLayout(prev => renameCollection(prev, collectionId, newName));
  }, []);

  const deleteCollectionAction = useCallback((collectionId: string) => {
    setArchiveLayout(prev => deleteCollection(prev, collectionId));
  }, []);

  const moveCollectionAction = useCallback((collectionId: string, newParentId: string) => {
    setArchiveLayout(prev => moveCollection(prev, collectionId, newParentId));
  }, []);

  // Canvas reordering
  const reorderCanvases = useCallback((manifestId: string, newOrder: string[]) => {
    setSourceManifests(prev => updateCanvasOrder(prev, manifestId, newOrder));
  }, []);

  // Getters
  const getManifest = useCallback((id: string): SourceManifest | undefined => {
    return findManifest(sourceManifests, id);
  }, [sourceManifests]);

  const getCollection = useCallback((id: string): ArchiveCollection | undefined => {
    const all = getAllCollections(archiveLayout);
    return all.find(c => c.id === id);
  }, [archiveLayout]);

  const getAllCollectionsList = useCallback((): ArchiveCollection[] => {
    return getAllCollections(archiveLayout);
  }, [archiveLayout]);

  const unassignedManifests = useMemo((): SourceManifest[] => {
    return archiveLayout.unassignedManifests
      .map(id => findManifest(sourceManifests, id))
      .filter((m): m is SourceManifest => m !== undefined);
  }, [archiveLayout.unassignedManifests, sourceManifests]);

  const hasUnassigned = useMemo(() => {
    return archiveLayout.unassignedManifests.length > 0;
  }, [archiveLayout.unassignedManifests]);

  // Compose state object
  const state: StagingState = useMemo(() => ({
    sourceManifests,
    archiveLayout,
    selectedIds,
    focusedPane
  }), [sourceManifests, archiveLayout, selectedIds, focusedPane]);

  return {
    state,

    // Selection
    selectedIds: Array.from(selectedIds),
    toggleSelection,
    selectRange,
    clearSelection,
    selectAll,

    // Focus
    focusedPane,
    setFocusedPane,

    // Collection operations
    createNewCollection,
    addToCollection,
    removeFromCollection,
    renameCollectionAction,
    deleteCollectionAction,
    moveCollectionAction,

    // Canvas reordering
    reorderCanvases,

    // Getters
    getManifest,
    getCollection,
    getAllCollectionsList,
    unassignedManifests,
    hasUnassigned,

    // Direct access
    archiveLayout,
    sourceManifests
  };
}
