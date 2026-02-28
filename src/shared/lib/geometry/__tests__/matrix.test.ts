import { describe, expect, it } from 'vitest';
import { close as numClose } from '@/src/shared/lib/geometry/math';
import * as M from '@/src/shared/lib/geometry/matrix';

/** Helper: check matrix field equality within epsilon */
function expectMatrix(actual: M.Matrix, expected: M.Matrix, epsilon = 1e-6) {
  expect(numClose(actual.a, expected.a, epsilon)).toBe(true);
  expect(numClose(actual.b, expected.b, epsilon)).toBe(true);
  expect(numClose(actual.c, expected.c, epsilon)).toBe(true);
  expect(numClose(actual.d, expected.d, epsilon)).toBe(true);
  expect(numClose(actual.e, expected.e, epsilon)).toBe(true);
  expect(numClose(actual.f, expected.f, epsilon)).toBe(true);
}

function expectPoint(
  actual: { x: number; y: number },
  expected: { x: number; y: number },
  epsilon = 1e-6,
) {
  expect(numClose(actual.x, expected.x, epsilon)).toBe(true);
  expect(numClose(actual.y, expected.y, epsilon)).toBe(true);
}

describe('geometry/matrix', () => {
  describe('construction', () => {
    it('default matrix is identity', () => {
      expect(M.matrix()).toEqual(M.IDENTITY);
    });

    it('creates matrix with all fields', () => {
      const m = M.matrix(2, 0, 0, 3, 10, 20);
      expect(m).toEqual({ a: 2, b: 0, c: 0, d: 3, e: 10, f: 20 });
    });

    it('translateMatrix', () => {
      expect(M.translateMatrix(10, 20)).toEqual({ a: 1, b: 0, c: 0, d: 1, e: 10, f: 20 });
    });

    it('scaleMatrix without center', () => {
      expect(M.scaleMatrix(2, 3)).toEqual({ a: 2, b: 0, c: 0, d: 3, e: 0, f: 0 });
    });

    it('scaleMatrix with center', () => {
      const m = M.scaleMatrix(2, 2, { x: 50, y: 50 });
      // Scaling by 2 around (50,50): e = 50 - 50*2 = -50
      expect(m.a).toBe(2);
      expect(m.d).toBe(2);
      expect(m.e).toBe(-50);
      expect(m.f).toBe(-50);
    });

    it('rotateMatrix 90°', () => {
      const m = M.rotateMatrix(90);
      expectMatrix(m, { a: 0, b: 1, c: -1, d: 0, e: 0, f: 0 });
    });

    it('rotateMatrix 180°', () => {
      const m = M.rotateMatrix(180);
      expectMatrix(m, { a: -1, b: 0, c: 0, d: -1, e: 0, f: 0 });
    });

    it('rotateMatrix with center', () => {
      const m = M.rotateMatrix(90, { x: 50, y: 50 });
      // Rotate (100,50) around (50,50) by 90° → (50,100)
      const result = M.transformPoint({ x: 100, y: 50 }, m);
      expectPoint(result, { x: 50, y: 100 });
    });
  });

  describe('predicates', () => {
    it('isIdentity for identity matrix', () => {
      expect(M.isIdentity(M.IDENTITY)).toBe(true);
    });

    it('isIdentity for non-identity', () => {
      expect(M.isIdentity(M.translateMatrix(1, 0))).toBe(false);
    });

    it('isTranslation for pure translation', () => {
      expect(M.isTranslation(M.translateMatrix(10, 20))).toBe(true);
    });

    it('isTranslation for rotation is false', () => {
      expect(M.isTranslation(M.rotateMatrix(45))).toBe(false);
    });

    it('close for equal matrices', () => {
      expect(M.close(M.IDENTITY, M.IDENTITY)).toBe(true);
    });

    it('close within epsilon', () => {
      const m = M.matrix(1.0005, 0, 0, 1, 0, 0);
      expect(M.close(M.IDENTITY, m)).toBe(true);
    });

    it('close beyond epsilon', () => {
      const m = M.matrix(1.01, 0, 0, 1, 0, 0);
      expect(M.close(M.IDENTITY, m)).toBe(false);
    });
  });

  describe('arithmetic', () => {
    it('multiply with identity is identity (left)', () => {
      const m = M.translateMatrix(10, 20);
      expect(M.multiply(M.IDENTITY, m)).toEqual(m);
    });

    it('multiply with identity is identity (right)', () => {
      const m = M.translateMatrix(10, 20);
      expect(M.multiply(m, M.IDENTITY)).toEqual(m);
    });

    it('multiply two translations adds offsets', () => {
      const m = M.multiply(M.translateMatrix(10, 20), M.translateMatrix(5, 7));
      expect(m.e).toBe(15);
      expect(m.f).toBe(27);
    });

    it('multiply scale then translate', () => {
      const m = M.multiply(M.scaleMatrix(2, 2), M.translateMatrix(10, 10));
      // Scale first, then translate: translate values get scaled
      expectPoint(M.transformPoint({ x: 0, y: 0 }, m), { x: 20, y: 20 });
    });

    it('determinant of identity is 1', () => {
      expect(M.determinant(M.IDENTITY)).toBe(1);
    });

    it('determinant of scale matrix', () => {
      expect(M.determinant(M.scaleMatrix(2, 3))).toBe(6);
    });

    it('determinant of rotation is 1', () => {
      expect(numClose(M.determinant(M.rotateMatrix(45)), 1, 1e-10)).toBe(true);
    });

    it('inverse of identity is identity', () => {
      const inv = M.inverse(M.IDENTITY)!;
      expectMatrix(inv, M.IDENTITY);
    });

    it('inverse of translation', () => {
      const inv = M.inverse(M.translateMatrix(10, 20))!;
      expectMatrix(inv, M.translateMatrix(-10, -20));
    });

    it('inverse of scale', () => {
      const inv = M.inverse(M.scaleMatrix(2, 4))!;
      expectMatrix(inv, M.scaleMatrix(0.5, 0.25));
    });

    it('m * inverse(m) = identity', () => {
      const m = M.multiply(M.rotateMatrix(30), M.translateMatrix(10, 20));
      const inv = M.inverse(m)!;
      expectMatrix(M.multiply(m, inv), M.IDENTITY);
    });

    it('inverse of singular matrix returns null', () => {
      expect(M.inverse(M.matrix(0, 0, 0, 0, 0, 0))).toBe(null);
    });
  });

  describe('transform chaining', () => {
    it('translate appends translation', () => {
      const m = M.translate(M.IDENTITY, 10, 20);
      expect(m.e).toBe(10);
      expect(m.f).toBe(20);
    });

    it('scale appends scale', () => {
      const m = M.scale(M.IDENTITY, 2, 3);
      expect(m.a).toBe(2);
      expect(m.d).toBe(3);
    });

    it('rotate appends rotation', () => {
      const m = M.rotate(M.IDENTITY, 90);
      expectMatrix(m, M.rotateMatrix(90));
    });
  });

  describe('transformPoint', () => {
    it('identity preserves point', () => {
      expectPoint(M.transformPoint({ x: 3, y: 4 }, M.IDENTITY), { x: 3, y: 4 });
    });

    it('translation moves point', () => {
      expectPoint(M.transformPoint({ x: 3, y: 4 }, M.translateMatrix(10, 20)), { x: 13, y: 24 });
    });

    it('scale scales point', () => {
      expectPoint(M.transformPoint({ x: 3, y: 4 }, M.scaleMatrix(2, 3)), { x: 6, y: 12 });
    });

    it('90° rotation rotates point', () => {
      expectPoint(M.transformPoint({ x: 1, y: 0 }, M.rotateMatrix(90)), { x: 0, y: 1 });
    });
  });

  describe('serialization', () => {
    it('fromCssString parses valid matrix', () => {
      const m = M.fromCssString('matrix(1, 0, 0, 1, 10, 20)');
      expect(m).toEqual({ a: 1, b: 0, c: 0, d: 1, e: 10, f: 20 });
    });

    it('fromCssString returns null for invalid', () => {
      expect(M.fromCssString('not a matrix')).toBe(null);
    });

    it('toCssString produces valid string', () => {
      expect(M.toCssString(M.IDENTITY)).toBe('matrix(1, 0, 0, 1, 0, 0)');
    });

    it('round-trips through CSS string', () => {
      const m = M.translateMatrix(10.5, 20.3);
      const parsed = M.fromCssString(M.toCssString(m))!;
      expectMatrix(parsed, m);
    });
  });
});
