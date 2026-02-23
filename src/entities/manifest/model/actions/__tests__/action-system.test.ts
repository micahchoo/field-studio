/**
 * Action System Tests — reduce, ActionHistory, ActionDispatcher
 *
 * Tests the core mutation pipeline: action dispatch, undo/redo with
 * JSON-patch-based history, coalescing, subscriber notifications,
 * and helper utilities.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  reduce,
  ActionHistory,
  ActionDispatcher,
  actions,
  createActionHistory,
  validateAction,
  executeAction,
} from '../index';
import type { Action, ActionResult, HistoryEntry } from '../types';
import type { NormalizedState } from '../../vault';
import type { IIIFCanvas, IIIFManifest } from '@/src/shared/types';

// ---------------------------------------------------------------------------
// Mock external services that the dispatcher records to
// ---------------------------------------------------------------------------

vi.mock('@/src/shared/services/provenanceService', () => ({
  provenanceService: { recordUpdate: vi.fn() },
}));

vi.mock('@/src/shared/services/activityStream', () => ({
  activityStream: {
    recordCreate: vi.fn().mockResolvedValue(undefined),
    recordUpdate: vi.fn().mockResolvedValue(undefined),
    recordDelete: vi.fn().mockResolvedValue(undefined),
  },
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const MANIFEST_ID = 'https://example.org/manifest/1';
const CANVAS_ID = 'https://example.org/canvas/1';

function makeCanvas(id: string, overrides?: Partial<IIIFCanvas>): IIIFCanvas {
  return {
    id,
    type: 'Canvas',
    label: { en: ['Test Canvas'] },
    width: 1000,
    height: 800,
    items: [],
    ...overrides,
  };
}

function makeManifest(id: string, canvasIds: string[]): IIIFManifest {
  return {
    id,
    type: 'Manifest',
    label: { en: ['Test Manifest'] },
    items: [],
  };
}

/** Build a minimal NormalizedState with one manifest and one canvas. */
function buildTestState(): NormalizedState {
  const canvas = makeCanvas(CANVAS_ID);
  const manifest = makeManifest(MANIFEST_ID, [CANVAS_ID]);

  return {
    entities: {
      Collection: {},
      Manifest: { [MANIFEST_ID]: manifest },
      Canvas: { [CANVAS_ID]: canvas },
      Range: {},
      AnnotationPage: {},
      Annotation: {},
    },
    references: {
      [MANIFEST_ID]: [CANVAS_ID],
    },
    reverseRefs: {
      [CANVAS_ID]: MANIFEST_ID,
    },
    collectionMembers: {},
    memberOfCollections: {},
    rootId: MANIFEST_ID,
    typeIndex: {
      [MANIFEST_ID]: 'Manifest',
      [CANVAS_ID]: 'Canvas',
    },
    extensions: {},
    trashedEntities: {},
  };
}

// ============================================================================
// 1. reduce() function
// ============================================================================

