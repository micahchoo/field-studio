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

import {
  NormalizedState,
  updateEntity,
  addEntity,
  removeEntity,
  moveEntity,
  reorderChildren,
  getEntity,
  VaultSnapshot
} from './vault';
import {
  IIIFItem,
  IIIFCanvas,
  IIIFManifest,
  IIIFAnnotation,
  LanguageMap
} from '../types';
import { provenanceService, PropertyChange } from './provenanceService';
import {
  isValidChildType,
  getRelationshipType,
  getValidChildTypes
} from '../utils/iiifHierarchy';
import {
  validateBehaviors as centralizedValidateBehaviors,
  findBehaviorConflicts,
  isValidViewingDirection,
  isValidNavDate
} from '../utils';

// ============================================================================
// Action Types
// ============================================================================

export type Action =
  | { type: 'UPDATE_LABEL'; id: string; label: LanguageMap }
  | { type: 'UPDATE_SUMMARY'; id: string; summary: LanguageMap }
  | { type: 'UPDATE_METADATA'; id: string; metadata: Array<{ label: LanguageMap; value: LanguageMap }> }
  | { type: 'UPDATE_RIGHTS'; id: string; rights: string }
  | { type: 'UPDATE_NAV_DATE'; id: string; navDate: string | undefined }
  | { type: 'UPDATE_BEHAVIOR'; id: string; behavior: string[] }
  | { type: 'UPDATE_VIEWING_DIRECTION'; id: string; viewingDirection: string }
  | { type: 'ADD_CANVAS'; manifestId: string; canvas: IIIFCanvas; index?: number }
  | { type: 'REMOVE_CANVAS'; manifestId: string; canvasId: string }
  | { type: 'REORDER_CANVASES'; manifestId: string; order: string[] }
  | { type: 'ADD_ANNOTATION'; canvasId: string; annotation: IIIFAnnotation }
  | { type: 'REMOVE_ANNOTATION'; canvasId: string; annotationId: string }
  | { type: 'UPDATE_CANVAS_DIMENSIONS'; canvasId: string; width: number; height: number }
  | { type: 'MOVE_ITEM'; itemId: string; newParentId: string; index?: number }
  | { type: 'BATCH_UPDATE'; updates: Array<{ id: string; changes: Partial<IIIFItem> }> };

