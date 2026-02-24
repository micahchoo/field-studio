/**
 * HistoryStore — unit tests
 *
 * Covers:
 *   1. update → undo → state equals previous
 *   2. undo → redo → state equals post
 *   3. canUndo / canRedo reactivity
 *   4. Idempotent: undo/redo past limits
 *   5. set() resets history
 *   6. Skips identical states (JSON comparison)
 *   7. Respects maxHistory depth
 */

import { describe, it, expect } from 'vitest';
import { HistoryStore } from '../history.svelte';

describe('HistoryStore', () => {
  it('starts with canUndo=false and canRedo=false', () => {
    const h = new HistoryStore(0, 10);
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
    expect(h.state).toBe(0);
  });

  it('update enables canUndo, disables canRedo', () => {
    const h = new HistoryStore(0, 10);
    h.update(1);
    expect(h.canUndo).toBe(true);
    expect(h.canRedo).toBe(false);
    expect(h.state).toBe(1);
  });

  it('undo restores previous state', () => {
    const h = new HistoryStore(0, 10);
    h.update(1);
    h.update(2);
    h.undo();
    expect(h.state).toBe(1);
    expect(h.canUndo).toBe(true);
    expect(h.canRedo).toBe(true);
  });

  it('undo all the way back', () => {
    const h = new HistoryStore(0, 10);
    h.update(1);
    h.update(2);
    h.undo();
    h.undo();
    expect(h.state).toBe(0);
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(true);
  });

  it('redo restores next state', () => {
    const h = new HistoryStore(0, 10);
    h.update(1);
    h.update(2);
    h.undo();
    h.undo();
    h.redo();
    expect(h.state).toBe(1);
    h.redo();
    expect(h.state).toBe(2);
    expect(h.canRedo).toBe(false);
  });

  it('new update after undo clears redo stack', () => {
    const h = new HistoryStore(0, 10);
    h.update(1);
    h.update(2);
    h.undo();           // state = 1, future = [2]
    h.update(99);       // clears future
    expect(h.canRedo).toBe(false);
    expect(h.state).toBe(99);
  });

  it('undo does nothing when already at oldest state', () => {
    const h = new HistoryStore(42, 10);
    h.undo(); // no-op
    expect(h.state).toBe(42);
  });

  it('redo does nothing when already at newest state', () => {
    const h = new HistoryStore(42, 10);
    h.update(43);
    h.redo(); // no-op (already at newest)
    expect(h.state).toBe(43);
  });

  it('set() resets history (no undo/redo)', () => {
    const h = new HistoryStore(0, 10);
    h.update(1);
    h.update(2);
    h.set(99);
    expect(h.state).toBe(99);
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
  });

  it('skips identical states (shallow JSON comparison)', () => {
    const h = new HistoryStore({ x: 1 }, 10);
    h.update({ x: 1 });  // same value
    expect(h.canUndo).toBe(false);
    expect(h.pastLength).toBe(0);
  });

  it('respects maxHistory depth', () => {
    const h = new HistoryStore(0, 3);
    h.update(1);
    h.update(2);
    h.update(3);
    h.update(4);  // should evict oldest (0→1)
    expect(h.pastLength).toBe(3);
    h.undo(); h.undo(); h.undo();
    expect(h.state).toBe(1);  // oldest in history now
    expect(h.canUndo).toBe(false);
  });

  it('functional update form works', () => {
    const h = new HistoryStore(10, 10);
    h.update((curr) => curr + 5);
    expect(h.state).toBe(15);
    expect(h.canUndo).toBe(true);
  });
});
