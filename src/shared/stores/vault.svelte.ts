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
 *   vault.update(id, changes)
 *   vault.moveToTrash(id)
 *
 * WARNING: Do NOT destructure the vault object — it breaks reactivity:
 *   const { state } = vault;  // ❌ captures value, not signal
 *   vault.state;              // ✅ reads through getter, tracked
 */

import { Vault } from '@/src/entities/manifest/model/vault';
import type { NormalizedState, VaultSnapshot, IIIFItem } from '@/src/shared/types';
import { reduce } from '@/src/entities/manifest/model/actions';
import type { Action } from '@/src/entities/manifest/model/actions';

class VaultStore {
  // ──────────────────────────────────────────────
  // Internal state — $state.raw() avoids deep proxy on NormalizedState
  // ──────────────────────────────────────────────
  #raw = $state.raw<NormalizedState>(null!);
  #vault: Vault;

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
  // Mutations — delegate to framework-agnostic Vault,
  // which triggers subscribe → updates #raw → reactive cascade
  // ──────────────────────────────────────────────

  load(root: IIIFItem): void { this.#vault.load(root); }
  export(): IIIFItem | null { return this.#vault.export(); }
  update(id: string, updates: Partial<IIIFItem>): void { this.#vault.update(id, updates); }
  add(entity: IIIFItem, parentId: string): void { this.#vault.add(entity, parentId); }
  remove(id: string, opts?: { permanent?: boolean }): void { this.#vault.remove(id, opts); }
  moveToTrash(id: string): void { this.#vault.moveToTrash(id); }
  restoreFromTrash(id: string, opts?: { parentId?: string; index?: number }): void {
    this.#vault.restoreFromTrash(id, opts);
  }
  emptyTrash(): void { this.#vault.emptyTrash(); }
  move(id: string, newParentId: string, index?: number): void {
    this.#vault.move(id, newParentId, index);
  }

  // Collections
  addToCollection(collId: string, resId: string): void { this.#vault.addToCollection(collId, resId); }
  removeFromCollection(collId: string, resId: string): void { this.#vault.removeFromCollection(collId, resId); }
  getCollectionMembers(collId: string): string[] { return this.#vault.getCollectionMembers(collId); }
  getCollectionsContaining(resId: string): string[] { return this.#vault.getCollectionsContaining(resId); }

  // Snapshot/Restore
  snapshot(): VaultSnapshot { return this.#vault.snapshot(); }
  restore(snap: VaultSnapshot): void { this.#vault.restore(snap); }

  /**
   * Dispatch an action through the reducer — applies action to normalized state.
   * Returns true if the action succeeded.
   * Use for annotation and board mutations that need the action system's logic.
   */
  dispatch(action: Action): boolean {
    const currentState = this.#vault.getState();
    const result = reduce(currentState, action);
    if (result.success) {
      this.restore({ state: result.state, timestamp: Date.now() });
      return true;
    }
    return false;
  }
}

/** Singleton vault store — import and use directly in any component */
export const vault = new VaultStore();
