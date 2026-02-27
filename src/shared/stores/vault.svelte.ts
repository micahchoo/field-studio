/**
 * Vault Reactive Module — Svelte 5 Runes Interface
 *
 * Wraps the framework-agnostic Vault class with $state.raw() for reactive access.
 * NormalizedState uses $state.raw() (not $state()) because it's a large nested
 * structure that doesn't need deep proxy tracking — mutations go through the
 * Vault class API, which replaces the entire state object on each operation.
 *
 * Per architecture doc §4: "$state.raw for large collections you don't need
 * deep tracking on (like the full NormalizedState)"
 *
 * Usage in Svelte components:
 *   import { vault } from '@/src/shared/stores/vault.svelte';
 *
 *   // REACTIVE reads (tracked in templates/$derived — triggers re-render)
 *   vault.state          // full NormalizedState
 *   vault.rootId         // root entity ID
 *   vault.trashedCount   // number of trashed entities
 *   vault.getEntity(id)  // entity by ID
 *   vault.getChildIds(id) // child IDs
 *
 *   // NON-REACTIVE peeks (for imperative code, event handlers, external libs)
 *   vault.peekEntity(id) // one-shot read, no tracking
 *   vault.peekState()    // snapshot of state, no tracking
 *   vault.peekHas(id)    // existence check, no tracking
 *
 *   // Mutations (trigger reactive updates)
 *   vault.load(root)
 *   vault.dispatch(action)
 *   vault.undo() / vault.redo()
 *
 * WARNING: Do NOT destructure the vault object — it breaks reactivity:
 *   const { state } = vault;  // ❌ captures value, not signal
 *   vault.state;              // ✅ reads through getter, tracked
 */

import { Vault } from '@/src/entities/manifest/model/vault';
import type { NormalizedState, VaultSnapshot, IIIFItem } from '@/src/shared/types';
import { reduce, ActionHistory } from '@/src/entities/manifest/model/actions';
import type { Action } from '@/src/entities/manifest/model/actions';

class VaultStore {
  // ──────────────────────────────────────────────
  // Internal state — $state.raw() avoids deep proxy on NormalizedState
  // ──────────────────────────────────────────────
  #raw = $state.raw<NormalizedState>(null!);
  #vault: Vault;
  #history = new ActionHistory(100);

  constructor() {
    this.#vault = new Vault();
    this.#raw = this.#vault.getState();

    // Bridge: Vault class pub/sub → $state.raw signal
    this.#vault.subscribe((newState) => {
      this.#raw = newState;
    });
  }

  // ──────────────────────────────────────────────
  // REACTIVE reads — trigger fine-grained Svelte updates
  // Use these in component templates and $derived expressions.
  // ──────────────────────────────────────────────

  /** Full normalized state (read-only, reactive) */
  get state(): Readonly<NormalizedState> {
    return this.#raw;
  }

  /** Root entity ID (reactive) */
  get rootId(): string | null {
    return this.#raw.rootId;
  }

  /** Number of trashed entities (reactive) */
  get trashedCount(): number {
    return Object.keys(this.#raw.trashedEntities).length;
  }

  /** Get entity by ID — reactive, triggers updates when state changes */
  getEntity(id: string): IIIFItem | null {
    const type = this.#raw.typeIndex[id];
    if (!type) return null;
    return (this.#raw.entities[type] as Record<string, IIIFItem>)[id] ?? null;
  }

  /** Get child IDs — reactive */
  getChildIds(id: string): string[] {
    return this.#raw.references[id] || [];
  }

  // ──────────────────────────────────────────────
  // NON-REACTIVE peeks — one-shot reads, no tracking.
  // Use these in event handlers, external lib callbacks, imperative code.
  // ──────────────────────────────────────────────

  /** One-shot entity read — NOT reactive, won't trigger re-renders */
  peekEntity(id: string): IIIFItem | null { return this.#vault.get(id); }

  /** One-shot existence check — NOT reactive */
  peekHas(id: string): boolean { return this.#vault.has(id); }

  /** One-shot state snapshot — NOT reactive */
  peekState(): Readonly<NormalizedState> { return this.#vault.getState(); }

  /** One-shot children read — NOT reactive */
  peekChildren(id: string): string[] { return this.#vault.getChildren(id); }

  /** One-shot parent read — NOT reactive */
  peekParent(id: string): string | null { return this.#vault.getParent(id); }

  // ──────────────────────────────────────────────
  // Mutations — all writes go through load() or dispatch()
  // ──────────────────────────────────────────────

  load(root: IIIFItem): void {
    const beforeState = this.#vault.getState();
    this.#vault.load(root);
    const afterState = this.#vault.getState();
    this.#history.pushPatched(
      { type: 'RELOAD_TREE', root } as Action,
      beforeState,
      afterState
    );
  }
  export(): IIIFItem | null { return this.#vault.export(); }

  // Read-only collection queries
  getCollectionMembers(collId: string): string[] { return this.#vault.getCollectionMembers(collId); }
  getCollectionsContaining(resId: string): string[] { return this.#vault.getCollectionsContaining(resId); }

  // Snapshot/Restore (used internally by dispatch/undo/redo)
  snapshot(): VaultSnapshot { return this.#vault.snapshot(); }
  restore(snap: VaultSnapshot): void { this.#vault.restore(snap); }

  /**
   * Dispatch an action through the reducer — applies action to normalized state.
   * Returns true if the action succeeded.
   * Use for annotation and board mutations that need the action system's logic.
   */
  dispatch(action: Action): boolean {
    const beforeState = this.#vault.getState();
    const result = reduce(beforeState, action);
    if (result.success) {
      this.#history.pushPatched(action, beforeState, result.state);
      this.#vault.restore({ state: result.state, timestamp: Date.now() });
      return true;
    }
    return false;
  }

  undo(): boolean {
    const undoneState = this.#history.undoPatched(this.#vault.getState());
    if (!undoneState) return false;
    this.#vault.restore({ state: undoneState, timestamp: Date.now() });
    return true;
  }

  redo(): boolean {
    const redoneState = this.#history.redoPatched(this.#vault.getState());
    if (!redoneState) return false;
    this.#vault.restore({ state: redoneState, timestamp: Date.now() });
    return true;
  }

  get canUndo(): boolean { return this.#history.canUndo(); }
  get canRedo(): boolean { return this.#history.canRedo(); }
}

/** Singleton vault store — import and use directly in any component */
export const vault = new VaultStore();
