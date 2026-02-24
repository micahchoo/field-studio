/**
 * Metadata Atoms — Contract Tests
 *
 * Tests the pure logic that backs metadata-edit atom components:
 *  - StartPropertyEditor: value derivation, canvas resolution, time offset construction
 *  - TimeModeSelector: formatTime, playbackRate derivation, loop description
 *  - AccompanyingCanvasEditor: type icon mapping, URL trimming
 *  - PlaceholderCanvasEditor: dimension label derivation
 *
 * Strategy: import the real domain functions (getIIIFValue, validateResource)
 * and replicate the pure derivations from each component's <script> block,
 * verifying input→output contracts — not implementation details.
 */

import { describe, it, expect } from 'vitest';
import { getIIIFValue, type IIIFCanvas, type IIIFItem } from '@/src/shared/types';
import { validateResource } from '@/src/features/metadata-edit/lib/inspectorValidation';

// ============================================================================
// Shared fixtures — factory functions, not constants
// ============================================================================

function makeCanvas(overrides: Partial<IIIFCanvas> & Record<string, unknown> = {}): IIIFCanvas {
  return {
    id: `https://example.org/canvas/${Math.random().toString(36).slice(2, 8)}`,
    type: 'Canvas',
    label: { en: ['Test Canvas'] },
    width: 800,
    height: 600,
    items: [],
    ...overrides,
  } as IIIFCanvas;
}

// ============================================================================
// 1. StartPropertyEditor — value derivation contracts
//
// The component derives:
//   currentCanvasId = value?.type === 'Canvas' ? value.id : (value?.source ?? '')
//   selectedCanvas  = canvases.find(c => c.id === currentCanvasId)
//   hasTimeSupport  = selectedCanvas ? (selectedCanvas.duration ?? 0) > 0 : false
// These are the contracts we test.
// ============================================================================

/** Replicates the currentCanvasId derivation from StartPropertyEditor */
function deriveCurrentCanvasId(
  value?: { id: string; type: string; source?: string }
): string {
  if (!value) return '';
  return value.type === 'Canvas' ? value.id : (value.source ?? '');
}

/** Replicates the selectedCanvas derivation */
function resolveSelectedCanvas(
  canvases: IIIFCanvas[],
  value?: { id: string; type: string; source?: string }
): IIIFCanvas | undefined {
  const canvasId = deriveCurrentCanvasId(value);
  return canvases.find(c => c.id === canvasId);
}

/** Replicates the hasTimeSupport derivation */
function hasTimeSupport(canvas?: IIIFCanvas): boolean {
  return canvas ? (canvas.duration ?? 0) > 0 : false;
}

describe('StartPropertyEditor — currentCanvasId derivation', () => {
  it('returns the id directly for a Canvas-type start value', () => {
    const result = deriveCurrentCanvasId({ id: 'canvas-1', type: 'Canvas' });
    expect(result).toBe('canvas-1');
  });

  it('returns source for a SpecificResource-type start value', () => {
    const result = deriveCurrentCanvasId({
      id: 'canvas-2#t=5',
      type: 'SpecificResource',
      source: 'canvas-2',
    });
    expect(result).toBe('canvas-2');
  });

  it('returns empty string when value is undefined (no start selected)', () => {
    expect(deriveCurrentCanvasId(undefined)).toBe('');
  });

  it('returns empty string when SpecificResource has no source', () => {
    const result = deriveCurrentCanvasId({
      id: 'canvas-x#t=10',
      type: 'SpecificResource',
    });
    expect(result).toBe('');
  });
});

describe('StartPropertyEditor — selectedCanvas resolution', () => {
  const canvases = [
    makeCanvas({ id: 'canvas-a', label: { en: ['Alpha'] } }),
    makeCanvas({ id: 'canvas-b', label: { en: ['Beta'] }, duration: 120 }),
  ];

  it('finds the canvas matching a Canvas-type start value', () => {
    const selected = resolveSelectedCanvas(canvases, {
      id: 'canvas-b',
      type: 'Canvas',
    });
    expect(selected?.id).toBe('canvas-b');
    expect(getIIIFValue(selected?.label)).toBe('Beta');
  });

  it('finds the canvas matching a SpecificResource source', () => {
    const selected = resolveSelectedCanvas(canvases, {
      id: 'canvas-b#t=30',
      type: 'SpecificResource',
      source: 'canvas-b',
    });
    expect(selected?.id).toBe('canvas-b');
  });

  it('returns undefined when no canvas matches', () => {
    const selected = resolveSelectedCanvas(canvases, {
      id: 'nonexistent',
      type: 'Canvas',
    });
    expect(selected).toBeUndefined();
  });

  it('returns undefined when canvas list is empty', () => {
    const selected = resolveSelectedCanvas([], {
      id: 'canvas-a',
      type: 'Canvas',
    });
    expect(selected).toBeUndefined();
  });
});

