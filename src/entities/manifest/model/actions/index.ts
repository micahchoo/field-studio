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
