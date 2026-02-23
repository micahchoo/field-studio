/**
 * Annotation Selectors
 *
 * Parse and serialize URI fragments and selector objects for
 * spatial (xywh) and temporal (t) regions per W3C Media Fragments
 * and IIIF specifications.
 *
 * Supported formats:
 * - Fragment selectors: #xywh=x,y,w,h or #xywh=percent:x,y,w,h
 * - Temporal selectors: #t=start,end or #t=start
 * - Combined: #xywh=0,0,100,100&t=0,10
 * - SVG selectors: <svg>...</svg>
 * - Point selectors: { type: "PointSelector", x, y, t }
 *
 * @see https://www.w3.org/TR/media-frags/
 * @see https://iiif.io/api/annex/openannotation/#selectors
 */

import type { IIIFSpecificResource, Selector } from '@/src/shared/types';

// ============================================================================
// Types
// ============================================================================

export interface SpatialRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: 'pixel' | 'percent';
}

export interface TemporalRegion {
  start: number;
  end?: number;
}

export interface PointRegion {
  x?: number;
  y?: number;
  t?: number;
}

export interface ParsedSelector {
  type: 'fragment' | 'svg' | 'point' | 'unknown';
  spatial?: SpatialRegion;
  temporal?: TemporalRegion;
  point?: PointRegion;
  svgPath?: string;
  original: string;
}

export interface SelectorTarget {
  source: string;
  selector?: ParsedSelector;
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse a target string or SpecificResource into components
 */
export function parseTarget(target: string | IIIFSpecificResource): SelectorTarget {
  // Simple string with fragment
  if (typeof target === 'string') {
    const [source, fragment] = target.split('#');
    return {
      source,
      selector: fragment ? parseFragment(fragment) : undefined
    };
  }

  // SpecificResource object
  const source = typeof target.source === 'string'
    ? target.source
    : (target.source as { id?: string })?.id || '';

  let selector: ParsedSelector | undefined;

  if (target.selector) {
    const selectors = Array.isArray(target.selector) ? target.selector : [target.selector];
    // Parse first selector (most common case)
    selector = parseSelector(selectors[0]);
  }

  return { source, selector };
}

/**
 * Parse a URI fragment (without the #)
 */
export function parseFragment(fragment: string): ParsedSelector {
  const result: ParsedSelector = {
    type: 'fragment',
    original: `#${fragment}`
  };

  // Parse each component (xywh, t, etc.)
  const parts = fragment.split('&');

  for (const part of parts) {
    if (part.startsWith('xywh=')) {
      result.spatial = parseXYWH(part.slice(5));
    } else if (part.startsWith('t=')) {
      result.temporal = parseTemporal(part.slice(2));
    }
  }

  return result;
}

/**
 * Parse xywh spatial region
 */
export function parseXYWH(value: string): SpatialRegion {
  const isPercent = value.startsWith('percent:');
  const numbers = value.replace('percent:', '').split(',').map(Number);

  return {
    x: numbers[0] || 0,
    y: numbers[1] || 0,
    width: numbers[2] || 0,
    height: numbers[3] || 0,
    unit: isPercent ? 'percent' : 'pixel'
  };
}

/**
 * Parse temporal region
 */
export function parseTemporal(value: string): TemporalRegion {
  const parts = value.split(',').map(Number);
  return {
    start: parts[0] || 0,
    end: parts[1]
  };
}

/**
 * Parse a selector object
 */
export function parseSelector(selector: Selector): ParsedSelector {
  // FragmentSelector
  if (selector.type === 'FragmentSelector' && selector.value) {
    return parseFragment(selector.value);
  }

  // SVGSelector
  if (selector.type === 'SvgSelector' && selector.value) {
    return {
      type: 'svg',
      svgPath: selector.value,
      original: selector.value
    };
  }

  // PointSelector
  if (selector.type === 'PointSelector') {
    return {
      type: 'point',
      point: {
        x: selector.x,
        y: selector.y,
        t: selector.t
      },
      original: JSON.stringify(selector)
    };
  }

  // Unknown
  return {
    type: 'unknown',
    original: JSON.stringify(selector)
  };
}

// ============================================================================
// Serialization Functions
// ============================================================================

/**
 * Serialize a spatial region to fragment string
 */
export function serializeXYWH(region: SpatialRegion): string {
  const prefix = region.unit === 'percent' ? 'percent:' : '';
  return `${prefix}${region.x},${region.y},${region.width},${region.height}`;
}

/**
 * Serialize a temporal region to fragment string
 */
export function serializeTemporal(region: TemporalRegion): string {
  if (region.end !== undefined) {
    return `${region.start},${region.end}`;
  }
  return String(region.start);
}

/**
 * Serialize a parsed selector back to fragment string
 */
export function serializeSelector(parsed: ParsedSelector): string {
  const parts: string[] = [];

  if (parsed.spatial) {
    parts.push(`xywh=${serializeXYWH(parsed.spatial)}`);
  }

  if (parsed.temporal) {
    parts.push(`t=${serializeTemporal(parsed.temporal)}`);
  }

  if (parts.length > 0) {
    return `#${parts.join('&')}`;
  }

  return parsed.original;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a point is within a spatial region
 */
export function isPointInRegion(x: number, y: number, region: SpatialRegion): boolean {
  return x >= region.x &&
    x <= region.x + region.width &&
    y >= region.y &&
    y <= region.y + region.height;
}

/**
 * Check if a region is a valid non-zero area
 */
export function isValidRegion(region: SpatialRegion): boolean {
  return region.width > 0 && region.height > 0;
}

/**
 * Calculate if a time is within a temporal region
 */
export function isTimeInRegion(time: number, region: TemporalRegion): boolean {
  if (region.end !== undefined) {
    return time >= region.start && time <= region.end;
  }
  return time >= region.start;
}

/**
 * Convert pixel coordinates to percentages
 */
export function toPercentRegion(
  region: SpatialRegion,
  containerWidth: number,
  containerHeight: number
): SpatialRegion {
  if (region.unit === 'percent') {
    return region;
  }

  return {
    x: (region.x / containerWidth) * 100,
    y: (region.y / containerHeight) * 100,
    width: (region.width / containerWidth) * 100,
    height: (region.height / containerHeight) * 100,
    unit: 'percent'
  };
}

/**
 * Convert percentage coordinates to pixels
 */
export function toPixelRegion(
  region: SpatialRegion,
  containerWidth: number,
  containerHeight: number
): SpatialRegion {
  if (region.unit === 'pixel') {
    return region;
  }

  return {
    x: (region.x / 100) * containerWidth,
    y: (region.y / 100) * containerHeight,
    width: (region.width / 100) * containerWidth,
    height: (region.height / 100) * containerHeight,
    unit: 'pixel'
  };
}

export default {
  parseTarget,
  parseFragment,
  parseXYWH,
  parseTemporal,
  parseSelector,
  serializeXYWH,
  serializeTemporal,
  serializeSelector,
  isPointInRegion,
  isValidRegion,
  isTimeInRegion,
  toPercentRegion,
  toPixelRegion,
};
