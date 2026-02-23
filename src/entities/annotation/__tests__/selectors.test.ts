/**
 * Annotation Selectors Tests
 *
 * Tests parsing and serialization of W3C Media Fragment selectors
 * (spatial xywh, temporal t) and IIIF-specific selector utilities
 * used throughout the annotation system.
 */

import { describe, it, expect } from 'vitest';
import {
  parseXYWH,
  parseTemporal,
  parseFragment,
  serializeXYWH,
  serializeTemporal,
  serializeSelector,
  parseTarget,
  parseSelector,
  isPointInRegion,
  isValidRegion,
  isTimeInRegion,
  toPercentRegion,
  toPixelRegion,
} from '../model/selectors';
import type { SpatialRegion, TemporalRegion, ParsedSelector } from '../model/selectors';

// ======================================================================
// Parsing
// ======================================================================

describe('parseXYWH', () => {
  it('parses "100,200,300,400" correctly', () => {
    const region = parseXYWH('100,200,300,400');
    expect(region).toEqual({ x: 100, y: 200, width: 300, height: 400, unit: 'pixel' });
  });

  it('parses percent coordinates', () => {
    const region = parseXYWH('percent:10,20,50,60');
    expect(region).toEqual({ x: 10, y: 20, width: 50, height: 60, unit: 'percent' });
  });

  it('returns zeros for empty string', () => {
    const region = parseXYWH('');
    expect(region).toEqual({ x: 0, y: 0, width: 0, height: 0, unit: 'pixel' });
  });

  it('returns zeros for incomplete values', () => {
    const region = parseXYWH('10');
    expect(region.x).toBe(10);
    expect(region.y).toBe(0);
    expect(region.width).toBe(0);
  });
});

describe('parseTemporal', () => {
  it('parses "10,20" correctly', () => {
    const region = parseTemporal('10,20');
    expect(region).toEqual({ start: 10, end: 20 });
  });

  it('handles open-ended "10" (no end)', () => {
    const region = parseTemporal('10');
    expect(region.start).toBe(10);
    expect(region.end).toBeUndefined();
  });

  it('returns start 0 for empty string', () => {
    const region = parseTemporal('');
    expect(region.start).toBe(0);
    expect(region.end).toBeUndefined();
  });
});

// ======================================================================
// Serialization
// ======================================================================

describe('serializeXYWH', () => {
  it('produces correct pixel string', () => {
    const region: SpatialRegion = { x: 10, y: 20, width: 100, height: 200, unit: 'pixel' };
    expect(serializeXYWH(region)).toBe('10,20,100,200');
  });

  it('includes percent: prefix for percent unit', () => {
    const region: SpatialRegion = { x: 5, y: 10, width: 50, height: 60, unit: 'percent' };
    expect(serializeXYWH(region)).toBe('percent:5,10,50,60');
  });
});

describe('serializeTemporal', () => {
  it('produces "start,end" when end is defined', () => {
    const region: TemporalRegion = { start: 5, end: 15 };
    expect(serializeTemporal(region)).toBe('5,15');
  });

  it('produces start only when end is undefined', () => {
    const region: TemporalRegion = { start: 42 };
    expect(serializeTemporal(region)).toBe('42');
  });
});

// ======================================================================
// Fragment Parsing (combined xywh+time)
// ======================================================================

describe('parseFragment', () => {
  it('parses combined xywh+time fragment', () => {
    const parsed = parseFragment('xywh=0,0,100,100&t=0,10');
    expect(parsed.type).toBe('fragment');
    expect(parsed.spatial).toEqual({ x: 0, y: 0, width: 100, height: 100, unit: 'pixel' });
    expect(parsed.temporal).toEqual({ start: 0, end: 10 });
  });

  it('parses xywh-only fragment', () => {
    const parsed = parseFragment('xywh=50,50,200,300');
    expect(parsed.spatial).toBeDefined();
    expect(parsed.temporal).toBeUndefined();
  });

  it('parses time-only fragment', () => {
    const parsed = parseFragment('t=5,30');
    expect(parsed.temporal).toBeDefined();
    expect(parsed.spatial).toBeUndefined();
  });

  it('stores original with # prefix', () => {
    const parsed = parseFragment('xywh=0,0,10,10');
    expect(parsed.original).toBe('#xywh=0,0,10,10');
  });
});

// ======================================================================
// serializeSelector (round-trip)
// ======================================================================

describe('serializeSelector', () => {
  it('round-trips spatial + temporal to fragment string', () => {
    const parsed: ParsedSelector = {
      type: 'fragment',
      spatial: { x: 10, y: 20, width: 100, height: 200, unit: 'pixel' },
      temporal: { start: 0, end: 5 },
      original: '#xywh=10,20,100,200&t=0,5',
    };
    expect(serializeSelector(parsed)).toBe('#xywh=10,20,100,200&t=0,5');
  });

  it('returns original for non-fragment selector', () => {
    const parsed: ParsedSelector = {
      type: 'svg',
      svgPath: '<svg></svg>',
      original: '<svg></svg>',
    };
    expect(serializeSelector(parsed)).toBe('<svg></svg>');
  });
});

// ======================================================================
// parseTarget / parseSelector
// ======================================================================

