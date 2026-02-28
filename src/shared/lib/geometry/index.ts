/**
 * Geometry Library — Barrel Export
 *
 * Ported from Penpot (AGPL-3.0).
 * Pure TypeScript 2D geometry primitives: math, point, rect, matrix.
 *
 * Usage:
 *   import { Point, Rect, Matrix } from '@/src/shared/lib/geometry';
 *   // or import individual modules:
 *   import * as Point from '@/src/shared/lib/geometry/point';
 */

export * as Math from './math';
export * as Point from './point';
export * as Rect from './rect';
export * as Matrix from './matrix';

// Re-export types at top level for convenience
export type { Point as PointType } from './point';
export type { Rect as RectType } from './rect';
export type { Matrix as MatrixType } from './matrix';
