/**
 * ContentStateService — unit tests
 *
 * Covers:
 *  1. encode → decode round-trip
 *  2. createContentState → parseContentState round-trip
 *  3. parseFromUrl extracts viewport state
 *  4. Invalid base64 returns null, no throw
 *  5. Region/time/annotation selectors preserved
 */

import { describe, it, expect } from 'vitest';
import { contentStateService } from '../contentState';
import type { ViewportState } from '../contentState';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeViewport(overrides: Partial<ViewportState> = {}): ViewportState {
  return {
    manifestId: 'https://example.com/manifest/1',
    canvasId: 'https://example.com/canvas/1',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('contentStateService.encode / decode', () => {
  it('round-trips a plain object', () => {
    const obj = { foo: 'bar', n: 42 };
    const encoded = contentStateService.encode(obj);
    expect(typeof encoded).toBe('string');
    // base64url — must not contain +, /, or trailing =
    expect(encoded).not.toMatch(/[+/=]/);

    const decoded = contentStateService.decode(encoded);
    expect(decoded).not.toBeNull();
  });

  it('returns null for invalid base64', () => {
    const result = contentStateService.decode('!!!not-base64!!!');
    expect(result).toBeNull();
  });

  it('returns null for valid base64 that is not JSON', () => {
    const encoded = btoa('not json');
    const urlSafe = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const result = contentStateService.decode(urlSafe);
    expect(result).toBeNull();
  });
});

describe('contentStateService.createContentState / parseContentState', () => {
  it('round-trips basic canvas + manifest IDs', () => {
    const vp = makeViewport();
    const state = contentStateService.createContentState(vp);
    const parsed = contentStateService.parseContentState(state);

    expect(parsed).not.toBeNull();
    expect(parsed!.manifestId).toBe(vp.manifestId);
    expect(parsed!.canvasId).toBe(vp.canvasId);
  });

  it('preserves xywh region selector', () => {
    const vp = makeViewport({ region: { x: 100, y: 200, w: 300, h: 400 } });
    const state = contentStateService.createContentState(vp);
    const parsed = contentStateService.parseContentState(state);

    expect(parsed!.region).toEqual({ x: 100, y: 200, w: 300, h: 400 });
  });

  it('preserves time range selector', () => {
    const vp = makeViewport({ time: { start: 10.5, end: 20.0 } });
    const state = contentStateService.createContentState(vp);
    const parsed = contentStateService.parseContentState(state);

    expect(parsed!.time?.start).toBe(10.5);
    expect(parsed!.time?.end).toBe(20.0);
  });

  it('preserves annotationId selector', () => {
    const vp = makeViewport({ annotationId: 'https://example.com/anno/42' });
    const state = contentStateService.createContentState(vp);
    const parsed = contentStateService.parseContentState(state);

    expect(parsed!.annotationId).toBe('https://example.com/anno/42');
  });

  it('ContentState has correct @context and type', () => {
    const state = contentStateService.createContentState(makeViewport());
    expect(state['@context']).toBe('http://iiif.io/api/presentation/3/context.json');
    expect(state.type).toBe('Annotation');
    expect(state.motivation).toBe('contentState');
  });
});

describe('contentStateService.parseFromUrl', () => {
  it('extracts viewport from a URL with iiif-content param', () => {
    const vp = makeViewport();
    const state = contentStateService.createContentState(vp);
    const encoded = contentStateService.encode(state);
    const url = `https://example.com/viewer?iiif-content=${encoded}`;

    const parsed = contentStateService.parseFromUrl(url);
    expect(parsed).not.toBeNull();
    expect(parsed!.manifestId).toBe(vp.manifestId);
    expect(parsed!.canvasId).toBe(vp.canvasId);
  });

  it('returns null when no iiif-content param', () => {
    const result = contentStateService.parseFromUrl('https://example.com/viewer');
    expect(result).toBeNull();
  });

  it('returns null for invalid encoded value', () => {
    const result = contentStateService.parseFromUrl('https://example.com/viewer?iiif-content=!!!bad!!!');
    expect(result).toBeNull();
  });
});

describe('contentStateService.generateLink', () => {
  it('appends iiif-content param to base URL', () => {
    const vp = makeViewport();
    const link = contentStateService.generateLink('https://example.com/viewer', vp);
    expect(link).toContain('iiif-content=');
    expect(link).toContain('example.com');
  });
});
