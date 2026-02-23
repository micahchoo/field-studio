import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseRotation,
  calculateSquareRegion,
  calculateConfinedSize,
  getFormatOptions,
  getMimeTypeForExtension,
  parseRangeHeader,
  buildContentRangeHeader,
  isInBackoff,
  recordFailure,
  clearFailure,
  type FailureEntry,
} from '../iiif-image-api';

describe('parseRotation', () => {
  it('parses simple rotation', () => {
    expect(parseRotation('90')).toEqual({ degrees: 90, mirror: false });
  });

  it('parses mirrored rotation', () => {
    expect(parseRotation('!180')).toEqual({ degrees: 180, mirror: true });
  });

  it('normalizes 360 to 0', () => {
    expect(parseRotation('360')).toEqual({ degrees: 0, mirror: false });
  });

  it('handles non-numeric as 0', () => {
    expect(parseRotation('abc')).toEqual({ degrees: 0, mirror: false });
  });

  it('handles 0 rotation', () => {
    expect(parseRotation('0')).toEqual({ degrees: 0, mirror: false });
  });

  it('handles 270 rotation', () => {
    expect(parseRotation('270')).toEqual({ degrees: 270, mirror: false });
  });

  it('handles mirrored with 0', () => {
    expect(parseRotation('!0')).toEqual({ degrees: 0, mirror: true });
  });
});

describe('calculateSquareRegion', () => {
  it('handles landscape (wider than tall)', () => {
    const result = calculateSquareRegion(800, 600);
    expect(result).toEqual({ x: 100, y: 0, w: 600, h: 600 });
  });

  it('handles portrait (taller than wide)', () => {
    const result = calculateSquareRegion(600, 800);
    expect(result).toEqual({ x: 0, y: 100, w: 600, h: 600 });
  });

  it('handles square', () => {
    const result = calculateSquareRegion(500, 500);
    expect(result).toEqual({ x: 0, y: 0, w: 500, h: 500 });
  });

  it('centers the square region', () => {
    const result = calculateSquareRegion(1000, 600);
    // (1000-600)/2 = 200
    expect(result.x).toBe(200);
    expect(result.y).toBe(0);
  });
});

describe('calculateConfinedSize', () => {
  it('scales down by width when width is the constraint', () => {
    const result = calculateConfinedSize(1000, 500, 400, 400);
    // scale = min(400/1000, 400/500, 1) = 0.4
    expect(result).toEqual({ width: 400, height: 200 });
  });

  it('scales down by height when height is the constraint', () => {
    const result = calculateConfinedSize(500, 1000, 400, 400);
    // scale = min(400/500, 400/1000, 1) = 0.4
    expect(result).toEqual({ width: 200, height: 400 });
  });

  it('does not upscale', () => {
    const result = calculateConfinedSize(200, 100, 400, 400);
    // scale = min(400/200, 400/100, 1) = 1
    expect(result).toEqual({ width: 200, height: 100 });
  });

  it('handles exact fit', () => {
    const result = calculateConfinedSize(400, 400, 400, 400);
    expect(result).toEqual({ width: 400, height: 400 });
  });
});

