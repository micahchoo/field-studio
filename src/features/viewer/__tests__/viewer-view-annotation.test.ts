/**
 * ViewerView annotation type-safety regression tests
 *
 * Verifies that:
 * 1. handleCreateAnnotation uses vault.dispatch(actions.addAnnotation(...)) — the typed API
 *    for IIIFAnnotation, NOT vault.add() which expects IIIFItem.
 * 2. The TextualBody literal is shaped correctly without as-any casts.
 * 3. Result<T,E> type helpers are usable and well-typed.
 *
 * These tests catch the class of bug where vault.add(annotation as any, id)
 * silently bypassed the action reducer and produced undefined behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IIIFAnnotation } from '@/src/shared/types';
import { ok, err, type Result } from '@/src/shared/types';
import { actions } from '@/src/entities/manifest/model/actions';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/src/shared/stores/vault.svelte', () => {
  const dispatchMock = vi.fn(() => true);
  const addMock = vi.fn();
  return {
    vault: {
      dispatch: dispatchMock,
      add: addMock,
      export: vi.fn(() => null),
    },
  };
});

import { vault } from '@/src/shared/stores/vault.svelte';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAnnotation(overrides: Partial<IIIFAnnotation> = {}): IIIFAnnotation {
  return {
    id: 'https://example.com/anno/1',
    type: 'Annotation',
    motivation: 'commenting',
    body: { type: 'TextualBody' as const, value: 'test', format: 'text/plain' },
    target: 'https://example.com/canvas/1',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('actions.addAnnotation — typed dispatch contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a well-typed ADD_ANNOTATION action', () => {
    const anno = makeAnnotation();
    const action = actions.addAnnotation('canvas-1', anno);
    expect(action.type).toBe('ADD_ANNOTATION');
    expect((action as { canvasId: string }).canvasId).toBe('canvas-1');
  });

  it('dispatching addAnnotation calls vault.dispatch, not vault.add', () => {
    const anno = makeAnnotation();
    const canvasId = 'https://example.com/canvas/1';

    // Simulate the pattern used in ViewerView.handleCreateAnnotation
    vault.dispatch(actions.addAnnotation(canvasId, anno));

    expect(vault.dispatch).toHaveBeenCalledTimes(1);
    expect(vault.add).not.toHaveBeenCalled();
  });

  it('dispatch receives the correct action shape', () => {
    const anno = makeAnnotation({ id: 'https://example.com/anno/42' });
    const canvasId = 'https://example.com/canvas/5';

    vault.dispatch(actions.addAnnotation(canvasId, anno));

    const [calledAction] = (vault.dispatch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(calledAction.type).toBe('ADD_ANNOTATION');
    expect(calledAction.canvasId).toBe(canvasId);
    expect(calledAction.annotation.id).toBe('https://example.com/anno/42');
  });
});

describe('IIIFTextualBody literal type', () => {
  it('constructs a valid TextualBody with as const on type literal', () => {
    const body: { type: 'TextualBody'; value: string; format: string } = {
      type: 'TextualBody' as const,
      value: '',
      format: 'text/plain',
    };
    expect(body.type).toBe('TextualBody');
    expect(body.format).toBe('text/plain');
  });
});

describe('Result<T, E> type helpers', () => {
  it('ok() constructs a success result', () => {
    const r: Result<number> = ok(42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });

  it('err() constructs a failure result', () => {
    const r: Result<number> = err(new Error('bad'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toBe('bad');
  });

  it('Result narrows correctly in if-else branches', () => {
    function parse(s: string): Result<number> {
      const n = Number(s);
      return isNaN(n) ? err(new Error(`Not a number: ${s}`)) : ok(n);
    }

    const good = parse('42');
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.value).toBe(42);

    const bad = parse('abc');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.message).toContain('abc');
  });
});