describe('reduce()', () => {
  let state: NormalizedState;

  beforeEach(() => {
    state = buildTestState();
  });

  it('UPDATE_LABEL modifies entity label', () => {
    const newLabel = { en: ['Updated Title'] };
    const result = reduce(state, actions.updateLabel(MANIFEST_ID, newLabel));

    expect(result.success).toBe(true);
    expect(result.state.entities.Manifest[MANIFEST_ID].label).toEqual(newLabel);
  });

  it('ADD_CANVAS adds canvas to manifest', () => {
    const newCanvas = makeCanvas('https://example.org/canvas/2');
    const result = reduce(state, actions.addCanvas(MANIFEST_ID, newCanvas));

    expect(result.success).toBe(true);
    expect(result.state.entities.Canvas['https://example.org/canvas/2']).toBeDefined();
    expect(result.state.references[MANIFEST_ID]).toContain('https://example.org/canvas/2');
    expect(result.state.typeIndex['https://example.org/canvas/2']).toBe('Canvas');
  });

  it('REMOVE_CANVAS removes canvas from state', () => {
    const result = reduce(state, actions.removeCanvas(MANIFEST_ID, CANVAS_ID));

    expect(result.success).toBe(true);
    // removeEntity sends to trash by default, so entity may still exist in trashedEntities
    // but the references should no longer list it
    const refs = result.state.references[MANIFEST_ID] || [];
    expect(refs).not.toContain(CANVAS_ID);
  });

  it('MOVE_ITEM reparents entity', () => {
    // Add a second manifest to move the canvas into
    const secondManifestId = 'https://example.org/manifest/2';
    state.entities.Manifest[secondManifestId] = {
      id: secondManifestId,
      type: 'Manifest',
      label: { en: ['Second Manifest'] },
      items: [],
    };
    state.typeIndex[secondManifestId] = 'Manifest';
    state.references[secondManifestId] = [];

    const result = reduce(state, actions.moveItem(CANVAS_ID, secondManifestId));

    expect(result.success).toBe(true);
    expect(result.state.reverseRefs[CANVAS_ID]).toBe(secondManifestId);
    expect(result.state.references[secondManifestId]).toContain(CANVAS_ID);
    expect(result.state.references[MANIFEST_ID]).not.toContain(CANVAS_ID);
  });

  it('unknown action returns error', () => {
    const bogus = { type: 'DOES_NOT_EXIST' } as unknown as Action;
    const result = reduce(state, bogus);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown action type');
    expect(result.state).toBe(state); // state unchanged
  });

  it('error in handler returns success: false', () => {
    // ADD_CANVAS with invalid dimensions should fail validation
    const badCanvas = makeCanvas('https://example.org/canvas/bad', {
      width: -1,
      height: 0,
    });
    const result = reduce(state, actions.addCanvas(MANIFEST_ID, badCanvas));

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// 2. ActionHistory class
// ============================================================================

describe('ActionHistory', () => {
  let history: ActionHistory;
  let stateA: NormalizedState;
  let stateB: NormalizedState;
  let stateC: NormalizedState;

  beforeEach(() => {
    history = new ActionHistory(5);
    stateA = buildTestState();

    // stateB: label changed
    stateB = {
      ...stateA,
      entities: {
        ...stateA.entities,
        Manifest: {
          ...stateA.entities.Manifest,
          [MANIFEST_ID]: {
            ...stateA.entities.Manifest[MANIFEST_ID],
            label: { en: ['State B'] },
          },
        },
      },
    };

    // stateC: label changed again
    stateC = {
      ...stateA,
      entities: {
        ...stateA.entities,
        Manifest: {
          ...stateA.entities.Manifest,
          [MANIFEST_ID]: {
            ...stateA.entities.Manifest[MANIFEST_ID],
            label: { en: ['State C'] },
          },
        },
      },
    };
  });

  it('pushPatched records forward/reverse patches', () => {
    const action = actions.updateLabel(MANIFEST_ID, { en: ['State B'] });
    history.pushPatched(action, stateA, stateB);

    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    const status = history.getStatus();
    expect(status.position).toBe(1);
    expect(status.total).toBe(1);
  });

  it('canUndo/canRedo track position', () => {
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);

    const actionAB = actions.updateLabel(MANIFEST_ID, { en: ['State B'] });
    history.pushPatched(actionAB, stateA, stateB);

    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    history.undoPatched(stateB);

    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);
  });

  it('undoPatched restores prior state', () => {
    const action = actions.updateLabel(MANIFEST_ID, { en: ['State B'] });
    history.pushPatched(action, stateA, stateB);

    const restored = history.undoPatched(stateB);
    expect(restored).not.toBeNull();
    // The entities key should be restored to stateA's entities via reverse patches
    expect(restored!.entities.Manifest[MANIFEST_ID].label).toEqual(
      stateA.entities.Manifest[MANIFEST_ID].label
    );
  });

  it('redoPatched re-applies action', () => {
    const action = actions.updateLabel(MANIFEST_ID, { en: ['State B'] });
    history.pushPatched(action, stateA, stateB);

    const afterUndo = history.undoPatched(stateB)!;
    const afterRedo = history.redoPatched(afterUndo);

    expect(afterRedo).not.toBeNull();
    expect(afterRedo!.entities.Manifest[MANIFEST_ID].label).toEqual(
      stateB.entities.Manifest[MANIFEST_ID].label
    );
  });

  it('coalescing: rapid same-type edits merge within 500ms window', () => {
    const action1 = actions.updateLabel(MANIFEST_ID, { en: ['Edit 1'] });
    const action2 = actions.updateLabel(MANIFEST_ID, { en: ['Edit 2'] });
    const action3 = actions.updateLabel(MANIFEST_ID, { en: ['Edit 3'] });

    // Push all three within rapid succession (< 500ms between them)
    history.pushPatched(action1, stateA, stateB);
    // Second push should coalesce with first (same type, same entity, same instant)
    history.pushPatched(action2, stateA, stateC);
    history.pushPatched(action3, stateA, stateC);

    // Should only have one entry because they coalesced
    const status = history.getStatus();
    expect(status.total).toBe(1);

    // Undo should restore all the way back to stateA (original reverse patches)
    const restored = history.undoPatched(stateC);
    expect(restored).not.toBeNull();
  });

  it('max size enforced (shift when full)', () => {
    const bigHistory = new ActionHistory(3);

    for (let i = 0; i < 5; i++) {
      const label = { en: [`Label ${i}`] };
      const before = buildTestState();
      const after = {
        ...before,
        entities: {
          ...before.entities,
          Manifest: {
            ...before.entities.Manifest,
            [MANIFEST_ID]: { ...before.entities.Manifest[MANIFEST_ID], label },
          },
        },
      };
      // Use different entity IDs to avoid coalescing
      const action: Action = { type: 'UPDATE_LABEL', id: `entity-${i}`, label };
      bigHistory.pushPatched(action, before, after);
    }

    const status = bigHistory.getStatus();
    expect(status.total).toBeLessThanOrEqual(3);
  });

  it('RELOAD_TREE stores full snapshots instead of patches', () => {
    const root = {
      id: MANIFEST_ID,
      type: 'Manifest' as const,
      label: { en: ['Reloaded'] },
      items: [],
    };
    const action = actions.reloadTree(root);

    history.pushPatched(action, stateA, stateB);

    const status = history.getStatus();
    expect(status.total).toBe(1);

    // Undo should return a full snapshot, not a patched state
    const restored = history.undoPatched(stateB);
    expect(restored).not.toBeNull();
    // The restored state should be stateA (the full snapshot stored as __full__)
    expect(restored!.rootId).toBe(stateA.rootId);
  });

  it('clear() resets history', () => {
    const action = actions.updateLabel(MANIFEST_ID, { en: ['State B'] });
    history.pushPatched(action, stateA, stateB);

    expect(history.canUndo()).toBe(true);

    history.clear();

    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    const status = history.getStatus();
    expect(status.total).toBe(0);
    expect(status.position).toBe(0);
  });
});

// ============================================================================
// 3. ActionDispatcher class
// ============================================================================

describe('ActionDispatcher', () => {
  let dispatcher: ActionDispatcher;
  let initialState: NormalizedState;

  beforeEach(() => {
    initialState = buildTestState();
    dispatcher = new ActionDispatcher(initialState);
  });

  it('dispatch() updates state and returns true', () => {
    const newLabel = { en: ['Dispatched Label'] };
    const ok = dispatcher.dispatch(actions.updateLabel(MANIFEST_ID, newLabel));

    expect(ok).toBe(true);
    expect(dispatcher.getState().entities.Manifest[MANIFEST_ID].label).toEqual(newLabel);
  });

  it('failed dispatch returns false and notifies error listeners', () => {
    const errorCb = vi.fn();
    dispatcher.onError(errorCb);

    const bogus = { type: 'DOES_NOT_EXIST' } as unknown as Action;
    const ok = dispatcher.dispatch(bogus);

    expect(ok).toBe(false);
    expect(errorCb).toHaveBeenCalledTimes(1);
    expect(errorCb).toHaveBeenCalledWith('Unknown action type', bogus);
  });

  it('undo()/redo() restore/reapply state', () => {
    const original = dispatcher.getState().entities.Manifest[MANIFEST_ID].label;
    const newLabel = { en: ['Changed'] };

    dispatcher.dispatch(actions.updateLabel(MANIFEST_ID, newLabel));
    expect(dispatcher.getState().entities.Manifest[MANIFEST_ID].label).toEqual(newLabel);

    const undone = dispatcher.undo();
    expect(undone).toBe(true);
    expect(dispatcher.getState().entities.Manifest[MANIFEST_ID].label).toEqual(original);

    const redone = dispatcher.redo();
    expect(redone).toBe(true);
    expect(dispatcher.getState().entities.Manifest[MANIFEST_ID].label).toEqual(newLabel);
  });

  it('undo returns false when nothing to undo', () => {
    expect(dispatcher.undo()).toBe(false);
  });

  it('redo returns false when nothing to redo', () => {
    expect(dispatcher.redo()).toBe(false);
  });

  it('subscribe() receives state + action on dispatch', () => {
    const listener = vi.fn();
    const unsub = dispatcher.subscribe(listener);

    const action = actions.updateLabel(MANIFEST_ID, { en: ['Notified'] });
    dispatcher.dispatch(action);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ rootId: MANIFEST_ID }),
      action
    );

    unsub();
    dispatcher.dispatch(actions.updateLabel(MANIFEST_ID, { en: ['After Unsub'] }));
    expect(listener).toHaveBeenCalledTimes(1); // no additional call
  });

  it('subscribeEntity() receives changed entity IDs', () => {
    const entityCb = vi.fn();
    dispatcher.subscribeEntity(entityCb);

    dispatcher.dispatch(actions.updateLabel(MANIFEST_ID, { en: ['Entity Change'] }));

    expect(entityCb).toHaveBeenCalledTimes(1);
    const [_state, ids] = entityCb.mock.calls[0];
    expect(ids).toBeInstanceOf(Set);
    expect(ids.has(MANIFEST_ID)).toBe(true);
  });

  it('onError() receives error + action on failures', () => {
    const errorCb = vi.fn();
    dispatcher.onError(errorCb);

    // Canvas with invalid dimensions
    const badCanvas = makeCanvas('bad', { width: -10, height: 0 });
    const action = actions.addCanvas(MANIFEST_ID, badCanvas);
    dispatcher.dispatch(action);

    expect(errorCb).toHaveBeenCalledTimes(1);
    const [error, failedAction] = errorCb.mock.calls[0];
    expect(typeof error).toBe('string');
    expect(failedAction).toBe(action);
  });

  it('lastChangedIds tracks affected entities', () => {
    dispatcher.dispatch(actions.updateLabel(MANIFEST_ID, { en: ['Track IDs'] }));
    expect(dispatcher.lastChangedIds.has(MANIFEST_ID)).toBe(true);

    const newCanvas = makeCanvas('https://example.org/canvas/new');
    dispatcher.dispatch(actions.addCanvas(MANIFEST_ID, newCanvas));
    expect(dispatcher.lastChangedIds.has(MANIFEST_ID)).toBe(true);
  });

  it('undo/redo notify both general and entity listeners', () => {
    const generalCb = vi.fn();
    const entityCb = vi.fn();
    dispatcher.subscribe(generalCb);
    dispatcher.subscribeEntity(entityCb);

    dispatcher.dispatch(actions.updateLabel(MANIFEST_ID, { en: ['Before Undo'] }));
    generalCb.mockClear();
    entityCb.mockClear();

    dispatcher.undo();
    expect(generalCb).toHaveBeenCalledTimes(1);
    expect(entityCb).toHaveBeenCalledTimes(1);

    generalCb.mockClear();
    entityCb.mockClear();

    dispatcher.redo();
    expect(generalCb).toHaveBeenCalledTimes(1);
    expect(entityCb).toHaveBeenCalledTimes(1);
  });

  it('getHistoryStatus() reflects dispatch/undo state', () => {
    expect(dispatcher.getHistoryStatus().canUndo).toBe(false);

    dispatcher.dispatch(actions.updateLabel(MANIFEST_ID, { en: ['A'] }));
    expect(dispatcher.getHistoryStatus().canUndo).toBe(true);
    expect(dispatcher.getHistoryStatus().canRedo).toBe(false);

    dispatcher.undo();
    expect(dispatcher.getHistoryStatus().canRedo).toBe(true);
  });
});

