/**
 * Viewer-Specific Stores Tests
 *
 * Tests the Svelte 5 runes-based reactive class stores used by ViewerView.
 * Each describe block covers one store: constructor defaults, mutations,
 * clamping/validation, derived getters, and reset behaviour.
 *
 * Stores under test:
 *   1. ImageFilterStore   — brightness/contrast/saturation/invert/grayscale
 *   2. ComparisonStore    — side-by-side, overlay, curtain comparison modes
 *   3. MeasurementStore   — distance measurement with calibration
 *   4. AnnotationLayerStore — annotation page visibility, color, opacity
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ============================================================================
// 1. ImageFilterStore
// ============================================================================

import {
  ImageFilterStore,
  type ImageFilterState,
} from '@/src/features/viewer/model/imageFilters.svelte';

describe('ImageFilterStore', () => {
  let store: ImageFilterStore;

  beforeEach(() => {
    store = new ImageFilterStore();
  });

  // -- Constructor defaults --

  it('has correct default values', () => {
    expect(store.brightness).toBe(100);
    expect(store.contrast).toBe(100);
    expect(store.saturation).toBe(100);
    expect(store.invert).toBe(false);
    expect(store.grayscale).toBe(false);
  });

  it('isDefault returns true initially', () => {
    expect(store.isDefault).toBe(true);
  });

  // -- Mutations --

  it('setBrightness clamps to 0-200', () => {
    store.setBrightness(150);
    expect(store.brightness).toBe(150);

    store.setBrightness(-50);
    expect(store.brightness).toBe(0);

    store.setBrightness(999);
    expect(store.brightness).toBe(200);
  });

  it('setContrast updates value and isDefault becomes false', () => {
    store.setContrast(80);
    expect(store.contrast).toBe(80);
    expect(store.isDefault).toBe(false);
  });

  it('setSaturation clamps to 0-200', () => {
    store.setSaturation(0);
    expect(store.saturation).toBe(0);

    store.setSaturation(200);
    expect(store.saturation).toBe(200);

    store.setSaturation(250);
    expect(store.saturation).toBe(200);

    store.setSaturation(-10);
    expect(store.saturation).toBe(0);
  });

  it('toggleInvert flips the invert state', () => {
    expect(store.invert).toBe(false);
    store.toggleInvert();
    expect(store.invert).toBe(true);
    store.toggleInvert();
    expect(store.invert).toBe(false);
  });

  it('toggleGrayscale flips the grayscale state', () => {
    expect(store.grayscale).toBe(false);
    store.toggleGrayscale();
    expect(store.grayscale).toBe(true);
    store.toggleGrayscale();
    expect(store.grayscale).toBe(false);
  });

  // -- cssFilter derived value --

  it('cssFilter returns "none" when all defaults', () => {
    expect(store.cssFilter).toBe('none');
  });

  it('cssFilter includes filter functions for non-default values', () => {
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

  it('cssFilter omits default-valued filters', () => {
    store.toggleInvert();
    const css = store.cssFilter;
    // Only invert should appear; brightness/contrast/saturation at 100 are omitted
    expect(css).not.toContain('brightness');
    expect(css).not.toContain('contrast');
    expect(css).not.toContain('saturate');
    expect(css).toBe('invert(1)');
  });

  // -- Reset --

  it('reset restores all defaults', () => {
    store.setBrightness(50);
    store.setContrast(150);
    store.setSaturation(10);
    store.toggleInvert();
    store.toggleGrayscale();

    store.reset();

    expect(store.brightness).toBe(100);
    expect(store.contrast).toBe(100);
    expect(store.saturation).toBe(100);
    expect(store.invert).toBe(false);
    expect(store.grayscale).toBe(false);
    expect(store.isDefault).toBe(true);
    expect(store.cssFilter).toBe('none');
  });
});


// ============================================================================
// 2. ComparisonStore
// ============================================================================

import {
  ComparisonStore,
  type ComparisonMode,
} from '@/src/features/viewer/model/comparison.svelte';

describe('ComparisonStore', () => {
  let store: ComparisonStore;

  beforeEach(() => {
    store = new ComparisonStore();
  });

  // -- Constructor defaults --

  it('has correct default values', () => {
    expect(store.mode).toBe('off');
    expect(store.leftCanvasId).toBeNull();
    expect(store.rightCanvasId).toBeNull();
    expect(store.overlayOpacity).toBe(0.5);
    expect(store.curtainPosition).toBe(50);
    expect(store.syncViewports).toBe(true);
  });

  it('isActive is false when mode is "off"', () => {
    expect(store.isActive).toBe(false);
  });

  // -- Mode --

  it('setMode changes mode and isActive reflects it', () => {
    store.setMode('side-by-side');
    expect(store.mode).toBe('side-by-side');
    expect(store.isActive).toBe(true);

    store.setMode('overlay');
    expect(store.mode).toBe('overlay');
    expect(store.isActive).toBe(true);

    store.setMode('curtain');
    expect(store.mode).toBe('curtain');
    expect(store.isActive).toBe(true);

    store.setMode('off');
    expect(store.mode).toBe('off');
    expect(store.isActive).toBe(false);
  });

  // -- Canvases --

  it('setCanvases stores both IDs', () => {
    store.setCanvases('canvas-a', 'canvas-b');
    expect(store.leftCanvasId).toBe('canvas-a');
    expect(store.rightCanvasId).toBe('canvas-b');
  });

  it('swapCanvases swaps left and right', () => {
    store.setCanvases('left-1', 'right-2');
    store.swapCanvases();
    expect(store.leftCanvasId).toBe('right-2');
    expect(store.rightCanvasId).toBe('left-1');
  });

  // -- Clamped values --

  it('setOverlayOpacity clamps to 0-1', () => {
    store.setOverlayOpacity(0.75);
    expect(store.overlayOpacity).toBe(0.75);

    store.setOverlayOpacity(-0.5);
    expect(store.overlayOpacity).toBe(0);

    store.setOverlayOpacity(2.0);
    expect(store.overlayOpacity).toBe(1);
  });

  it('setCurtainPosition clamps to 0-100', () => {
    store.setCurtainPosition(25);
    expect(store.curtainPosition).toBe(25);

    store.setCurtainPosition(-10);
    expect(store.curtainPosition).toBe(0);

    store.setCurtainPosition(150);
    expect(store.curtainPosition).toBe(100);
  });

  // -- Toggle --

  it('toggleSyncViewports flips sync state', () => {
    expect(store.syncViewports).toBe(true);
    store.toggleSyncViewports();
    expect(store.syncViewports).toBe(false);
    store.toggleSyncViewports();
    expect(store.syncViewports).toBe(true);
  });

  // -- Reset --

  it('reset restores all defaults', () => {
    store.setMode('overlay');
    store.setCanvases('a', 'b');
    store.setOverlayOpacity(0.8);
    store.setCurtainPosition(30);
    store.toggleSyncViewports();

    store.reset();

    expect(store.mode).toBe('off');
    expect(store.leftCanvasId).toBeNull();
    expect(store.rightCanvasId).toBeNull();
    expect(store.overlayOpacity).toBe(0.5);
    expect(store.curtainPosition).toBe(50);
    expect(store.syncViewports).toBe(true);
    expect(store.isActive).toBe(false);
  });
});


// ============================================================================
// 3. MeasurementStore
// ============================================================================

import {
  MeasurementStore,
  type MeasurementPoint,
  type Measurement,
} from '@/src/features/viewer/model/measurement.svelte';

describe('MeasurementStore', () => {
  let store: MeasurementStore;

  beforeEach(() => {
    store = new MeasurementStore();
  });

  // -- Constructor defaults --

  it('has correct default values', () => {
    expect(store.active).toBe(false);
    expect(store.startPoint).toBeNull();
    expect(store.endPoint).toBeNull();
    expect(store.measurements).toEqual([]);
    expect(store.calibration).toBeNull();
    expect(store.isDrawing).toBe(false);
    expect(store.currentDistancePx).toBe(0);
  });

  // -- Activate / Deactivate --

  it('activate and deactivate toggle active state', () => {
    store.activate();
    expect(store.active).toBe(true);

    store.deactivate();
    expect(store.active).toBe(false);
  });

  it('deactivate clears start and end points', () => {
    store.activate();
    store.setStart({ x: 10, y: 20 });
    store.setEnd({ x: 30, y: 40 });

    store.deactivate();
    expect(store.startPoint).toBeNull();
    expect(store.endPoint).toBeNull();
  });

  // -- Points --

  it('setStart and setEnd store points', () => {
    store.setStart({ x: 5, y: 10 });
    expect(store.startPoint).toEqual({ x: 5, y: 10 });

    store.setEnd({ x: 15, y: 20 });
    expect(store.endPoint).toEqual({ x: 15, y: 20 });
  });

  it('setStart clears any existing end point', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 10, y: 10 });
    expect(store.endPoint).toEqual({ x: 10, y: 10 });

    store.setStart({ x: 5, y: 5 });
    expect(store.endPoint).toBeNull();
  });

  // -- Derived values --

  it('isDrawing is true when start set but not end', () => {
    store.setStart({ x: 0, y: 0 });
    expect(store.isDrawing).toBe(true);

    store.setEnd({ x: 10, y: 10 });
    expect(store.isDrawing).toBe(false);
  });

  it('currentDistancePx calculates Euclidean distance', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 3, y: 4 });
    // 3-4-5 triangle
    expect(store.currentDistancePx).toBe(5);
  });

  it('currentDistancePx is 0 when points are missing', () => {
    expect(store.currentDistancePx).toBe(0);

    store.setStart({ x: 0, y: 0 });
    // Only start set, no end
    expect(store.currentDistancePx).toBe(0);
  });

  // -- Commit --

  it('commit adds measurement to list and clears points', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 3, y: 4 });
    store.commit();

    expect(store.measurements).toHaveLength(1);
    const m = store.measurements[0];
    expect(m.start).toEqual({ x: 0, y: 0 });
    expect(m.end).toEqual({ x: 3, y: 4 });
    expect(m.distancePx).toBe(5);
    expect(m.distanceCalibrated).toBeNull();
    expect(m.unit).toBe('px');
    expect(m.id).toMatch(/^m-/);

    // Points cleared after commit
    expect(store.startPoint).toBeNull();
    expect(store.endPoint).toBeNull();
  });

  it('commit with calibration adds calibrated distance', () => {
    store.calibrate(100, 'cm');
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 300, y: 400 });
    store.commit();

    const m = store.measurements[0];
    expect(m.distancePx).toBe(500);
    expect(m.distanceCalibrated).toBe(5); // 500 / 100
    expect(m.unit).toBe('cm');
  });

  it('commit ignores when start or end point is missing', () => {
    // No points at all
    store.commit();
    expect(store.measurements).toHaveLength(0);

    // Only start
    store.setStart({ x: 0, y: 0 });
    store.commit();
    expect(store.measurements).toHaveLength(0);
  });

  // -- Remove / Clear --

  it('removeMeasurement removes by id', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 10, y: 0 });
    store.commit();

    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 0, y: 20 });
    store.commit();

    expect(store.measurements).toHaveLength(2);
    const idToRemove = store.measurements[0].id;
    store.removeMeasurement(idToRemove);
    expect(store.measurements).toHaveLength(1);
    expect(store.measurements[0].id).not.toBe(idToRemove);
  });

  it('clearAll clears measurements and points', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 10, y: 0 });
    store.commit();
    store.setStart({ x: 5, y: 5 });

    store.clearAll();
    expect(store.measurements).toHaveLength(0);
    expect(store.startPoint).toBeNull();
    expect(store.endPoint).toBeNull();
  });

  // -- Reset --

  it('reset clears everything including calibration', () => {
    store.activate();
    store.calibrate(50, 'mm');
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 10, y: 0 });
    store.commit();

    store.reset();

    expect(store.active).toBe(false);
    expect(store.startPoint).toBeNull();
    expect(store.endPoint).toBeNull();
    expect(store.measurements).toHaveLength(0);
    expect(store.calibration).toBeNull();
  });
});


// ============================================================================
// 4. AnnotationLayerStore
// ============================================================================

import {
  AnnotationLayerStore,
  type AnnotationLayer,
} from '@/src/features/viewer/model/annotationLayers.svelte';

describe('AnnotationLayerStore', () => {
  let store: AnnotationLayerStore;

  const samplePages = [
    { id: 'page-1', label: 'Transcription' },
    { id: 'page-2', label: 'Commentary' },
    { id: 'page-3', label: '' },  // empty label tests fallback
  ];

  beforeEach(() => {
    store = new AnnotationLayerStore();
  });

  // -- Constructor defaults --

  it('starts with empty layers', () => {
    expect(store.layers).toEqual([]);
    expect(store.visibleLayerIds).toEqual([]);
  });

  // -- setLayers --

  it('setLayers initializes layers with default colors and visibility', () => {
    store.setLayers(samplePages);

    expect(store.layers).toHaveLength(3);
    expect(store.layers[0].id).toBe('page-1');
    expect(store.layers[0].label).toBe('Transcription');
    expect(store.layers[0].visible).toBe(true);
    expect(store.layers[0].opacity).toBe(1);
    // Each layer gets a color from the default palette
    expect(store.layers[0].color).toMatch(/^#[0-9A-Fa-f]{6}$/);

    // Empty label falls back to "Layer N"
    expect(store.layers[2].label).toBe('Layer 3');
  });

  // -- Toggle visibility --

  it('toggleVisibility flips a specific layer visible state', () => {
    store.setLayers(samplePages);
    expect(store.layers[0].visible).toBe(true);

    store.toggleVisibility('page-1');
    expect(store.layers[0].visible).toBe(false);

    store.toggleVisibility('page-1');
    expect(store.layers[0].visible).toBe(true);
  });

  // -- setColor --

  it('setColor updates a layer color', () => {
    store.setLayers(samplePages);
    store.setColor('page-2', '#000000');
    expect(store.layers[1].color).toBe('#000000');
  });

  // -- setOpacity --

  it('setOpacity clamps to 0-1', () => {
    store.setLayers(samplePages);

    store.setOpacity('page-1', 0.5);
    expect(store.layers[0].opacity).toBe(0.5);

    store.setOpacity('page-1', -0.5);
    expect(store.layers[0].opacity).toBe(0);

    store.setOpacity('page-1', 2.0);
    expect(store.layers[0].opacity).toBe(1);
  });

  // -- visibleLayerIds --

  it('visibleLayerIds returns only visible layer IDs', () => {
    store.setLayers(samplePages);
    store.toggleVisibility('page-2');

    const visible = store.visibleLayerIds;
    expect(visible).toContain('page-1');
    expect(visible).not.toContain('page-2');
    expect(visible).toContain('page-3');
  });

  // -- showAll / hideAll --

  it('showAll makes all layers visible', () => {
    store.setLayers(samplePages);
    store.hideAll();
    expect(store.visibleLayerIds).toHaveLength(0);

    store.showAll();
    expect(store.visibleLayerIds).toHaveLength(3);
    for (const layer of store.layers) {
      expect(layer.visible).toBe(true);
    }
  });

  it('hideAll makes all layers hidden', () => {
    store.setLayers(samplePages);
    store.hideAll();

    expect(store.visibleLayerIds).toHaveLength(0);
    for (const layer of store.layers) {
      expect(layer.visible).toBe(false);
    }
  });

  // -- toggleAll --

  it('toggleAll hides all when all visible, shows all when any hidden', () => {
    store.setLayers(samplePages);

    // All visible -> hides all
    store.toggleAll();
    expect(store.visibleLayerIds).toHaveLength(0);

    // None visible -> shows all
    store.toggleAll();
    expect(store.visibleLayerIds).toHaveLength(3);

    // Make one hidden, toggleAll should show all
    store.toggleVisibility('page-1');
    expect(store.visibleLayerIds).toHaveLength(2);
    store.toggleAll();
    expect(store.visibleLayerIds).toHaveLength(3);
  });

  // -- Reset --

  it('reset clears all layers', () => {
    store.setLayers(samplePages);
    expect(store.layers).toHaveLength(3);

    store.reset();
    expect(store.layers).toEqual([]);
    expect(store.visibleLayerIds).toEqual([]);
  });
});
