/**
 * React Hooks for IIIF Entity Management
 *
 * Provides React integration with the Vault normalized state management system.
 * Hooks are type-safe and provide convenient access to entities with automatic
 * re-rendering on state changes.
 *
 * Usage:
 * 1. Wrap app with VaultProvider
 * 2. Use hooks like useManifest, useCanvas, etc. to access entities
 * 3. Use useHistory for undo/redo controls
 *
 * @see services/vault.ts for state management
 * @see services/actions.ts for action dispatch
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import {
  Vault,
  NormalizedState,
  getEntity,
  getEntityType,
  getParentId,
  getChildIds,
  getEntitiesByType,
  denormalize,
  normalize,
  createEmptyState,
  EntityType
} from '../services/vault';
import {
  ActionDispatcher,
  ActionHistory,
  Action,
  actions
} from '../services/actions';
import {
  IIIFItem,
  IIIFCollection,
  IIIFManifest,
  IIIFCanvas,
  IIIFRange,
  IIIFAnnotation,
  IIIFAnnotationPage,
  LanguageMap,
  LanguageString,
  isManifest,
  isCollection
} from '../types';

// ============================================================================
// Context Types
// ============================================================================

interface VaultContextValue {
  /** Current normalized state */
  state: NormalizedState;

  /** Action dispatcher for mutations */
  dispatcher: ActionDispatcher;

  /** Get entity by ID */
  getEntity: (id: string) => IIIFItem | null;

  /** Dispatch an action */
  dispatch: (action: Action) => boolean;

  /** Undo last action */
  undo: () => boolean;

  /** Redo previously undone action */
  redo: () => boolean;

  /** Check if undo is available */
  canUndo: boolean;

  /** Check if redo is available */
  canRedo: boolean;

  /** Load a new root item */
  loadRoot: (root: IIIFItem) => void;

  /** Export as nested IIIF tree */
  exportRoot: () => IIIFItem | null;

  /** Get root ID */
  rootId: string | null;
}

// ============================================================================
// Context and Provider
// ============================================================================

const VaultContext = createContext<VaultContextValue | null>(null);

interface VaultProviderProps {
  children: ReactNode;
  initialRoot?: IIIFItem | null;
  historySize?: number;
}

export const VaultProvider: React.FC<VaultProviderProps> = ({
  children,
  initialRoot = null,
  historySize = 100
}) => {
  // Initialize state
  const [state, setState] = useState<NormalizedState>(() =>
    initialRoot ? normalize(initialRoot) : createEmptyState()
  );

  // Create dispatcher (stable reference)
  const [dispatcher] = useState(() =>
    new ActionDispatcher(state, historySize)
  );

  // Track undo/redo status
  const [undoRedoStatus, setUndoRedoStatus] = useState({
    canUndo: false,
    canRedo: false
  });

  // Subscribe to dispatcher changes
  useEffect(() => {
    const unsubscribe = dispatcher.subscribe((newState) => {
      setState(newState);
      const status = dispatcher.getHistoryStatus();
      setUndoRedoStatus({
        canUndo: status.canUndo,
        canRedo: status.canRedo
      });
    });

    return unsubscribe;
  }, [dispatcher]);

  // Sync dispatcher state when initialRoot changes
  useEffect(() => {
    if (initialRoot) {
      const normalized = normalize(initialRoot);
      setState(normalized);
      // Note: This doesn't reset the dispatcher, which maintains its own state
      // For a full reset, create a new dispatcher
    }
  }, [initialRoot]);

  // Stable actions - defined in dependency order to avoid TDZ issues
  const dispatchAction = useCallback((action: Action) => dispatcher.dispatch(action), [dispatcher]);
  const undo = useCallback(() => dispatcher.undo(), [dispatcher]);
  const redo = useCallback(() => dispatcher.redo(), [dispatcher]);

  // loadRoot directly normalizes and dispatches - avoids circular dependency issues
  const loadRoot = useCallback((root: IIIFItem) => {
    // Normalize the tree first
    const normalized = normalize(root);
    // Then dispatch RELOAD_TREE to properly sync the vault state
    // This ensures the typeIndex is fully rebuilt and all IDs are correctly indexed
    dispatcher.dispatch(actions.reloadTree(root));
  }, [dispatcher]);

  // Memoized context value
  const contextValue = useMemo<VaultContextValue>(() => ({
    state,
    dispatcher,
    getEntity: (id: string) => getEntity(state, id),
    dispatch: dispatchAction,
    undo,
    redo,
    canUndo: undoRedoStatus.canUndo,
    canRedo: undoRedoStatus.canRedo,
    loadRoot,
    exportRoot: () => denormalize(state),
    rootId: state.rootId
  }), [state, dispatcher, undoRedoStatus, loadRoot, dispatchAction, undo, redo]);

  return (
    <VaultContext.Provider value={contextValue}>
      {children}
    </VaultContext.Provider>
  );
};

