/**
 * Grid Lasso Select — DOM behavior action (Category 3)
 *
 * Replaces useGridLassoSelect React hook.
 * Architecture doc §4 Cat 3: Svelte action (use:gridLassoSelect)
 *
 * Click-drag lasso selection on archive grid with AABB collision.
 */

export interface LassoRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LassoParams {
  /** CSS selector for grid items (default: '[data-grid-item]') */
  itemSelector?: string;
  /** Called with IDs of items intersecting the lasso */
  onSelect?: (ids: string[]) => void;
  /** Called continuously while dragging with the lasso rect */
  onUpdate?: (rect: LassoRect | null) => void;
  /** Whether lasso is enabled (default: true) */
  enabled?: boolean;
}

function rectsIntersect(a: LassoRect, b: DOMRect, containerRect: DOMRect): boolean {
  const bRel = {
    x: b.left - containerRect.left,
    y: b.top - containerRect.top,
    width: b.width,
    height: b.height,
  };
  return !(
    a.x + a.width < bRel.x ||
    bRel.x + bRel.width < a.x ||
    a.y + a.height < bRel.y ||
    bRel.y + bRel.height < a.y
  );
}

export function gridLassoSelect(node: HTMLElement, params: LassoParams = {}) {
  let {
    itemSelector = '[data-grid-item]',
    onSelect,
    onUpdate,
    enabled = true,
  } = params;

  let startX = 0;
  let startY = 0;
  let isDragging = false;

  function getLassoRect(clientX: number, clientY: number): LassoRect {
    const rect = node.getBoundingClientRect();
    const cx = clientX - rect.left + node.scrollLeft;
    const cy = clientY - rect.top + node.scrollTop;
    return {
      x: Math.min(startX, cx),
      y: Math.min(startY, cy),
      width: Math.abs(cx - startX),
      height: Math.abs(cy - startY),
    };
  }

  function getIntersectingIds(lasso: LassoRect): string[] {
    const containerRect = node.getBoundingClientRect();
    const items = node.querySelectorAll<HTMLElement>(itemSelector);
    const ids: string[] = [];
    items.forEach(item => {
      const itemRect = item.getBoundingClientRect();
      if (rectsIntersect(lasso, itemRect, containerRect)) {
        const id = item.dataset.gridItem || item.dataset.id;
        if (id) ids.push(id);
      }
    });
    return ids;
  }

  function handleMouseDown(e: MouseEvent) {
    if (!enabled || e.button !== 0) return;
    const rect = node.getBoundingClientRect();
    startX = e.clientX - rect.left + node.scrollLeft;
    startY = e.clientY - rect.top + node.scrollTop;
    isDragging = true;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    e.preventDefault();
    const lasso = getLassoRect(e.clientX, e.clientY);
    onUpdate?.(lasso);
    onSelect?.(getIntersectingIds(lasso));
  }

  function handleMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    onUpdate?.(null);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  node.addEventListener('mousedown', handleMouseDown);

  return {
    update(newParams: LassoParams) {
      itemSelector = newParams.itemSelector ?? '[data-grid-item]';
      onSelect = newParams.onSelect;
      onUpdate = newParams.onUpdate;
      enabled = newParams.enabled ?? true;
    },
    destroy() {
      node.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    },
  };
}
