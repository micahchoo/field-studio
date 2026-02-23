/**
 * Keyboard Drag Drop -- DOM behavior action (Category 3)
 *
 * Replaces useKeyboardDragDrop React hook.
 * Architecture doc S4 Cat 3: Svelte action (use:keyboardDragDrop)
 *
 * Provides keyboard-accessible drag-and-drop as an alternative to mouse
 * operations. Implements the ARIA drag-and-drop pattern:
 *   - Space: pick up / drop the focused item
 *   - Arrow keys: move focus (or move the grabbed item)
 *   - Enter: confirm drop at current position
 *   - Escape: cancel drag
 *   - Home / End: jump to first / last item
 *
 * A live region is injected for screen reader announcements so that
 * drag operations are perceivable without vision.
 *
 * Usage:
 *   <ul use:keyboardDragDrop={{
 *     items: canvasItems,
 *     onReorder: handleReorder,
 *     orientation: 'vertical',
 *   }}>
 *     {#each items as item}
 *       <li data-kbd-drag-item={item.id} tabindex="0">{item.label}</li>
 *     {/each}
 *   </ul>
 */

// ---------------------------------------------------------------------------
// Conversion strategy
// ---------------------------------------------------------------------------
// The React hook used useState for focusedIndex/selectedIndex/isDragging and
// useEffect for keydown listener + ARIA live region injection. In the Svelte
// action all mutable state is plain variables, the live region is a DOM
// element appended on init and removed on destroy, and keyboard handling is a
// single keydown listener on `node`.
//
// Key behaviors:
//   1. Items are discovered via [data-kbd-drag-item] children
//   2. Focus is managed manually via .focus() calls
//   3. aria-grabbed / aria-dropeffect are set on items during drag
//   4. Announcements go to an aria-live="assertive" region
//   5. canDropOn callback gates whether a drop position is valid
//   6. Supports both vertical and horizontal orientation
// ---------------------------------------------------------------------------

export interface KeyboardDragDropParams {
  /** The ordered list of draggable items. Each must have an id and optional label. */
  items: { id: string; label?: string }[];
  /** Called when an item is reordered. Receives source and destination indices. */
  onReorder?: (fromIndex: number, toIndex: number) => void;
  /** Called when an item is moved onto a target (for tree-style drops). */
  onMove?: (itemId: string, targetId: string) => void;
  /** Predicate: can `itemId` be dropped on `targetId`? (default: always true) */
  canDropOn?: (itemId: string, targetId: string) => boolean;
  /** Navigation axis (default: 'vertical') */
  orientation?: 'vertical' | 'horizontal';
}

const ITEM_SELECTOR = '[data-kbd-drag-item]';