export interface ActionResult {
  success: boolean;
  state: NormalizedState;
  error?: string;
  changes?: PropertyChange[];
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a language map structure
 */
function validateLanguageMap(label: LanguageMap | undefined, fieldName: string): string | null {
  if (!label) return null; // undefined is OK for optional fields

  if (typeof label !== 'object') {
    return `${fieldName} must be an object`;
  }

  for (const [locale, values] of Object.entries(label)) {
    if (!Array.isArray(values)) {
      return `${fieldName}["${locale}"] must be an array`;
    }
    for (const value of values) {
      if (typeof value !== 'string') {
        return `${fieldName}["${locale}"] must contain only strings`;
      }
    }
  }

  return null;
}

/**
 * IIIF 3.0 Behavior Validation
 *
 * Uses centralized behavior validation from utils/iiifBehaviors.ts
 * which implements the complete IIIF Presentation API 3.0 specification.
 */
function validateBehavior(behavior: string[], entityType: string): string | null {
  // Use centralized behavior validation
  const validationResult = centralizedValidateBehaviors(entityType, behavior);

  // Return first error if any
  if (validationResult.errors.length > 0) {
    return validationResult.errors[0];
  }

  // Check for disjoint set conflicts using centralized utility
  const conflicts = findBehaviorConflicts(behavior);
  if (conflicts.length > 0) {
    return conflicts[0];
  }

  return null;
}

/**
 * Validate canvas dimensions
 */
function validateCanvasDimensions(width: number, height: number): string | null {
  if (typeof width !== 'number' || width <= 0) {
    return 'Canvas width must be a positive number';
  }
  if (typeof height !== 'number' || height <= 0) {
    return 'Canvas height must be a positive number';
  }
  return null;
}

// ============================================================================
// Reducer
// ============================================================================

/**
 * Main reducer - applies validated actions to state
 */
export function reduce(state: NormalizedState, action: Action): ActionResult {
  try {
    switch (action.type) {
      case 'UPDATE_LABEL': {
        const error = validateLanguageMap(action.label, 'label');
        if (error) return { success: false, state, error };

        const entity = getEntity(state, action.id);
        const changes: PropertyChange[] = [{
          property: 'label',
          oldValue: entity?.label,
          newValue: action.label
        }];

        return {
          success: true,
          state: updateEntity(state, action.id, { label: action.label }),
          changes
        };
      }

      case 'UPDATE_SUMMARY': {
        const error = validateLanguageMap(action.summary, 'summary');
        if (error) return { success: false, state, error };

        const entity = getEntity(state, action.id);
        const changes: PropertyChange[] = [{
          property: 'summary',
          oldValue: entity?.summary,
          newValue: action.summary
        }];

        return {
          success: true,
          state: updateEntity(state, action.id, { summary: action.summary }),
          changes
        };
      }

      case 'UPDATE_METADATA': {
        // Validate each metadata entry
        for (let i = 0; i < action.metadata.length; i++) {
          const entry = action.metadata[i];
          const labelError = validateLanguageMap(entry.label, `metadata[${i}].label`);
          if (labelError) return { success: false, state, error: labelError };
          const valueError = validateLanguageMap(entry.value, `metadata[${i}].value`);
          if (valueError) return { success: false, state, error: valueError };
        }

        const entity = getEntity(state, action.id);
        const changes: PropertyChange[] = [{
          property: 'metadata',
          oldValue: entity?.metadata,
          newValue: action.metadata
        }];

        return {
          success: true,
          state: updateEntity(state, action.id, { metadata: action.metadata }),
          changes
        };
      }

      case 'UPDATE_RIGHTS': {
        // Validate rights URL format
        if (action.rights && !action.rights.startsWith('http')) {
          return { success: false, state, error: 'Rights must be a valid URL' };
        }

        const entity = getEntity(state, action.id);
        const changes: PropertyChange[] = [{
          property: 'rights',
          oldValue: entity?.rights,
          newValue: action.rights
        }];

        return {
          success: true,
          state: updateEntity(state, action.id, { rights: action.rights }),
          changes
        };
      }

      case 'UPDATE_NAV_DATE': {
        // Use centralized navDate validation
        if (action.navDate && !isValidNavDate(action.navDate)) {
          return { success: false, state, error: 'navDate must be a valid ISO 8601 date-time' };
        }

        const entity = getEntity(state, action.id);
        const changes: PropertyChange[] = [{
          property: 'navDate',
          oldValue: entity?.navDate,
          newValue: action.navDate
        }];

        return {
          success: true,
          state: updateEntity(state, action.id, { navDate: action.navDate }),
          changes
        };
      }

      case 'UPDATE_BEHAVIOR': {
        const entity = getEntity(state, action.id);
        if (!entity) {
          return { success: false, state, error: `Entity not found: ${action.id}` };
        }

        const error = validateBehavior(action.behavior, entity.type);
        if (error) return { success: false, state, error };

        const changes: PropertyChange[] = [{
          property: 'behavior',
          oldValue: entity.behavior,
          newValue: action.behavior
        }];

        return {
          success: true,
          state: updateEntity(state, action.id, { behavior: action.behavior }),
          changes
        };
      }

      case 'UPDATE_VIEWING_DIRECTION': {
        // Use centralized viewingDirection validation
        if (!isValidViewingDirection(action.viewingDirection)) {
          return {
            success: false,
            state,
            error: `Invalid viewing direction: ${action.viewingDirection}. Must be: left-to-right, right-to-left, top-to-bottom, or bottom-to-top`
          };
        }

        const entity = getEntity(state, action.id);
        const oldViewingDirection = entity && 'viewingDirection' in entity
          ? (entity as IIIFManifest).viewingDirection
          : undefined;
        const changes: PropertyChange[] = [{
          property: 'viewingDirection',
          oldValue: oldViewingDirection,
          newValue: action.viewingDirection
        }];

        return {
          success: true,
          state: updateEntity(state, action.id, { viewingDirection: action.viewingDirection } as Partial<IIIFManifest>),
          changes
        };
      }

      case 'UPDATE_CANVAS_DIMENSIONS': {
        const error = validateCanvasDimensions(action.width, action.height);
        if (error) return { success: false, state, error };

        const canvas = getEntity(state, action.canvasId) as IIIFCanvas;
        const changes: PropertyChange[] = [
          { property: 'width', oldValue: canvas?.width, newValue: action.width },
          { property: 'height', oldValue: canvas?.height, newValue: action.height }
        ];

        return {
          success: true,
          state: updateEntity(state, action.canvasId, {
            width: action.width,
            height: action.height
          } as Partial<IIIFCanvas>),
          changes
        };
      }

      case 'ADD_CANVAS': {
        // Validate canvas
        if (!action.canvas.id) {
          return { success: false, state, error: 'Canvas must have an id' };
        }

        const dimError = validateCanvasDimensions(action.canvas.width, action.canvas.height);
        if (dimError) return { success: false, state, error: dimError };

        let newState = addEntity(state, action.canvas as IIIFItem, action.manifestId);

        // Handle index positioning
        if (typeof action.index === 'number') {
          const children = [...(state.references[action.manifestId] || [])];
          const newId = action.canvas.id;
          // Remove from end (where addEntity put it) and insert at index
          const filtered = children.filter(id => id !== newId);
          filtered.splice(action.index, 0, newId);
          newState = reorderChildren(newState, action.manifestId, filtered);
        }

        return {
          success: true,
          state: newState,
          changes: [{ property: 'items', oldValue: null, newValue: action.canvas.id }]
        };
      }

      case 'REMOVE_CANVAS': {
        return {
          success: true,
          state: removeEntity(state, action.canvasId),
          changes: [{ property: 'items', oldValue: action.canvasId, newValue: null }]
        };
      }

      case 'REORDER_CANVASES': {
        // Validate that all IDs exist in current children
        const currentChildren = state.references[action.manifestId] || [];
        const currentSet = new Set(currentChildren);
        const newSet = new Set(action.order);

        if (currentChildren.length !== action.order.length) {
          return { success: false, state, error: 'Reorder must include all existing canvases' };
        }

        for (const id of action.order) {
          if (!currentSet.has(id)) {
            return { success: false, state, error: `Unknown canvas ID: ${id}` };
          }
        }

        return {
          success: true,
          state: reorderChildren(state, action.manifestId, action.order),
          changes: [{
            property: 'items',
            oldValue: currentChildren,
            newValue: action.order
          }]
        };
      }

      case 'ADD_ANNOTATION': {
        if (!action.annotation.id) {
          return { success: false, state, error: 'Annotation must have an id' };
        }

        return {
          success: true,
          state: addEntity(state, action.annotation as IIIFItem, action.canvasId),
          changes: [{ property: 'annotations', oldValue: null, newValue: action.annotation.id }]
        };
      }

      case 'REMOVE_ANNOTATION': {
        return {
          success: true,
          state: removeEntity(state, action.annotationId),
          changes: [{ property: 'annotations', oldValue: action.annotationId, newValue: null }]
        };
      }

      case 'MOVE_ITEM': {
        // Validate the move using centralized IIIF hierarchy rules
        const itemToMove = getEntity(state, action.itemId);
        const newParent = getEntity(state, action.newParentId);

        if (!itemToMove) {
          return { success: false, state, error: `Item not found: ${action.itemId}` };
        }
        if (!newParent) {
          return { success: false, state, error: `Parent not found: ${action.newParentId}` };
        }

        // Check if move is valid according to IIIF spec
        if (!isValidChildType(newParent.type, itemToMove.type)) {
          const validChildren = getValidChildTypes(newParent.type);
          return {
            success: false,
            state,
            error: `Cannot move ${itemToMove.type} into ${newParent.type}. Valid children: ${validChildren.join(', ') || 'none'}`
          };
        }

        // Determine relationship type for the move
        const relationshipType = getRelationshipType(newParent.type, itemToMove.type);

        return {
          success: true,
          state: moveEntity(state, action.itemId, action.newParentId, action.index),
          changes: [{
            property: '_parentId',
            oldValue: state.reverseRefs[action.itemId],
            newValue: action.newParentId
          }, {
            property: '_relationshipType',
            oldValue: null,
            newValue: relationshipType
          }]
        };
      }

      case 'BATCH_UPDATE': {
        let currentState = state;
        const allChanges: PropertyChange[] = [];

        for (const update of action.updates) {
          currentState = updateEntity(currentState, update.id, update.changes);
          for (const [prop, value] of Object.entries(update.changes)) {
            const entity = getEntity(state, update.id);
            // Dynamic property access requires casting through unknown
            const oldValue = entity ? (entity as unknown as Record<string, unknown>)[prop] : undefined;
            allChanges.push({
              property: prop,
              oldValue,
              newValue: value
            });
          }
        }

        return {
          success: true,
          state: currentState,
          changes: allChanges
        };
      }

      default:
        return { success: false, state, error: `Unknown action type` };
    }
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

export interface HistoryEntry {
  action: Action;
  beforeState: NormalizedState;
  afterState: NormalizedState;
  timestamp: number;
}

export class ActionHistory {
  private history: HistoryEntry[] = [];
  private currentIndex: number = -1;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * Record a new action
   */
  push(entry: Omit<HistoryEntry, 'timestamp'>): void {
    // Remove any redo history when new action is pushed
    this.history = this.history.slice(0, this.currentIndex + 1);

    // Add new entry
    this.history.push({
      ...entry,
      timestamp: Date.now()
    });

    // Enforce max size
    if (this.history.length > this.maxSize) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Get state to undo to
   */
  undo(): NormalizedState | null {
    if (!this.canUndo()) return null;

    const entry = this.history[this.currentIndex];
    this.currentIndex--;
    return entry.beforeState;
  }

  /**
   * Get state to redo to
   */
  redo(): NormalizedState | null {
    if (!this.canRedo()) return null;

    this.currentIndex++;
    const entry = this.history[this.currentIndex];
    return entry.afterState;
  }

  /**
   * Get current history position info
   */
  getStatus(): { position: number; total: number; canUndo: boolean; canRedo: boolean } {
    return {
      position: this.currentIndex + 1,
      total: this.history.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    };
  }

  /**
   * Get recent history entries
   */
  getRecent(count: number = 10): HistoryEntry[] {
    const start = Math.max(0, this.currentIndex - count + 1);
    return this.history.slice(start, this.currentIndex + 1);
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }
}

// ============================================================================
// Action Dispatcher
// ============================================================================

export class ActionDispatcher {
  private state: NormalizedState;
  private history: ActionHistory;
  private listeners: Set<(state: NormalizedState, action: Action) => void> = new Set();
  private errorListeners: Set<(error: string, action: Action) => void> = new Set();

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

    // Record in history
    this.history.push({
      action,
      beforeState,
      afterState: result.state
    });

    // Record in provenance (for certain actions)
    if (result.changes && result.changes.length > 0) {
      const id = 'id' in action ? (action as any).id :
                 'canvasId' in action ? (action as any).canvasId :
                 'manifestId' in action ? (action as any).manifestId : null;

      if (id) {
        provenanceService.recordUpdate(id, result.changes, action.type);
      }
    }

    // Notify listeners
    for (const listener of this.listeners) {
      listener(this.state, action);
    }

    return true;
  }

  /**
   * Undo last action
   */
  undo(): boolean {
    const previousState = this.history.undo();
    if (!previousState) return false;

    this.state = previousState;

    // Notify listeners with synthetic action
    for (const listener of this.listeners) {
      listener(this.state, { type: 'BATCH_UPDATE', updates: [] });
    }

    return true;
  }

  /**
   * Redo previously undone action
   */
  redo(): boolean {
    const nextState = this.history.redo();
    if (!nextState) return false;

    this.state = nextState;

    // Notify listeners with synthetic action
    for (const listener of this.listeners) {
      listener(this.state, { type: 'BATCH_UPDATE', updates: [] });
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
   * Subscribe to state changes
   */
  subscribe(listener: (state: NormalizedState, action: Action) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
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

  updateCanvasDimensions: (canvasId: string, width: number, height: number): Action =>
    ({ type: 'UPDATE_CANVAS_DIMENSIONS', canvasId, width, height }),

  moveItem: (itemId: string, newParentId: string, index?: number): Action =>
    ({ type: 'MOVE_ITEM', itemId, newParentId, index }),

  batchUpdate: (updates: Array<{ id: string; changes: Partial<IIIFItem> }>): Action =>
    ({ type: 'BATCH_UPDATE', updates })
};