describe('StartPropertyEditor — hasTimeSupport derivation', () => {
  it('returns true when canvas has positive duration', () => {
    const canvas = makeCanvas({ duration: 60 });
    expect(hasTimeSupport(canvas)).toBe(true);
  });

  it('returns false when canvas has zero duration', () => {
    const canvas = makeCanvas({ duration: 0 });
    expect(hasTimeSupport(canvas)).toBe(false);
  });

  it('returns false when canvas has no duration property', () => {
    const canvas = makeCanvas();
    expect(hasTimeSupport(canvas)).toBe(false);
  });

  it('returns false when canvas is undefined', () => {
    expect(hasTimeSupport(undefined)).toBe(false);
  });
});

describe('StartPropertyEditor — SpecificResource construction', () => {
  it('constructs id by appending fragment to canvas id', () => {
    const canvasId = 'https://example.org/canvas/1';
    const t = 30.5;
    const result = {
      id: `${canvasId}#t=${t}`,
      type: 'SpecificResource' as const,
      source: canvasId,
      selector: { type: 'PointSelector' as const, t },
    };
    // The id encodes the time offset as a media fragment
    expect(result.id).toContain('#t=');
    expect(result.id.startsWith(canvasId)).toBe(true);
    // source always matches the original canvas id without fragment
    expect(result.source).toBe(canvasId);
    expect(result.source).not.toContain('#');
    // Selector time matches the input
    expect(result.selector.t).toBe(t);
  });

  it('rejects NaN time values (component guards with isNaN check)', () => {
    const timeValue = 'not-a-number';
    const t = parseFloat(timeValue);
    // The component returns early if isNaN(t)
    expect(isNaN(t)).toBe(true);
  });

  it('handles zero as a valid time offset', () => {
    const t = parseFloat('0');
    expect(isNaN(t)).toBe(false);
    expect(t).toBe(0);
  });

  it('handles negative time values (parseFloat succeeds, component allows it)', () => {
    const t = parseFloat('-5.3');
    expect(isNaN(t)).toBe(false);
    // The component does not guard against negative — this documents behavior
    expect(t).toBeLessThan(0);
  });
});

// ============================================================================
// 2. TimeModeSelector — formatTime and derivation contracts
//
// The component defines:
//   formatTime(seconds): string
//   annotationDuration = timeRange ? ((timeRange.end ?? timeRange.start) - timeRange.start) : 0
//   playbackRate = canvasDuration && annotationDuration > 0
//     ? (canvasDuration / annotationDuration).toFixed(2) : '1.00'
//   loop description = loopCount === 0 ? 'Loop indefinitely' : `Loop ${loopCount} times`
// ============================================================================

/** Exact replica of TimeModeSelector.formatTime */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

/** Exact replica of TimeModeSelector.annotationDuration derivation */
function deriveAnnotationDuration(
  timeRange?: { start: number; end?: number }
): number {
  return timeRange ? ((timeRange.end ?? timeRange.start) - timeRange.start) : 0;
}

/** Exact replica of TimeModeSelector.playbackRate derivation */
function derivePlaybackRate(
  canvasDuration?: number,
  annotationDuration?: number
): string {
  return canvasDuration && (annotationDuration ?? 0) > 0
    ? (canvasDuration / annotationDuration!).toFixed(2)
    : '1.00';
}

/** Exact replica of TimeModeSelector loop description */
function deriveLoopDescription(loopCount: number): string {
  return loopCount === 0 ? 'Loop indefinitely' : `Loop ${loopCount} times`;
}

describe('TimeModeSelector — formatTime', () => {
  it('formats zero seconds', () => {
    expect(formatTime(0)).toBe('0:00.00');
  });

  it('formats sub-minute values with leading zero on seconds', () => {
    const result = formatTime(5);
    // 5s = 0 minutes, 05 seconds, 00 hundredths
    expect(result).toBe('0:05.00');
  });

  it('formats values crossing the minute boundary', () => {
    const result = formatTime(65.5);
    // 65.5s = 1 minute, 05 seconds, 50 hundredths
    expect(result).toMatch(/^1:05\.50$/);
  });

  it('formats large values without clamping to 60 minutes', () => {
    const result = formatTime(3661.25);
    // 3661.25s = 61 minutes, 01 seconds, 25 hundredths
    expect(result).toBe('61:01.25');
  });

  it('truncates sub-centisecond precision (no rounding up)', () => {
    // 0.999 -> Math.floor(0.999 * 100) = 99
    expect(formatTime(0.999)).toBe('0:00.99');
    // 0.001 -> Math.floor(0.001 * 100) = 0
    expect(formatTime(0.001)).toBe('0:00.00');
  });

  it('handles very large input without crashing', () => {
    const result = formatTime(100000);
    // Should produce minutes > 1000
    const minutesPart = parseInt(result.split(':')[0], 10);
    expect(minutesPart).toBeGreaterThan(1000);
  });
});

