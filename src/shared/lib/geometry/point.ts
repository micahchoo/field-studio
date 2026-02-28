/**
 * Ported from Penpot (AGPL-3.0)
 * Source: common/src/app/common/geom/point.cljc
 * Adapted: Clojure records → TypeScript interfaces, pure functions
 */

import { almostZero, clamp, close as numClose, degrees, lerp as numLerp, radians } from './math';

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

/** Immutable 2D point / vector */
export interface Point {
  readonly x: number;
  readonly y: number;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/** Create a point */
export function point(x: number = 0, y: number = x): Point {
  return { x, y };
}

/** Zero point constant */
export const ZERO: Point = { x: 0, y: 0 };

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------

/** Vector addition */
export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Vector subtraction (a - b) */
export function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Component-wise multiplication */
export function multiply(a: Point, b: Point): Point {
  return { x: a.x * b.x, y: a.y * b.y };
}

/** Component-wise division */
export function divide(a: Point, b: Point): Point {
  return { x: a.x / b.x, y: a.y / b.y };
}

/** Scalar multiplication */
export function scale(p: Point, s: number): Point {
  return { x: p.x * s, y: p.y * s };
}

/** Negate both components */
export function negate(p: Point): Point {
  return { x: -p.x, y: -p.y };
}

/** Reciprocal of both components */
export function inverse(p: Point): Point {
  return { x: 1 / p.x, y: 1 / p.y };
}

/** Component-wise absolute value */
export function abs(p: Point): Point {
  return { x: Math.abs(p.x), y: Math.abs(p.y) };
}

/** Component-wise minimum */
export function min(a: Point, b: Point): Point {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) };
}

/** Component-wise maximum */
export function max(a: Point, b: Point): Point {
  return { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) };
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/** Euclidean distance between two points */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Absolute difference as a point (distance vector) */
export function distanceVector(a: Point, b: Point): Point {
  return { x: Math.abs(a.x - b.x), y: Math.abs(a.y - b.y) };
}

/** Magnitude (length) of a vector from origin */
export function length(p: Point): number {
  return Math.hypot(p.x, p.y);
}

// ---------------------------------------------------------------------------
// Vector operations
// ---------------------------------------------------------------------------

/** Normalize to unit vector. Returns ZERO if length ≈ 0. */
export function unit(p: Point): Point {
  const len = length(p);
  if (almostZero(len)) return ZERO;
  return { x: p.x / len, y: p.y / len };
}

/** 90° counter-clockwise rotation: (-y, x) */
export function perpendicular(p: Point): Point {
  return { x: -p.y, y: p.x };
}

/** Dot product */
export function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

/** Orthogonal projection of v1 onto v2 */
export function project(v1: Point, v2: Point): Point {
  const u = unit(v2);
  return scale(u, dot(v1, u));
}

/** Left-facing unit normal */
export function normalLeft(p: Point): Point {
  return unit({ x: -p.y, y: p.x });
}

/** Right-facing unit normal */
export function normalRight(p: Point): Point {
  return unit({ x: p.y, y: -p.x });
}

/** Vector from a to b */
export function toVec(a: Point, b: Point): Point {
  return subtract(b, a);
}

/** Resize vector to a new length, preserving direction */
export function resize(v: Point, newLength: number): Point {
  const len = length(v);
  if (almostZero(len)) return ZERO;
  return scale(v, newLength / len);
}

// ---------------------------------------------------------------------------
// Angles
// ---------------------------------------------------------------------------

/** Angle from x-axis in degrees. If center provided, angle from center to point. */
export function angle(p: Point, center?: Point): number {
  const x = center ? p.x - center.x : p.x;
  const y = center ? p.y - center.y : p.y;
  return degrees(Math.atan2(y, x));
}

/** Angle between two vectors in degrees [0, 180] */
export function angleWithOther(a: Point, b: Point): number {
  const lenA = length(a);
  const lenB = length(b);
  if (almostZero(lenA) || almostZero(lenB)) return 0;
  const cosAngle = clamp(dot(a, b) / (lenA * lenB), -1, 1);
  const deg = degrees(Math.acos(cosAngle));
  return Number.isNaN(deg) ? 0 : deg;
}

