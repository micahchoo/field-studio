/**
 * IIIF Selector Abstraction
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

import { IIIFSpecificResource, Selector } from '../types';

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
    : (target.source as any)?.id || '';

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
  const params = new URLSearchParams(fragment.replace(/&/g, '&'));

  // Also handle non-URL-encoded format (xywh=x,y,w,h)
  const parts = fragment.split('&');
  for (const part of parts) {
    const [key, value] = part.split('=');

    if (key === 'xywh' && value) {
      result.spatial = parseXYWH(value);
    } else if (key === 't' && value) {
      result.temporal = parseT(value);
    }
  }

  return result;
}

/**
 * Parse xywh parameter
 * Formats: "x,y,w,h" or "percent:x,y,w,h"
 */
export function parseXYWH(value: string): SpatialRegion {
  const isPercent = value.startsWith('percent:');
  const coords = (isPercent ? value.slice(8) : value).split(',').map(Number);

  return {
    x: coords[0] || 0,
    y: coords[1] || 0,
    width: coords[2] || 0,
    height: coords[3] || 0,
    unit: isPercent ? 'percent' : 'pixel'
  };
}

/**
 * Parse t parameter (temporal)
 * Formats: "start,end" or "start" (NPT - Normal Play Time)
 */
export function parseT(value: string): TemporalRegion {
  const parts = value.split(',');

  return {
    start: parseNPT(parts[0]),
    end: parts[1] ? parseNPT(parts[1]) : undefined
  };
}

/**
 * Parse Normal Play Time (NPT) format
 * Supports: seconds, mm:ss, hh:mm:ss
 */
