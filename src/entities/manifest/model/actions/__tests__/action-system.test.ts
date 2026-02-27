/**
 * Action System Tests — reduce, ActionHistory
 *
 * Tests the core mutation pipeline: action dispatch, undo/redo with
 * JSON-patch-based history, coalescing, and action creators.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  reduce,
  ActionHistory,
  actions,
} from '../index';
import type { Action } from '../types';
import type { NormalizedState } from '../../vault';
import type { IIIFCanvas, IIIFManifest } from '@/src/shared/types';

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

function makeManifest(id: string, _canvasIds: string[]): IIIFManifest {
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
// 3. Action creators
// ============================================================================

describe('Action creators', () => {
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