describe('parseTarget', () => {
  it('extracts canvas ID from target string with fragment', () => {
    const result = parseTarget('https://example.org/canvas/1#xywh=0,0,100,100');
    expect(result.source).toBe('https://example.org/canvas/1');
    expect(result.selector).toBeDefined();
    expect(result.selector!.spatial).toEqual({ x: 0, y: 0, width: 100, height: 100, unit: 'pixel' });
  });

  it('extracts source from string without fragment', () => {
    const result = parseTarget('https://example.org/canvas/1');
    expect(result.source).toBe('https://example.org/canvas/1');
    expect(result.selector).toBeUndefined();
  });

  it('handles SpecificResource object with FragmentSelector', () => {
    const result = parseTarget({
      type: 'SpecificResource',
      source: 'https://example.org/canvas/1',
      selector: { type: 'FragmentSelector', value: 'xywh=10,20,30,40' },
    });
    expect(result.source).toBe('https://example.org/canvas/1');
    expect(result.selector!.spatial!.x).toBe(10);
  });
});

describe('parseSelector', () => {
  it('parses FragmentSelector', () => {
    const parsed = parseSelector({ type: 'FragmentSelector', value: 'xywh=0,0,50,50' });
    expect(parsed.type).toBe('fragment');
    expect(parsed.spatial!.width).toBe(50);
  });

  it('parses SvgSelector', () => {
    const parsed = parseSelector({ type: 'SvgSelector', value: '<svg><rect/></svg>' });
    expect(parsed.type).toBe('svg');
    expect(parsed.svgPath).toBe('<svg><rect/></svg>');
  });

  it('parses PointSelector', () => {
    const parsed = parseSelector({ type: 'PointSelector', x: 100, y: 200, t: 5 });
    expect(parsed.type).toBe('point');
    expect(parsed.point).toEqual({ x: 100, y: 200, t: 5 });
  });

  it('returns unknown for unrecognized selector type', () => {
    const parsed = parseSelector({ type: 'CustomSelector' } as any);
    expect(parsed.type).toBe('unknown');
  });
});

// ======================================================================
// Utility Functions
// ======================================================================

describe('isPointInRegion', () => {
  const region: SpatialRegion = { x: 10, y: 10, width: 100, height: 100, unit: 'pixel' };

  it('returns true for point inside region', () => {
    expect(isPointInRegion(50, 50, region)).toBe(true);
  });

  it('returns true for point on boundary', () => {
    expect(isPointInRegion(10, 10, region)).toBe(true);
    expect(isPointInRegion(110, 110, region)).toBe(true);
  });

  it('returns false for point outside region', () => {
    expect(isPointInRegion(5, 5, region)).toBe(false);
    expect(isPointInRegion(200, 200, region)).toBe(false);
  });
});

describe('isValidRegion', () => {
  it('returns true for non-zero width and height', () => {
    expect(isValidRegion({ x: 0, y: 0, width: 10, height: 10, unit: 'pixel' })).toBe(true);
  });

  it('returns false for zero-area region', () => {
    expect(isValidRegion({ x: 0, y: 0, width: 0, height: 10, unit: 'pixel' })).toBe(false);
    expect(isValidRegion({ x: 0, y: 0, width: 10, height: 0, unit: 'pixel' })).toBe(false);
  });
});

describe('isTimeInRegion', () => {
  it('returns true when time is within range', () => {
    expect(isTimeInRegion(5, { start: 0, end: 10 })).toBe(true);
  });

  it('returns true on boundaries', () => {
    expect(isTimeInRegion(0, { start: 0, end: 10 })).toBe(true);
    expect(isTimeInRegion(10, { start: 0, end: 10 })).toBe(true);
  });

  it('returns false for time outside range', () => {
    expect(isTimeInRegion(15, { start: 0, end: 10 })).toBe(false);
  });

  it('handles open-ended temporal region (no end)', () => {
    expect(isTimeInRegion(100, { start: 5 })).toBe(true);
    expect(isTimeInRegion(3, { start: 5 })).toBe(false);
  });
});

describe('toPercentRegion', () => {
  it('converts pixel region to percent', () => {
    const region: SpatialRegion = { x: 50, y: 100, width: 200, height: 400, unit: 'pixel' };
    const result = toPercentRegion(region, 1000, 1000);
    expect(result.unit).toBe('percent');
    expect(result.x).toBe(5);
    expect(result.y).toBe(10);
    expect(result.width).toBe(20);
    expect(result.height).toBe(40);
  });

  it('returns same region if already percent', () => {
    const region: SpatialRegion = { x: 10, y: 20, width: 30, height: 40, unit: 'percent' };
    expect(toPercentRegion(region, 500, 500)).toBe(region);
  });
});

describe('toPixelRegion', () => {
  it('converts percent region to pixels', () => {
    const region: SpatialRegion = { x: 10, y: 20, width: 50, height: 50, unit: 'percent' };
    const result = toPixelRegion(region, 1000, 800);
    expect(result.unit).toBe('pixel');
    expect(result.x).toBe(100);
    expect(result.y).toBe(160);
    expect(result.width).toBe(500);
    expect(result.height).toBe(400);
  });

  it('returns same region if already pixel', () => {
    const region: SpatialRegion = { x: 10, y: 20, width: 30, height: 40, unit: 'pixel' };
    expect(toPixelRegion(region, 500, 500)).toBe(region);
  });
});
