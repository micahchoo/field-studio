/**
 * Selection Store — State container (Category 2)
 *
 * Replaces useSharedSelection React hook.
 * Architecture doc §4 Cat 2: Reactive class in .svelte.ts
 * Architecture doc §3.A: Module store (global singleton)
 *
 * Manages shared multi-item selection with modifier key support.
 */

export class SelectionStore {
  #ids = $state<Set<string>>(new Set());

  get ids(): Set<string> { return this.#ids; }
  get count(): number { return this.#ids.size; }

  /** Replace selection with one or more IDs */
  select(id: string | string[]): void {
    const ids = Array.isArray(id) ? id : [id];
    const next = new Set(this.#ids);
    ids.forEach(i => next.add(i));
    this.#ids = next;
  }

  /** Set selection to exactly these IDs (replaces current) */
  set(ids: string[]): void {
    this.#ids = new Set(ids);
  }

  /** Clear all selection */
  clear(): void {
    this.#ids = new Set();
  }

  /** Check if an ID is selected */
  isSelected(id: string): boolean {
    return this.#ids.has(id);
  }

  /** Toggle a single ID */
  toggle(id: string): void {
    const next = new Set(this.#ids);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.#ids = next;
  }

  /**
   * Handle selection with keyboard modifiers.
   * - Ctrl/Cmd: toggle
   * - Shift: range select (requires items array for index lookup)
   * - Plain click: single select
   */
  selectWithModifier(
    id: string,
    modifiers: { ctrlKey: boolean; shiftKey: boolean },
    items?: Array<{ id: string }>
  ): void {
    if (modifiers.ctrlKey) {
      this.toggle(id);
    } else if (modifiers.shiftKey && items && items.length > 0) {
      const lastSelected = Array.from(this.#ids).pop();
      if (lastSelected) {
        const lastIndex = items.findIndex(item => item.id === lastSelected);
        const currentIndex = items.findIndex(item => item.id === id);
        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const rangeIds = items.slice(start, end + 1).map(item => item.id);
          const next = new Set(this.#ids);
          rangeIds.forEach(i => next.add(i));
          this.#ids = next;
        } else {
          this.select(id);
        }
      } else {
        this.select(id);
      }
    } else {
      // Single selection (replace)
      this.#ids = new Set([id]);
    }
  }
}

/** Global singleton instance */
export const selection = new SelectionStore();