// ============================================================================
// 4. Helper functions
// ============================================================================

describe('Helper functions', () => {
  it('createActionHistory() factory returns ActionHistory', () => {
    const h = createActionHistory({ maxSize: 50 });
    expect(h).toBeInstanceOf(ActionHistory);
    expect(h.canUndo()).toBe(false);
    expect(h.getStatus().total).toBe(0);
  });

  it('createActionHistory() with default options', () => {
    const h = createActionHistory();
    expect(h).toBeInstanceOf(ActionHistory);
  });

  it('validateAction() returns valid for known action types', () => {
    const result = validateAction(actions.updateLabel('some-id', { en: ['Test'] }));
    // On an empty state UPDATE_LABEL still succeeds (updateEntity is a no-op on missing entity)
    expect(result.valid).toBe(true);
  });

  it('validateAction() returns invalid for unknown action', () => {
    const result = validateAction({ type: 'BOGUS' } as unknown as Action);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Unknown action type');
  });

  it('executeAction is an alias for reduce', () => {
    expect(executeAction).toBe(reduce);
  });

  it('action creators produce correctly typed actions', () => {
    expect(actions.updateLabel('id', { en: ['x'] })).toEqual({
      type: 'UPDATE_LABEL',
      id: 'id',
      label: { en: ['x'] },
    });

    const canvas = makeCanvas('c1');
    expect(actions.addCanvas('m1', canvas, 2)).toEqual({
      type: 'ADD_CANVAS',
      manifestId: 'm1',
      canvas,
      index: 2,
    });

    expect(actions.removeCanvas('m1', 'c1')).toEqual({
      type: 'REMOVE_CANVAS',
      manifestId: 'm1',
      canvasId: 'c1',
    });

    expect(actions.moveItem('item', 'parent', 0)).toEqual({
      type: 'MOVE_ITEM',
      itemId: 'item',
      newParentId: 'parent',
      index: 0,
    });

    expect(actions.moveToTrash('x')).toEqual({
      type: 'MOVE_TO_TRASH',
      id: 'x',
      options: undefined,
    });

    expect(actions.emptyTrash()).toEqual({ type: 'EMPTY_TRASH' });
  });
});