export function parseNPT(npt: string): number {
  const trimmed = npt.trim();

  // Already a number (seconds)
  if (!trimmed.includes(':')) {
    return parseFloat(trimmed) || 0;
  }

  // mm:ss or hh:mm:ss format
  const parts = trimmed.split(':').map(Number);

  if (parts.length === 2) {
    // mm:ss
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // hh:mm:ss
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return 0;
}

/**
 * Parse a IIIF Selector object
 */
export function parseSelector(selector: Selector): ParsedSelector {
  if (!selector) {
    return { type: 'unknown', original: '' };
  }

  switch (selector.type) {
    case 'FragmentSelector': {
      const value = (selector as any).value || '';
      // Remove leading # if present
      const fragment = value.startsWith('#') ? value.slice(1) : value;
      return parseFragment(fragment);
    }

    case 'SvgSelector': {
      return {
        type: 'svg',
        svgPath: (selector as any).value || '',
        original: (selector as any).value || ''
      };
    }

    case 'PointSelector': {
      const ps = selector as { type: 'PointSelector'; x?: number; y?: number; t?: number };
      return {
        type: 'point',
        point: {
          x: ps.x,
          y: ps.y,
          t: ps.t
        },
        original: JSON.stringify(selector)
      };
    }

    default:
      return { type: 'unknown', original: JSON.stringify(selector) };
  }
}

// ============================================================================
// Serialization Functions
// ============================================================================

/**
 * Serialize a SpatialRegion to xywh fragment
 */
export function serializeXYWH(region: SpatialRegion): string {
  const coords = `${region.x},${region.y},${region.width},${region.height}`;

  if (region.unit === 'percent') {
    return `xywh=percent:${coords}`;
  }

  return `xywh=${coords}`;
}

/**
 * Serialize a TemporalRegion to t fragment
 */
export function serializeT(region: TemporalRegion): string {
  if (region.end !== undefined) {
    return `t=${region.start},${region.end}`;
  }
  return `t=${region.start}`;
}

/**
 * Serialize a ParsedSelector back to a fragment string
 */
export function serializeSelector(selector: ParsedSelector): string {
  const parts: string[] = [];

  if (selector.spatial) {
    parts.push(serializeXYWH(selector.spatial));
  }

  if (selector.temporal) {
    parts.push(serializeT(selector.temporal));
  }

  if (parts.length === 0) {
    return '';
  }

  return `#${parts.join('&')}`;
}

/**
 * Serialize a parsed target back to a target string
 */
export function serializeTarget(target: SelectorTarget): string {
  if (!target.selector) {
    return target.source;
  }

  const fragment = serializeSelector(target.selector);
  return target.source + fragment;
}

/**
 * Create a IIIF Selector object from a ParsedSelector
 */
export function toIIIFSelector(parsed: ParsedSelector): Selector | null {
  switch (parsed.type) {
    case 'fragment': {
      const fragment = serializeSelector(parsed);
      if (!fragment) return null;

      return {
        type: 'FragmentSelector',
        value: fragment,
        conformsTo: 'http://www.w3.org/TR/media-frags/'
      };
    }

    case 'svg': {
      return {
        type: 'SvgSelector',
        value: parsed.svgPath || ''
      };
    }

    case 'point': {
      return {
        type: 'PointSelector',
        ...parsed.point
      } as Selector;
    }

    default:
      return null;
  }
}

/**
 * Create a SpecificResource from source and selector
 */
export function createSpecificResource(
  source: string,
  selector: ParsedSelector | null
): IIIFSpecificResource | string {
  // If no selector, return simple string
  if (!selector || selector.type === 'unknown') {
    return source;
  }

  const iiifSelector = toIIIFSelector(selector);
  if (!iiifSelector) {
    return source;
  }

  return {
    type: 'SpecificResource',
    source,
    selector: iiifSelector
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a target has a spatial selector
 */
export function hasSpatialSelector(target: string | IIIFSpecificResource): boolean {
  const parsed = parseTarget(target);
  return !!parsed.selector?.spatial;
}

/**
 * Check if a target has a temporal selector
 */
export function hasTemporalSelector(target: string | IIIFSpecificResource): boolean {
  const parsed = parseTarget(target);
  return !!parsed.selector?.temporal;
}

/**
 * Extract just the source ID without any fragment
 */
export function getSourceId(target: string | IIIFSpecificResource): string {
  return parseTarget(target).source;
}

/**
 * Get spatial region if present
 */
export function getSpatialRegion(target: string | IIIFSpecificResource): SpatialRegion | null {
  return parseTarget(target).selector?.spatial || null;
}

/**
 * Get temporal region if present
 */
export function getTemporalRegion(target: string | IIIFSpecificResource): TemporalRegion | null {
  return parseTarget(target).selector?.temporal || null;
}

/**
 * Update the spatial region of a target
 */
export function updateSpatialRegion(
  target: string | IIIFSpecificResource,
  region: SpatialRegion
): string {
  const parsed = parseTarget(target);

  const newSelector: ParsedSelector = {
    type: 'fragment',
    spatial: region,
    temporal: parsed.selector?.temporal,
    original: ''
  };

  return serializeTarget({ source: parsed.source, selector: newSelector });
}

/**
 * Update the temporal region of a target
 */
export function updateTemporalRegion(
  target: string | IIIFSpecificResource,
  region: TemporalRegion
): string {
  const parsed = parseTarget(target);

  const newSelector: ParsedSelector = {
    type: 'fragment',
    spatial: parsed.selector?.spatial,
    temporal: region,
    original: ''
  };

  return serializeTarget({ source: parsed.source, selector: newSelector });
}

/**
 * Create a spatial selector for a region
 */
export function createSpatialTarget(
  canvasId: string,
  x: number,
  y: number,
  width: number,
  height: number,
  unit: 'pixel' | 'percent' = 'pixel'
): string {
  return `${canvasId}#xywh=${unit === 'percent' ? 'percent:' : ''}${x},${y},${width},${height}`;
}

/**
 * Create a temporal selector for a time range
 */
export function createTemporalTarget(
  canvasId: string,
  start: number,
  end?: number
): string {
  const t = end !== undefined ? `${start},${end}` : `${start}`;
  return `${canvasId}#t=${t}`;
}

/**
 * Format seconds as human-readable time
 */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Calculate if a point is within a spatial region
 */
export function isPointInRegion(
  point: { x: number; y: number },
  region: SpatialRegion,
  canvasWidth?: number,
  canvasHeight?: number
): boolean {
  let { x, y, width, height } = region;

  // Convert percent to pixels if canvas dimensions provided
  if (region.unit === 'percent' && canvasWidth && canvasHeight) {
    x = (x / 100) * canvasWidth;
    y = (y / 100) * canvasHeight;
    width = (width / 100) * canvasWidth;
    height = (height / 100) * canvasHeight;
  }

  return (
    point.x >= x &&
    point.x <= x + width &&
    point.y >= y &&
    point.y <= y + height
  );
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
