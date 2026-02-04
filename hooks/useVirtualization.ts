/**
 * useVirtualization - Efficient list/grid virtualization for large datasets
 * 
 * Provides scroll-based virtualization to render only visible items,
 * improving performance with large IIIF archives.
 * 
 * Optimizations for 50k+ items:
 * - RAF throttled scroll handler
 * - Binary search for item lookup
 * - Memoized calculations
 */

import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface UseVirtualizationOptions {
  totalItems: number;
  itemHeight: number;
  containerRef: RefObject<HTMLElement | null>;
  overscan?: number;
  /**
   * Enable RAF throttling for smoother scrolling with large datasets
   * Recommended for 10k+ items
   */
  enableRAFThrottle?: boolean;
}

export interface UseVirtualizationReturn {
  visibleRange: { start: number; end: number };
  totalHeight: number;
  topSpacer: number;
  bottomSpacer: number;
  /**
   * Get item index at a specific scroll position (binary search)
   */
  getItemAtPosition: (scrollTop: number) => number;
  /**
   * Get scroll position for a specific item index
   */
  getPositionForItem: (index: number) => number;
}

/**
 * RAF throttled callback - ensures updates happen at most once per frame
 */
function useRAFThrottle<T extends (...args: unknown[]) => void>(
  callback: T
): (...args: Parameters<T>) => void {
  const rafId = useRef<number | null>(null);
  const pendingArgs = useRef<Parameters<T> | null>(null);

  return useCallback((...args: Parameters<T>) => {
    pendingArgs.current = args;

    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        if (pendingArgs.current) {
          callback(...pendingArgs.current);
        }
        rafId.current = null;
        pendingArgs.current = null;
      });
    }
  }, [callback]);
}

/**
 * Binary search for finding item index at a scroll position
 * O(log n) complexity - essential for 50k+ items
 */
function binarySearchItemIndex(scrollTop: number, itemHeight: number, totalItems: number): number {
  let left = 0;
  let right = totalItems - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midPosition = mid * itemHeight;

    if (midPosition <= scrollTop && scrollTop < midPosition + itemHeight) {
      return mid;
    }

    if (midPosition < scrollTop) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return Math.min(left, totalItems - 1);
}

/**
 * Virtualization hook for efficient rendering of large lists
 * Only renders items visible in the viewport plus overscan buffer
 * 
 * Performance optimizations:
 * - RAF throttled scroll updates for 60fps
 * - Binary search for O(log n) item lookup
 * - Memoized height calculations
 */
export function useVirtualization(options: UseVirtualizationOptions): UseVirtualizationReturn {
  const { 
    totalItems, 
    itemHeight, 
    containerRef, 
    overscan = 5,
    enableRAFThrottle = true 
  } = options;
  
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const isLargeDataset = totalItems > 10000;

  // Use binary search for large datasets
  const getItemAtPosition = useCallback((scrollTop: number): number => {
    if (isLargeDataset) {
      return binarySearchItemIndex(scrollTop, itemHeight, totalItems);
    }
    return Math.floor(scrollTop / itemHeight);
  }, [itemHeight, totalItems, isLargeDataset]);

  const getPositionForItem = useCallback((index: number): number => {
    return Math.max(0, Math.min(index, totalItems - 1)) * itemHeight;
  }, [itemHeight, totalItems]);

  // Core update logic
  const updateVisibleRange = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const {scrollTop} = container;
    const viewportHeight = container.clientHeight;

    const startIndex = getItemAtPosition(scrollTop);
    const visibleCount = Math.ceil(viewportHeight / itemHeight);
    
    const start = Math.max(0, startIndex - overscan);
    const end = Math.min(totalItems, startIndex + visibleCount + overscan);

    setVisibleRange(prev => {
      // Only update if range actually changed (prevents unnecessary re-renders)
      if (prev.start === start && prev.end === end) return prev;
      return { start, end };
    });
  }, [containerRef, itemHeight, overscan, totalItems, getItemAtPosition]);

  // RAF throttled version for smooth scrolling
  const throttledUpdate = useRAFThrottle(updateVisibleRange);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use RAF throttle for large datasets, direct updates for small
    const scrollHandler = isLargeDataset && enableRAFThrottle 
      ? throttledUpdate 
      : updateVisibleRange;

    updateVisibleRange();
    container.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('resize', updateVisibleRange);

    return () => {
      container.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('resize', updateVisibleRange);
    };
  }, [containerRef, updateVisibleRange, throttledUpdate, isLargeDataset, enableRAFThrottle]);

  const totalHeight = useMemo(() => totalItems * itemHeight, [totalItems, itemHeight]);
  const topSpacer = visibleRange.start * itemHeight;
  const bottomSpacer = Math.max(0, totalHeight - (visibleRange.end * itemHeight));

  return {
    visibleRange,
    totalHeight,
    topSpacer,
    bottomSpacer,
    getItemAtPosition,
    getPositionForItem
  };
}

