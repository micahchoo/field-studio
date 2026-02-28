/**
 * Ported from Penpot (AGPL-3.0)
 * Source: common/src/app/common/geom/matrix.cljc
 * Adapted: Clojure records → TypeScript interfaces, pure functions
 *
 * 2D affine transform matrix in column-major form:
 *   | a  c  e |
 *   | b  d  f |
 *   | 0  0  1 |
 */

import { almostZero, close as numClose, radians } from './math';
import type { Point } from './point';

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

/** 2D affine transform matrix */
export interface Matrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Identity matrix */
export const IDENTITY: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/** Create a matrix (defaults to identity) */
export function matrix(
  a: number = 1, b: number = 0,
  c: number = 0, d: number = 1,
  e: number = 0, f: number = 0,
): Matrix {
  return { a, b, c, d, e, f };
}

/** Create a pure translation matrix */
export function translateMatrix(tx: number, ty: number): Matrix {
  return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
}

/** Create a scale matrix. If center provided, scales around that point. */
export function scaleMatrix(sx: number, sy: number, center?: Point): Matrix {
  if (center) {
    return {
      a: sx, b: 0, c: 0, d: sy,
      e: center.x - center.x * sx,
      f: center.y - center.y * sy,
    };
  }
  return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
}

/** Create a rotation matrix (angle in degrees). If center provided, rotates around that point. */
export function rotateMatrix(angleDeg: number, center?: Point): Matrix {
  const rad = radians(angleDeg);
  const ca = Math.cos(rad);
  const sa = Math.sin(rad);
  if (center) {
    return {
      a: ca, b: sa, c: -sa, d: ca,
      e: center.x - ca * center.x + sa * center.y,
      f: center.y - sa * center.x - ca * center.y,
    };
  }
  return { a: ca, b: sa, c: -sa, d: ca, e: 0, f: 0 };
}

// ---------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------

/** Check if a matrix is approximately the identity */
export function isIdentity(m: Matrix): boolean {
  return (
    numClose(m.a, 1) && numClose(m.b, 0) &&
    numClose(m.c, 0) && numClose(m.d, 1) &&
    numClose(m.e, 0) && numClose(m.f, 0)
  );
}

/** Check if a matrix is a pure translation (no rotation/scale/shear) */
export function isTranslation(m: Matrix): boolean {
  return numClose(m.a, 1) && numClose(m.b, 0) && numClose(m.c, 0) && numClose(m.d, 1);
}

/** Check if two matrices are approximately equal */
export function close(m1: Matrix, m2: Matrix, epsilon: number = 0.001): boolean {
  return (
    numClose(m1.a, m2.a, epsilon) && numClose(m1.b, m2.b, epsilon) &&
    numClose(m1.c, m2.c, epsilon) && numClose(m1.d, m2.d, epsilon) &&
    numClose(m1.e, m2.e, epsilon) && numClose(m1.f, m2.f, epsilon)
  );
}

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------

/** Multiply two matrices (m1 * m2). Composes transformations. */
export function multiply(m1: Matrix, m2: Matrix): Matrix {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

/** Determinant of the 2x2 part */
export function determinant(m: Matrix): number {
  return m.a * m.d - m.c * m.b;
}

/** Inverse of a matrix. Returns null if singular (determinant ≈ 0). */
export function inverse(m: Matrix): Matrix | null {
  const det = determinant(m);
  if (almostZero(det)) return null;
  return {
    a: m.d / det,
    b: -m.b / det,
    c: -m.c / det,
    d: m.a / det,
    e: (m.c * m.f - m.d * m.e) / det,
    f: (m.b * m.e - m.a * m.f) / det,
  };
}

// ---------------------------------------------------------------------------
// Transform chaining (append a transform to an existing matrix)
// ---------------------------------------------------------------------------

/** Append a translation to matrix m */
export function translate(m: Matrix, tx: number, ty: number): Matrix {
  return multiply(m, translateMatrix(tx, ty));
}

/** Append a scale to matrix m */
export function scale(m: Matrix, sx: number, sy: number, center?: Point): Matrix {
  return multiply(m, scaleMatrix(sx, sy, center));
}

/** Append a rotation to matrix m (angle in degrees) */
export function rotate(m: Matrix, angleDeg: number, center?: Point): Matrix {
  return multiply(m, rotateMatrix(angleDeg, center));
}

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------

/** Apply matrix to a point */
export function transformPoint(p: Point, m: Matrix): Point {
  return {
    x: p.x * m.a + p.y * m.c + m.e,
    y: p.x * m.b + p.y * m.d + m.f,
  };
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/** Parse a CSS matrix() string into a Matrix */
export function fromCssString(str: string): Matrix | null {
  const match = str.match(/matrix\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
  if (!match) return null;
  return {
    a: parseFloat(match[1]),
    b: parseFloat(match[2]),
    c: parseFloat(match[3]),
    d: parseFloat(match[4]),
    e: parseFloat(match[5]),
    f: parseFloat(match[6]),
  };
}

/** Convert a Matrix to CSS matrix() string */
export function toCssString(m: Matrix, precision: number = 4): string {
  const fmt = (v: number) => {
    const d = Math.pow(10, precision);
    return (Math.round(v * d) / d).toString();
  };
  return `matrix(${fmt(m.a)}, ${fmt(m.b)}, ${fmt(m.c)}, ${fmt(m.d)}, ${fmt(m.e)}, ${fmt(m.f)})`;
}
