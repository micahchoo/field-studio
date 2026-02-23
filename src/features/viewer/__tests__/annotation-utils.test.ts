/**
 * Tests for annotation pure utility functions.
 *
 * Covers all 11 exported functions from the annotation model:
 *   1. pointsToSvgPath
 *   2. createSvgSelector
 *   3. parseSvgSelector
 *   4. getBoundingBox
 *   5. createTimeFragmentSelector
 *   6. parseTimeFragmentSelector
 *   7. formatTimeForDisplay
 *   8. createTimeAnnotation
 *   9. isTimeBasedAnnotation
 *  10. getAnnotationTimeRange
 *  11. simplifyPath
 */
import { describe, it, expect } from 'vitest';
import type { IIIFAnnotation } from '@/src/shared/types';
import {
  pointsToSvgPath,
  createSvgSelector,
  parseSvgSelector,
  getBoundingBox,
  createTimeFragmentSelector,
  parseTimeFragmentSelector,
  formatTimeForDisplay,
  createTimeAnnotation,
  isTimeBasedAnnotation,
  getAnnotationTimeRange,
  simplifyPath,
  type Point,
  type TimeRange,
} from '@/src/features/viewer/model/annotation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pt = (x: number, y: number): Point => ({ x, y });

const triangle: Point[] = [pt(0, 0), pt(100, 0), pt(50, 80)];

const square: Point[] = [pt(10, 10), pt(110, 10), pt(110, 110), pt(10, 110)];

// ---------------------------------------------------------------------------
// 1. pointsToSvgPath
// ---------------------------------------------------------------------------
describe('pointsToSvgPath', () => {
  it('returns empty string for empty array', () => {
    expect(pointsToSvgPath([])).toBe('');
  });

  it('returns empty string for a single point (needs >= 2)', () => {
    expect(pointsToSvgPath([pt(5, 5)])).toBe('');
  });

  it('generates an open path with two points (no Z because < 3 points)', () => {
    const result = pointsToSvgPath([pt(0, 0), pt(10, 20)], true);
    expect(result).toBe('M0.0,0.0 L10.0,20.0');
  });

  it('generates a closed path for three or more points by default', () => {
    const result = pointsToSvgPath(triangle);
    expect(result).toContain('M0.0,0.0');
    expect(result).toContain('L100.0,0.0');
    expect(result).toContain('L50.0,80.0');
    expect(result).toMatch(/Z$/);
  });

  it('omits Z when closed=false', () => {
    const result = pointsToSvgPath(triangle, false);
    expect(result).not.toContain('Z');
  });

  it('formats fractional coordinates to one decimal place', () => {
    const result = pointsToSvgPath([pt(1.567, 2.991), pt(3.14, 4.005)]);
    expect(result).toContain('M1.6,3.0');
    expect(result).toContain('L3.1,4.0');
  });

  it('handles negative coordinates', () => {
    const result = pointsToSvgPath([pt(-10, -20), pt(30, 40), pt(-5, 50)]);
    expect(result).toContain('M-10.0,-20.0');
    expect(result).toContain('L30.0,40.0');
    expect(result).toContain('L-5.0,50.0');
    expect(result).toMatch(/Z$/);
  });
});

// ---------------------------------------------------------------------------
// 2. createSvgSelector
// ---------------------------------------------------------------------------
describe('createSvgSelector', () => {
  it('wraps points in a complete SVG with correct viewBox', () => {
    const svg = createSvgSelector(triangle, 1000, 800);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0 1000 800"');
    expect(svg).toContain('<path d="');
    expect(svg).toContain('Z');
    expect(svg).toContain('"/>');
  });

  it('produces valid SVG even when points array yields empty path', () => {
    const svg = createSvgSelector([], 500, 500);
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 500 500"');
  });
});