// ============================================================================
// Base Hook
// ============================================================================

/**
 * Access the vault context
 */
export function useVault(): VaultContextValue {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}

/**
 * Use vault context optionally (returns null if not in provider)
 */
export function useVaultOptional(): VaultContextValue | null {
  return useContext(VaultContext);
}

// ============================================================================
// Entity Hooks
// ============================================================================

/**
 * Hook for accessing any IIIF entity by ID
 */
export function useEntity<T extends IIIFItem = IIIFItem>(id: string | null): {
  entity: T | null;
  type: EntityType | null;
  parentId: string | null;
  childIds: string[];
  update: (updates: Partial<T>) => boolean;
} {
  const { state, dispatch } = useVault();

  const entity = id ? getEntity(state, id) as T | null : null;
  const type = id ? getEntityType(state, id) : null;
  const parentId = id ? getParentId(state, id) : null;
  const childIds = id ? getChildIds(state, id) : [];

  const update = useCallback((updates: Partial<T>) => {
    if (!id) return false;
    return dispatch(actions.batchUpdate([{ id, changes: updates as Partial<IIIFItem> }]));
  }, [id, dispatch]);

  return { entity, type, parentId, childIds, update };
}

/**
 * Hook for Manifest entities
 */
export function useManifest(id: string | null) {
  const { state, dispatch } = useVault();

  const manifest = id ? getEntity(state, id) as IIIFManifest | null : null;
  const canvasIds = id ? getChildIds(state, id).filter(
    cid => getEntityType(state, cid) === 'Canvas'
  ) : [];

  const canvases = useMemo(() =>
    canvasIds.map(cid => getEntity(state, cid) as IIIFCanvas).filter(Boolean),
    [state, canvasIds]
  );

  // Label as LanguageString
  const label = useMemo(() =>
    manifest?.label ? new LanguageString(manifest.label) : null,
    [manifest?.label]
  );

  // Actions
  const updateLabel = useCallback((newLabel: LanguageMap) => {
    if (!id) return false;
    return dispatch(actions.updateLabel(id, newLabel));
  }, [id, dispatch]);

  const updateSummary = useCallback((summary: LanguageMap) => {
    if (!id) return false;
    return dispatch(actions.updateSummary(id, summary));
  }, [id, dispatch]);

  const addCanvas = useCallback((canvas: IIIFCanvas, index?: number) => {
    if (!id) return false;
    return dispatch(actions.addCanvas(id, canvas, index));
  }, [id, dispatch]);

  const removeCanvas = useCallback((canvasId: string) => {
    if (!id) return false;
    return dispatch(actions.removeCanvas(id, canvasId));
  }, [id, dispatch]);

  const reorderCanvases = useCallback((order: string[]) => {
    if (!id) return false;
    return dispatch(actions.reorderCanvases(id, order));
  }, [id, dispatch]);

  const updateBehavior = useCallback((behavior: string[]) => {
    if (!id) return false;
    return dispatch(actions.updateBehavior(id, behavior));
  }, [id, dispatch]);

  return {
    manifest,
    label,
    canvases,
    canvasIds,
    updateLabel,
    updateSummary,
    addCanvas,
    removeCanvas,
    reorderCanvases,
    updateBehavior
  };
}

