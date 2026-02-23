/**
 * Alignment Guides — Pure computation (Category 1)
 *
 * Replaces useAlignmentGuides React hook.
 * Architecture doc §4 Cat 1: plain function.
 *
 * Snap-to-grid alignment guides for board item dragging.
 */

export interface AlignmentGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  label?: string;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SNAP_THRESHOLD = 8; // pixels

/**
 * Calculate alignment guides for a dragging item against other items.
 * Returns guides that are within snap threshold.
 */
export function calculateAlignmentGuides(
  dragItem: Rect,
  otherItems: Rect[],
  snapThreshold = SNAP_THRESHOLD
): { guides: AlignmentGuide[]; snappedX: number | null; snappedY: number | null } {
  const guides: AlignmentGuide[] = [];
  let snappedX: number | null = null;
  let snappedY: number | null = null;

  const dragCenter = {
    x: dragItem.x + dragItem.width / 2,
    y: dragItem.y + dragItem.height / 2,
  };

  for (const item of otherItems) {
    const itemCenter = {
      x: item.x + item.width / 2,
      y: item.y + item.height / 2,
    };

    // Vertical guides (alignment on X axis)
    // Left edge to left edge
    if (Math.abs(dragItem.x - item.x) < snapThreshold) {
      guides.push({ type: 'vertical', position: item.x });
      snappedX = item.x;
    }
    // Right edge to right edge
    if (Math.abs((dragItem.x + dragItem.width) - (item.x + item.width)) < snapThreshold) {
      guides.push({ type: 'vertical', position: item.x + item.width });
      snappedX = item.x + item.width - dragItem.width;
    }
    // Center to center (vertical)
    if (Math.abs(dragCenter.x - itemCenter.x) < snapThreshold) {
      guides.push({ type: 'vertical', position: itemCenter.x });
      snappedX = itemCenter.x - dragItem.width / 2;
    }

    // Horizontal guides (alignment on Y axis)
    // Top edge to top edge
    if (Math.abs(dragItem.y - item.y) < snapThreshold) {
      guides.push({ type: 'horizontal', position: item.y });
      snappedY = item.y;
    }
    // Bottom edge to bottom edge
    if (Math.abs((dragItem.y + dragItem.height) - (item.y + item.height)) < snapThreshold) {
      guides.push({ type: 'horizontal', position: item.y + item.height });
      snappedY = item.y + item.height - dragItem.height;
    }
    // Center to center (horizontal)
    if (Math.abs(dragCenter.y - itemCenter.y) < snapThreshold) {
      guides.push({ type: 'horizontal', position: itemCenter.y });
      snappedY = itemCenter.y - dragItem.height / 2;
    }
  }

  return { guides, snappedX, snappedY };
}

/**
 * Snap a position to a grid.
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}
