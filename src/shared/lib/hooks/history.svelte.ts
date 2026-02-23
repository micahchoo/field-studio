/**
 * History — State container (Category 2)
 *
 * Replaces useHistory React hook.
 * Architecture doc §4 Cat 2: Reactive class in .svelte.ts
 *
 * Generic undo/redo with configurable max depth.
 * Exported as a CLASS (not singleton) — each consumer creates their own instance.
 *
 * Usage in Svelte:
 *   let history = new HistoryStore<MyState>(initialState, 50);
 *   history.update(newState);
 *   history.undo();
 */

export class HistoryStore<T> {
  #past = $state<T[]>([]);
  #present: T;
  #future = $state<T[]>([]);
  #maxHistory: number;

  constructor(initialPresent: T, maxHistory = 50) {
    this.#present = $state(initialPresent) as T;
    this.#maxHistory = maxHistory;
  }

  get state(): T { return this.#present; }
  get canUndo(): boolean { return this.#past.length > 0; }
  get canRedo(): boolean { return this.#future.length > 0; }
  get pastLength(): number { return this.#past.length; }
  get futureLength(): number { return this.#future.length; }

  /** Push a new state, clearing the redo stack */
  update(newPresent: T | ((curr: T) => T)): void {
    const resolved = typeof newPresent === 'function'
      ? (newPresent as (curr: T) => T)(this.#present)
      : newPresent;

    // Skip if identical (shallow JSON comparison)
    if (JSON.stringify(resolved) === JSON.stringify(this.#present)) return;

    this.#past = [...this.#past.slice(-(this.#maxHistory - 1)), this.#present];
    this.#present = resolved;
    this.#future = [];
  }

  /** Replace state without adding to history */
  set(newPresent: T): void {
    this.#past = [];
    this.#present = newPresent;
    this.#future = [];
  }

  /** Move back one step */
  undo(): void {
    if (this.#past.length === 0) return;
    const newPast = [...this.#past];
    const newPresent = newPast.pop()!;
    this.#future = [this.#present, ...this.#future];
    this.#past = newPast;
    this.#present = newPresent;
  }

  /** Move forward one step */
  redo(): void {
    if (this.#future.length === 0) return;
    const newFuture = [...this.#future];
    const newPresent = newFuture.shift()!;
    this.#past = [...this.#past, this.#present];
    this.#future = newFuture;
    this.#present = newPresent;
  }
}
