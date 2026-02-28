/**
 * Ported from Penpot (AGPL-3.0)
 * Source: common/src/app/common/geom/rect.cljc
 * Adapted: Clojure records → TypeScript interfaces, pure functions
 */

import { almostZero, close as numClose } from './math';
import type { Point } from './point';

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

/** Axis-aligned rectangle */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/** Create a rect from position and size */
export function rect(x: number = 0, y: number = 0, width: number = 0, height: number = 0): Rect {
  return { x, y, width, height };
}

/** Create a rect from two opposing corner points (order-independent) */
export function fromCorners(p1: Point, p2: Point): Rect {
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  return {
    x,
    y,
    width: Math.max(p1.x, p2.x) - x,
    height: Math.max(p1.y, p2.y) - y,
  };
}

/** Compute the axis-aligned bounding box of a set of points */
export function fromPoints(points: readonly Point[]): Rect {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Create a rect centered on a point */
export function centeredAt(cx: number, cy: number, width: number, height: number): Rect {
  return { x: cx - width / 2, y: cy - height / 2, width, height };
}

// ---------------------------------------------------------------------------
// Accessors (derived edges / corners)
// ---------------------------------------------------------------------------

/** Right edge x-coordinate */
export function right(r: Rect): number {
  return r.x + r.width;
}

/** Bottom edge y-coordinate */
export function bottom(r: Rect): number {
  return r.y + r.height;
}

/** Center point of rect */
export function center(r: Rect): Point {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/** Position (top-left corner) as a point */
export function position(r: Rect): Point {
  return { x: r.x, y: r.y };
}

/** Size as a point (width, height) */
export function size(r: Rect): Point {
  return { x: r.width, y: r.height };
}

/** Four corner points in clockwise order: TL, TR, BR, BL */
export function toPoints(r: Rect): [Point, Point, Point, Point] {
  const r2 = right(r);
  const b2 = bottom(r);
  return [
    { x: r.x, y: r.y },
    { x: r2, y: r.y },
    { x: r2, y: b2 },
    { x: r.x, y: b2 },
  ];
}

/** Four edges as [start, end] line segment pairs: top, right, bottom, left */
export function toLines(r: Rect): [[Point, Point], [Point, Point], [Point, Point], [Point, Point]] {
  const [tl, tr, br, bl] = toPoints(r);
  return [[tl, tr], [tr, br], [br, bl], [bl, tl]];
}

// ---------------------------------------------------------------------------
// Spatial queries
// ---------------------------------------------------------------------------

/** Check if a point is inside or on the boundary of a rect */
export function containsPoint(r: Rect, p: Point): boolean {
  return p.x >= r.x && p.x <= right(r) && p.y >= r.y && p.y <= bottom(r);
}

/** Check if rect b is fully contained within rect a */
export function containsRect(a: Rect, b: Rect): boolean {
  return b.x >= a.x && b.y >= a.y && right(b) <= right(a) && bottom(b) <= bottom(a);
}

/** Check if two rects overlap (including touching edges) */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x <= right(b) && right(a) >= b.x && a.y <= bottom(b) && bottom(a) >= b.y;
}

/** Compute the intersection of two rects. Returns null if they don't overlap. */
export function intersection(a: Rect, b: Rect): Rect | null {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(right(a), right(b));
  const y2 = Math.min(bottom(a), bottom(b));
  if (x2 < x1 || y2 < y1) return null;
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

// ---------------------------------------------------------------------------
// Combinators
// ---------------------------------------------------------------------------

/** Union bounding rect of multiple rects (smallest rect containing all) */
export function union(rects: readonly Rect[]): Rect {
  if (rects.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    if (r.x < minX) minX = r.x;
    if (r.y < minY) minY = r.y;
    const rx = r.x + r.width;
    const ry = r.y + r.height;
    if (rx > maxX) maxX = rx;
    if (ry > maxY) maxY = ry;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Expand (or contract) a rect by a padding amount on all sides */
export function expand(r: Rect, padding: number): Rect {
  return {
    x: r.x - padding,
    y: r.y - padding,
    width: r.width + padding * 2,
    height: r.height + padding * 2,
  };
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

/** Check if two rects are approximately equal (within epsilon) */
export function close(a: Rect, b: Rect, epsilon: number = 0.001): boolean {
  return (
    numClose(a.x, b.x, epsilon) &&
    numClose(a.y, b.y, epsilon) &&
    numClose(a.width, b.width, epsilon) &&
    numClose(a.height, b.height, epsilon)
  );
}

/** Area of the rect */
export function area(r: Rect): number {
  return r.width * r.height;
}

/** Check if a rect has effectively zero area */
export function isEmpty(r: Rect): boolean {
  return almostZero(r.width) || almostZero(r.height);
}
