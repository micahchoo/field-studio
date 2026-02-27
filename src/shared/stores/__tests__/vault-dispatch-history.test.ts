/**
 * VaultStore.dispatch() + ActionHistory integration tests
 *
 * Tests the pattern used in VaultStore: Vault + reduce() + ActionHistory
 * wired together so dispatch records undo history and undo/redo reverses
 * state via patches.
 *
 * We test against the raw Vault class + ActionHistory directly (not the
 * VaultStore singleton) because VaultStore uses $state.raw which requires
 * the Svelte compiler. The integration pattern is identical.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { IIIFItem, IIIFAnnotation } from '@/src/shared/types';
import { Vault } from '@/src/entities/manifest/model/vault';
import { reduce, ActionHistory } from '@/src/entities/manifest/model/actions';
import type { Action } from '@/src/entities/manifest/model/actions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCanvas(id = 'https://example.org/canvas/1'): IIIFItem {
  return {
    id,
    type: 'Canvas',
    label: { en: ['Test Canvas'] },
    width: 800,
    height: 600,
    items: [],
  } as unknown as IIIFItem;
}

function makeManifest(canvas: IIIFItem): IIIFItem {
  return {
    id: 'https://example.org/manifest/1',
    type: 'Manifest',
    label: { en: ['Test Manifest'] },
    items: [canvas],
  } as unknown as IIIFItem;
}

function makeAnnotation(canvasId: string, suffix = '1'): IIIFAnnotation {
  return {
    id: `${canvasId}/annotation/test-${suffix}`,
    type: 'Annotation',
    motivation: 'commenting',
    body: { type: 'TextualBody', value: 'Hello', format: 'text/plain' },
    target: canvasId,
  } as unknown as IIIFAnnotation;
}

/**
 * Mirrors the VaultStore.dispatch() pattern: reduce + history + restore.
 */
function dispatchWithHistory(
  vault: Vault,
  history: ActionHistory,
  action: Action,
): boolean {
  const beforeState = vault.getState();
  const result = reduce(beforeState, action);
  if (result.success) {
    history.pushPatched(action, beforeState, result.state);
    vault.restore({ state: result.state, timestamp: Date.now() });
    return true;
  }
  return false;
}

/**
 * Mirrors VaultStore.undo().
 */
function undoWithHistory(vault: Vault, history: ActionHistory): boolean {
  const undoneState = history.undoPatched(vault.getState());
  if (!undoneState) return false;
  vault.restore({ state: undoneState, timestamp: Date.now() });
  return true;
}

/**
 * Mirrors VaultStore.redo().
 */
