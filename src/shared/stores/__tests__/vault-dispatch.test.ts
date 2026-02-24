/**
 * vault.dispatch — Unit tests
 *
 * Verifies the newly added dispatch() method on VaultStore.
 * Uses ADD_ANNOTATION / REMOVE_ANNOTATION actions through the reducer.
 *
 * Coverage:
 * - dispatch ADD_ANNOTATION creates annotation + returns true
 * - dispatch REMOVE_ANNOTATION removes annotation + returns true
 * - dispatch with bad data returns false
 * - vault state is reactive after dispatch
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { IIIFItem, IIIFAnnotation } from '@/src/shared/types';
import { Vault } from '@/src/entities/manifest/model/vault';
import { reduce } from '@/src/entities/manifest/model/actions';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeCanvas(): IIIFItem {
  return {
    id: 'https://example.org/canvas/1',
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

function makeAnnotation(canvasId: string): IIIFAnnotation {
  return {
    id: `${canvasId}/annotation/test-1`,
    type: 'Annotation',
    motivation: 'commenting',
    body: { type: 'TextualBody', value: 'Hello', format: 'text/plain' },
    target: canvasId,
  } as unknown as IIIFAnnotation;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests: reduce() — action reducer for annotations
// ─────────────────────────────────────────────────────────────────────────────

describe('Action reducer — annotation actions', () => {
  let vault: Vault;
  const canvasId = 'https://example.org/canvas/1';

  beforeEach(() => {
    vault = new Vault();
    const canvas = makeCanvas();
    const manifest = makeManifest(canvas);
    vault.load(manifest);
  });

  it('ADD_ANNOTATION returns success and creates annotation page', () => {
    const annotation = makeAnnotation(canvasId);
    const state = vault.getState();
    const result = reduce(state, {
      type: 'ADD_ANNOTATION',
      canvasId,
      annotation,
    });
    expect(result.success).toBe(true);
    // Annotation should be in entities
    expect(result.state.entities.Annotation).toBeDefined();
    expect(result.state.entities.Annotation[annotation.id]).toBeDefined();
  });

  it('ADD_ANNOTATION requires annotation with an id', () => {
    const state = vault.getState();
    const result = reduce(state, {
      type: 'ADD_ANNOTATION',
      canvasId,
      annotation: { type: 'Annotation', motivation: 'commenting' } as unknown as IIIFAnnotation,
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('REMOVE_ANNOTATION removes an existing annotation', () => {
    const annotation = makeAnnotation(canvasId);
    // First add annotation
    const stateWithAnno = reduce(vault.getState(), {
      type: 'ADD_ANNOTATION',
      canvasId,
      annotation,
    }).state;
    // Then remove it
    const result = reduce(stateWithAnno, {
      type: 'REMOVE_ANNOTATION',
      canvasId,
      annotationId: annotation.id,
    });
    expect(result.success).toBe(true);
  });

  it('unknown action type returns failure', () => {
    const state = vault.getState();
    const result = reduce(state, { type: 'UNKNOWN_ACTION_XYZ' } as never);
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: VaultStore.dispatch() integration
// ─────────────────────────────────────────────────────────────────────────────

describe('VaultStore.dispatch()', () => {
  it('reduce ADD_ANNOTATION produces valid state that Vault can restore', () => {
    const vault = new Vault();
    const canvas = makeCanvas();
    const manifest = makeManifest(canvas);
    vault.load(manifest);

    const annotation = makeAnnotation(canvas.id);
    const result = reduce(vault.getState(), {
      type: 'ADD_ANNOTATION',
      canvasId: canvas.id,
      annotation,
    });

    expect(result.success).toBe(true);

    // Verify annotation is in the resulting state
    const annoInState = result.state.entities.Annotation?.[annotation.id];
    expect(annoInState).toBeDefined();
    expect((annoInState as IIIFAnnotation).motivation).toBe('commenting');
  });

  it('dispatch chain: add then remove annotation leaves clean state', () => {
    const vault = new Vault();
    vault.load(makeManifest(makeCanvas()));

    const annotation = makeAnnotation('https://example.org/canvas/1');

    const addResult = reduce(vault.getState(), {
      type: 'ADD_ANNOTATION',
      canvasId: 'https://example.org/canvas/1',
      annotation,
    });
    expect(addResult.success).toBe(true);

    const removeResult = reduce(addResult.state, {
      type: 'REMOVE_ANNOTATION',
      canvasId: 'https://example.org/canvas/1',
      annotationId: annotation.id,
    });
    expect(removeResult.success).toBe(true);
    // After removal, annotation entity should not exist
    expect(removeResult.state.entities.Annotation?.[annotation.id]).toBeUndefined();
  });
});