/** Sign of cross product: -1 or 1 */
export function angleSign(a: Point, b: Point): number {
  return a.y * b.x > a.x * b.y ? -1 : 1;
}

/** Signed angle between two vectors in degrees [-180, 180] */
export function signedAngle(a: Point, b: Point): number {
  return angleSign(a, b) * angleWithOther(a, b);
}

/** Quadrant of a point (1-4, standard math quadrants) */
export function quadrant(p: Point): number {
  if (p.x >= 0) return p.y >= 0 ? 1 : 4;
  return p.y >= 0 ? 2 : 3;
}

// ---------------------------------------------------------------------------
// Transforms
// ---------------------------------------------------------------------------

/** Rotate point around center by angle (in degrees) */
export function rotate(p: Point, center: Point, angleDeg: number): Point {
  const rad = radians(angleDeg);
  const sa = Math.sin(rad);
  const ca = Math.cos(rad);
  const px = p.x - center.x;
  const py = p.y - center.y;
  return {
    x: ca * px - sa * py + center.x,
    y: sa * px + ca * py + center.y,
  };
}

/** Scale point away from center by a factor */
export function scaleFrom(p: Point, center: Point, factor: number): Point {
  const v = toVec(center, p);
  return add(center, scale(v, factor));
}

/** Apply a 2D affine matrix [a,b,c,d,e,f] to a point */
export function transform(
  p: Point,
  m: { a: number; b: number; c: number; d: number; e: number; f: number },
): Point {
  return {
    x: p.x * m.a + p.y * m.c + m.e,
    y: p.x * m.b + p.y * m.d + m.f,
  };
}

// ---------------------------------------------------------------------------
// Interpolation & proximity
// ---------------------------------------------------------------------------

/** Linear interpolation between two points */
export function lerp(a: Point, b: Point, t: number): Point {
  return { x: numLerp(a.x, b.x, t), y: numLerp(a.y, b.y, t) };
}

/** Check if two points are within epsilon of each other */
export function close(a: Point, b: Point, epsilon: number = 1e-4): boolean {
  return numClose(a.x, b.x, epsilon) && numClose(a.y, b.y, epsilon);
}

/** Check if point is approximately zero */
export function isAlmostZero(p: Point): boolean {
  return almostZero(p.x) && almostZero(p.y);
}

/** Check if point is exactly zero */
export function isZero(p: Point): boolean {
  return p.x === 0 && p.y === 0;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/** Centroid (average) of a set of points */
export function centerPoints(points: readonly Point[]): Point {
  if (points.length === 0) return ZERO;
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / points.length, y: sy / points.length };
}

// ---------------------------------------------------------------------------
// Geometry queries
// ---------------------------------------------------------------------------

/** Perpendicular distance from a point to a line defined by two points */
export function pointLineDistance(p: Point, lineA: Point, lineB: Point): number {
  const num = Math.abs(
    p.x * (lineB.y - lineA.y) -
    p.y * (lineB.x - lineA.x) +
    lineB.x * lineA.y -
    lineB.y * lineA.x,
  );
  const den = distance(lineA, lineB);
  if (almostZero(den)) return distance(p, lineA);
  return num / den;
}

// ---------------------------------------------------------------------------
// Rounding
// ---------------------------------------------------------------------------

/** Round point coordinates to N decimal places */
export function round(p: Point, decimals: number = 0): Point {
  const d = Math.pow(10, decimals);
  return { x: Math.round(p.x * d) / d, y: Math.round(p.y * d) / d };
}

/** Round point coordinates to nearest step */
export function roundStep(p: Point, step: number): Point {
  return { x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step };
}

/** Replace near-zero coordinates with 0.001 (avoids division by zero) */
export function noZeros(p: Point): Point {
  return {
    x: almostZero(p.x) ? 0.001 : p.x,
    y: almostZero(p.y) ? 0.001 : p.y,
  };
}
