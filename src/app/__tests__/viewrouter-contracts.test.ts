/**
 * ViewRouter Entity Resolution Contract Tests
 *
 * Verifies that entity lookup + type guard narrowing produces correct types
 * for each view scenario. Tests the pure function patterns used in ViewRouter
 * after the `as IIIFSubtype` casts were replaced with type guards.
 */

import { describe, it, expect } from 'vitest';
import type {
  IIIFItem,
  IIIFCanvas,
  IIIFManifest,
  IIIFCollection,
  IIIFRange,
} from '@/src/shared/types';
import {
  isCanvas,
  isManifest,
  isRange,
  getChildEntities,
} from '@/src/shared/types';

// ═══════════════════════════════════════════════════════════════════════
// Test fixtures
// ═══════════════════════════════════════════════════════════════════════

function makeCanvas(overrides: Partial<IIIFCanvas> = {}): IIIFCanvas {
  return {
    id: `urn:test:canvas:${Math.random().toString(36).slice(2, 8)}`,
    type: 'Canvas',
    width: 1024,
    height: 768,
    items: [],
    ...overrides,
  };
}

function makeManifest(overrides: Partial<IIIFManifest> = {}): IIIFManifest {
  return {
    id: `urn:test:manifest:${Math.random().toString(36).slice(2, 8)}`,
    type: 'Manifest',
    label: { en: ['Test Manifest'] },
    items: [],
    ...overrides,
  };
}

function makeCollection(overrides: Partial<IIIFCollection> = {}): IIIFCollection {
  return {
    id: `urn:test:collection:${Math.random().toString(36).slice(2, 8)}`,
    type: 'Collection',
    label: { en: ['Test Collection'] },
    items: [],
    ...overrides,
  };
}

