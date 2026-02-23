/**
 * Grid Virtualization — Pure computation (Category 1)
 *
 * Replaces useGridVirtualization React hook.
 * Architecture doc §4 Cat 1: plain function.
 *
 * Calculates visible range for large grid rendering.
 * Given container dimensions, scroll position, item sizes,
 * and total count, returns which items are visible plus
 * the total scrollable height and Y offset for positioning.
 */

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface GridVirtualizationConfig {
  /** Height of each grid item in pixels */
  itemHeight?: number;
  /** Width of each grid item in pixels */
  itemWidth?: number;
  /** Visible container height in pixels */
  containerHeight: number;
  /** Visible container width in pixels */
  containerWidth: number;
  /** Total number of items in the grid */
  totalItems: number;
  /** Current scroll offset from the top */
  scrollTop?: number;
  /** Gap between items in pixels (applied both horizontally and vertically) */
  gap?: number;
  /** Number of extra rows to render above and below the visible area */
  overscan?: number;
}

export interface VirtualizationResult {
  /** Inclusive start and exclusive end indices of visible items */
  visibleRange: { start: number; end: number };
  /** Number of columns that fit in the container width */
  columns: number;
  /** Total scrollable content height in pixels */
  totalHeight: number;
  /** Pixel offset for the first visible row (for CSS transform) */
  offsetY: number;
}

// --------------------------------------------------------------------------
// calculateGridVirtualization
// --------------------------------------------------------------------------

/**
 * Compute which items are visible and layout metrics.
 *
 * Pseudocode:
 *   1. Derive defaults for optional params (itemHeight=200, itemWidth=200, gap=8, overscan=2, scrollTop=0)
 *   2. Calculate columns = floor(containerWidth + gap) / (itemWidth + gap), min 1
 *   3. Calculate totalRows = ceil(totalItems / columns)
 *   4. Calculate rowHeight = itemHeight + gap
 *   5. Calculate totalHeight = totalRows * rowHeight - gap  (no trailing gap)
 *   6. Calculate firstVisibleRow = floor(scrollTop / rowHeight)
 *   7. Calculate visibleRowCount = ceil(containerHeight / rowHeight) + 1
 *   8. Apply overscan: startRow = max(0, firstVisibleRow - overscan)
 *   9.                  endRow   = min(totalRows, firstVisibleRow + visibleRowCount + overscan)
 *  10. Convert rows to item indices: start = startRow * columns, end = min(endRow * columns, totalItems)
 *  11. offsetY = startRow * rowHeight
 */
export function calculateGridVirtualization(
  config: GridVirtualizationConfig
): VirtualizationResult {
  // 1. Derive defaults
  const itemHeight = config.itemHeight ?? 200;
  const itemWidth = config.itemWidth ?? 200;
  const gap = config.gap ?? 8;
  const overscan = config.overscan ?? 2;
  const scrollTop = config.scrollTop ?? 0;
  const { containerHeight, containerWidth, totalItems } = config;

  // Edge case: nothing to show
  if (totalItems <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { visibleRange: { start: 0, end: 0 }, columns: 1, totalHeight: 0, offsetY: 0 };
  }

  // 2. Calculate columns — how many items fit horizontally
  const columns = Math.max(1, Math.floor((containerWidth + gap) / (itemWidth + gap)));

  // 3. Total rows needed
  const totalRows = Math.ceil(totalItems / columns);

  // 4. Row height including gap
  const rowHeight = itemHeight + gap;

  // 5. Total scrollable height (subtract trailing gap from last row)
  const totalHeight = totalRows > 0 ? totalRows * rowHeight - gap : 0;

  // 6. First visible row based on scroll position
  const firstVisibleRow = Math.floor(scrollTop / rowHeight);

  // 7. Number of rows visible in the viewport (+1 for partial visibility)
  const visibleRowCount = Math.ceil(containerHeight / rowHeight) + 1;

  // 8. Apply overscan for smoother scrolling
  const startRow = Math.max(0, firstVisibleRow - overscan);
  const endRow = Math.min(totalRows, firstVisibleRow + visibleRowCount + overscan);

  // 9. Convert rows to flat item indices
  const start = startRow * columns;
  const end = Math.min(endRow * columns, totalItems);

  // 10. Pixel offset for CSS transform positioning
  const offsetY = startRow * rowHeight;

  return {
    visibleRange: { start, end },
    columns,
    totalHeight,
    offsetY,
  };
}
