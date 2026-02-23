/**
 * useGridLassoSelect Hook
 *
 * Click+drag on empty grid space draws a selection rectangle.
 * Items intersecting the rectangle are selected via AABB collision.
 *
 * Uses viewport coordinates and DOM-based collision detection.
 *
 * @module features/archive/hooks/useGridLassoSelect
 */

import { useCallback, useRef, useState } from 'react';

export interface LassoRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UseGridLassoSelectOptions {
  /** CSS selector for grid items */
  itemSelector?: string;
  /** Minimum drag distance to activate lasso */
  threshold?: number;
  /** Whether lasso is disabled (e.g. during reorder mode) */
  disabled?: boolean;
  /** Called with selected item IDs when lasso completes */
  onSelect?: (ids: string[]) => void;
}

export interface UseGridLassoSelectReturn {
  isLassoing: boolean;
  lassoRect: LassoRect | null;
  lassoHandlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
  };
}

export function useGridLassoSelect(
  options: UseGridLassoSelectOptions = {}
): UseGridLassoSelectReturn {
  const {
    itemSelector = '[data-grid-item]',
    threshold = 5,
    disabled = false,
    onSelect,
  } = options;

  const [isLassoing, setIsLassoing] = useState(false);
  const [lassoRect, setLassoRect] = useState<LassoRect | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const activatedRef = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled || e.button !== 0) return;
    // Only activate on empty space, not on grid items
    const target = e.target as HTMLElement;
    if (target.closest(itemSelector)) return;

    startRef.current = { x: e.clientX, y: e.clientY };
    activatedRef.current = false;
  }, [disabled, itemSelector]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!startRef.current) return;

    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;

    // Check threshold before activating
    if (!activatedRef.current) {
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
      activatedRef.current = true;
      setIsLassoing(true);
    }

    setLassoRect({
      x: Math.min(startRef.current.x, e.clientX),
      y: Math.min(startRef.current.y, e.clientY),
      width: Math.abs(dx),
      height: Math.abs(dy),
    });
  }, [threshold]);

  const onMouseUp = useCallback(() => {
    if (!startRef.current) return;

    if (activatedRef.current && lassoRect && lassoRect.width >= threshold && lassoRect.height >= threshold) {
      // Find intersecting items via DOM
      const items = document.querySelectorAll(itemSelector);
      const selectedIds: string[] = [];

      items.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const id = el.getAttribute('data-item-id');
        if (!id) return;

        // AABB intersection test
        const intersects = !(
          rect.right < lassoRect.x ||
          rect.left > lassoRect.x + lassoRect.width ||
          rect.bottom < lassoRect.y ||
          rect.top > lassoRect.y + lassoRect.height
        );

        if (intersects) selectedIds.push(id);
      });

      if (selectedIds.length > 0) {
        onSelect?.(selectedIds);
      }
    }

    startRef.current = null;
    activatedRef.current = false;
    setIsLassoing(false);
    setLassoRect(null);
  }, [lassoRect, threshold, itemSelector, onSelect]);

  return {
    isLassoing,
    lassoRect,
    lassoHandlers: { onMouseDown, onMouseMove, onMouseUp },
  };
}

export default useGridLassoSelect;