/**
 * Hook for Canvas entities
 */
export function useCanvas(id: string | null) {
  const { state, dispatch } = useVault();

  const canvas = id ? getEntity(state, id) as IIIFCanvas | null : null;

  // Get painting annotations
  const annotationPageIds = id ? getChildIds(state, id).filter(
    pid => getEntityType(state, pid) === 'AnnotationPage'
  ) : [];

  const paintings = useMemo(() => {
    const annotations: IIIFAnnotation[] = [];
    for (const pageId of annotationPageIds) {
      const annoIds = getChildIds(state, pageId);
      for (const annoId of annoIds) {
        const anno = getEntity(state, annoId) as IIIFAnnotation;
        if (anno?.motivation === 'painting') {
          annotations.push(anno);
        }
      }
    }
    return annotations;
  }, [state, annotationPageIds]);

  // Label as LanguageString
  const label = useMemo(() =>
    canvas?.label ? new LanguageString(canvas.label) : null,
    [canvas?.label]
  );

  // Dimensions
  const dimensions = useMemo(() =>
    canvas ? { width: canvas.width, height: canvas.height } : null,
    [canvas?.width, canvas?.height]
  );

  // Actions
  const updateDimensions = useCallback((width: number, height: number) => {
    if (!id) return false;
    return dispatch(actions.updateCanvasDimensions(id, width, height));
  }, [id, dispatch]);

  const updateLabel = useCallback((newLabel: LanguageMap) => {
    if (!id) return false;
    return dispatch(actions.updateLabel(id, newLabel));
  }, [id, dispatch]);

  const addAnnotation = useCallback((annotation: IIIFAnnotation) => {
    if (!id) return false;
    return dispatch(actions.addAnnotation(id, annotation));
  }, [id, dispatch]);

  const removeAnnotation = useCallback((annotationId: string) => {
    if (!id) return false;
    return dispatch(actions.removeAnnotation(id, annotationId));
  }, [id, dispatch]);

  return {
    canvas,
    label,
    dimensions,
    paintings,
    updateDimensions,
    updateLabel,
    addAnnotation,
    removeAnnotation
  };
}

/**
 * Hook for Annotation entities
 */
export function useAnnotation(id: string | null) {
  const { state, dispatch } = useVault();

  const annotation = id ? getEntity(state, id) as IIIFAnnotation | null : null;

  // Extract motivation
  const motivation = annotation?.motivation || null;

  // Extract body text (if textual)
  const bodyText = useMemo(() => {
    if (!annotation?.body) return null;
    const body = Array.isArray(annotation.body) ? annotation.body[0] : annotation.body;
    if (body && typeof body === 'object' && 'value' in body) {
      return body.value;
    }
    return null;
  }, [annotation?.body]);

  // Extract target
  const target = annotation?.target || null;

  const update = useCallback((updates: Partial<IIIFAnnotation>) => {
    if (!id) return false;
    return dispatch(actions.batchUpdate([{ id, changes: updates as Partial<IIIFItem> }]));
  }, [id, dispatch]);

  return {
    annotation,
    motivation,
    bodyText,
    target,
    update
  };
}

/**
 * Hook for Collection entities
 */
export function useCollection(id: string | null) {
  const { state, dispatch } = useVault();

  const collection = id ? getEntity(state, id) as IIIFCollection | null : null;
  const childIds = id ? getChildIds(state, id) : [];

  const children = useMemo(() =>
    childIds.map(cid => getEntity(state, cid) as IIIFItem).filter(Boolean),
    [state, childIds]
  );

  const manifests = useMemo(() =>
    children.filter(isManifest),
    [children]
  );

  const subCollections = useMemo(() =>
    children.filter(isCollection),
    [children]
  );

  const label = useMemo(() =>
    collection?.label ? new LanguageString(collection.label) : null,
    [collection?.label]
  );

  const updateLabel = useCallback((newLabel: LanguageMap) => {
    if (!id) return false;
    return dispatch(actions.updateLabel(id, newLabel));
  }, [id, dispatch]);

  return {
    collection,
    label,
    children,
    manifests,
    subCollections,
    childIds,
    updateLabel
  };
}