describe('TimeModeSelector — annotationDuration derivation', () => {
  it('computes duration from start and end', () => {
    const duration = deriveAnnotationDuration({ start: 10, end: 40 });
    expect(duration).toBe(30);
  });

  it('returns zero when end equals start', () => {
    expect(deriveAnnotationDuration({ start: 10, end: 10 })).toBe(0);
  });

  it('falls back to start when end is undefined (duration = 0)', () => {
    // end ?? start means end defaults to start, so duration = start - start = 0
    expect(deriveAnnotationDuration({ start: 10 })).toBe(0);
  });

  it('returns zero when timeRange is undefined', () => {
    expect(deriveAnnotationDuration(undefined)).toBe(0);
  });

  it('handles negative range (end < start) — no clamping', () => {
    const result = deriveAnnotationDuration({ start: 40, end: 10 });
    expect(result).toBeLessThan(0);
  });
});

describe('TimeModeSelector — playbackRate derivation', () => {
  it('computes rate as canvasDuration / annotationDuration', () => {
    const rate = derivePlaybackRate(60, 30);
    expect(rate).toBe('2.00');
  });

  it('returns 1.00 when annotation duration is zero', () => {
    expect(derivePlaybackRate(60, 0)).toBe('1.00');
  });

  it('returns 1.00 when canvas duration is zero', () => {
    expect(derivePlaybackRate(0, 30)).toBe('1.00');
  });

  it('returns 1.00 when canvas duration is undefined', () => {
    expect(derivePlaybackRate(undefined, 30)).toBe('1.00');
  });

  it('returns sub-1x rate when annotation is longer than canvas', () => {
    const rate = derivePlaybackRate(30, 60);
    expect(parseFloat(rate)).toBeLessThan(1);
    expect(rate).toBe('0.50');
  });

  it('always returns exactly two decimal places', () => {
    const rate = derivePlaybackRate(100, 3);
    expect(rate).toMatch(/^\d+\.\d{2}$/);
  });
});

describe('TimeModeSelector — loop description', () => {
  it('shows "Loop indefinitely" when count is 0', () => {
    expect(deriveLoopDescription(0)).toBe('Loop indefinitely');
  });

  it('shows count in description for positive values', () => {
    const desc = deriveLoopDescription(5);
    expect(desc).toContain('5');
    expect(desc).toContain('times');
  });

  it('distinguishes between 0 and 1 (1 is not indefinite)', () => {
    expect(deriveLoopDescription(0)).not.toBe(deriveLoopDescription(1));
  });

  it('handles very large loop counts', () => {
    const desc = deriveLoopDescription(999999);
    expect(desc).toContain('999999');
  });
});

// ============================================================================
// 3. AccompanyingCanvasEditor — type icon mapping
//
// The component defines: typeIcons = { transcript: 'subtitles', image: 'image', other: 'attachment' }
// And uses: typeIcons[contentType ?? 'other']
// ============================================================================

/** Replica of AccompanyingCanvasEditor's type → icon mapping */
const TYPE_ICONS: Record<string, string> = {
  transcript: 'subtitles',
  image: 'image',
  other: 'attachment',
};

function resolveTypeIcon(contentType?: string): string {
  return TYPE_ICONS[contentType ?? 'other'];
}

describe('AccompanyingCanvasEditor — type icon resolution', () => {
  it('maps each known type to a distinct icon', () => {
    const icons = new Set(Object.values(TYPE_ICONS));
    // Every type maps to a unique icon
    expect(icons.size).toBe(Object.keys(TYPE_ICONS).length);
  });

  it('resolves transcript type', () => {
    expect(resolveTypeIcon('transcript')).toBe('subtitles');
  });

  it('resolves image type', () => {
    expect(resolveTypeIcon('image')).toBe('image');
  });

  it('falls back to other/attachment for undefined contentType', () => {
    expect(resolveTypeIcon(undefined)).toBe('attachment');
  });

  it('returns undefined for unknown contentType (unmapped key)', () => {
    // This documents actual behavior — unknown types are NOT mapped to fallback
    expect(resolveTypeIcon('video')).toBeUndefined();
  });
});

describe('AccompanyingCanvasEditor — URL trimming contract', () => {
  it('trim removes leading and trailing whitespace', () => {
    const urlInput = '  https://example.org/file.vtt  ';
    const trimmed = urlInput.trim();
    expect(trimmed).toBe('https://example.org/file.vtt');
    // The component only calls onSetUrl if trimmed is truthy
    expect(trimmed.length).toBeGreaterThan(0);
  });

  it('blank-only input is rejected (trimmed to empty string)', () => {
    const inputs = ['', '   ', '\t', '\n  \t  '];
    for (const input of inputs) {
      expect(input.trim()).toBe('');
    }
  });

  it('preserves internal whitespace in URLs', () => {
    // Unusual but the component does not sanitize beyond trim
    const urlInput = 'https://example.org/file name.vtt';
    expect(urlInput.trim()).toBe('https://example.org/file name.vtt');
  });
});

