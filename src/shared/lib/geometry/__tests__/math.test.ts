import { describe, expect, it } from 'vitest';
import {
  almostZero,
  clamp,
  close,
  cubicRoot,
  degrees,
  finite,
  lerp,
  maxAbs,
  precision,
  radians,
  roundStep,
  roundToZero,
  sign,
  sq,
} from '@/src/shared/lib/geometry/math';

describe('geometry/math', () => {
  describe('close', () => {
    it('returns true for equal numbers', () => {
      expect(close(1, 1)).toBe(true);
    });

    it('returns true within default epsilon (0.001)', () => {
      expect(close(1, 1.0005)).toBe(true);
      expect(close(1, 1.001)).toBe(true);
    });

    it('returns false outside default epsilon', () => {
      expect(close(1, 1.002)).toBe(false);
    });

    it('respects custom epsilon', () => {
      expect(close(1, 1.05, 0.1)).toBe(true);
      expect(close(1, 1.15, 0.1)).toBe(false);
    });
  });

  describe('almostZero', () => {
    it('returns true for zero', () => {
      expect(almostZero(0)).toBe(true);
    });

    it('returns true for very small values', () => {
      expect(almostZero(0.00001)).toBe(true);
      expect(almostZero(-0.00001)).toBe(true);
    });

    it('returns false for non-trivial values', () => {
      expect(almostZero(0.001)).toBe(false);
      expect(almostZero(1)).toBe(false);
    });
  });

  describe('roundToZero', () => {
    it('rounds near-zero to zero', () => {
      expect(roundToZero(0.00001)).toBe(0);
    });

    it('passes through non-zero values', () => {
      expect(roundToZero(0.5)).toBe(0.5);
      expect(roundToZero(-3)).toBe(-3);
    });
  });

  describe('clamp', () => {
    it('returns value when in range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('clamps to min', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('clamps to max', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('handles min === max', () => {
      expect(clamp(5, 3, 3)).toBe(3);
    });
  });

  describe('radians / degrees', () => {
    it('converts 180° to π', () => {
      expect(close(radians(180), Math.PI, 1e-10)).toBe(true);
    });

    it('converts 90° to π/2', () => {
      expect(close(radians(90), Math.PI / 2, 1e-10)).toBe(true);
    });

    it('converts π to 180°', () => {
      expect(close(degrees(Math.PI), 180, 1e-10)).toBe(true);
    });

    it('round-trips', () => {
      expect(close(degrees(radians(45)), 45, 1e-10)).toBe(true);
      expect(close(radians(degrees(1.5)), 1.5, 1e-10)).toBe(true);
    });
  });

  describe('lerp', () => {
    it('returns a at t=0', () => {
      expect(lerp(10, 20, 0)).toBe(10);
    });

    it('returns b at t=1', () => {
      expect(lerp(10, 20, 1)).toBe(20);
    });

    it('returns midpoint at t=0.5', () => {
      expect(lerp(10, 20, 0.5)).toBe(15);
    });

    it('extrapolates beyond [0,1]', () => {
      expect(lerp(10, 20, 2)).toBe(30);
    });
  });

  describe('precision', () => {
    it('rounds to 2 decimal places', () => {
      expect(precision(3.14159, 2)).toBe(3.14);
    });

    it('rounds to 0 decimal places', () => {
      expect(precision(3.7, 0)).toBe(4);
    });

    it('returns NaN for non-finite input', () => {
      expect(precision(Infinity, 2)).toBeNaN();
      expect(precision(NaN, 2)).toBeNaN();
    });
  });

  describe('sq', () => {
    it('squares positive numbers', () => {
      expect(sq(3)).toBe(9);
    });

    it('squares negative numbers', () => {
      expect(sq(-4)).toBe(16);
    });

    it('squares zero', () => {
      expect(sq(0)).toBe(0);
    });
  });

  describe('cubicRoot', () => {
    it('handles positive values', () => {
      expect(close(cubicRoot(27), 3, 1e-10)).toBe(true);
    });

    it('handles negative values', () => {
      expect(close(cubicRoot(-27), -3, 1e-10)).toBe(true);
    });

    it('handles zero', () => {
      expect(cubicRoot(0)).toBe(0);
    });
  });

  describe('roundStep', () => {
    it('snaps to grid', () => {
      expect(roundStep(17, 10)).toBe(20);
      expect(roundStep(14, 10)).toBe(10);
    });

    it('handles small steps', () => {
      expect(roundStep(0.37, 0.25)).toBe(0.25);
      expect(roundStep(0.38, 0.25)).toBe(0.5);
    });
  });

  describe('maxAbs', () => {
    it('returns max absolute value', () => {
      expect(maxAbs(-5, 3)).toBe(5);
      expect(maxAbs(2, -8)).toBe(8);
    });
  });

  describe('sign', () => {
    it('returns -1 for negative', () => {
      expect(sign(-5)).toBe(-1);
    });

    it('returns 1 for positive', () => {
      expect(sign(5)).toBe(1);
    });

    it('returns 1 for zero', () => {
      expect(sign(0)).toBe(1);
    });
  });

  describe('finite', () => {
    it('returns value when finite', () => {
      expect(finite(42, 0)).toBe(42);
    });

    it('returns fallback for Infinity', () => {
      expect(finite(Infinity, 0)).toBe(0);
    });

    it('returns fallback for NaN', () => {
      expect(finite(NaN, -1)).toBe(-1);
    });
  });
});