export interface UseGridVirtualizationOptions {
  totalItems: number;
  itemSize: { width: number; height: number };
  containerRef: RefObject<HTMLElement | null>;
  columnsOverride?: number;
  overscan?: number;
  gap?: number;
  enableRAFThrottle?: boolean;
}

export interface UseGridVirtualizationReturn extends UseVirtualizationReturn {
  columns: number;
  rowHeight: number;
}

/**
 * Grid virtualization for 2D layouts with dynamic column calculation
 * Automatically calculates columns based on container width
 * 
 * Includes optimizations for 50k+ grid items
 */
export function useGridVirtualization(options: UseGridVirtualizationOptions): UseGridVirtualizationReturn {
  const { 
    totalItems, 
    itemSize, 
    containerRef, 
    columnsOverride, 
    overscan = 2, 
    gap = 16,
    enableRAFThrottle = true 
  } = options;
  
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const [columns, setColumns] = useState(columnsOverride || 4);
  const isLargeDataset = totalItems > 10000;

  const rowHeight = itemSize.height + gap;

  // Memoized column calculation
  const calculateColumns = useCallback((containerWidth: number): number => {
    if (columnsOverride) return columnsOverride;
    const padding = 48; // 1.5rem padding on each side
    const availableWidth = Math.max(0, containerWidth - padding);
    return Math.max(1, Math.floor(availableWidth / (itemSize.width + gap)));
  }, [columnsOverride, itemSize.width, gap]);

  const updateVisibleRange = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const {scrollTop} = container;
    const viewportHeight = container.clientHeight;
    const viewportWidth = container.clientWidth;

    // Calculate columns based on container width if not overridden
    const calculatedColumns = calculateColumns(viewportWidth);
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
  }, [containerRef, rowHeight, overscan, totalItems, calculateColumns]);

  // RAF throttled version
  const throttledUpdate = useRAFThrottle(updateVisibleRange);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollHandler = isLargeDataset && enableRAFThrottle 
      ? throttledUpdate 
      : updateVisibleRange;

    updateVisibleRange();
    container.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('resize', updateVisibleRange);

    // Use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(updateVisibleRange);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('resize', updateVisibleRange);
      resizeObserver.disconnect();
    };
  }, [containerRef, updateVisibleRange, throttledUpdate, isLargeDataset, enableRAFThrottle]);

  // Binary search for grid items
  const getItemAtPosition = useCallback((scrollTop: number): number => {
    const row = Math.floor(scrollTop / rowHeight);
    return Math.min(row * columns, totalItems - 1);
  }, [rowHeight, columns, totalItems]);

  const getPositionForItem = useCallback((index: number): number => {
    const row = Math.floor(index / columns);
    return row * rowHeight;
  }, [rowHeight, columns]);

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
    rowHeight,
    getItemAtPosition,
    getPositionForItem
  };
}

export default useVirtualization;
