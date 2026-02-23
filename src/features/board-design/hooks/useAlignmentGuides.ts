/**
 * useAlignmentGuides Hook
 *
 * During item drag, computes alignment guides against other items.
 *
 * @module features/board-design/hooks/useAlignmentGuides
 */

import { useCallback, useState } from 'react';
import type { BoardItem } from '../model';

export interface AlignmentGuide {
  type: 'horizontal' | 'vertical';
  position: number;
}

const SNAP_THRESHOLD = 8;

export interface UseAlignmentGuidesReturn {
  guides: AlignmentGuide[];
  computeGuides: (draggedId: string, draggedPos: { x: number; y: number }, draggedSize: { w: number; h: number }, items: BoardItem[]) => { x: number; y: number };
  clearGuides: () => void;
}

export function useAlignmentGuides(): UseAlignmentGuidesReturn {
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);

  const computeGuides = useCallback((
    draggedId: string,
    draggedPos: { x: number; y: number },
    draggedSize: { w: number; h: number },
    items: BoardItem[],
  ): { x: number; y: number } => {
    const others = items.filter(i => i.id !== draggedId);
    const newGuides: AlignmentGuide[] = [];
    let snappedX = draggedPos.x;
    let snappedY = draggedPos.y;

    const dragLeft = draggedPos.x;
    const dragCenterX = draggedPos.x + draggedSize.w / 2;
    const dragRight = draggedPos.x + draggedSize.w;
    const dragTop = draggedPos.y;
    const dragCenterY = draggedPos.y + draggedSize.h / 2;
    const dragBottom = draggedPos.y + draggedSize.h;

    for (const other of others) {
      const otherLeft = other.x;
      const otherCenterX = other.x + other.w / 2;
      const otherRight = other.x + other.w;
      const otherTop = other.y;
      const otherCenterY = other.y + other.h / 2;
      const otherBottom = other.y + other.h;

      // Vertical guides (snap X)
      if (Math.abs(dragLeft - otherLeft) < SNAP_THRESHOLD) { snappedX = otherLeft; newGuides.push({ type: 'vertical', position: otherLeft }); }
      else if (Math.abs(dragCenterX - otherCenterX) < SNAP_THRESHOLD) { snappedX = otherCenterX - draggedSize.w / 2; newGuides.push({ type: 'vertical', position: otherCenterX }); }
      else if (Math.abs(dragRight - otherRight) < SNAP_THRESHOLD) { snappedX = otherRight - draggedSize.w; newGuides.push({ type: 'vertical', position: otherRight }); }
      else if (Math.abs(dragLeft - otherRight) < SNAP_THRESHOLD) { snappedX = otherRight; newGuides.push({ type: 'vertical', position: otherRight }); }
      else if (Math.abs(dragRight - otherLeft) < SNAP_THRESHOLD) { snappedX = otherLeft - draggedSize.w; newGuides.push({ type: 'vertical', position: otherLeft }); }

      // Horizontal guides (snap Y)
      if (Math.abs(dragTop - otherTop) < SNAP_THRESHOLD) { snappedY = otherTop; newGuides.push({ type: 'horizontal', position: otherTop }); }
      else if (Math.abs(dragCenterY - otherCenterY) < SNAP_THRESHOLD) { snappedY = otherCenterY - draggedSize.h / 2; newGuides.push({ type: 'horizontal', position: otherCenterY }); }
      else if (Math.abs(dragBottom - otherBottom) < SNAP_THRESHOLD) { snappedY = otherBottom - draggedSize.h; newGuides.push({ type: 'horizontal', position: otherBottom }); }
      else if (Math.abs(dragTop - otherBottom) < SNAP_THRESHOLD) { snappedY = otherBottom; newGuides.push({ type: 'horizontal', position: otherBottom }); }
      else if (Math.abs(dragBottom - otherTop) < SNAP_THRESHOLD) { snappedY = otherTop - draggedSize.h; newGuides.push({ type: 'horizontal', position: otherTop }); }
    }

    setGuides(newGuides);
    return { x: snappedX, y: snappedY };
  }, []);

  const clearGuides = useCallback(() => {
    setGuides([]);
  }, []);

  return { guides, computeGuides, clearGuides };
}