// ============================================================================
// 4. PlaceholderCanvasEditor — dimension label derivation
//
// The component shows: canvasWidth && canvasHeight ? `${canvasWidth} × ${canvasHeight}` : 'Custom poster'
// ============================================================================

function deriveDimensionLabel(
  canvasWidth?: number,
  canvasHeight?: number
): string {
  return canvasWidth && canvasHeight
    ? `${canvasWidth} × ${canvasHeight}`
    : 'Custom poster';
}

describe('PlaceholderCanvasEditor — dimension label derivation', () => {
  it('shows dimensions when both width and height are present', () => {
    const label = deriveDimensionLabel(1920, 1080);
    expect(label).toContain('1920');
    expect(label).toContain('1080');
    // Verify the multiplication sign is the Unicode ×, not x
    expect(label).toContain('\u00D7');
  });

  it('shows "Custom poster" when width is missing', () => {
    expect(deriveDimensionLabel(undefined, 1080)).toBe('Custom poster');
  });

  it('shows "Custom poster" when height is missing', () => {
    expect(deriveDimensionLabel(1920, undefined)).toBe('Custom poster');
  });

  it('shows "Custom poster" when both are missing', () => {
    expect(deriveDimensionLabel()).toBe('Custom poster');
  });

  it('shows "Custom poster" when width is zero (falsy)', () => {
    // 0 is falsy in JS — the component uses && which short-circuits on 0
    expect(deriveDimensionLabel(0, 1080)).toBe('Custom poster');
  });

  it('handles very large dimensions', () => {
    const label = deriveDimensionLabel(999999, 888888);
    expect(label).toContain('999999');
    expect(label).toContain('888888');
  });
});

// ============================================================================
// 5. Cross-cutting: getIIIFValue contracts used by atoms
//
// Multiple atoms use getIIIFValue(canvas.label) to display labels.
// ============================================================================

describe('getIIIFValue — label resolution used by atoms', () => {
  it('extracts the first value from the preferred language', () => {
    const label = { en: ['English Label'], fr: ['French Label'] };
    expect(getIIIFValue(label, 'en')).toBe('English Label');
    expect(getIIIFValue(label, 'fr')).toBe('French Label');
  });

  it('falls back to en when preferred language is missing', () => {
    const label = { en: ['English Label'] };
    expect(getIIIFValue(label, 'de')).toBe('English Label');
  });

  it('falls back through none and @none', () => {
    expect(getIIIFValue({ none: ['Untitled'] }, 'en')).toBe('Untitled');
    expect(getIIIFValue({ '@none': ['No Language'] }, 'en')).toBe('No Language');
  });

  it('returns empty string for undefined input', () => {
    expect(getIIIFValue(undefined)).toBe('');
  });

  it('returns empty string for empty arrays in the language map', () => {
    expect(getIIIFValue({ en: [] })).toBe('');
  });

  it('returns empty string for non-object input', () => {
    // getIIIFValue guards: if (!map || typeof map !== 'object') return ''
    expect(getIIIFValue(null as unknown as undefined)).toBe('');
    expect(getIIIFValue(42 as unknown as undefined)).toBe('');
  });
});

// ============================================================================
// 6. StartPropertyEditor — validation interaction
//
// A canvas with a start property referencing a canvas that does not exist
// in items should not crash validation; the validator runs on the manifest.
// ============================================================================

describe('StartPropertyEditor — start property on manifest validation', () => {
  it('validates a manifest with a valid start canvas without errors on start', () => {
    const canvas = makeCanvas({ id: 'https://example.org/c1' });
    const manifest: IIIFItem = {
      id: 'https://example.org/m1',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [canvas],
      start: { id: canvas.id, type: 'Canvas' },
    } as unknown as IIIFItem;
    const result = validateResource(manifest, 'Manifest');
    // No issue should reference the 'start' field
    const startIssues = result.issues.filter(i => i.field === 'start');
    expect(startIssues).toHaveLength(0);
  });

  it('a manifest with no canvases triggers empty-manifest error', () => {
    const manifest: IIIFItem = {
      id: 'https://example.org/m1',
      type: 'Manifest',
      label: { en: ['Empty'] },
      items: [],
    } as unknown as IIIFItem;
    const result = validateResource(manifest, 'Manifest');
    const emptyManifest = result.issues.find(i => i.id === 'empty-manifest');
    expect(emptyManifest).toBeDefined();
    expect(emptyManifest!.severity).toBe('error');
  });
});
