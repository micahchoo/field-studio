/**
 * ImageFilterStore — Unit Tests
 *
 * Tests the Svelte 5 runes-based reactive class store for viewer image filters.
 * Covers constructor defaults, all mutation methods, clamping, CSS generation,
 * the isDefault derived flag, and reset behaviour.
 *
 * Source: src/features/viewer/model/imageFilters.svelte.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ImageFilterStore,
  type ImageFilterState,
} from '@/src/features/viewer/model/imageFilters.svelte';

// ============================================================================
// Constructor defaults
// ============================================================================

describe('ImageFilterStore — defaults', () => {
  let store: ImageFilterStore;

  beforeEach(() => {
    store = new ImageFilterStore();
  });

  it('initializes brightness to 100', () => {
    expect(store.brightness).toBe(100);
  });

  it('initializes contrast to 100', () => {
    expect(store.contrast).toBe(100);
  });

  it('initializes saturation to 100', () => {
    expect(store.saturation).toBe(100);
  });

  it('initializes invert to false', () => {
    expect(store.invert).toBe(false);
  });

  it('initializes grayscale to false', () => {
    expect(store.grayscale).toBe(false);
  });

  it('isDefault returns true when all values are at defaults', () => {
    expect(store.isDefault).toBe(true);
  });

  it('cssFilter returns "none" when everything is at defaults', () => {
    expect(store.cssFilter).toBe('none');
  });

  it('filters getter exposes the full state object', () => {
    const state: Readonly<ImageFilterState> = store.filters;
    expect(state.brightness).toBe(100);
    expect(state.contrast).toBe(100);
    expect(state.saturation).toBe(100);
    expect(state.invert).toBe(false);
    expect(state.grayscale).toBe(false);
  });
});

// ============================================================================
// setBrightness
// ============================================================================

describe('ImageFilterStore — setBrightness', () => {
  let store: ImageFilterStore;

  beforeEach(() => {
    store = new ImageFilterStore();
  });

  it('sets a valid brightness value within range', () => {
    store.setBrightness(150);
    expect(store.brightness).toBe(150);
  });

  it('clamps brightness below 0 to 0', () => {
    store.setBrightness(-10);
    expect(store.brightness).toBe(0);
  });

  it('clamps brightness above 200 to 200', () => {
    store.setBrightness(999);
    expect(store.brightness).toBe(200);
  });

  it('accepts boundary value 0', () => {
    store.setBrightness(0);
    expect(store.brightness).toBe(0);
  });

  it('accepts boundary value 200', () => {
    store.setBrightness(200);
    expect(store.brightness).toBe(200);
  });

  it('marks store as non-default when brightness differs from 100', () => {
    store.setBrightness(80);
    expect(store.isDefault).toBe(false);
  });
});

// ============================================================================
// setContrast
// ============================================================================

describe('ImageFilterStore — setContrast', () => {
  let store: ImageFilterStore;

  beforeEach(() => {
    store = new ImageFilterStore();
  });

  it('sets a valid contrast value', () => {
    store.setContrast(120);
    expect(store.contrast).toBe(120);
  });

  it('clamps contrast below 0 to 0', () => {
    store.setContrast(-5);
    expect(store.contrast).toBe(0);
  });

  it('clamps contrast above 200 to 200', () => {
    store.setContrast(300);
    expect(store.contrast).toBe(200);
  });

  it('marks store as non-default when contrast differs from 100', () => {
    store.setContrast(50);
    expect(store.isDefault).toBe(false);
  });
});

// ============================================================================
// setSaturation
// ============================================================================

describe('ImageFilterStore — setSaturation', () => {
  let store: ImageFilterStore;

  beforeEach(() => {
    store = new ImageFilterStore();
  });

  it('sets a valid saturation value', () => {
    store.setSaturation(75);
    expect(store.saturation).toBe(75);
  });

  it('clamps saturation below 0 to 0', () => {
    store.setSaturation(-1);
    expect(store.saturation).toBe(0);
  });

  it('clamps saturation above 200 to 200', () => {
    store.setSaturation(201);
    expect(store.saturation).toBe(200);
  });

  it('accepts boundary value 0', () => {
    store.setSaturation(0);
    expect(store.saturation).toBe(0);
  });

  it('marks store as non-default when saturation differs from 100', () => {
    store.setSaturation(0);
    expect(store.isDefault).toBe(false);
  });
});

// ============================================================================
// toggleInvert / toggleGrayscale
// ============================================================================

describe('ImageFilterStore — toggleInvert', () => {
  let store: ImageFilterStore;

  beforeEach(() => {
    store = new ImageFilterStore();
  });

  it('toggleInvert flips false to true', () => {
    store.toggleInvert();
    expect(store.invert).toBe(true);
  });

  it('toggleInvert flips true back to false', () => {
    store.toggleInvert();
    store.toggleInvert();
    expect(store.invert).toBe(false);
  });

  it('marks store as non-default after toggling invert', () => {
    store.toggleInvert();
    expect(store.isDefault).toBe(false);
  });
});

describe('ImageFilterStore — toggleGrayscale', () => {
  let store: ImageFilterStore;

  beforeEach(() => {
    store = new ImageFilterStore();
  });

  it('toggleGrayscale flips false to true', () => {
    store.toggleGrayscale();
    expect(store.grayscale).toBe(true);
  });

  it('toggleGrayscale flips true back to false', () => {
    store.toggleGrayscale();
    store.toggleGrayscale();
    expect(store.grayscale).toBe(false);
  });

  it('marks store as non-default after toggling grayscale', () => {
    store.toggleGrayscale();
    expect(store.isDefault).toBe(false);
  });
});

// ============================================================================
// cssFilter derived value
// ============================================================================

describe('ImageFilterStore — cssFilter', () => {
  let store: ImageFilterStore;

  beforeEach(() => {
    store = new ImageFilterStore();
  });

  it('includes brightness() when not 100', () => {
    store.setBrightness(120);
    expect(store.cssFilter).toContain('brightness(120%)');
  });

  it('includes contrast() when not 100', () => {
    store.setContrast(80);
    expect(store.cssFilter).toContain('contrast(80%)');
  });

  it('includes saturate() when not 100', () => {
    store.setSaturation(50);
    expect(store.cssFilter).toContain('saturate(50%)');
  });

  it('includes invert(1) when invert is true', () => {
    store.toggleInvert();
    expect(store.cssFilter).toContain('invert(1)');
  });

  it('includes grayscale(1) when grayscale is true', () => {
    store.toggleGrayscale();
    expect(store.cssFilter).toContain('grayscale(1)');
  });

  it('omits brightness when exactly 100', () => {
    store.toggleInvert();
    expect(store.cssFilter).not.toContain('brightness');
  });

  it('omits contrast when exactly 100', () => {
    store.toggleInvert();
    expect(store.cssFilter).not.toContain('contrast');
  });

  it('omits saturate when exactly 100', () => {
    store.toggleInvert();
    expect(store.cssFilter).not.toContain('saturate');
  });

  it('combines multiple active filters in one string', () => {
    store.setBrightness(120);
    store.setContrast(80);
    store.toggleInvert();
    store.toggleGrayscale();
    const css = store.cssFilter;
    expect(css).toContain('brightness(120%)');
    expect(css).toContain('contrast(80%)');
    expect(css).toContain('invert(1)');
    expect(css).toContain('grayscale(1)');
  });

  it('returns only the single active filter with no spaces when only one filter set', () => {
    store.toggleInvert();
    expect(store.cssFilter).toBe('invert(1)');
  });
});

// ============================================================================
// reset
// ============================================================================

describe('ImageFilterStore — reset', () => {
  let store: ImageFilterStore;

  beforeEach(() => {
    store = new ImageFilterStore();
  });

  it('restores brightness to 100', () => {
    store.setBrightness(50);
    store.reset();
    expect(store.brightness).toBe(100);
  });

  it('restores contrast to 100', () => {
    store.setContrast(150);
    store.reset();
    expect(store.contrast).toBe(100);
  });

  it('restores saturation to 100', () => {
    store.setSaturation(0);
    store.reset();
    expect(store.saturation).toBe(100);
  });

  it('restores invert to false', () => {
    store.toggleInvert();
    store.reset();
    expect(store.invert).toBe(false);
  });

  it('restores grayscale to false', () => {
    store.toggleGrayscale();
    store.reset();
    expect(store.grayscale).toBe(false);
  });

  it('isDefault returns true after reset', () => {
    store.setBrightness(50);
    store.toggleInvert();
    store.reset();
    expect(store.isDefault).toBe(true);
  });

  it('cssFilter returns "none" after reset', () => {
    store.setBrightness(50);
    store.toggleGrayscale();
    store.reset();
    expect(store.cssFilter).toBe('none');
  });

  it('multiple instances are independent after reset', () => {
    const storeA = new ImageFilterStore();
    const storeB = new ImageFilterStore();
    storeA.setBrightness(50);
    storeB.setContrast(200);
    storeA.reset();
    expect(storeA.isDefault).toBe(true);
    expect(storeB.contrast).toBe(200);
  });
});
