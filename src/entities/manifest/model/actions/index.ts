/**
 * Action-Driven Mutation System with Undo/Redo
 *
 * Implements validated, auditable mutations with full undo/redo support.
 * Actions are dispatched through a reducer that validates changes before
 * applying them to the normalized state.
 *
 * Key features:
 * - Pre-mutation validation
 * - Typed action definitions
 * - Undo/redo history stack
 * - Batch operations
 * - Change event notifications
 *
 * @see ARCHITECTURE_INSPIRATION.md Pattern 4
 */

import type { Action, ActionResult, HistoryEntry } from './types';
import type { NormalizedState } from '../vault';
import {
  IIIFAnnotation,
  IIIFCanvas,
  IIIFItem,
  IIIFRange,
  LanguageMap
} from '@/src/shared/types';
import { provenanceService } from '@/src/shared/services/provenanceService';
import { activityStream } from '@/src/shared/services/activityStream';
import { diffStates, applyPatches } from '@/src/shared/lib/jsonPatch';

import { handleMetadataAction } from './metadata';
import { handleCanvasAction } from './canvas';
import { handleAnnotationAction } from './annotation';
import { handleMovementAction } from './movement';
import { handleTrashAction } from './trash';
import { handleRangeAction } from './range';
import { handleLinkingAction } from './linking';
import { handleBoardAction } from './board';

// Re-export types
export type { Action, ActionResult, HistoryEntry } from './types';

// ============================================================================
// Reducer
// ============================================================================

const handlers = [
  handleMetadataAction,
  handleCanvasAction,
  handleAnnotationAction,
  handleMovementAction,
  handleTrashAction,
  handleRangeAction,
  handleLinkingAction,
  handleBoardAction
];

/**
 * Main reducer - applies validated actions to state
 */