function redoWithHistory(vault: Vault, history: ActionHistory): boolean {
  const redoneState = history.redoPatched(vault.getState());
  if (!redoneState) return false;
  vault.restore({ state: redoneState, timestamp: Date.now() });
  return true;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VaultStore dispatch + ActionHistory integration pattern', () => {
  let vault: Vault;
  let history: ActionHistory;
  const canvasId = 'https://example.org/canvas/1';

  beforeEach(() => {
    vault = new Vault();
    history = new ActionHistory(100);
    vault.load(makeManifest(makeCanvas()));
  });

  it('records undo entry after dispatch', () => {
    const annotation = makeAnnotation(canvasId);
    const ok = dispatchWithHistory(vault, history, {
      type: 'ADD_ANNOTATION',
      canvasId,
      annotation,
    });

    expect(ok).toBe(true);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
  });

  it('undo reverses the last dispatch', () => {
    const annotation = makeAnnotation(canvasId);

    // Dispatch: add annotation
    dispatchWithHistory(vault, history, {
      type: 'ADD_ANNOTATION',
      canvasId,
      annotation,
    });

    // Annotation should exist
    expect(vault.getState().entities.Annotation[annotation.id]).toBeDefined();

    // Undo
    const undone = undoWithHistory(vault, history);
    expect(undone).toBe(true);

    // Annotation should be gone
    expect(vault.getState().entities.Annotation[annotation.id]).toBeUndefined();
  });

  it('redo re-applies after undo', () => {
    const annotation = makeAnnotation(canvasId);

    dispatchWithHistory(vault, history, {
      type: 'ADD_ANNOTATION',
      canvasId,
      annotation,
    });

    // Undo then redo
    undoWithHistory(vault, history);
    expect(vault.getState().entities.Annotation[annotation.id]).toBeUndefined();

    const redone = redoWithHistory(vault, history);
    expect(redone).toBe(true);

    // Annotation should be restored
    expect(vault.getState().entities.Annotation[annotation.id]).toBeDefined();
  });

  it('RELOAD_TREE uses full snapshot path', () => {
    const newCanvas = makeCanvas('https://example.org/canvas/new');
    const newManifest: IIIFItem = {
      id: 'https://example.org/manifest/2',
      type: 'Manifest',
      label: { en: ['New Manifest'] },
      items: [newCanvas],
    } as unknown as IIIFItem;

    const beforeState = vault.getState();
    vault.load(newManifest);
    const afterState = vault.getState();
    history.pushPatched(
      { type: 'RELOAD_TREE', root: newManifest } as Action,
      beforeState,
      afterState,
    );

    // State should reflect the new manifest
    expect(vault.getState().rootId).toBe('https://example.org/manifest/2');

    // Undo should restore old manifest
    const undone = undoWithHistory(vault, history);
    expect(undone).toBe(true);
    expect(vault.getState().rootId).toBe('https://example.org/manifest/1');

    // Redo should restore new manifest
    const redone = redoWithHistory(vault, history);
    expect(redone).toBe(true);
    expect(vault.getState().rootId).toBe('https://example.org/manifest/2');
  });

  it('coalesces rapid edits of same type on same entity', () => {
    const manifestId = 'https://example.org/manifest/1';

    // Two rapid label updates on the same entity (within coalesce window)
    dispatchWithHistory(vault, history, {
      type: 'UPDATE_LABEL',
      id: manifestId,
      label: { en: ['First Edit'] },
    });

    dispatchWithHistory(vault, history, {
      type: 'UPDATE_LABEL',
      id: manifestId,
      label: { en: ['Second Edit'] },
    });

    // Should have coalesced into 1 entry (same type + same entity + fast)
    const status = history.getStatus();
    expect(status.total).toBe(1);

    // Undo should jump back to the original state (before either edit)
    undoWithHistory(vault, history);
    const entity = vault.get(manifestId);
    expect(entity).not.toBeNull();
    expect(entity!.label).toEqual({ en: ['Test Manifest'] });
  });

  it('does not record failed dispatches', () => {
    // Try to add annotation with missing id — should fail
    const ok = dispatchWithHistory(vault, history, {
      type: 'ADD_ANNOTATION',
      canvasId,
      annotation: { type: 'Annotation', motivation: 'commenting' } as unknown as IIIFAnnotation,
    });

    expect(ok).toBe(false);
    expect(history.canUndo()).toBe(false);
    expect(history.getStatus().total).toBe(0);
  });

  it('multi-step undo: A→B→C, undo×2 restores A', () => {
    const manifestId = 'https://example.org/manifest/1';

    // Dispatch B: change label (different type from C to avoid coalescing)
    dispatchWithHistory(vault, history, {
      type: 'UPDATE_LABEL',
      id: manifestId,
      label: { en: ['Label B'] },
    });

    // Force non-coalescing by changing action type
    dispatchWithHistory(vault, history, {
      type: 'UPDATE_SUMMARY',
      id: manifestId,
      summary: { en: ['Summary C'] },
    });

    expect(history.getStatus().total).toBe(2);

    // Undo×2 should restore original state
    undoWithHistory(vault, history);
    undoWithHistory(vault, history);

    const entity = vault.get(manifestId);
    expect(entity!.label).toEqual({ en: ['Test Manifest'] });
    expect(entity!.summary).toBeUndefined();
  });

  it('BATCH_UPDATE applies multiple field changes in single undo entry', () => {
    const manifestId = 'https://example.org/manifest/1';

    dispatchWithHistory(vault, history, {
      type: 'BATCH_UPDATE',
      updates: [
        { id: manifestId, changes: { label: { en: ['Batch Label'] } } },
        { id: canvasId, changes: { label: { en: ['Batch Canvas'] } } },
      ],
    });

    expect(history.getStatus().total).toBe(1);

    // Both entities updated
    expect(vault.get(manifestId)!.label).toEqual({ en: ['Batch Label'] });
    expect(vault.get(canvasId)!.label).toEqual({ en: ['Batch Canvas'] });

    // Single undo reverts both
    undoWithHistory(vault, history);
    expect(vault.get(manifestId)!.label).toEqual({ en: ['Test Manifest'] });
    expect(vault.get(canvasId)!.label).toEqual({ en: ['Test Canvas'] });
  });

  it('new action after undo truncates redo stack', () => {
    const manifestId = 'https://example.org/manifest/1';

    // Two distinct actions (different types to avoid coalescing)
    dispatchWithHistory(vault, history, {
      type: 'UPDATE_LABEL',
      id: manifestId,
      label: { en: ['Step 1'] },
    });
    dispatchWithHistory(vault, history, {
      type: 'UPDATE_SUMMARY',
      id: manifestId,
      summary: { en: ['Step 2'] },
    });

    expect(history.getStatus().total).toBe(2);

    // Undo step 2
    undoWithHistory(vault, history);
    expect(history.canRedo()).toBe(true);

    // New action should truncate redo
    const annotation = makeAnnotation(canvasId);
    dispatchWithHistory(vault, history, {
      type: 'ADD_ANNOTATION',
      canvasId,
      annotation,
    });

    // Redo should no longer be available (truncated)
    expect(history.canRedo()).toBe(false);
    expect(history.getStatus().total).toBe(2); // label update + annotation
  });

  it('undo with empty history is a no-op', () => {
    const stateBefore = vault.getState();
    const result = undoWithHistory(vault, history);

    expect(result).toBe(false);
    expect(vault.getState()).toBe(stateBefore);
  });

  it('redo with empty redo stack is a no-op', () => {
    dispatchWithHistory(vault, history, {
      type: 'UPDATE_LABEL',
      id: 'https://example.org/manifest/1',
      label: { en: ['Changed'] },
    });

    const stateBefore = vault.getState();
    const result = redoWithHistory(vault, history);

    expect(result).toBe(false);
    expect(vault.getState()).toBe(stateBefore);
  });
});
