/**
 * Annotation Tool Model -- Pure TS (no framework imports)
 *
 * Domain-specific logic for annotation tools:
 * - Spatial annotations (polygon, rectangle, freehand) for images
 * - Time-based annotations (W3C Media Fragments) for audio/video
 *
 * This file contains ONLY types and pure utility functions.
 * The stateful annotation tool logic lives in annotation.svelte.ts
 * as Svelte 5 reactive classes (Cat 2 migration).
 *
 * SOURCE: React codebase src/features/viewer/model/annotation.ts
 * MIGRATION: Types + pure functions copied verbatim.
 *            UseAnnotationReturn / UseTimeAnnotationReturn REMOVED
 *            (hook-specific interfaces; replaced by class APIs in .svelte.ts)
 *
 * @see https://www.w3.org/TR/media-frags/ - W3C Media Fragments URI 1.0
 * @see https://iiif.io/api/annex/oai/#temporal-media - IIIF Temporal Annotation
 */

import type { IIIFAnnotation, IIIFCanvas } from '@/src/shared/types';

// ============================================================================
// Point type (locally defined; matches shared/constants/viewport.Point)
// ============================================================================

/**
 * 2D point used for spatial annotations.
 * Defined locally to avoid circular dependency on viewport constants.
 * Matches the canonical Point from @/src/shared/constants/viewport.
 */
export interface Point {
  x: number;
  y: number;
}

// ============================================================================
// Types
// ============================================================================

/** Spatial drawing modes for image annotations */
export type SpatialDrawingMode = 'polygon' | 'rectangle' | 'freehand' | 'select';

/** Time-based drawing mode for AV annotations */
export type TimeDrawingMode = 'timeRange';

/** Combined drawing modes */
export type DrawingMode = SpatialDrawingMode | TimeDrawingMode;

/** Time range for audio/video annotations */
export interface TimeRange {
  /** Start time in seconds */
  start: number;
  /** End time in seconds (optional for point-in-time annotations) */
  end?: number;
}

/** State snapshot for time-based annotation tool */
export interface TimeAnnotationState {
  /** Current time range being defined */
  timeRange: TimeRange | null;
  /** Whether we're in the process of selecting a range */
  isSelecting: boolean;
  /** Whether start has been set */
  hasStart: boolean;
  /** Annotation text */
  annotationText: string;
  /** Annotation motivation */
  motivation: 'commenting' | 'tagging' | 'describing';
}

/** State snapshot for spatial annotation tool */
export interface AnnotationState {
  mode: DrawingMode;
  points: Point[];
  isDrawing: boolean;
  annotationText: string;
  motivation: 'commenting' | 'tagging' | 'describing';
  showExisting: boolean;
  freehandPoints: Point[];
  cursorPoint: Point | null;
  scale: number;
  offset: { x: number; y: number };
}

// ============================================================================
// SVG Utilities (pure functions)
// ============================================================================

/**
 * Convert a sequence of points to an SVG path `d` attribute string.
 *
 * @param points - Ordered vertices of the shape
 * @param closed - Whether to append `Z` (close the path). Default true.
 * @returns SVG path data string (e.g., "M10,20 L30,40 Z")
 */
export const pointsToSvgPath = (points: Point[], closed: boolean = true): string => {
  if (points.length < 2) return '';
  const pathParts = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`
  );
  if (closed && points.length >= 3) pathParts.push('Z');
  return pathParts.join(' ');
};

/**
 * Create an SVG selector value for a IIIF annotation target.
 * Wraps points in a full `<svg>` element with a viewBox matching the canvas.
 *
 * @param points       - Polygon vertices in canvas coordinate space
 * @param canvasWidth  - Width of the IIIF canvas
 * @param canvasHeight - Height of the IIIF canvas
 * @returns Complete SVG string suitable for SvgSelector.value
 */
export const createSvgSelector = (
  points: Point[],
  canvasWidth: number,
  canvasHeight: number,
): string => {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}"><path d="${pointsToSvgPath(points, true)}"/></svg>`;
};

/**
 * Parse an SVG selector value back into an array of points.
 * Extracts the `d` attribute from the first `<path>` element
 * and converts M/L commands into Point objects.
 *
 * @param svgValue - SVG string from SvgSelector.value
 * @returns Parsed points (empty array if parsing fails)
 */
export const parseSvgSelector = (svgValue: string): Point[] => {
  const points: Point[] = [];
  const pathMatch = svgValue.match(/d="([^"]+)"/);
  if (!pathMatch) return points;
  const commands = pathMatch[1].match(/[MLZ][\d.,\s-]*/gi);
  if (!commands) return points;
  for (const cmd of commands) {
    const type = cmd[0].toUpperCase();
    if (type === 'Z') continue;
    const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
    if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      points.push({ x: coords[0], y: coords[1] });
    }
  }
  return points;
};

/**
 * Calculate the axis-aligned bounding box of a set of points.
 *
 * @param points - Array of 2D points
 * @returns Bounding box as {x, y, width, height}
 */
export const getBoundingBox = (
  points: Point[],
): { x: number; y: number; width: number; height: number } => {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
};

