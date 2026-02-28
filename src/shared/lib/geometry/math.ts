/**
 * Ported from Penpot (AGPL-3.0)
 * Source: common/src/app/common/math.cljc
 * Adapted: Clojure functions → TypeScript, thin Math.* wrappers omitted
 */

/** Default epsilon for floating-point comparison */
export const FLOAT_EQUAL_PRECISION = 0.001;

/** Epsilon for "almost zero" checks */
const ALMOST_ZERO_THRESHOLD = 1e-4;

/** Check if two numbers are equal within epsilon tolerance */
export function close(a: number, b: number, epsilon: number = FLOAT_EQUAL_PRECISION): boolean {
  return Math.abs(a - b) <= epsilon;
}

/** Check if a number is effectively zero */
export function almostZero(v: number): boolean {
  return Math.abs(v) < ALMOST_ZERO_THRESHOLD;
}

/** Round a near-zero value to exactly 0, otherwise return as-is */
export function roundToZero(v: number): number {
  return almostZero(v) ? 0 : v;
}

/** Clamp a value to [min, max] range */
export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Convert degrees to radians */
export function radians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/** Convert radians to degrees */
export function degrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/** Linear interpolation between two values */
export function lerp(a: number, b: number, t: number): number {
  return (1 - t) * a + t * b;
}

/** Round to N decimal places. Returns NaN for non-finite input. */
export function precision(v: number, decimals: number): number {
  if (!Number.isFinite(v)) return NaN;
  const d = Math.pow(10, decimals);
  return Math.round(v * d) / d;
}

/** Square a number */
export function sq(v: number): number {
  return v * v;
}

/** Cube root that handles negative numbers */
export function cubicRoot(v: number): number {
  if (v === 0) return 0;
  return v > 0 ? Math.pow(v, 1 / 3) : -Math.pow(-v, 1 / 3);
}

/** Round to nearest step (e.g., snap to grid) */
export function roundStep(v: number, step: number): number {
  return Math.round(v / step) * step;
}

/** Maximum of absolute values */
export function maxAbs(a: number, b: number): number {
  return Math.max(Math.abs(a), Math.abs(b));
}

/** Sign: -1 for negative, 1 otherwise (differs from Math.sign which returns 0 for 0) */
export function sign(v: number): number {
  return v < 0 ? -1 : 1;
}

/** Guard: return value if finite, otherwise return fallback */
export function finite(v: number, fallback: number): number {
  return Number.isFinite(v) ? v : fallback;
}
