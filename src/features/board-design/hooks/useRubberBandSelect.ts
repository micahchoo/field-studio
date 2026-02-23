/**
 * useRubberBandSelect Hook
 *
 * Manages rubber-band (marquee) selection geometry.
 *
 * @module features/board-design/hooks/useRubberBandSelect
 */

import { useCallback, useRef, useState } from 'react';
import type { BoardItem } from '../model';

export interface RubberBandRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UseRubberBandSelectReturn {
  isSelecting: boolean;
  selectionRect: RubberBandRect | null;
  startSelection: (canvasX: number, canvasY: number) => void;
  updateSelection: (canvasX: number, canvasY: number) => void;
  endSelection: (items: BoardItem[]) => string[];
  cancelSelection: () => void;
}

export function useRubberBandSelect(): UseRubberBandSelectReturn {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<RubberBandRect | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const startSelection = useCallback((canvasX: number, canvasY: number) => {
    startRef.current = { x: canvasX, y: canvasY };
    setIsSelecting(true);
    setSelectionRect({ x: canvasX, y: canvasY, width: 0, height: 0 });
  }, []);

  const updateSelection = useCallback((canvasX: number, canvasY: number) => {
    if (!startRef.current) return;
    const s = startRef.current;
    setSelectionRect({
      x: Math.min(s.x, canvasX),
      y: Math.min(s.y, canvasY),
      width: Math.abs(canvasX - s.x),
      height: Math.abs(canvasY - s.y),
    });
  }, []);

  const endSelection = useCallback((items: BoardItem[]): string[] => {
    if (!selectionRect || selectionRect.width < 5 || selectionRect.height < 5) {
      setIsSelecting(false);
      setSelectionRect(null);
      startRef.current = null;
      return [];
    }

    const r = selectionRect;
    const intersecting = items.filter(item => {
      return !(
        item.x + item.w < r.x ||
        item.x > r.x + r.width ||
        item.y + item.h < r.y ||
        item.y > r.y + r.height
      );
    }).map(i => i.id);

    setIsSelecting(false);
    setSelectionRect(null);
    startRef.current = null;
    return intersecting;
  }, [selectionRect]);

  const cancelSelection = useCallback(() => {
    setIsSelecting(false);
    setSelectionRect(null);
    startRef.current = null;
  }, []);

  return { isSelecting, selectionRect, startSelection, updateSelection, endSelection, cancelSelection };
}