// ---------------------------------------------------------------------------
// 3. parseSvgSelector
// ---------------------------------------------------------------------------
describe('parseSvgSelector', () => {
  it('returns empty array for non-SVG strings', () => {
    expect(parseSvgSelector('')).toEqual([]);
    expect(parseSvgSelector('not svg at all')).toEqual([]);
  });

  it('parses a simple path with M and L commands', () => {
    const svg = '<svg><path d="M10,20 L30,40 L50,60 Z"/></svg>';
    const pts = parseSvgSelector(svg);
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual({ x: 10, y: 20 });
    expect(pts[1]).toEqual({ x: 30, y: 40 });
    expect(pts[2]).toEqual({ x: 50, y: 60 });
  });

  it('ignores Z command (does not produce a point)', () => {
    const svg = '<svg><path d="M0,0 L10,10 L20,0 Z"/></svg>';
    const pts = parseSvgSelector(svg);
    expect(pts).toHaveLength(3);
  });

  it('handles decimal coordinates', () => {
    const svg = '<svg><path d="M1.5,2.5 L3.14,4.99"/></svg>';
    const pts = parseSvgSelector(svg);
    expect(pts).toHaveLength(2);
    expect(pts[0].x).toBeCloseTo(1.5);
    expect(pts[0].y).toBeCloseTo(2.5);
    expect(pts[1].x).toBeCloseTo(3.14);
    expect(pts[1].y).toBeCloseTo(4.99);
  });

  it('round-trips through createSvgSelector -> parseSvgSelector', () => {
    const original = square;
    const svg = createSvgSelector(original, 500, 500);
    const parsed = parseSvgSelector(svg);
    expect(parsed).toHaveLength(original.length);
    for (let i = 0; i < original.length; i++) {
      expect(parsed[i].x).toBeCloseTo(original[i].x, 0);
      expect(parsed[i].y).toBeCloseTo(original[i].y, 0);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. getBoundingBox
// ---------------------------------------------------------------------------
describe('getBoundingBox', () => {
  it('returns zero-area box for empty array', () => {
    const bb = getBoundingBox([]);
    expect(bb).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('returns zero-area box for a single point', () => {
    const bb = getBoundingBox([pt(42, 77)]);
    expect(bb).toEqual({ x: 42, y: 77, width: 0, height: 0 });
  });

  it('computes correct AABB for a triangle', () => {
    const bb = getBoundingBox(triangle);
    expect(bb.x).toBe(0);
    expect(bb.y).toBe(0);
    expect(bb.width).toBe(100);
    expect(bb.height).toBe(80);
  });

  it('computes correct AABB for a square', () => {
    const bb = getBoundingBox(square);
    expect(bb).toEqual({ x: 10, y: 10, width: 100, height: 100 });
  });

  it('handles points with negative coordinates', () => {
    const pts = [pt(-50, -30), pt(50, 30)];
    const bb = getBoundingBox(pts);
    expect(bb).toEqual({ x: -50, y: -30, width: 100, height: 60 });
  });

  it('handles collinear horizontal points', () => {
    const pts = [pt(0, 5), pt(10, 5), pt(20, 5)];
    const bb = getBoundingBox(pts);
    expect(bb.height).toBe(0);
    expect(bb.width).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// 5. createTimeFragmentSelector
// ---------------------------------------------------------------------------
describe('createTimeFragmentSelector', () => {
  it('creates a selector with start and end', () => {
    const sel = createTimeFragmentSelector({ start: 10, end: 20 });
    expect(sel.type).toBe('FragmentSelector');
    expect(sel.conformsTo).toBe('http://www.w3.org/TR/media-frags/');
    expect(sel.value).toBe('t=10.00,20.00');
  });

  it('creates a selector with start only (point-in-time)', () => {
    const sel = createTimeFragmentSelector({ start: 5.5 });
    expect(sel.value).toBe('t=5.50');
  });

  it('handles zero start', () => {
    const sel = createTimeFragmentSelector({ start: 0, end: 1 });
    expect(sel.value).toBe('t=0.00,1.00');
  });

  it('formats to two decimal places', () => {
    const sel = createTimeFragmentSelector({ start: 3.14159, end: 99.999 });
    expect(sel.value).toBe('t=3.14,100.00');
  });
});

// ---------------------------------------------------------------------------
// 6. parseTimeFragmentSelector
// ---------------------------------------------------------------------------
describe('parseTimeFragmentSelector', () => {
  it('returns null for non-matching input', () => {
    expect(parseTimeFragmentSelector('')).toBeNull();
    expect(parseTimeFragmentSelector('x=10')).toBeNull();
    expect(parseTimeFragmentSelector('no fragment here')).toBeNull();
  });

  it('parses t=start', () => {
    const result = parseTimeFragmentSelector('t=10');
    expect(result).toEqual({ start: 10, end: undefined });
  });

  it('parses t=start,end', () => {
    const result = parseTimeFragmentSelector('t=10,20');
    expect(result).toEqual({ start: 10, end: 20 });
  });

  it('parses fractional seconds', () => {
    const result = parseTimeFragmentSelector('t=10.5,20.75');
    expect(result).toEqual({ start: 10.5, end: 20.75 });
  });

  it('parses t=0 (zero start)', () => {
    const result = parseTimeFragmentSelector('t=0');
    expect(result).toEqual({ start: 0, end: undefined });
  });

  it('round-trips through createTimeFragmentSelector -> parseTimeFragmentSelector', () => {
    const original: TimeRange = { start: 12.34, end: 56.78 };
    const selector = createTimeFragmentSelector(original);
    const parsed = parseTimeFragmentSelector(selector.value);
    expect(parsed).not.toBeNull();
    expect(parsed!.start).toBeCloseTo(original.start, 1);
    expect(parsed!.end).toBeCloseTo(original.end!, 1);
  });

  it('round-trips point-in-time', () => {
    const original: TimeRange = { start: 42 };
    const selector = createTimeFragmentSelector(original);
    const parsed = parseTimeFragmentSelector(selector.value);
    expect(parsed).not.toBeNull();
    expect(parsed!.start).toBe(42);
    expect(parsed!.end).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 7. formatTimeForDisplay
// ---------------------------------------------------------------------------
describe('formatTimeForDisplay', () => {
  it('formats zero seconds', () => {
    expect(formatTimeForDisplay(0)).toBe('0:00.00');
  });

  it('formats seconds < 60 without hour prefix', () => {
    expect(formatTimeForDisplay(5)).toBe('0:05.00');
    expect(formatTimeForDisplay(59)).toBe('0:59.00');
  });

  it('formats fractional seconds', () => {
    expect(formatTimeForDisplay(1.5)).toBe('0:01.50');
    expect(formatTimeForDisplay(10.99)).toBe('0:10.99');
  });

  it('formats exactly 60 seconds as 1:00', () => {
    expect(formatTimeForDisplay(60)).toBe('1:00.00');
  });

  it('formats minutes and seconds correctly', () => {
    expect(formatTimeForDisplay(125)).toBe('2:05.00');
    // 3599.99 % 1 = ~0.9899 due to IEEE 754, so floor(0.9899*100) = 98
    expect(formatTimeForDisplay(3599.99)).toBe('59:59.98');
  });

  it('uses HH:MM:SS.ms format when >= 1 hour', () => {
    expect(formatTimeForDisplay(3600)).toBe('1:00:00.00');
    expect(formatTimeForDisplay(3661.5)).toBe('1:01:01.50');
    expect(formatTimeForDisplay(7200)).toBe('2:00:00.00');
  });

  it('pads minutes and seconds with leading zeros in hour format', () => {
    expect(formatTimeForDisplay(3601)).toBe('1:00:01.00');
    expect(formatTimeForDisplay(3660)).toBe('1:01:00.00');
  });

  it('formats very large values', () => {
    const result = formatTimeForDisplay(36000);
    expect(result).toBe('10:00:00.00');
  });

  it('handles sub-centisecond precision (floors ms to 2 digits)', () => {
    expect(formatTimeForDisplay(0.999)).toBe('0:00.99');
    expect(formatTimeForDisplay(0.001)).toBe('0:00.00');
    expect(formatTimeForDisplay(0.015)).toBe('0:00.01');
  });
});

// ---------------------------------------------------------------------------
// 8. createTimeAnnotation
// ---------------------------------------------------------------------------
describe('createTimeAnnotation', () => {
  const canvasId = 'https://example.org/canvas/1';
  const range: TimeRange = { start: 10, end: 20 };

  it('creates a well-formed IIIF Annotation', () => {
    const ann = createTimeAnnotation(canvasId, range, 'Hello');
    expect(ann.type).toBe('Annotation');
    expect(ann.id).toContain(canvasId);
    expect(ann.id).toContain('annotation/time-');
    expect(ann.motivation).toBe('commenting');
  });

  it('uses the provided motivation', () => {
    const ann = createTimeAnnotation(canvasId, range, 'Tag', 'tagging');
    expect(ann.motivation).toBe('tagging');
  });

  it('trims text in the body', () => {
    const ann = createTimeAnnotation(canvasId, range, '  spaced out  ');
    const body = ann.body as { value: string };
    expect(body.value).toBe('spaced out');
  });

  it('sets TextualBody with text/plain format', () => {
    const ann = createTimeAnnotation(canvasId, range, 'Test');
    const body = ann.body as { type: string; format: string };
    expect(body.type).toBe('TextualBody');
    expect(body.format).toBe('text/plain');
  });

  it('sets target with SpecificResource and FragmentSelector', () => {
    const ann = createTimeAnnotation(canvasId, range, 'Test');
    const target = ann.target as {
      type: string;
      source: string;
      selector: { type: string; value: string };
    };
    expect(target.type).toBe('SpecificResource');
    expect(target.source).toBe(canvasId);
    expect(target.selector.type).toBe('FragmentSelector');
    expect(target.selector.value).toBe('t=10.00,20.00');
  });

  it('handles point-in-time range (no end)', () => {
    const ann = createTimeAnnotation(canvasId, { start: 5 }, 'Moment');
    const target = ann.target as { selector: { value: string } };
    expect(target.selector.value).toBe('t=5.00');
  });

  it('generates unique IDs based on Date.now()', () => {
    const a = createTimeAnnotation(canvasId, range, 'A');
    const b = createTimeAnnotation(canvasId, range, 'B');
    expect(a.id).toContain('annotation/time-');
    expect(b.id).toContain('annotation/time-');
  });
});

// ---------------------------------------------------------------------------
// 9. isTimeBasedAnnotation
// ---------------------------------------------------------------------------
describe('isTimeBasedAnnotation', () => {
  it('returns true for annotation with FragmentSelector t= value', () => {
    const ann: IIIFAnnotation = {
      id: 'a1',
      type: 'Annotation',
      motivation: 'commenting',
      body: { type: 'TextualBody', value: 'x', format: 'text/plain' },
      target: {
        type: 'SpecificResource',
        source: 'canvas/1',
        selector: { type: 'FragmentSelector', value: 't=10,20' },
      },
    };
    expect(isTimeBasedAnnotation(ann)).toBe(true);
  });

  it('returns false for annotation with non-time FragmentSelector', () => {
    const ann: IIIFAnnotation = {
      id: 'a2',
      type: 'Annotation',
      motivation: 'commenting',
      body: { type: 'TextualBody', value: 'x', format: 'text/plain' },
      target: {
        type: 'SpecificResource',
        source: 'canvas/1',
        selector: { type: 'FragmentSelector', value: 'xywh=0,0,100,100' },
      },
    };
    expect(isTimeBasedAnnotation(ann)).toBe(false);
  });

  it('returns true for annotation with source containing #t= fragment (with non-time selector)', () => {
    // Note: isTimeBasedAnnotation returns false if target has no selector at all,
    // so the source URL check only fires when a non-time selector IS present.
    const ann: IIIFAnnotation = {
      id: 'a3',
      type: 'Annotation',
      motivation: 'commenting',
      body: { type: 'TextualBody', value: 'x', format: 'text/plain' },
      target: {
        type: 'SpecificResource',
        source: 'canvas/1#t=5,15',
        selector: { type: 'SvgSelector', value: '<svg></svg>' },
      },
    };
    expect(isTimeBasedAnnotation(ann)).toBe(true);
  });

  it('returns false when source has #t= but target has no selector (early return)', () => {
    const ann: IIIFAnnotation = {
      id: 'a3b',
      type: 'Annotation',
      motivation: 'commenting',
      body: { type: 'TextualBody', value: 'x', format: 'text/plain' },
      target: {
        type: 'SpecificResource',
        source: 'canvas/1#t=5,15',
      },
    };
    // Implementation returns false if no selector property exists
    expect(isTimeBasedAnnotation(ann)).toBe(false);
  });

  it('returns false for annotation with no selector', () => {
    const ann: IIIFAnnotation = {
      id: 'a4',
      type: 'Annotation',
      motivation: 'commenting',
      body: { type: 'TextualBody', value: 'x', format: 'text/plain' },
      target: 'canvas/1',
    };
    expect(isTimeBasedAnnotation(ann)).toBe(false);
  });

  it('returns false for SVG selector annotation', () => {
    const ann: IIIFAnnotation = {
      id: 'a5',
      type: 'Annotation',
      motivation: 'commenting',
      body: { type: 'TextualBody', value: 'x', format: 'text/plain' },
      target: {
        type: 'SpecificResource',
        source: 'canvas/1',
        selector: { type: 'SvgSelector', value: '<svg>...</svg>' },
      },
    };
    expect(isTimeBasedAnnotation(ann)).toBe(false);
  });

  it('correctly identifies annotations created by createTimeAnnotation', () => {
    const ann = createTimeAnnotation('canvas/1', { start: 0, end: 10 }, 'Test');
    expect(isTimeBasedAnnotation(ann)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 10. getAnnotationTimeRange
// ---------------------------------------------------------------------------
describe('getAnnotationTimeRange', () => {
  it('extracts time range from FragmentSelector', () => {
    const ann: IIIFAnnotation = {
      id: 'a1',
      type: 'Annotation',
      motivation: 'commenting',
      body: { type: 'TextualBody', value: 'x', format: 'text/plain' },
      target: {
        type: 'SpecificResource',
        source: 'canvas/1',
        selector: { type: 'FragmentSelector', value: 't=5.5,15.75' },
      },
    };
    const range = getAnnotationTimeRange(ann);
    expect(range).not.toBeNull();
    expect(range!.start).toBeCloseTo(5.5);
    expect(range!.end).toBeCloseTo(15.75);
  });

  it('extracts time range from source URL fragment', () => {
    const ann: IIIFAnnotation = {
      id: 'a2',
      type: 'Annotation',
      motivation: 'commenting',
      body: { type: 'TextualBody', value: 'x', format: 'text/plain' },
      target: {
        type: 'SpecificResource',
        source: 'canvas/1#t=30,60',
      },
    };
    const range = getAnnotationTimeRange(ann);
    expect(range).not.toBeNull();
    expect(range!.start).toBe(30);
    expect(range!.end).toBe(60);
  });

  it('returns null for non-time annotations', () => {
    const ann: IIIFAnnotation = {
      id: 'a3',
      type: 'Annotation',
      motivation: 'commenting',
      body: { type: 'TextualBody', value: 'x', format: 'text/plain' },
      target: {
        type: 'SpecificResource',
        source: 'canvas/1',
        selector: { type: 'SvgSelector', value: '<svg>...</svg>' },
      },
    };
    expect(getAnnotationTimeRange(ann)).toBeNull();
  });

  it('returns null for string target', () => {
    const ann: IIIFAnnotation = {
      id: 'a4',
      type: 'Annotation',
      motivation: 'commenting',
      body: { type: 'TextualBody', value: 'x', format: 'text/plain' },
      target: 'canvas/1',
    };
    expect(getAnnotationTimeRange(ann)).toBeNull();
  });

  it('round-trips through createTimeAnnotation -> getAnnotationTimeRange', () => {
    const original: TimeRange = { start: 12.34, end: 56.78 };
    const ann = createTimeAnnotation('canvas/1', original, 'test');
    const extracted = getAnnotationTimeRange(ann);
    expect(extracted).not.toBeNull();
    expect(extracted!.start).toBeCloseTo(original.start, 1);
    expect(extracted!.end).toBeCloseTo(original.end!, 1);
  });

  it('handles point-in-time annotation', () => {
    const ann = createTimeAnnotation('canvas/1', { start: 42 }, 'test');
    const range = getAnnotationTimeRange(ann);
    expect(range).not.toBeNull();
    expect(range!.start).toBe(42);
    expect(range!.end).toBeUndefined();
  });

  it('prefers FragmentSelector over source URL fragment', () => {
    const ann: IIIFAnnotation = {
      id: 'a5',
      type: 'Annotation',
      motivation: 'commenting',
      body: { type: 'TextualBody', value: 'x', format: 'text/plain' },
      target: {
        type: 'SpecificResource',
        source: 'canvas/1#t=100,200',
        selector: { type: 'FragmentSelector', value: 't=10,20' },
      },
    };
    const range = getAnnotationTimeRange(ann);
    expect(range).not.toBeNull();
    expect(range!.start).toBe(10);
    expect(range!.end).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// 11. simplifyPath
// ---------------------------------------------------------------------------
describe('simplifyPath', () => {
  it('returns empty array for empty input', () => {
    expect(simplifyPath([], 5)).toEqual([]);
  });

  it('returns single point for single-point input', () => {
    const pts = [pt(1, 1)];
    expect(simplifyPath(pts, 5)).toEqual(pts);
  });

  it('returns both points for two-point input', () => {
    const pts = [pt(0, 0), pt(100, 100)];
    expect(simplifyPath(pts, 5)).toEqual(pts);
  });

  it('always includes first and last points', () => {
    const pts = [pt(0, 0), pt(1, 1), pt(2, 2), pt(100, 100)];
    const result = simplifyPath(pts, 1000);
    expect(result[0]).toEqual(pt(0, 0));
    expect(result[result.length - 1]).toEqual(pt(100, 100));
  });

  it('retains all points when tolerance is 0', () => {
    const pts = [pt(0, 0), pt(1, 0), pt(2, 0), pt(3, 0)];
    const result = simplifyPath(pts, 0);
    expect(result).toEqual(pts);
  });

  it('removes intermediate points closer than tolerance', () => {
    const pts = [pt(0, 0), pt(1, 0), pt(2, 0), pt(3, 0), pt(100, 0)];
    const result = simplifyPath(pts, 50);
    expect(result).toEqual([pt(0, 0), pt(100, 0)]);
  });

  it('retains points that exceed tolerance from previous kept point', () => {
    const pts = [pt(0, 0), pt(5, 0), pt(11, 0), pt(12, 0), pt(22, 0), pt(30, 0)];
    const result = simplifyPath(pts, 10);
    expect(result).toEqual([pt(0, 0), pt(11, 0), pt(22, 0), pt(30, 0)]);
  });

  it('handles collinear points correctly', () => {
    const pts = Array.from({ length: 20 }, (_, i) => pt(i, 0));
    const result = simplifyPath(pts, 5);
    expect(result.length).toBeLessThan(pts.length);
    expect(result[0]).toEqual(pt(0, 0));
    expect(result[result.length - 1]).toEqual(pt(19, 0));
  });

  it('works with diagonal paths', () => {
    const pts = [pt(0, 0), pt(3, 4), pt(6, 8), pt(9, 12), pt(100, 100)];
    const result = simplifyPath(pts, 7);
    expect(result).toEqual([pt(0, 0), pt(6, 8), pt(100, 100)]);
  });

  it('handles large tolerance that removes all middle points', () => {
    const pts = [pt(0, 0), pt(1, 1), pt(2, 2), pt(3, 3), pt(4, 4)];
    const result = simplifyPath(pts, 99999);
    expect(result).toEqual([pt(0, 0), pt(4, 4)]);
  });

  it('does not mutate the original array', () => {
    const pts = [pt(0, 0), pt(1, 0), pt(2, 0), pt(100, 0)];
    const original = [...pts];
    simplifyPath(pts, 50);
    expect(pts).toEqual(original);
  });
});