export function reduce(state: NormalizedState, action: Action): ActionResult {
  try {
    for (const handler of handlers) {
      const result = handler(state, action);
      if (result) return result;
    }
    return { success: false, state, error: 'Unknown action type' };
  } catch (e) {
    return {
      success: false,
      state,
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}

// ============================================================================
// Undo/Redo History Manager
// ============================================================================

/** Coalescing window — rapid edits of same type on same entity merge into one entry */
const COALESCE_WINDOW_MS = 500;

export class ActionHistory {
  private history: HistoryEntry[] = [];
  private currentIndex: number = -1;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * Record a new action using patch-based diffing.
   * Coalesces rapid edits of the same action type on the same entity.
   */
  pushPatched(
    action: Action,
    beforeState: NormalizedState,
    afterState: NormalizedState
  ): void {
    // Remove any redo history when new action is pushed
    this.history = this.history.slice(0, this.currentIndex + 1);

    // RELOAD_TREE stores a full snapshot (patch would be enormous)
    if (action.type === 'RELOAD_TREE') {
      this.history.push({
        action,
        forwardPatches: [{ path: ['__full__'], op: 'replace', value: afterState }],
        reversePatches: [{ path: ['__full__'], op: 'replace', value: beforeState }],
        timestamp: Date.now(),
      });
      if (this.history.length > this.maxSize) this.history.shift();
      else this.currentIndex++;
      return;
    }

    // Compute patches
    const { forward, reverse } = diffStates(beforeState, afterState);

    // Extract primary entity ID for coalescing
    const entityId = this.getActionEntityId(action);
    const now = Date.now();

    // Attempt to coalesce with previous entry
    if (
      entityId &&
      this.currentIndex >= 0 &&
      this.history.length > 0
    ) {
      const prev = this.history[this.currentIndex];
      if (
        prev.action.type === action.type &&
        prev.entityId === entityId &&
        now - prev.timestamp < COALESCE_WINDOW_MS
      ) {
        // Merge: keep prev's reversePatches (original undo point), use new forwardPatches
        prev.forwardPatches = forward;
        prev.timestamp = now;
        prev.action = action;
        return;
      }
    }

    // Add new entry
    this.history.push({
      action,
      forwardPatches: forward,
      reversePatches: reverse,
      entityId,
      timestamp: now,
    });

    // Enforce max size
    if (this.history.length > this.maxSize) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  /** @deprecated Use pushPatched() instead */
  push(entry: { action: Action; beforeState: NormalizedState; afterState: NormalizedState }): void {
    this.pushPatched(entry.action, entry.beforeState, entry.afterState);
  }

  private getActionEntityId(action: Action): string | undefined {
    if ('id' in action && typeof (action as Record<string, unknown>).id === 'string') {
      return (action as Record<string, unknown>).id as string;
    }
    if ('canvasId' in action) return (action as { canvasId: string }).canvasId;
    if ('annotationId' in action) return (action as { annotationId: string }).annotationId;
    if ('manifestId' in action) return (action as { manifestId: string }).manifestId;
    return undefined;
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Undo by applying reverse patches to current state
   */
  undoPatched(currentState: NormalizedState): NormalizedState | null {
    if (!this.canUndo()) return null;

    const entry = this.history[this.currentIndex];
    this.currentIndex--;

    // Full snapshot path (RELOAD_TREE)
    if (entry.reversePatches.length === 1 && entry.reversePatches[0].path[0] === '__full__') {
      return entry.reversePatches[0].value as NormalizedState;
    }

    return applyPatches(currentState, entry.reversePatches);
  }

  /**
   * Redo by applying forward patches to current state
   */
  redoPatched(currentState: NormalizedState): NormalizedState | null {
    if (!this.canRedo()) return null;

    this.currentIndex++;
    const entry = this.history[this.currentIndex];

    // Full snapshot path (RELOAD_TREE)
    if (entry.forwardPatches.length === 1 && entry.forwardPatches[0].path[0] === '__full__') {
      return entry.forwardPatches[0].value as NormalizedState;
    }

    return applyPatches(currentState, entry.forwardPatches);
  }

  /** @deprecated Use undoPatched() */
  undo(): NormalizedState | null {
    // Cannot apply patches without current state — caller must use undoPatched()
    return null;
  }

  /** @deprecated Use redoPatched() */
  redo(): NormalizedState | null {
    // Cannot apply patches without current state — caller must use redoPatched()
    return null;
  }

  getStatus(): { position: number; total: number; canUndo: boolean; canRedo: boolean } {
    return {
      position: this.currentIndex + 1,
      total: this.history.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    };
  }

  getRecent(count: number = 10): HistoryEntry[] {
    const start = Math.max(0, this.currentIndex - count + 1);
    return this.history.slice(start, this.currentIndex + 1);
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }
}

// ============================================================================
// Action Dispatcher
// ============================================================================

/**
 * Extract entity IDs that an action will affect.
 * Used for selective re-rendering — components can subscribe
 * to changes for specific entity IDs only.
 */
function getChangedIds(action: Action): Set<string> {
  const ids = new Set<string>();
  if ('id' in action && typeof (action as Record<string, unknown>).id === 'string') {
    ids.add((action as Record<string, unknown>).id as string);
  }
  if ('canvasId' in action) ids.add((action as { canvasId: string }).canvasId);
  if ('manifestId' in action) ids.add((action as { manifestId: string }).manifestId);
  if ('annotationId' in action) ids.add((action as { annotationId: string }).annotationId);
  if ('rangeId' in action) ids.add((action as { rangeId: string }).rangeId);
  if ('pageId' in action) ids.add((action as { pageId: string }).pageId);
  if ('boardId' in action) ids.add((action as { boardId: string }).boardId);
  if ('parentRangeId' in action) ids.add((action as { parentRangeId: string }).parentRangeId);
  if ('itemId' in action) ids.add((action as { itemId: string }).itemId);
  if ('newParentId' in action) ids.add((action as { newParentId: string }).newParentId);
  if (action.type === 'BATCH_UPDATE') {
    for (const u of action.updates) ids.add(u.id);
  }
  if (action.type === 'BATCH_UPDATE_NAV_DATE') {
    for (const u of action.updates) ids.add(u.id);
  }
  if (action.type === 'BATCH_RESTORE') {
    for (const id of action.ids) ids.add(id);
  }
  return ids;
}

export class ActionDispatcher {
  private state: NormalizedState;
  private history: ActionHistory;
  private listeners: Set<(state: NormalizedState, action: Action) => void> = new Set();
  private entityListeners: Set<(state: NormalizedState, changedIds: Set<string>) => void> = new Set();
  private errorListeners: Set<(error: string, action: Action) => void> = new Set();
  /** IDs changed by the most recent dispatch (for selective re-render hooks) */
  lastChangedIds: Set<string> = new Set();

  constructor(initialState: NormalizedState, historySize: number = 100) {
    this.state = initialState;
    this.history = new ActionHistory(historySize);
  }

  /**
   * Dispatch an action with validation
   */
  dispatch(action: Action): boolean {
    const beforeState = this.state;
    const result = reduce(this.state, action);

    if (!result.success) {
      // Notify error listeners
      for (const listener of this.errorListeners) {
        listener(result.error || 'Unknown error', action);
      }
      return false;
    }

    // Update state
    this.state = result.state;

    // Track changed entity IDs
    this.lastChangedIds = action.type === 'RELOAD_TREE'
      ? new Set<string>(['__all__'])
      : getChangedIds(action);

    // Record in history (patch-based)
    this.history.pushPatched(action, beforeState, result.state);

    // Record in provenance (for certain actions)
    if (result.changes && result.changes.length > 0) {
      const id = 'id' in action ? (action as any).id :
                 'canvasId' in action ? (action as any).canvasId :
                 'manifestId' in action ? (action as any).manifestId : null;

      if (id) {
        provenanceService.recordUpdate(id, result.changes, action.type);
      }
    }

    // Record in activity stream (non-blocking)
    this.recordActivity(action).catch(() => {});

    // Notify general listeners
    for (const listener of this.listeners) {
      listener(this.state, action);
    }

    // Notify entity-level listeners
    for (const listener of this.entityListeners) {
      listener(this.state, this.lastChangedIds);
    }

    return true;
  }

  /**
   * Undo last action (patch-based)
   */
  undo(): boolean {
    const previousState = this.history.undoPatched(this.state);
    if (!previousState) return false;

    this.state = previousState;
    this.lastChangedIds = new Set(['__all__']);

    // Notify listeners with synthetic action
    for (const listener of this.listeners) {
      listener(this.state, { type: 'BATCH_UPDATE', updates: [] });
    }
    for (const listener of this.entityListeners) {
      listener(this.state, this.lastChangedIds);
    }

    return true;
  }

  /**
   * Redo previously undone action (patch-based)
   */
  redo(): boolean {
    const nextState = this.history.redoPatched(this.state);
    if (!nextState) return false;

    this.state = nextState;
    this.lastChangedIds = new Set(['__all__']);

    // Notify listeners with synthetic action
    for (const listener of this.listeners) {
      listener(this.state, { type: 'BATCH_UPDATE', updates: [] });
    }
    for (const listener of this.entityListeners) {
      listener(this.state, this.lastChangedIds);
    }

    return true;
  }

  /**
   * Get current state
   */
  getState(): NormalizedState {
    return this.state;
  }

  /**
   * Get history status
   */
  getHistoryStatus() {
    return this.history.getStatus();
  }

  /**
   * Get recent history entries for UI display
   */
  getRecentActions(count: number = 1): HistoryEntry[] {
    return this.history.getRecent(count);
  }

  /**
   * Record an action in the activity stream
   */
  private async recordActivity(action: Action): Promise<void> {
    const entityId =
      ('id' in action && typeof (action as Record<string, unknown>).id === 'string')
        ? (action as Record<string, unknown>).id as string
        : 'canvasId' in action ? (action as { canvasId: string }).canvasId
        : 'manifestId' in action ? (action as { manifestId: string }).manifestId
        : 'annotationId' in action ? (action as { annotationId: string }).annotationId
        : 'unknown';

    const entityType = this.getActivityEntityType(action);
    const summary = this.describeAction(action);

    switch (action.type) {
      case 'ADD_CANVAS':
      case 'ADD_ANNOTATION':
      case 'ADD_RANGE':
      case 'ADD_NESTED_RANGE':
      case 'ADD_CANVAS_TO_RANGE':
      case 'CREATE_ANNOTATION_PAGE':
      case 'CREATE_BOARD':
        await activityStream.recordCreate(entityId, entityType, summary);
        break;
      case 'REMOVE_CANVAS':
      case 'REMOVE_ANNOTATION':
      case 'REMOVE_RANGE':
      case 'REMOVE_CANVAS_FROM_RANGE':
      case 'REMOVE_BOARD_ITEM':
      case 'MOVE_TO_TRASH':
      case 'EMPTY_TRASH':
        await activityStream.recordDelete(entityId, entityType, summary);
        break;
      case 'MOVE_ITEM':
      case 'REORDER_CANVASES':
      case 'REORDER_RANGE_ITEMS':
      case 'MOVE_ANNOTATION_TO_PAGE':
        await activityStream.recordUpdate(entityId, entityType, summary);
        break;
      case 'RESTORE_FROM_TRASH':
      case 'BATCH_RESTORE':
        await activityStream.recordCreate(entityId, entityType, summary);
        break;
      default:
        // All other actions are updates
        if (action.type !== 'RELOAD_TREE') {
          await activityStream.recordUpdate(entityId, entityType, summary);
        }
        break;
    }
  }

  private getActivityEntityType(action: Action): string {
    if ('canvasId' in action) return 'Canvas';
    if ('annotationId' in action) return 'Annotation';
    if ('manifestId' in action) return 'Manifest';
    if ('rangeId' in action || 'parentRangeId' in action) return 'Range';
    if ('pageId' in action) return 'AnnotationPage';
    if ('boardId' in action) return 'Canvas'; // Boards are canvases
    return 'Resource';
  }

  private describeAction(action: Action): string {
    switch (action.type) {
      case 'UPDATE_LABEL': return 'Updated label';
      case 'UPDATE_SUMMARY': return 'Updated summary';
      case 'UPDATE_METADATA': return 'Updated metadata';
      case 'UPDATE_RIGHTS': return 'Updated rights';
      case 'UPDATE_NAV_DATE': return 'Updated navigation date';
      case 'UPDATE_BEHAVIOR': return 'Updated behavior';
      case 'ADD_CANVAS': return 'Added canvas';
      case 'REMOVE_CANVAS': return 'Removed canvas';
      case 'REORDER_CANVASES': return 'Reordered canvases';
      case 'ADD_ANNOTATION': return 'Added annotation';
      case 'REMOVE_ANNOTATION': return 'Removed annotation';
      case 'UPDATE_ANNOTATION': return 'Updated annotation';
      case 'MOVE_ITEM': return 'Moved item';
      case 'BATCH_UPDATE': return `Batch updated ${action.updates.length} items`;
      case 'MOVE_TO_TRASH': return 'Moved to trash';
      case 'RESTORE_FROM_TRASH': return 'Restored from trash';
      case 'EMPTY_TRASH': return 'Emptied trash';
      case 'ADD_RANGE': return 'Added range';
      case 'REMOVE_RANGE': return 'Removed range';
      case 'CREATE_BOARD': return 'Created board';
      default: return `${action.type}`;
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: NormalizedState, action: Action) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe to entity-level changes (for selective re-rendering)
   */
  subscribeEntity(listener: (state: NormalizedState, changedIds: Set<string>) => void): () => void {
    this.entityListeners.add(listener);
    return () => this.entityListeners.delete(listener);
  }

  /**
   * Subscribe to errors
   */
  onError(listener: (error: string, action: Action) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }
}

// ============================================================================
// Action Creators (Convenience Functions)
// ============================================================================

export const actions = {
  updateLabel: (id: string, label: LanguageMap): Action =>
    ({ type: 'UPDATE_LABEL', id, label }),

  updateSummary: (id: string, summary: LanguageMap): Action =>
    ({ type: 'UPDATE_SUMMARY', id, summary }),

  updateMetadata: (id: string, metadata: Array<{ label: LanguageMap; value: LanguageMap }>): Action =>
    ({ type: 'UPDATE_METADATA', id, metadata }),

  updateRights: (id: string, rights: string): Action =>
    ({ type: 'UPDATE_RIGHTS', id, rights }),

  updateNavDate: (id: string, navDate: string | undefined): Action =>
    ({ type: 'UPDATE_NAV_DATE', id, navDate }),

  updateBehavior: (id: string, behavior: string[]): Action =>
    ({ type: 'UPDATE_BEHAVIOR', id, behavior }),

  updateViewingDirection: (id: string, viewingDirection: string): Action =>
    ({ type: 'UPDATE_VIEWING_DIRECTION', id, viewingDirection }),

  addCanvas: (manifestId: string, canvas: IIIFCanvas, index?: number): Action =>
    ({ type: 'ADD_CANVAS', manifestId, canvas, index }),

  removeCanvas: (manifestId: string, canvasId: string): Action =>
    ({ type: 'REMOVE_CANVAS', manifestId, canvasId }),

  reorderCanvases: (manifestId: string, order: string[]): Action =>
    ({ type: 'REORDER_CANVASES', manifestId, order }),

  addAnnotation: (canvasId: string, annotation: IIIFAnnotation): Action =>
    ({ type: 'ADD_ANNOTATION', canvasId, annotation }),

  removeAnnotation: (canvasId: string, annotationId: string): Action =>
    ({ type: 'REMOVE_ANNOTATION', canvasId, annotationId }),

  updateAnnotation: (annotationId: string, updates: Partial<Pick<IIIFAnnotation, 'body' | 'motivation'>>): Action =>
    ({ type: 'UPDATE_ANNOTATION', annotationId, updates }),

  updateCanvasDimensions: (canvasId: string, width: number, height: number): Action =>
    ({ type: 'UPDATE_CANVAS_DIMENSIONS', canvasId, width, height }),

  moveItem: (itemId: string, newParentId: string, index?: number): Action =>
    ({ type: 'MOVE_ITEM', itemId, newParentId, index }),

  batchUpdate: (updates: Array<{ id: string; changes: Partial<IIIFItem> }>): Action =>
    ({ type: 'BATCH_UPDATE', updates }),

  reloadTree: (root: IIIFItem): Action =>
    ({ type: 'RELOAD_TREE', root }),

  // Phase 2: Trash/Restore System Action Creators
  moveToTrash: (id: string, options?: { preserveRelationships?: boolean }): Action =>
    ({ type: 'MOVE_TO_TRASH', id, options }),

  restoreFromTrash: (id: string, options?: { parentId?: string; index?: number }): Action =>
    ({ type: 'RESTORE_FROM_TRASH', id, options }),

  emptyTrash: (): Action =>
    ({ type: 'EMPTY_TRASH' }),

  batchRestore: (ids: string[], options?: { parentId?: string }): Action =>
    ({ type: 'BATCH_RESTORE', ids, options }),

  // Phase 3: Range/Structure Action Creators
  addRange: (manifestId: string, range: IIIFRange, index?: number): Action =>
    ({ type: 'ADD_RANGE', manifestId, range, index }),

  removeRange: (manifestId: string, rangeId: string): Action =>
    ({ type: 'REMOVE_RANGE', manifestId, rangeId }),

  addCanvasToRange: (rangeId: string, canvasId: string, index?: number): Action =>
    ({ type: 'ADD_CANVAS_TO_RANGE', rangeId, canvasId, index }),

  removeCanvasFromRange: (rangeId: string, canvasId: string): Action =>
    ({ type: 'REMOVE_CANVAS_FROM_RANGE', rangeId, canvasId }),

  reorderRangeItems: (rangeId: string, order: string[]): Action =>
    ({ type: 'REORDER_RANGE_ITEMS', rangeId, order }),

  addNestedRange: (parentRangeId: string, range: IIIFRange, index?: number): Action =>
    ({ type: 'ADD_NESTED_RANGE', parentRangeId, range, index }),

  // Phase 4: IIIF Presentation API 3.0 Feature Action Creators
  createAnnotationPage: (canvasId: string, label?: LanguageMap, motivation?: string): Action =>
    ({ type: 'CREATE_ANNOTATION_PAGE', canvasId, label, motivation }),

  updateAnnotationPageLabel: (pageId: string, label: LanguageMap): Action =>
    ({ type: 'UPDATE_ANNOTATION_PAGE_LABEL', pageId, label }),

  moveAnnotationToPage: (annotationId: string, targetPageId: string): Action =>
    ({ type: 'MOVE_ANNOTATION_TO_PAGE', annotationId, targetPageId }),

  setAnnotationPageBehavior: (pageId: string, behavior: string[]): Action =>
    ({ type: 'SET_ANNOTATION_PAGE_BEHAVIOR', pageId, behavior }),

  updateLinkingProperty: (id: string, property: 'rendering' | 'seeAlso' | 'homepage' | 'provider', value: unknown[]): Action =>
    ({ type: 'UPDATE_LINKING_PROPERTY', id, property, value }),

  updateRequiredStatement: (id: string, requiredStatement: { label: LanguageMap; value: LanguageMap } | undefined): Action =>
    ({ type: 'UPDATE_REQUIRED_STATEMENT', id, requiredStatement }),

  batchUpdateNavDate: (updates: Array<{ id: string; navDate: string }>): Action =>
    ({ type: 'BATCH_UPDATE_NAV_DATE', updates }),

  updateStart: (id: string, start: { id: string; type: 'Canvas' | 'SpecificResource'; source?: string; selector?: unknown } | undefined): Action =>
    ({ type: 'UPDATE_START', id, start }),

  updateRangeSupplementary: (rangeId: string, supplementary: { id: string; type: 'AnnotationCollection' } | undefined): Action =>
    ({ type: 'UPDATE_RANGE_SUPPLEMENTARY', rangeId, supplementary }),

  // Phase 5: Board Design Action Creators
  createBoard: (boardId: string, title: string, behavior?: string[]): Action =>
    ({ type: 'CREATE_BOARD', boardId, title, behavior }),

  updateBoardItemPosition: (annotationId: string, surfaceCanvasId: string, x: number, y: number, w: number, h: number): Action =>
    ({ type: 'UPDATE_BOARD_ITEM_POSITION', annotationId, surfaceCanvasId, x, y, w, h }),

  removeBoardItem: (annotationId: string, surfaceCanvasId: string): Action =>
    ({ type: 'REMOVE_BOARD_ITEM', annotationId, surfaceCanvasId }),
};

// ============================================================================
// Test API - Factory Functions and Aliases
// ============================================================================

/**
 * Factory function to create ActionHistory instance
 * @param options Configuration options
 * @returns New ActionHistory instance
 */
export function createActionHistory(options?: { maxSize?: number }): ActionHistory {
  return new ActionHistory(options?.maxSize);
}

/**
 * Validate an action before execution
 * @param action Action to validate
 * @returns Validation result with valid flag and optional error
 */
export function validateAction(action: Action): { valid: boolean; error?: string } {
  // Create a temporary empty state for validation
  const tempState: NormalizedState = {
    entities: {
      Collection: {},
      Manifest: {},
      Canvas: {},
      Range: {},
      AnnotationPage: {},
      Annotation: {}
    },
    references: {},
    reverseRefs: {},
    collectionMembers: {},
    memberOfCollections: {},
    rootId: null,
    typeIndex: {},
    extensions: {},
    trashedEntities: {}
  };

  try {
    const result = reduce(tempState, action);
    return { valid: !result.error, error: result.error };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Execute an action on state
 * Alias for reduce() to match test expectations
 */
export const executeAction = reduce;
