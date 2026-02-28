import { describe, expect, it } from 'vitest';
import * as R from '@/src/shared/lib/geometry/rect';

describe('geometry/rect', () => {
  describe('construction', () => {
    it('creates default rect at origin', () => {
      expect(R.rect()).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });

    it('creates rect with position and size', () => {
      expect(R.rect(10, 20, 100, 50)).toEqual({ x: 10, y: 20, width: 100, height: 50 });
    });

    it('fromCorners normalizes order', () => {
      const r = R.fromCorners({ x: 30, y: 40 }, { x: 10, y: 20 });
      expect(r).toEqual({ x: 10, y: 20, width: 20, height: 20 });
    });

    it('fromCorners with same point gives zero-size rect', () => {
      const r = R.fromCorners({ x: 5, y: 5 }, { x: 5, y: 5 });
      expect(r).toEqual({ x: 5, y: 5, width: 0, height: 0 });
    });

    it('fromPoints computes AABB', () => {
      const pts = [{ x: 5, y: 10 }, { x: 1, y: 3 }, { x: 8, y: 7 }];
      expect(R.fromPoints(pts)).toEqual({ x: 1, y: 3, width: 7, height: 7 });
    });

    it('fromPoints of empty array is zero rect', () => {
      expect(R.fromPoints([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });

    it('fromPoints of single point', () => {
      expect(R.fromPoints([{ x: 3, y: 7 }])).toEqual({ x: 3, y: 7, width: 0, height: 0 });
    });

    it('centeredAt creates rect centered on point', () => {
      const r = R.centeredAt(50, 50, 20, 10);
      expect(r).toEqual({ x: 40, y: 45, width: 20, height: 10 });
    });
  });

  describe('accessors', () => {
    const r = R.rect(10, 20, 100, 50);

    it('right edge', () => {
      expect(R.right(r)).toBe(110);
    });

    it('bottom edge', () => {
      expect(R.bottom(r)).toBe(70);
    });

    it('center point', () => {
      expect(R.center(r)).toEqual({ x: 60, y: 45 });
    });

    it('position', () => {
      expect(R.position(r)).toEqual({ x: 10, y: 20 });
    });

    it('size', () => {
      expect(R.size(r)).toEqual({ x: 100, y: 50 });
    });

    it('toPoints returns 4 corners clockwise', () => {
      const pts = R.toPoints(r);
      expect(pts).toEqual([
        { x: 10, y: 20 },   // TL
        { x: 110, y: 20 },  // TR
        { x: 110, y: 70 },  // BR
        { x: 10, y: 70 },   // BL
      ]);
    });

    it('toLines returns 4 edges', () => {
      const lines = R.toLines(r);
      expect(lines).toHaveLength(4);
      // Top edge
      expect(lines[0]).toEqual([{ x: 10, y: 20 }, { x: 110, y: 20 }]);
      // Right edge
      expect(lines[1]).toEqual([{ x: 110, y: 20 }, { x: 110, y: 70 }]);
    });
  });

  describe('spatial queries', () => {
    const r = R.rect(10, 10, 80, 60);

    it('containsPoint: inside', () => {
      expect(R.containsPoint(r, { x: 50, y: 40 })).toBe(true);
    });

    it('containsPoint: on edge', () => {
      expect(R.containsPoint(r, { x: 10, y: 10 })).toBe(true);
      expect(R.containsPoint(r, { x: 90, y: 70 })).toBe(true);
    });

    it('containsPoint: outside', () => {
      expect(R.containsPoint(r, { x: 5, y: 40 })).toBe(false);
      expect(R.containsPoint(r, { x: 95, y: 40 })).toBe(false);
    });

    it('containsRect: fully inside', () => {
      expect(R.containsRect(r, R.rect(20, 20, 30, 30))).toBe(true);
    });

    it('containsRect: same rect', () => {
      expect(R.containsRect(r, r)).toBe(true);
    });

    it('containsRect: partially outside', () => {
      expect(R.containsRect(r, R.rect(5, 10, 30, 30))).toBe(false);
    });

    it('overlaps: overlapping rects', () => {
      expect(R.overlaps(r, R.rect(50, 40, 100, 100))).toBe(true);
    });

    it('overlaps: touching edges', () => {
      expect(R.overlaps(r, R.rect(90, 10, 20, 20))).toBe(true);
    });

    it('overlaps: separate rects', () => {
      expect(R.overlaps(r, R.rect(200, 200, 10, 10))).toBe(false);
    });

    it('intersection returns overlap area', () => {
      const inter = R.intersection(r, R.rect(50, 40, 100, 100));
      expect(inter).toEqual({ x: 50, y: 40, width: 40, height: 30 });
    });

    it('intersection returns null for non-overlapping', () => {
      expect(R.intersection(r, R.rect(200, 200, 10, 10))).toBe(null);
    });
  });

  describe('combinators', () => {
    it('union of multiple rects', () => {
      const rects = [R.rect(0, 0, 10, 10), R.rect(20, 20, 10, 10)];
      expect(R.union(rects)).toEqual({ x: 0, y: 0, width: 30, height: 30 });
    });

    it('union of single rect is itself', () => {
      const r = R.rect(5, 5, 10, 10);
      expect(R.union([r])).toEqual(r);
    });

    it('union of empty array is zero rect', () => {
      expect(R.union([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });

    it('expand adds padding to all sides', () => {
      const r = R.expand(R.rect(10, 10, 80, 60), 5);
      expect(r).toEqual({ x: 5, y: 5, width: 90, height: 70 });
    });

    it('expand with negative padding contracts', () => {
      const r = R.expand(R.rect(10, 10, 80, 60), -5);
      expect(r).toEqual({ x: 15, y: 15, width: 70, height: 50 });
    });
  });

  describe('comparison', () => {
    it('close returns true for equal rects', () => {
      const r = R.rect(10, 20, 30, 40);
      expect(R.close(r, r)).toBe(true);
    });

    it('close returns true within epsilon', () => {
      expect(R.close(R.rect(10, 20, 30, 40), R.rect(10.0005, 20, 30, 40))).toBe(true);
    });

    it('close returns false beyond epsilon', () => {
      expect(R.close(R.rect(10, 20, 30, 40), R.rect(11, 20, 30, 40))).toBe(false);
    });

    it('area', () => {
      expect(R.area(R.rect(0, 0, 10, 5))).toBe(50);
    });

    it('isEmpty for zero-width', () => {
      expect(R.isEmpty(R.rect(0, 0, 0, 10))).toBe(true);
    });

    it('isEmpty for non-zero rect', () => {
      expect(R.isEmpty(R.rect(0, 0, 10, 10))).toBe(false);
    });
  });

  describe('annotation getBoundingBox regression', () => {
    it('matches original inline getBoundingBox', () => {
      const points = [{ x: 5, y: 10 }, { x: 1, y: 3 }, { x: 8, y: 7 }];

      // Original inline implementation
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const original = {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      };

      // Geometry library
      const fromLib = R.fromPoints(points);

      expect(fromLib).toEqual(original);
    });

    it('handles empty points same as original', () => {
      expect(R.fromPoints([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });
  });
});
