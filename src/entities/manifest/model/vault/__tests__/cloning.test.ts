/**
 * Cloning utilities — comprehensive tests built from scratch.
 */
import { describe, it, expect } from 'vitest';
import { cloneAsRecord, deepCloneState, recordAs, hasType } from '../cloning';
import { createEmptyState } from '../normalization';

describe('cloneAsRecord', () => {
  it('creates a deep copy (no reference sharing)', () => {
    const obj = { a: 1, nested: { b: 2 } };
    const cloned = cloneAsRecord(obj);

    expect(cloned.a).toBe(1);
    expect((cloned.nested as any).b).toBe(2);

    // Mutating clone should not affect original
    (cloned.nested as any).b = 99;
    expect(obj.nested.b).toBe(2);
  });

  it('returns Record<string, unknown>', () => {
    const result = cloneAsRecord({ id: 'test', type: 'Canvas' });
    expect(result.id).toBe('test');
    expect(result.type).toBe('Canvas');
  });

  it('handles arrays in objects', () => {
    const obj = { items: [1, 2, 3], label: { en: ['Hello'] } };
    const cloned = cloneAsRecord(obj);

    expect(cloned.items).toEqual([1, 2, 3]);
    expect(cloned.label).toEqual({ en: ['Hello'] });

    // Mutation isolation
    (cloned.items as number[]).push(4);
    expect(obj.items).toHaveLength(3);
  });

  it('handles empty objects', () => {
    const cloned = cloneAsRecord({});
    expect(Object.keys(cloned)).toHaveLength(0);
  });

  it('handles null/undefined values in objects', () => {
    const obj = { a: null, b: undefined, c: 'value' };
    const cloned = cloneAsRecord(obj);

    expect(cloned.a).toBeNull();
    expect(cloned.b).toBeUndefined();
    expect(cloned.c).toBe('value');
  });
});

describe('deepCloneState', () => {
  it('creates deep copy of NormalizedState', () => {
    const state = createEmptyState();
    state.rootId = 'test-root';
    state.typeIndex['test'] = 'Canvas';

    const cloned = deepCloneState(state);

    expect(cloned.rootId).toBe('test-root');
    expect(cloned.typeIndex['test']).toBe('Canvas');

    // Mutation isolation
    cloned.rootId = 'modified';
    expect(state.rootId).toBe('test-root');
  });

  it('deep clones entity stores', () => {
    const state = createEmptyState();
    state.entities.Canvas['c1'] = {
      id: 'c1', type: 'Canvas', width: 100, height: 100, items: []
    };

    const cloned = deepCloneState(state);
    cloned.entities.Canvas['c1'].width = 999;

    expect(state.entities.Canvas['c1'].width).toBe(100);
  });
});

describe('recordAs', () => {
  it('casts record to specified type', () => {
    const record: Record<string, unknown> = { id: 'test', type: 'Canvas', width: 100, height: 50 };
    const typed = recordAs<{ id: string; type: string; width: number }>(record);

    expect(typed.id).toBe('test');
    expect(typed.width).toBe(100);
  });
});

describe('hasType', () => {
  it('returns true for objects with type property', () => {
    expect(hasType({ type: 'Canvas' })).toBe(true);
    expect(hasType({ type: 'Manifest', id: '123' })).toBe(true);
  });

  it('returns false for objects without type', () => {
    expect(hasType({ id: '123' })).toBe(false);
    expect(hasType({})).toBe(false);
  });

  it('returns false for non-objects', () => {
    expect(hasType(null)).toBe(false);
    expect(hasType(undefined)).toBe(false);
    expect(hasType('string')).toBe(false);
    expect(hasType(42)).toBe(false);
  });

  it('narrows type correctly', () => {
    const item: unknown = { type: 'Range', id: 'r1' };
    if (hasType(item)) {
      // TypeScript should know item.type is string
      expect(item.type).toBe('Range');
    }
  });
});
