/**
 * Keyboard Navigation — DOM behavior action (Category 3)
 *
 * Replaces useKeyboardNav React hook.
 * Architecture doc §4 Cat 3: Svelte action (use:keyboardNav)
 *
 * Handles up/down/Home/End/PageUp/PageDown for list navigation.
 * The action manages focus among child elements marked with [data-nav-item].
 *
 * Usage: <ul use:keyboardNav={{ onSelect, orientation: 'vertical' }}>
 */

export interface KeyboardNavParams {
  /** Called when an item is selected (Enter/Space) */
  onSelect?: (index: number) => void;
  /** Navigation orientation */
  orientation?: 'vertical' | 'horizontal';
  /** CSS selector for navigable items (default: '[data-nav-item]') */
  itemSelector?: string;
  /** Wrap around at boundaries (default: true) */
  wrap?: boolean;
  /** Page size for PageUp/PageDown (default: 10) */
  pageSize?: number;
}

export function keyboardNav(node: HTMLElement, params: KeyboardNavParams = {}) {
  let {
    onSelect,
    orientation = 'vertical',
    itemSelector = '[data-nav-item]',
    wrap = true,
    pageSize = 10,
  } = params;

  function getItems(): HTMLElement[] {
    return Array.from(node.querySelectorAll<HTMLElement>(itemSelector));
  }

  function getCurrentIndex(items: HTMLElement[]): number {
    const active = document.activeElement;
    return items.indexOf(active as HTMLElement);
  }

  function focusItem(items: HTMLElement[], index: number) {
    if (items.length === 0) return;
    const clamped = wrap
      ? ((index % items.length) + items.length) % items.length
      : Math.max(0, Math.min(index, items.length - 1));
    items[clamped]?.focus();
  }

  function handleKeydown(e: KeyboardEvent) {
    const items = getItems();
    if (items.length === 0) return;

    const current = getCurrentIndex(items);
    const isVertical = orientation === 'vertical';

    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';

    switch (e.key) {
      case prevKey:
        e.preventDefault();
        focusItem(items, current - 1);
        break;
      case nextKey:
        e.preventDefault();
        focusItem(items, current + 1);
        break;
      case 'Home':
        e.preventDefault();
        focusItem(items, 0);
        break;
      case 'End':
        e.preventDefault();
        focusItem(items, items.length - 1);
        break;
      case 'PageUp':
        e.preventDefault();
        focusItem(items, current - pageSize);
        break;
      case 'PageDown':
        e.preventDefault();
        focusItem(items, current + pageSize);
        break;
      case 'Enter':
      case ' ':
        if (current !== -1) {
          e.preventDefault();
          onSelect?.(current);
        }
        break;
    }
  }

  node.addEventListener('keydown', handleKeydown);

  return {
    update(newParams: KeyboardNavParams) {
      onSelect = newParams.onSelect;
      orientation = newParams.orientation ?? 'vertical';
      itemSelector = newParams.itemSelector ?? '[data-nav-item]';
      wrap = newParams.wrap ?? true;
      pageSize = newParams.pageSize ?? 10;
    },
    destroy() {
      node.removeEventListener('keydown', handleKeydown);
    },
  };
}
