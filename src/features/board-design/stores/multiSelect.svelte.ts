/**
 * Board Multi-Select — State container (Category 2)
 *
 * Replaces useMultiSelect React hook from board-design.
 * Architecture doc §4 Cat 2: Reactive class in .svelte.ts
 *
 * Manages multi-item selection for the board canvas.
 * Scoped class — each board view creates its own.
 */

export interface BoardItemLike {
  id: string;
  x: number;
  y: number;
}

export class BoardMultiSelectStore {
  #selectedIds = $state<Set<string>>(new Set());

  get selectedIds(): Set<string> { return this.#selectedIds; }
  get count(): number { return this.#selectedIds.size; }
  get hasSelection(): boolean { return this.#selectedIds.size > 0; }

  toggleItem(id: string, shiftKey: boolean): void {
    if (shiftKey) {
      const next = new Set(this.#selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      this.#selectedIds = next;
    } else {
      this.#selectedIds = new Set([id]);
    }
  }

  selectItems(ids: string[]): void {
    this.#selectedIds = new Set(ids);
  }

  clearSelection(): void {
    this.#selectedIds = new Set();
  }

  selectAll(items: BoardItemLike[]): void {
    this.#selectedIds = new Set(items.map(i => i.id));
  }

  isSelected(id: string): boolean {
    return this.#selectedIds.has(id);
  }

  /** Delete selected items via provided callback */
  deleteSelected(removeItem: (id: string) => void): void {
    this.#selectedIds.forEach(id => removeItem(id));
    this.#selectedIds = new Set();
  }

  /** Move selected items by delta via provided callback */
  moveSelected(
    dx: number,
    dy: number,
    moveItem: (id: string, pos: { x: number; y: number }) => void,
    items: BoardItemLike[]
  ): void {
    this.#selectedIds.forEach(id => {
      const item = items.find(i => i.id === id);
      if (item) moveItem(id, { x: item.x + dx, y: item.y + dy });
    });
  }
}
