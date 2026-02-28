import { describe, expect, it } from 'vitest';
import { close as numClose } from '@/src/shared/lib/geometry/math';
import * as P from '@/src/shared/lib/geometry/point';

/** Helper: check point equality within epsilon */
function expectPoint(actual: P.Point, expected: P.Point, epsilon = 1e-6) {
  expect(numClose(actual.x, expected.x, epsilon)).toBe(true);
  expect(numClose(actual.y, expected.y, epsilon)).toBe(true);
}

describe('geometry/point', () => {
  describe('construction', () => {
    it('creates zero point by default', () => {
      expect(P.point()).toEqual({ x: 0, y: 0 });
    });

    it('creates point with single value (square)', () => {
      expect(P.point(5)).toEqual({ x: 5, y: 5 });
    });

    it('creates point with x and y', () => {
      expect(P.point(3, 7)).toEqual({ x: 3, y: 7 });
    });
  });

  describe('arithmetic', () => {
    const a = P.point(3, 4);
    const b = P.point(1, 2);

    it('add', () => {
      expect(P.add(a, b)).toEqual({ x: 4, y: 6 });
    });

    it('subtract', () => {
      expect(P.subtract(a, b)).toEqual({ x: 2, y: 2 });
    });

    it('multiply (component-wise)', () => {
      expect(P.multiply(a, b)).toEqual({ x: 3, y: 8 });
    });

    it('divide (component-wise)', () => {
      expect(P.divide(P.point(6, 8), P.point(2, 4))).toEqual({ x: 3, y: 2 });
    });

    it('scale (scalar)', () => {
      expect(P.scale(a, 2)).toEqual({ x: 6, y: 8 });
    });

    it('negate', () => {
      expect(P.negate(a)).toEqual({ x: -3, y: -4 });
    });

    it('inverse', () => {
      const inv = P.inverse(P.point(2, 4));
      expectPoint(inv, { x: 0.5, y: 0.25 });
    });

    it('abs', () => {
      expect(P.abs(P.point(-3, -4))).toEqual({ x: 3, y: 4 });
    });

    it('min', () => {
      expect(P.min(a, b)).toEqual({ x: 1, y: 2 });
    });

    it('max', () => {
      expect(P.max(a, b)).toEqual({ x: 3, y: 4 });
    });
  });

  describe('metrics', () => {
    it('distance between two points', () => {
      expect(P.distance(P.point(0, 0), P.point(3, 4))).toBe(5);
    });

    it('distance is commutative', () => {
      const a = P.point(1, 2);
      const b = P.point(4, 6);
      expect(P.distance(a, b)).toBe(P.distance(b, a));
    });

    it('distanceVector', () => {
      expect(P.distanceVector(P.point(1, 5), P.point(4, 2))).toEqual({ x: 3, y: 3 });
    });

    it('length of (3,4) is 5', () => {
      expect(P.length(P.point(3, 4))).toBe(5);
    });

    it('length of zero vector is 0', () => {
      expect(P.length(P.ZERO)).toBe(0);
    });
  });

  describe('vector operations', () => {
    it('unit normalizes to length 1', () => {
      const u = P.unit(P.point(3, 4));
      expect(numClose(P.length(u), 1, 1e-10)).toBe(true);
    });

    it('unit of zero vector is zero', () => {
      expect(P.unit(P.ZERO)).toEqual(P.ZERO);
    });

    it('perpendicular rotates 90° CCW', () => {
      // -0 === 0 in JS but Object.is distinguishes them; use expectPoint for tolerance
      expectPoint(P.perpendicular(P.point(1, 0)), { x: 0, y: 1 });
      expectPoint(P.perpendicular(P.point(0, 1)), { x: -1, y: 0 });
      expect(P.perpendicular(P.point(3, 4))).toEqual({ x: -4, y: 3 });
    });

    it('dot product', () => {
      expect(P.dot(P.point(1, 2), P.point(3, 4))).toBe(11);
    });

    it('dot product of perpendicular vectors is 0', () => {
      const v = P.point(3, 4);
      expect(P.dot(v, P.perpendicular(v))).toBe(0);
    });

    it('project onto x-axis', () => {
      const proj = P.project(P.point(3, 4), P.point(1, 0));
      expectPoint(proj, { x: 3, y: 0 });
    });

    it('toVec gives vector from a to b', () => {
      expect(P.toVec(P.point(1, 2), P.point(4, 6))).toEqual({ x: 3, y: 4 });
    });

    it('resize changes length', () => {
      const v = P.point(3, 4); // length 5
      const resized = P.resize(v, 10);
      expect(numClose(P.length(resized), 10, 1e-10)).toBe(true);
      // Direction preserved
      expectPoint(P.unit(resized), P.unit(v));
    });

    it('normalLeft is unit perpendicular', () => {
      const n = P.normalLeft(P.point(1, 0));
      expectPoint(n, { x: 0, y: 1 });
      expect(numClose(P.length(n), 1, 1e-10)).toBe(true);
    });
  });

  describe('angles', () => {
    it('angle of (1,0) is 0°', () => {
      expect(numClose(P.angle(P.point(1, 0)), 0, 1e-10)).toBe(true);
    });

    it('angle of (0,1) is 90°', () => {
      expect(numClose(P.angle(P.point(0, 1)), 90, 1e-10)).toBe(true);
    });

    it('angle of (-1,0) is 180°', () => {
      expect(numClose(P.angle(P.point(-1, 0)), 180, 1e-10)).toBe(true);
    });

    it('angle from center', () => {
      const deg = P.angle(P.point(2, 1), P.point(1, 1));
      expect(numClose(deg, 0, 1e-10)).toBe(true); // pointing right
    });

    it('angleWithOther for perpendicular vectors is 90°', () => {
      expect(numClose(P.angleWithOther(P.point(1, 0), P.point(0, 1)), 90, 1e-6)).toBe(true);
    });

    it('angleWithOther for same direction is 0°', () => {
      expect(numClose(P.angleWithOther(P.point(1, 0), P.point(2, 0)), 0, 1e-6)).toBe(true);
    });

    it('quadrant classification', () => {
      expect(P.quadrant(P.point(1, 1))).toBe(1);
      expect(P.quadrant(P.point(-1, 1))).toBe(2);
      expect(P.quadrant(P.point(-1, -1))).toBe(3);
      expect(P.quadrant(P.point(1, -1))).toBe(4);
    });
  });

  describe('transforms', () => {
    it('rotate 90° around origin', () => {
      const rotated = P.rotate(P.point(1, 0), P.ZERO, 90);
      expectPoint(rotated, { x: 0, y: 1 });
    });

    it('rotate 180° around origin', () => {
      const rotated = P.rotate(P.point(1, 0), P.ZERO, 180);
      expectPoint(rotated, { x: -1, y: 0 });
    });

    it('rotate around custom center', () => {
      const rotated = P.rotate(P.point(2, 0), P.point(1, 0), 90);
      expectPoint(rotated, { x: 1, y: 1 });
    });

    it('scaleFrom moves point away from center', () => {
      const scaled = P.scaleFrom(P.point(2, 0), P.point(0, 0), 2);
      expectPoint(scaled, { x: 4, y: 0 });
    });

    it('transform with identity matrix', () => {
      const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
      const p = P.point(3, 4);
      expectPoint(P.transform(p, identity), p);
    });

    it('transform with translation matrix', () => {
      const translate = { a: 1, b: 0, c: 0, d: 1, e: 10, f: 20 };
      expectPoint(P.transform(P.point(3, 4), translate), { x: 13, y: 24 });
    });

    it('transform with scale matrix', () => {
      const scaleM = { a: 2, b: 0, c: 0, d: 3, e: 0, f: 0 };
      expectPoint(P.transform(P.point(3, 4), scaleM), { x: 6, y: 12 });
    });
  });

  describe('interpolation & proximity', () => {
    it('lerp at t=0 returns first point', () => {
      expect(P.lerp(P.point(0, 0), P.point(10, 10), 0)).toEqual({ x: 0, y: 0 });
    });

    it('lerp at t=1 returns second point', () => {
      expect(P.lerp(P.point(0, 0), P.point(10, 10), 1)).toEqual({ x: 10, y: 10 });
    });

    it('lerp at t=0.5 returns midpoint', () => {
      expect(P.lerp(P.point(0, 0), P.point(10, 10), 0.5)).toEqual({ x: 5, y: 5 });
    });

    it('close returns true for nearby points', () => {
      expect(P.close(P.point(1, 1), P.point(1.00001, 1.00001))).toBe(true);
    });

    it('close returns false for distant points', () => {
      expect(P.close(P.point(1, 1), P.point(2, 2))).toBe(false);
    });

    it('isZero', () => {
      expect(P.isZero(P.ZERO)).toBe(true);
      expect(P.isZero(P.point(0.001, 0))).toBe(false);
    });

    it('isAlmostZero', () => {
      expect(P.isAlmostZero(P.point(0.00001, -0.00001))).toBe(true);
      expect(P.isAlmostZero(P.point(0.01, 0))).toBe(false);
    });
  });

  describe('aggregation', () => {
    it('centerPoints computes centroid', () => {
      const pts = [P.point(0, 0), P.point(4, 0), P.point(4, 4), P.point(0, 4)];
      expectPoint(P.centerPoints(pts), { x: 2, y: 2 });
    });

    it('centerPoints of single point is itself', () => {
      expectPoint(P.centerPoints([P.point(5, 7)]), { x: 5, y: 7 });
    });

    it('centerPoints of empty array is zero', () => {
      expect(P.centerPoints([])).toEqual(P.ZERO);
    });
  });

  describe('geometry queries', () => {
    it('pointLineDistance to horizontal line', () => {
      const dist = P.pointLineDistance(P.point(5, 3), P.point(0, 0), P.point(10, 0));
      expect(numClose(dist, 3, 1e-10)).toBe(true);
    });

    it('pointLineDistance to vertical line', () => {
      const dist = P.pointLineDistance(P.point(3, 5), P.point(0, 0), P.point(0, 10));
      expect(numClose(dist, 3, 1e-10)).toBe(true);
    });

    it('pointLineDistance when point is on line is 0', () => {
      const dist = P.pointLineDistance(P.point(5, 5), P.point(0, 0), P.point(10, 10));
      expect(numClose(dist, 0, 1e-10)).toBe(true);
    });
  });

  describe('rounding', () => {
    it('round to integer', () => {
      expect(P.round(P.point(3.7, 4.2))).toEqual({ x: 4, y: 4 });
    });

    it('round to 2 decimal places', () => {
      expect(P.round(P.point(3.456, 7.891), 2)).toEqual({ x: 3.46, y: 7.89 });
    });

    it('roundStep snaps to grid', () => {
      expect(P.roundStep(P.point(17, 23), 10)).toEqual({ x: 20, y: 20 });
    });

    it('noZeros replaces near-zero with 0.001', () => {
      const p = P.noZeros(P.point(0.00001, 5));
      expect(p.x).toBe(0.001);
      expect(p.y).toBe(5);
    });
  });

  describe('ConnectionLine bezier regression', () => {
    // This test verifies the ported geometry produces identical results
    // to the inline math in ConnectionLine.svelte (lines 31-40)
    it('computes identical bezier control point as inline math', () => {
      const from = { x: 100, y: 50 };
      const to = { x: 300, y: 150 };

      // Original inline math from ConnectionLine.svelte
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const offset = Math.min(50, len * 0.3);
      const inlineCx = midX - (dy / len) * offset;
      const inlineCy = midY + (dx / len) * offset;

      // Geometry library equivalent
      const delta = P.subtract(to, from);
      const mid = P.lerp(from, to, 0.5);
      const lineLen = P.length(delta);
      const geoOffset = Math.min(50, lineLen * 0.3);
      const perp = P.perpendicular(P.unit(delta));
      const control = P.add(mid, P.scale(perp, geoOffset));

      expect(numClose(control.x, inlineCx, 1e-10)).toBe(true);
      expect(numClose(control.y, inlineCy, 1e-10)).toBe(true);
    });

    it('handles zero-length connection (from === to)', () => {
      const from = { x: 100, y: 100 };
      const to = { x: 100, y: 100 };

      const delta = P.subtract(to, from);
      const mid = P.lerp(from, to, 0.5);
      const lineLen = P.length(delta);
      const offset = Math.min(50, lineLen * 0.3);
      const perp = P.perpendicular(P.unit(delta));
      const control = P.add(mid, P.scale(perp, offset));

      // Control point should be at midpoint (no offset since length is 0)
      expectPoint(control, mid);
    });
  });
});