function makeRange(overrides: Partial<IIIFRange> = {}): IIIFRange {
  return {
    id: `urn:test:range:${Math.random().toString(36).slice(2, 8)}`,
    type: 'Range',
    label: { en: ['Chapter 1'] },
    items: [],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Re-implement key ViewRouter patterns using type guards
// ═══════════════════════════════════════════════════════════════════════

/**
 * ViewRouter.findFirstCanvas — equivalent logic using type guards.
 * The component's function was updated to use isCanvas/isManifest.
 */
function findFirstCanvas(node: IIIFItem): { canvas: IIIFCanvas | null; manifest: IIIFManifest | null } {
  if (isCanvas(node)) {
    return { canvas: node, manifest: null };
  }
  if (node.items && Array.isArray(node.items)) {
    for (const item of node.items) {
      const result = findFirstCanvas(item as IIIFItem);
      if (result.canvas) {
        if (isManifest(node)) {
          return { canvas: result.canvas, manifest: node };
        }
        return result;
      }
    }
  }
  return { canvas: null, manifest: null };
}

/**
 * ViewRouter.getCanvasMediaType — equivalent logic using type guards.
 */
function getCanvasMediaType(canvas: IIIFCanvas | IIIFItem | null): 'image' | 'video' | 'audio' | 'other' {
  if (!canvas) return 'other';
  if (!isCanvas(canvas)) return 'other';
  const items = canvas.items;
  if (!items || items.length === 0) return 'other';
  for (const page of items) {
    if (page.items) {
      for (const anno of page.items) {
        const body = anno.body as { type?: string };
        if (body?.type === 'Image') return 'image';
        if (body?.type === 'Video') return 'video';
        if (body?.type === 'Sound') return 'audio';
      }
    }
  }
  return 'other';
}

/**
 * ViewRouter.getParentManifest pattern — lookup + type guard narrowing.
 */
function resolveEntityAsManifest(entity: IIIFItem | null): IIIFManifest | null {
  return isManifest(entity) ? entity : null;
}

/**
 * ViewRouter viewer resolution pattern — type guard narrowing for canvas.
 */
function resolveEntityAsCanvas(entity: IIIFItem | null | undefined): IIIFCanvas | null {
  return isCanvas(entity) ? entity : null;
}

// ═══════════════════════════════════════════════════════════════════════
// Canvas resolution contracts
// ═══════════════════════════════════════════════════════════════════════

describe('Canvas entity resolution', () => {
  it('resolves Canvas with width and height', () => {
    const canvas = makeCanvas({ width: 2048, height: 1536 });
    const result = resolveEntityAsCanvas(canvas);
    expect(result).not.toBeNull();
    expect(result!.width).toBe(2048);
    expect(result!.height).toBe(1536);
  });

  it('resolves Canvas with duration (AV)', () => {
    const canvas = makeCanvas({ duration: 120.5, width: 1920, height: 1080 });
    const result = resolveEntityAsCanvas(canvas);
    expect(result).not.toBeNull();
    expect(result!.duration).toBe(120.5);
  });

  it('returns null for Manifest entity', () => {
    const manifest = makeManifest();
    const result = resolveEntityAsCanvas(manifest);
    expect(result).toBeNull();
  });

  it('returns null for null input', () => {
    expect(resolveEntityAsCanvas(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(resolveEntityAsCanvas(undefined)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Manifest resolution contracts
// ═══════════════════════════════════════════════════════════════════════

describe('Manifest entity resolution', () => {
  it('resolves Manifest with structures', () => {
    const range = makeRange();
    const manifest = makeManifest({ structures: [range] });
    const result = resolveEntityAsManifest(manifest);
    expect(result).not.toBeNull();
    expect(result!.structures).toHaveLength(1);
    expect(result!.structures![0].type).toBe('Range');
  });

  it('resolves Manifest with items (canvases)', () => {
    const canvas = makeCanvas();
    const manifest = makeManifest({ items: [canvas] });
    const result = resolveEntityAsManifest(manifest);
    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(1);
    expect(result!.items[0].width).toBe(1024);
  });

  it('resolves Manifest with viewingDirection', () => {
    const manifest = makeManifest({ viewingDirection: 'right-to-left' });
    const result = resolveEntityAsManifest(manifest);
    expect(result).not.toBeNull();
    expect(result!.viewingDirection).toBe('right-to-left');
  });

  it('returns null for Canvas entity', () => {
    expect(resolveEntityAsManifest(makeCanvas())).toBeNull();
  });

  it('returns null for Collection entity', () => {
    expect(resolveEntityAsManifest(makeCollection())).toBeNull();
  });

  it('returns null for null input', () => {
    expect(resolveEntityAsManifest(null)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// findFirstCanvas with type guards
// ═══════════════════════════════════════════════════════════════════════

describe('findFirstCanvas with type guards', () => {
  it('finds canvas directly at root', () => {
    const canvas = makeCanvas({ id: 'canvas-direct' });
    const result = findFirstCanvas(canvas);
    expect(result.canvas).toBe(canvas);
    expect(result.manifest).toBeNull();
    // Verify narrowed type has width/height
    expect(result.canvas!.width).toBe(1024);
    expect(result.canvas!.height).toBe(768);
  });

  it('finds canvas in manifest and returns both', () => {
    const canvas = makeCanvas({ id: 'canvas-in-manifest', width: 800, height: 600 });
    const manifest = makeManifest({ id: 'parent-manifest', items: [canvas] });
    const result = findFirstCanvas(manifest);
    expect(result.canvas).toBe(canvas);
    expect(result.manifest).toBe(manifest);
    // Verify narrowed types
    expect(result.canvas!.width).toBe(800);
    expect(result.manifest!.type).toBe('Manifest');
  });

  it('finds canvas in collection > manifest', () => {
    const canvas = makeCanvas({ id: 'deep-canvas' });
    const manifest = makeManifest({ id: 'deep-manifest', items: [canvas] });
    const collection = makeCollection({ items: [manifest] });
    const result = findFirstCanvas(collection);
    expect(result.canvas).toBe(canvas);
    expect(result.manifest).toBe(manifest);
  });

  it('returns null for empty structure', () => {
    const collection = makeCollection();
    const result = findFirstCanvas(collection);
    expect(result.canvas).toBeNull();
    expect(result.manifest).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// getCanvasMediaType with type guards
// ═══════════════════════════════════════════════════════════════════════

describe('getCanvasMediaType with type guards', () => {
  it('returns other for non-Canvas entity', () => {
    const manifest = makeManifest();
    expect(getCanvasMediaType(manifest)).toBe('other');
  });

  it('returns image for Canvas with Image painting', () => {
    const canvas = makeCanvas({
      items: [{
        id: 'page-1',
        type: 'AnnotationPage',
        items: [{
          id: 'anno-1',
          type: 'Annotation',
          motivation: 'painting',
          body: { id: 'img-1', type: 'Image', format: 'image/jpeg' },
          target: 'canvas-1',
        }],
      }],
    });
    expect(getCanvasMediaType(canvas)).toBe('image');
  });

  it('returns other for Canvas with no items', () => {
    const canvas = makeCanvas({ items: [] });
    expect(getCanvasMediaType(canvas)).toBe('other');
  });

  it('returns null for null input', () => {
    expect(getCanvasMediaType(null)).toBe('other');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// getChildEntities integration
// ═══════════════════════════════════════════════════════════════════════

describe('getChildEntities integration', () => {
  it('returns canvases from Manifest', () => {
    const canvas = makeCanvas();
    const manifest = makeManifest({ items: [canvas] });
    const children = getChildEntities(manifest);
    expect(children).toHaveLength(1);
    expect(isCanvas(children[0])).toBe(true);
  });

  it('returns items from Collection', () => {
    const manifest = makeManifest();
    const collection = makeCollection({ items: [manifest] });
    const children = getChildEntities(collection);
    expect(children).toHaveLength(1);
    expect(isManifest(children[0])).toBe(true);
  });

  it('returns nested ranges from Range', () => {
    const nested = makeRange({ id: 'nested-range' });
    const range = makeRange({
      items: [
        { id: 'canvas-ref', type: 'Canvas' as const },
        nested,
      ],
    });
    const children = getChildEntities(range);
    // Only nested Range items, not canvas references
    expect(children).toHaveLength(1);
    expect(isRange(children[0])).toBe(true);
  });

  it('returns empty array from Canvas', () => {
    const canvas = makeCanvas();
    expect(getChildEntities(canvas)).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Archive view sorting pattern (was using `as IIIFCanvas`)
// ═══════════════════════════════════════════════════════════════════════

describe('Archive sort-by-size pattern with type guards', () => {
  function sortBySize(items: IIIFItem[]): IIIFItem[] {
    return [...items].sort((a, b) => {
      const sizeA = isCanvas(a) && a.width && a.height ? a.width * a.height : 0;
      const sizeB = isCanvas(b) && b.width && b.height ? b.width * b.height : 0;
      return sizeA - sizeB;
    });
  }

  it('sorts canvases by pixel count ascending', () => {
    const small = makeCanvas({ id: 'small', width: 100, height: 100 });   // 10,000
    const medium = makeCanvas({ id: 'medium', width: 500, height: 400 }); // 200,000
    const large = makeCanvas({ id: 'large', width: 2000, height: 1500 }); // 3,000,000

    const sorted = sortBySize([large, small, medium]);
    expect(sorted[0].id).toBe('small');
    expect(sorted[1].id).toBe('medium');
    expect(sorted[2].id).toBe('large');
  });

  it('treats non-Canvas items as size 0', () => {
    const manifest = makeManifest({ id: 'manifest-item' });
    const canvas = makeCanvas({ id: 'canvas-item', width: 100, height: 100 });
    const sorted = sortBySize([canvas, manifest]);
    // Manifest has size 0, canvas has 10,000 — manifest sorts first
    expect(sorted[0].id).toBe('manifest-item');
    expect(sorted[1].id).toBe('canvas-item');
  });
});