export function keyboardDragDrop(node: HTMLElement, params: KeyboardDragDropParams) {
  let {
    items,
    onReorder,
    onMove,
    canDropOn,
    orientation = 'vertical',
  } = params;

  // ---- Mutable state (plain variables, no runes) ----
  let focusedIndex = -1;
  let grabbedIndex = -1;
  let isDragging = false;

  // ---- Live region for screen reader announcements ----

  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'assertive');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.style.cssText =
    'position:absolute;width:1px;height:1px;padding:0;margin:-1px;' +
    'overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
  node.appendChild(liveRegion);

  function announce(message: string): void {
    // Clear then set on next tick so AT picks up repeated identical messages
    liveRegion.textContent = '';
    requestAnimationFrame(() => {
      liveRegion.textContent = message;
    });
  }

  // ---- DOM item helpers ----

  function getItemElements(): HTMLElement[] {
    return Array.from(node.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
  }

  function getItemLabel(index: number): string {
    if (index < 0 || index >= items.length) return '';
    return items[index].label || items[index].id;
  }

  function getItemId(index: number): string {
    if (index < 0 || index >= items.length) return '';
    return items[index].id;
  }

  // ---- Focus management ----

  function focusItemAt(index: number): void {
    const els = getItemElements();
    if (els.length === 0) return;
    const clamped = Math.max(0, Math.min(index, els.length - 1));
    focusedIndex = clamped;
    els[clamped]?.focus();
  }

  // ---- ARIA attribute management ----

  function updateAriaAttributes(): void {
    const els = getItemElements();
    els.forEach((el, i) => {
      if (isDragging && i === grabbedIndex) {
        el.setAttribute('aria-grabbed', 'true');
      } else if (isDragging) {
        el.setAttribute('aria-grabbed', 'false');
        // Mark potential drop targets
        const targetId = el.getAttribute('data-kbd-drag-item') || '';
        const sourceId = getItemId(grabbedIndex);
        const droppable = canDropOn ? canDropOn(sourceId, targetId) : true;
        el.setAttribute('aria-dropeffect', droppable ? 'move' : 'none');
      } else {
        el.removeAttribute('aria-grabbed');
        el.removeAttribute('aria-dropeffect');
      }

      // Visual feedback via data attributes
      if (isDragging) {
        if (i === grabbedIndex) {
          el.setAttribute('data-kbd-drag-state', 'grabbed');
        } else if (i === focusedIndex) {
          el.setAttribute('data-kbd-drag-state', 'drop-target');
        } else {
          el.removeAttribute('data-kbd-drag-state');
        }
      } else {
        el.removeAttribute('data-kbd-drag-state');
      }
    });
  }

  function clearAriaAttributes(): void {
    const els = getItemElements();
    els.forEach((el) => {
      el.removeAttribute('aria-grabbed');
      el.removeAttribute('aria-dropeffect');
      el.removeAttribute('data-kbd-drag-state');
    });
  }

  // ---- Drag operations ----

  function startDrag(): void {
    if (focusedIndex < 0 || focusedIndex >= items.length) return;

    isDragging = true;
    grabbedIndex = focusedIndex;
    updateAriaAttributes();

    const label = getItemLabel(grabbedIndex);
    announce(`Grabbed ${label}. Use arrow keys to move, Enter to drop, Escape to cancel.`);
  }

  function cancelDrag(): void {
    if (!isDragging) return;

    const label = getItemLabel(grabbedIndex);
    isDragging = false;

    // Return focus to the original position
    focusItemAt(grabbedIndex);
    grabbedIndex = -1;
    clearAriaAttributes();

    announce(`Cancelled. ${label} returned to original position.`);
  }

  function confirmDrop(): void {
    if (!isDragging) return;

    const sourceIndex = grabbedIndex;
    const targetIndex = focusedIndex;
    const sourceId = getItemId(sourceIndex);
    const targetId = getItemId(targetIndex);
    const sourceLabel = getItemLabel(sourceIndex);
    const targetLabel = getItemLabel(targetIndex);

    // Check if drop is allowed
    if (canDropOn && !canDropOn(sourceId, targetId)) {
      announce(`Cannot drop ${sourceLabel} on ${targetLabel}.`);
      return;
    }

    isDragging = false;
    grabbedIndex = -1;
    clearAriaAttributes();

    if (sourceIndex === targetIndex) {
      announce(`${sourceLabel} not moved.`);
      return;
    }

    // Fire appropriate callback
    if (onReorder) {
      onReorder(sourceIndex, targetIndex);
      announce(`Dropped ${sourceLabel} ${targetIndex < sourceIndex ? 'before' : 'after'} ${targetLabel}. Position ${targetIndex + 1} of ${items.length}.`);
    } else if (onMove) {
      onMove(sourceId, targetId);
      announce(`Moved ${sourceLabel} onto ${targetLabel}.`);
    }
  }

  // ---- Keyboard handler ----

  function handleKeydown(e: KeyboardEvent): void {
    // Do not handle if target is an input/textarea/select within the container
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT'
    ) {
      return;
    }

    // Determine navigation keys based on orientation
    const isVertical = orientation === 'vertical';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';

    let handled = true;

    switch (e.key) {
      // ---- Navigation ----
      case prevKey:
        if (focusedIndex > 0) {
          focusItemAt(focusedIndex - 1);
          if (isDragging) {
            updateAriaAttributes();
            announce(`${getItemLabel(grabbedIndex)} over ${getItemLabel(focusedIndex)}, position ${focusedIndex + 1} of ${items.length}.`);
          }
        }
        break;

      case nextKey:
        if (focusedIndex < items.length - 1) {
          focusItemAt(focusedIndex + 1);
          if (isDragging) {
            updateAriaAttributes();
            announce(`${getItemLabel(grabbedIndex)} over ${getItemLabel(focusedIndex)}, position ${focusedIndex + 1} of ${items.length}.`);
          }
        }
        break;

      case 'Home':
        focusItemAt(0);
        if (isDragging) {
          updateAriaAttributes();
          announce(`${getItemLabel(grabbedIndex)} over ${getItemLabel(0)}, position 1 of ${items.length}.`);
        }
        break;

      case 'End':
        focusItemAt(items.length - 1);
        if (isDragging) {
          updateAriaAttributes();
          announce(`${getItemLabel(grabbedIndex)} over ${getItemLabel(focusedIndex)}, position ${items.length} of ${items.length}.`);
        }
        break;

      // ---- Drag lifecycle ----
      case ' ':
        // Space: pick up if not dragging, or drop if dragging
        if (isDragging) {
          confirmDrop();
        } else {
          startDrag();
        }
        break;

      case 'Enter':
        if (isDragging) {
          confirmDrop();
        } else {
          handled = false;
        }
        break;

      case 'Escape':
        if (isDragging) {
          cancelDrag();
        } else {
          handled = false;
        }
        break;

      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // ---- Focus tracking: keep focusedIndex in sync with actual DOM focus ----

  function handleFocusIn(e: FocusEvent): void {
    const target = e.target as HTMLElement;
    if (!target.matches(ITEM_SELECTOR)) return;

    const els = getItemElements();
    const index = els.indexOf(target);
    if (index !== -1) {
      focusedIndex = index;
    }
  }

  // ---- Initialization ----

  // Ensure container is focusable for initial tab-in
  if (!node.hasAttribute('tabindex')) {
    node.setAttribute('role', 'listbox');
    // Items themselves should have tabindex; the container does not need one
    // unless no items exist. We set aria-label for the container.
  }
  node.setAttribute('aria-roledescription', 'reorderable list');

  // Make sure all items have tabindex
  function ensureItemTabindex(): void {
    const els = getItemElements();
    els.forEach((el, i) => {
      if (!el.hasAttribute('tabindex')) {
        el.setAttribute('tabindex', i === 0 ? '0' : '-1');
      }
      el.setAttribute('role', 'option');
    });
  }

  ensureItemTabindex();

  node.addEventListener('keydown', handleKeydown);
  node.addEventListener('focusin', handleFocusIn);

  // ---- Action return ----

  return {
    update(newParams: KeyboardDragDropParams) {
      items = newParams.items;
      onReorder = newParams.onReorder;
      onMove = newParams.onMove;
      canDropOn = newParams.canDropOn;
      orientation = newParams.orientation ?? 'vertical';

      // Re-apply tabindex to any new items
      ensureItemTabindex();

      // If we were dragging and items changed, cancel
      if (isDragging && grabbedIndex >= items.length) {
        cancelDrag();
      }
    },

    destroy() {
      // Cancel any active drag
      if (isDragging) {
        cancelDrag();
      }

      clearAriaAttributes();
      node.removeEventListener('keydown', handleKeydown);
      node.removeEventListener('focusin', handleFocusIn);

      // Remove the injected live region
      if (liveRegion.parentNode) {
        liveRegion.parentNode.removeChild(liveRegion);
      }
    },
  };
}
