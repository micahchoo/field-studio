/**
 * useVirtualization - Efficient list/grid virtualization for large datasets
 * 
 * Provides scroll-based virtualization to render only visible items,
 * improving performance with large IIIF archives.
 */

import { useState, useEffect, useMemo, RefObject } from 'react';

export interface UseVirtualizationOptions {
  totalItems: number;
  itemHeight: number;
  containerRef: RefObject<HTMLElement | null>;
  overscan?: number;
}

export interface UseVirtualizationReturn {
  visibleRange: { start: number; end: number };
  totalHeight: number;
  topSpacer: number;
  bottomSpacer: number;
}

/**
 * Virtualization hook for efficient rendering of large lists
 * Only renders items visible in the viewport plus overscan buffer
 */
export function useVirtualization(options: UseVirtualizationOptions): UseVirtualizationReturn {
  const { totalItems, itemHeight, containerRef, overscan = 5 } = options;
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateVisibleRange = () => {
      const scrollTop = container.scrollTop;
      const viewportHeight = container.clientHeight;

      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const visibleCount = Math.ceil(viewportHeight / itemHeight);
      const end = Math.min(totalItems, start + visibleCount + overscan * 2);

      setVisibleRange(prev => {
        if (prev.start === start && prev.end === end) return prev;
        return { start, end };
      });
    };

    updateVisibleRange();
    container.addEventListener('scroll', updateVisibleRange, { passive: true });
    window.addEventListener('resize', updateVisibleRange);

    return () => {
      container.removeEventListener('scroll', updateVisibleRange);
      window.removeEventListener('resize', updateVisibleRange);
    };
  }, [totalItems, itemHeight, containerRef, overscan]);

  const totalHeight = useMemo(() => totalItems * itemHeight, [totalItems, itemHeight]);
  const topSpacer = visibleRange.start * itemHeight;
  const bottomSpacer = Math.max(0, totalHeight - (visibleRange.end * itemHeight));

  return {
    visibleRange,
    totalHeight,
    topSpacer,
    bottomSpacer
  };
}

export interface UseGridVirtualizationOptions {
  totalItems: number;
  itemSize: { width: number; height: number };
  containerRef: RefObject<HTMLElement | null>;
  columnsOverride?: number;
  overscan?: number;
  gap?: number;
}

export interface UseGridVirtualizationReturn extends UseVirtualizationReturn {
  columns: number;
  rowHeight: number;
}

/**
 * Grid virtualization for 2D layouts with dynamic column calculation
 * Automatically calculates columns based on container width
 */
export function useGridVirtualization(options: UseGridVirtualizationOptions): UseGridVirtualizationReturn {
  const { totalItems, itemSize, containerRef, columnsOverride, overscan = 2, gap = 16 } = options;
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const [columns, setColumns] = useState(columnsOverride || 4);

  const rowHeight = itemSize.height + gap;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateVisibleRange = () => {
      const scrollTop = container.scrollTop;
      const viewportHeight = container.clientHeight;
      const viewportWidth = container.clientWidth;

      // Calculate columns based on container width if not overridden
      const padding = 48; // 1.5rem padding on each side
      const availableWidth = viewportWidth - padding;
      const calculatedColumns = columnsOverride || Math.max(1, Math.floor(availableWidth / (itemSize.width + gap)));
      setColumns(calculatedColumns);

      const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
      const visibleRows = Math.ceil(viewportHeight / rowHeight);
      const endRow = startRow + visibleRows + overscan * 2;

      const start = startRow * calculatedColumns;
      const end = Math.min(totalItems, endRow * calculatedColumns);

      setVisibleRange(prev => {
        if (prev.start === start && prev.end === end) return prev;
        return { start, end };
      });
    };

    updateVisibleRange();
    container.addEventListener('scroll', updateVisibleRange, { passive: true });
    window.addEventListener('resize', updateVisibleRange);

    // Use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(updateVisibleRange);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', updateVisibleRange);
      window.removeEventListener('resize', updateVisibleRange);
      resizeObserver.disconnect();
    };
  }, [totalItems, itemSize, containerRef, columnsOverride, overscan, gap, rowHeight]);

  const totalRows = Math.ceil(totalItems / columns);
  const totalHeight = totalRows * rowHeight;
  const startRow = Math.floor(visibleRange.start / columns);
  const topSpacer = startRow * rowHeight;
  const endRow = Math.ceil(visibleRange.end / columns);
  const bottomSpacer = Math.max(0, (totalRows - endRow) * rowHeight);

  return {
    visibleRange,
    columns,
    totalHeight,
    topSpacer,
    bottomSpacer,
    rowHeight
  };
}

export default useVirtualization;
