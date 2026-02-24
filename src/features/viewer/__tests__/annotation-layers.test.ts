/**
 * AnnotationLayerStore — Unit Tests
 *
 * Tests the Svelte 5 runes-based reactive class store for annotation page
 * visibility, color, and opacity management in the viewer.
 *
 * Source: src/features/viewer/model/annotationLayers.svelte.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AnnotationLayerStore,
} from '@/src/features/viewer/model/annotationLayers.svelte';

// ============================================================================
// Shared test data
// ============================================================================

const THREE_PAGES = [
  { id: 'page-1', label: 'Transcription' },
  { id: 'page-2', label: 'Commentary' },
  { id: 'page-3', label: 'Notes' },
];

// ============================================================================
// Constructor defaults
// ============================================================================

describe('AnnotationLayerStore — defaults', () => {
  let store: AnnotationLayerStore;

  beforeEach(() => {
    store = new AnnotationLayerStore();
  });

  it('initializes with an empty layers array', () => {
    expect(store.layers).toEqual([]);
  });

  it('visibleLayerIds is empty by default', () => {
    expect(store.visibleLayerIds).toEqual([]);
  });
});

// ============================================================================
// setLayers
// ============================================================================

describe('AnnotationLayerStore — setLayers', () => {
  let store: AnnotationLayerStore;

  beforeEach(() => {
    store = new AnnotationLayerStore();
  });

  it('creates one layer entry per page', () => {
    store.setLayers(THREE_PAGES);
    expect(store.layers).toHaveLength(3);
  });

  it('preserves page id on each layer', () => {
    store.setLayers(THREE_PAGES);
    expect(store.layers[0].id).toBe('page-1');
    expect(store.layers[1].id).toBe('page-2');
    expect(store.layers[2].id).toBe('page-3');
  });

  it('preserves page label on each layer', () => {
    store.setLayers(THREE_PAGES);
    expect(store.layers[0].label).toBe('Transcription');
    expect(store.layers[1].label).toBe('Commentary');
    expect(store.layers[2].label).toBe('Notes');
  });

  it('all layers start as visible', () => {
    store.setLayers(THREE_PAGES);
    expect(store.layers.every(l => l.visible)).toBe(true);
  });

  it('all layers start with opacity 1', () => {
    store.setLayers(THREE_PAGES);
    expect(store.layers.every(l => l.opacity === 1)).toBe(true);
  });

  it('each layer gets a hex color from the default palette', () => {
    store.setLayers(THREE_PAGES);
    for (const layer of store.layers) {
      expect(layer.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('layers with empty labels fall back to "Layer N" (1-indexed)', () => {
    store.setLayers([
      { id: 'p1', label: '' },
      { id: 'p2', label: '' },
    ]);
    expect(store.layers[0].label).toBe('Layer 1');
    expect(store.layers[1].label).toBe('Layer 2');
  });

  it('replaces existing layers when called a second time', () => {
    store.setLayers(THREE_PAGES);
    store.setLayers([{ id: 'new-1', label: 'Single' }]);
    expect(store.layers).toHaveLength(1);
    expect(store.layers[0].id).toBe('new-1');
  });

  it('calling setLayers with empty array clears all layers', () => {
    store.setLayers(THREE_PAGES);
    store.setLayers([]);
    expect(store.layers).toHaveLength(0);
  });

  it('palette wraps around for more than 8 layers', () => {
    const pages = Array.from({ length: 10 }, (_, i) => ({ id: `p-${i}`, label: `Page ${i}` }));
    store.setLayers(pages);
    // Layer 0 and layer 8 should get the same color from wrapped palette
    expect(store.layers[0].color).toBe(store.layers[8].color);
  });
});

// ============================================================================
// toggleVisibility
// ============================================================================

describe('AnnotationLayerStore — toggleVisibility', () => {
  let store: AnnotationLayerStore;

  beforeEach(() => {
    store = new AnnotationLayerStore();
    store.setLayers(THREE_PAGES);
  });

  it('toggles a visible layer to hidden', () => {
    store.toggleVisibility('page-1');
    expect(store.layers[0].visible).toBe(false);
  });

  it('toggles a hidden layer back to visible', () => {
    store.toggleVisibility('page-1');
    store.toggleVisibility('page-1');
    expect(store.layers[0].visible).toBe(true);
  });

  it('does not affect other layers when toggling one', () => {
    store.toggleVisibility('page-1');
    expect(store.layers[1].visible).toBe(true);
    expect(store.layers[2].visible).toBe(true);
  });

  it('is a no-op for an unknown id', () => {
    store.toggleVisibility('nonexistent');
    expect(store.layers.every(l => l.visible)).toBe(true);
  });
});

// ============================================================================
// setColor
// ============================================================================

describe('AnnotationLayerStore — setColor', () => {
  let store: AnnotationLayerStore;

  beforeEach(() => {
    store = new AnnotationLayerStore();
    store.setLayers(THREE_PAGES);
  });

  it('updates the color of the target layer', () => {
    store.setColor('page-2', '#000000');
    expect(store.layers[1].color).toBe('#000000');
  });

  it('does not affect other layers', () => {
    const originalColor0 = store.layers[0].color;
    store.setColor('page-2', '#FFFFFF');
    expect(store.layers[0].color).toBe(originalColor0);
  });

  it('accepts any string value as a color', () => {
    store.setColor('page-1', 'red');
    expect(store.layers[0].color).toBe('red');
  });

  it('is a no-op for an unknown id', () => {
    const before = store.layers.map(l => l.color);
    store.setColor('nonexistent', '#ABCDEF');
    const after = store.layers.map(l => l.color);
    expect(after).toEqual(before);
  });
});

// ============================================================================
// setOpacity
// ============================================================================

describe('AnnotationLayerStore — setOpacity', () => {
  let store: AnnotationLayerStore;

  beforeEach(() => {
    store = new AnnotationLayerStore();
    store.setLayers(THREE_PAGES);
  });

  it('sets opacity within the valid 0-1 range', () => {
    store.setOpacity('page-1', 0.5);
    expect(store.layers[0].opacity).toBe(0.5);
  });

  it('clamps opacity below 0 to 0', () => {
    store.setOpacity('page-1', -0.5);
    expect(store.layers[0].opacity).toBe(0);
  });

  it('clamps opacity above 1 to 1', () => {
    store.setOpacity('page-1', 2.0);
    expect(store.layers[0].opacity).toBe(1);
  });

  it('accepts boundary value 0', () => {
    store.setOpacity('page-1', 0);
    expect(store.layers[0].opacity).toBe(0);
  });

  it('accepts boundary value 1', () => {
    store.setOpacity('page-1', 1);
    expect(store.layers[0].opacity).toBe(1);
  });

  it('does not affect other layers', () => {
    store.setOpacity('page-1', 0.3);
    expect(store.layers[1].opacity).toBe(1);
    expect(store.layers[2].opacity).toBe(1);
  });
});

// ============================================================================
// visibleLayerIds
// ============================================================================

describe('AnnotationLayerStore — visibleLayerIds', () => {
  let store: AnnotationLayerStore;

  beforeEach(() => {
    store = new AnnotationLayerStore();
    store.setLayers(THREE_PAGES);
  });

  it('returns all layer IDs when all are visible', () => {
    expect(store.visibleLayerIds).toEqual(['page-1', 'page-2', 'page-3']);
  });

  it('excludes hidden layer IDs', () => {
    store.toggleVisibility('page-2');
    expect(store.visibleLayerIds).toContain('page-1');
    expect(store.visibleLayerIds).not.toContain('page-2');
    expect(store.visibleLayerIds).toContain('page-3');
  });

  it('returns empty array when all layers are hidden', () => {
    store.hideAll();
    expect(store.visibleLayerIds).toEqual([]);
  });
});

// ============================================================================
// showAll / hideAll
// ============================================================================

describe('AnnotationLayerStore — showAll / hideAll', () => {
  let store: AnnotationLayerStore;

  beforeEach(() => {
    store = new AnnotationLayerStore();
    store.setLayers(THREE_PAGES);
  });

  it('hideAll makes every layer invisible', () => {
    store.hideAll();
    expect(store.layers.every(l => !l.visible)).toBe(true);
  });

  it('showAll makes every layer visible', () => {
    store.hideAll();
    store.showAll();
    expect(store.layers.every(l => l.visible)).toBe(true);
  });

  it('showAll on already-visible layers is idempotent', () => {
    store.showAll();
    expect(store.layers.every(l => l.visible)).toBe(true);
  });

  it('hideAll on already-hidden layers is idempotent', () => {
    store.hideAll();
    store.hideAll();
    expect(store.layers.every(l => !l.visible)).toBe(true);
  });

  it('visibleLayerIds has correct length after showAll', () => {
    store.hideAll();
    store.showAll();
    expect(store.visibleLayerIds).toHaveLength(3);
  });

  it('visibleLayerIds is empty after hideAll', () => {
    store.hideAll();
    expect(store.visibleLayerIds).toHaveLength(0);
  });
});

// ============================================================================
// toggleAll
// ============================================================================

describe('AnnotationLayerStore — toggleAll', () => {
  let store: AnnotationLayerStore;

  beforeEach(() => {
    store = new AnnotationLayerStore();
    store.setLayers(THREE_PAGES);
  });

  it('hides all when all layers are currently visible', () => {
    store.toggleAll();
    expect(store.visibleLayerIds).toHaveLength(0);
  });

  it('shows all when all layers are currently hidden', () => {
    store.hideAll();
    store.toggleAll();
    expect(store.visibleLayerIds).toHaveLength(3);
  });

  it('shows all when at least one layer is hidden (not all visible)', () => {
    store.toggleVisibility('page-1');
    store.toggleAll();
    expect(store.visibleLayerIds).toHaveLength(3);
  });

  it('calling toggleAll twice returns to all-visible state', () => {
    store.toggleAll(); // hide all
    store.toggleAll(); // show all
    expect(store.visibleLayerIds).toHaveLength(3);
  });
});

// ============================================================================
// reset
// ============================================================================

describe('AnnotationLayerStore — reset', () => {
  let store: AnnotationLayerStore;

  beforeEach(() => {
    store = new AnnotationLayerStore();
  });

  it('clears all layers', () => {
    store.setLayers(THREE_PAGES);
    store.reset();
    expect(store.layers).toEqual([]);
  });

  it('visibleLayerIds is empty after reset', () => {
    store.setLayers(THREE_PAGES);
    store.reset();
    expect(store.visibleLayerIds).toEqual([]);
  });

  it('store can be reloaded with new layers after reset', () => {
    store.setLayers(THREE_PAGES);
    store.reset();
    store.setLayers([{ id: 'fresh', label: 'Fresh Layer' }]);
    expect(store.layers).toHaveLength(1);
    expect(store.layers[0].id).toBe('fresh');
  });
});