// ============================================================================
// Time Fragment Utilities (W3C Media Fragments URI 1.0)
// ============================================================================

/**
 * Create a media fragment selector for time-based annotations.
 * Uses W3C Media Fragments URI 1.0 specification.
 *
 * @see https://www.w3.org/TR/media-frags/
 * @param timeRange - Start and optional end time in seconds
 * @returns FragmentSelector object for IIIF annotation target
 */
export const createTimeFragmentSelector = (
  timeRange: TimeRange,
): { type: 'FragmentSelector'; conformsTo: string; value: string } => {
  const value = timeRange.end !== undefined
    ? `t=${timeRange.start.toFixed(2)},${timeRange.end.toFixed(2)}`
    : `t=${timeRange.start.toFixed(2)}`;

  return {
    type: 'FragmentSelector',
    conformsTo: 'http://www.w3.org/TR/media-frags/',
    value,
  };
};

/**
 * Parse a media fragment selector to extract time range.
 * Handles formats: t=10, t=10,20, t=10.5,20.75
 *
 * @param value - Fragment selector value string
 * @returns Parsed TimeRange, or null if not a valid time fragment
 */
export const parseTimeFragmentSelector = (value: string): TimeRange | null => {
  const match = value.match(/t=(\d+(?:\.\d+)?)(,(\d+(?:\.\d+)?))?/);
  if (!match) return null;

  const start = parseFloat(match[1]);
  const end = match[3] ? parseFloat(match[3]) : undefined;

  return { start, end };
};

/**
 * Format time for display (MM:SS.ms or HH:MM:SS.ms).
 *
 * @param seconds - Time value in seconds
 * @returns Human-readable time string
 */
export const formatTimeForDisplay = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

/**
 * Create a IIIF-compliant time-based annotation.
 *
 * @param canvasId   - Target canvas ID
 * @param timeRange  - Time range for the annotation
 * @param text       - Annotation body text
 * @param motivation - W3C motivation (default: 'commenting')
 * @returns Complete IIIFAnnotation object
 */
export const createTimeAnnotation = (
  canvasId: string,
  timeRange: TimeRange,
  text: string,
  motivation: 'commenting' | 'tagging' | 'describing' = 'commenting',
): IIIFAnnotation => {
  return {
    id: `${canvasId}/annotation/time-${Date.now()}`,
    type: 'Annotation',
    motivation,
    body: {
      type: 'TextualBody',
      value: text.trim(),
      format: 'text/plain',
    },
    target: {
      type: 'SpecificResource',
      source: canvasId,
      selector: createTimeFragmentSelector(timeRange),
    },
  };
};

/**
 * Check if an annotation is time-based (has a temporal fragment selector).
 *
 * @param annotation - IIIF annotation to inspect
 * @returns true if the annotation targets a time range
 */
export const isTimeBasedAnnotation = (annotation: IIIFAnnotation): boolean => {
  const target = annotation.target as { selector?: { type?: string; value?: string } };
  if (!target?.selector) return false;

  // Check for FragmentSelector with time fragment
  if (target.selector.type === 'FragmentSelector') {
    return target.selector.value?.startsWith('t=') || false;
  }

  // Also check if source URL contains media fragment
  const source = (annotation.target as { source?: string })?.source;
  if (typeof source === 'string' && source.includes('#t=')) {
    return true;
  }

  return false;
};

/**
 * Extract time range from a time-based annotation.
 *
 * @param annotation - IIIF annotation with temporal target
 * @returns Parsed TimeRange, or null if not time-based
 */
export const getAnnotationTimeRange = (annotation: IIIFAnnotation): TimeRange | null => {
  const target = annotation.target as {
    selector?: { type?: string; value?: string };
    source?: string;
  };

  // Check FragmentSelector first
  if (target?.selector?.type === 'FragmentSelector' && target.selector.value) {
    return parseTimeFragmentSelector(target.selector.value);
  }

  // Check source URL for media fragment
  if (typeof target?.source === 'string') {
    const fragMatch = target.source.match(/#(.+)$/);
    if (fragMatch) {
      return parseTimeFragmentSelector(fragMatch[1]);
    }
  }

  return null;
};

// ============================================================================
// Path Simplification
// ============================================================================

/**
 * Simplify a freehand path by removing points that are closer
 * than `tolerance` to the previous retained point.
 * Uses a simple distance-based decimation (not Ramer-Douglas-Peucker).
 *
 * @param pts       - Input point array from freehand drawing
 * @param tolerance - Minimum distance between retained points (pixels)
 * @returns Simplified point array (always includes first and last)
 */
export const simplifyPath = (pts: Point[], tolerance: number): Point[] => {
  if (pts.length <= 2) return pts;
  const result: Point[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = result[result.length - 1];
    const dist = Math.sqrt(
      Math.pow(pts[i].x - prev.x, 2) + Math.pow(pts[i].y - prev.y, 2),
    );
    if (dist > tolerance) result.push(pts[i]);
  }
  result.push(pts[pts.length - 1]);
  return result;
};