/**
 * Hook for Range entities
 */
export function useRange(id: string | null) {
  const { state, dispatch } = useVault();

  const range = id ? getEntity(state, id) as IIIFRange | null : null;
  const childIds = id ? getChildIds(state, id) : [];

  const label = useMemo(() =>
    range?.label ? new LanguageString(range.label) : null,
    [range?.label]
  );

  const updateLabel = useCallback((newLabel: LanguageMap) => {
    if (!id) return false;
    return dispatch(actions.updateLabel(id, newLabel));
  }, [id, dispatch]);

  return {
    range,
    label,
    childIds,
    updateLabel
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for undo/redo controls
 */
export function useHistory() {
  const { undo, redo, canUndo, canRedo, dispatcher } = useVault();

  const status = useMemo(() =>
    dispatcher.getHistoryStatus(),
    [dispatcher]
  );

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    position: status.position,
    total: status.total
  };
}

/**
 * Hook for accessing root entity
 */
export function useRoot() {
  const { state, rootId, loadRoot, exportRoot, dispatch } = useVault();

  const root = rootId ? getEntity(state, rootId) : null;
  const rootType = rootId ? getEntityType(state, rootId) : null;

  /**
   * Reload the vault from a modified tree (e.g., after healing).
   * This re-normalizes the entire tree and rebuilds the typeIndex.
   * Use this instead of individual entity updates when IDs might have changed
   * or when healing has modified multiple entities.
   */
  const reloadTree = useCallback((modifiedRoot: IIIFItem) => {
    return dispatch(actions.reloadTree(modifiedRoot));
  }, [dispatch]);

  return {
    root,
    rootId,
    rootType,
    loadRoot,
    exportRoot,
    reloadTree
  };
}

/**
 * Hook for bulk operations
 */
export function useBulkOperations() {
  const { dispatch } = useVault();

  const batchUpdate = useCallback((
    updates: Array<{ id: string; changes: Partial<IIIFItem> }>
  ) => {
    return dispatch(actions.batchUpdate(updates));
  }, [dispatch]);

  const updateMultipleLabels = useCallback((
    items: Array<{ id: string; label: LanguageMap }>
  ) => {
    const updates = items.map(({ id, label }) => ({
      id,
      changes: { label }
    }));
    return dispatch(actions.batchUpdate(updates));
  }, [dispatch]);

  return {
    batchUpdate,
    updateMultipleLabels
  };
}

/**
 * Hook for searching entities
 */
export function useEntitySearch() {
  const { state } = useVault();

  const searchByType = useCallback(<T extends IIIFItem>(type: EntityType): T[] => {
    return getEntitiesByType<T>(state, type);
  }, [state]);

  const searchByLabel = useCallback((query: string, types?: EntityType[]): IIIFItem[] => {
    const results: IIIFItem[] = [];
    const queryLower = query.toLowerCase();

    const typesToSearch = types || ['Collection', 'Manifest', 'Canvas', 'Range'] as EntityType[];

    for (const type of typesToSearch) {
      const entities = getEntitiesByType<IIIFItem>(state, type);
      for (const entity of entities) {
        if (entity.label) {
          const labelStr = new LanguageString(entity.label);
          const labelText = labelStr.get();
          if (labelText.toLowerCase().includes(queryLower)) {
            results.push(entity);
          }
        }
      }
    }

    return results;
  }, [state]);

  return {
    searchByType,
    searchByLabel
  };
}

/**
 * Hook for keyboard shortcuts (undo/redo)
 */
export function useUndoRedoShortcuts() {
  const { undo, redo, canUndo, canRedo } = useHistory();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl + Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          // Redo: Cmd/Ctrl + Shift + Z
          if (canRedo) {
            e.preventDefault();
            redo();
          }
        } else {
          // Undo: Cmd/Ctrl + Z
          if (canUndo) {
            e.preventDefault();
            undo();
          }
        }
      }
      // Also support Cmd/Ctrl + Y for redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        if (canRedo) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);
}