describe('getFormatOptions', () => {
  it('returns jpeg for jpg', () => {
    const result = getFormatOptions('jpg');
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.options).toEqual({ quality: 0.85 });
  });

  it('returns png for png', () => {
    const result = getFormatOptions('png');
    expect(result.mimeType).toBe('image/png');
    expect(result.options).toEqual({});
  });

  it('returns webp for webp', () => {
    const result = getFormatOptions('webp');
    expect(result.mimeType).toBe('image/webp');
    expect(result.options).toEqual({ quality: 0.85 });
  });

  it('returns gif for gif', () => {
    const result = getFormatOptions('gif');
    expect(result.mimeType).toBe('image/gif');
  });

  it('defaults to jpg for unknown format', () => {
    const result = getFormatOptions('bmp');
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('uses png for bitonal jpg', () => {
    const result = getFormatOptions('jpg', 'bitonal');
    expect(result.mimeType).toBe('image/png');
  });
});

describe('getMimeTypeForExtension', () => {
  it('returns audio/mpeg for mp3', () => {
    expect(getMimeTypeForExtension('mp3')).toBe('audio/mpeg');
  });

  it('returns video/mp4 for mp4', () => {
    expect(getMimeTypeForExtension('mp4')).toBe('video/mp4');
  });

  it('returns video/webm for webm', () => {
    expect(getMimeTypeForExtension('webm')).toBe('video/webm');
  });

  it('returns audio/ogg for ogg', () => {
    expect(getMimeTypeForExtension('ogg')).toBe('audio/ogg');
  });

  it('returns audio/wav for wav', () => {
    expect(getMimeTypeForExtension('wav')).toBe('audio/wav');
  });

  it('returns audio/mp4 for m4a', () => {
    expect(getMimeTypeForExtension('m4a')).toBe('audio/mp4');
  });

  it('returns audio/flac for flac', () => {
    expect(getMimeTypeForExtension('flac')).toBe('audio/flac');
  });

  it('returns application/octet-stream for unknown', () => {
    expect(getMimeTypeForExtension('xyz')).toBe('application/octet-stream');
  });

  it('is case-insensitive', () => {
    expect(getMimeTypeForExtension('MP3')).toBe('audio/mpeg');
  });
});

describe('parseRangeHeader', () => {
  it('parses "bytes=0-999"', () => {
    const result = parseRangeHeader('bytes=0-999', 10000);
    expect(result).toEqual({ start: 0, end: 999 });
  });

  it('parses "bytes=1000-" (open-ended)', () => {
    const result = parseRangeHeader('bytes=1000-', 5000);
    expect(result).toEqual({ start: 1000, end: 4999 });
  });

  it('returns null for invalid format', () => {
    expect(parseRangeHeader('invalid', 1000)).toBeNull();
  });

  it('clamps end to total-1', () => {
    const result = parseRangeHeader('bytes=0-9999', 5000);
    expect(result).toEqual({ start: 0, end: 4999 });
  });

  it('returns null when start > end', () => {
    expect(parseRangeHeader('bytes=1000-500', 2000)).toBeNull();
  });

  it('handles single-byte range', () => {
    const result = parseRangeHeader('bytes=0-0', 100);
    expect(result).toEqual({ start: 0, end: 0 });
  });
});

describe('buildContentRangeHeader', () => {
  it('formats correctly', () => {
    expect(buildContentRangeHeader(0, 999, 10000)).toBe('bytes 0-999/10000');
  });

  it('formats with large values', () => {
    expect(buildContentRangeHeader(1024, 2047, 1048576)).toBe('bytes 1024-2047/1048576');
  });
});

describe('backoff functions', () => {
  let tracker: Map<string, FailureEntry>;

  beforeEach(() => {
    tracker = new Map();
  });

  it('returns false when no failure recorded', () => {
    expect(isInBackoff(tracker, 'test-key')).toBe(false);
  });

  it('returns backoff ms after failure', () => {
    recordFailure(tracker, 'test-key', 'test error');
    const result = isInBackoff(tracker, 'test-key');
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
  });

  it('clears backoff on clearFailure', () => {
    recordFailure(tracker, 'test-key', 'test error');
    clearFailure(tracker, 'test-key');
    expect(isInBackoff(tracker, 'test-key')).toBe(false);
  });

  it('tracks failure count', () => {
    recordFailure(tracker, 'test-key', 'error 1');
    recordFailure(tracker, 'test-key', 'error 2');
    recordFailure(tracker, 'test-key', 'error 3');
    const entry = tracker.get('test-key')!;
    expect(entry.count).toBe(3);
    expect(entry.lastError).toBe('error 3');
  });

  it('has exponential backoff schedule', () => {
    // First failure: 2^0 * 1000 = 1000ms
    recordFailure(tracker, 'key1', 'err');
    const entry1 = tracker.get('key1')!;
    const backoff1 = entry1.backoffUntil - entry1.lastAttempt;
    expect(backoff1).toBeCloseTo(1000, -2);

    // Second failure: 2^1 * 1000 = 2000ms
    recordFailure(tracker, 'key1', 'err');
    const entry2 = tracker.get('key1')!;
    const backoff2 = entry2.backoffUntil - entry2.lastAttempt;
    expect(backoff2).toBeCloseTo(2000, -2);
  });

  it('caps backoff at 30 seconds', () => {
    // 7th failure: 2^6 * 1000 = 64000 -> capped to 30000
    for (let i = 0; i < 7; i++) {
      recordFailure(tracker, 'key', 'err');
    }
    const entry = tracker.get('key')!;
    const backoff = entry.backoffUntil - entry.lastAttempt;
    expect(backoff).toBeLessThanOrEqual(30000);
  });

  it('jumps to 5 minutes after 10 failures', () => {
    for (let i = 0; i < 10; i++) {
      recordFailure(tracker, 'key', 'err');
    }
    const entry = tracker.get('key')!;
    const backoff = entry.backoffUntil - entry.lastAttempt;
    expect(backoff).toBeCloseTo(5 * 60 * 1000, -2);
  });
});
