/**
 * Type Guard Regression Tests
 *
 * Verifies that isCanvas/isManifest/isCollection/isRange correctly narrow
 * IIIFItem to the specific subtype, and return false for wrong types, null,
 * and undefined. Ensures narrowed types expose subtype-specific fields.
 */

import { describe, it, expect } from 'vitest';
import {
  isCanvas,
  isManifest,
  isCollection,
  isRange,
  isAnnotationPage,
} from '../index';
import type {
  IIIFItem,
  IIIFCanvas,
  IIIFManifest,
  IIIFCollection,
  IIIFRange,
} from '../index';

// ═══════════════════════════════════════════════════════════════════════
// Test fixtures
// ═══════════════════════════════════════════════════════════════════════

function makeCanvas(overrides: Partial<IIIFCanvas> = {}): IIIFCanvas {
  return {
    id: 'urn:test:canvas:1',
    type: 'Canvas',
    width: 1024,
    height: 768,
    items: [],
    ...overrides,
  };
}

function makeManifest(overrides: Partial<IIIFManifest> = {}): IIIFManifest {
  return {
    id: 'urn:test:manifest:1',
    type: 'Manifest',
    label: { en: ['Test Manifest'] },
    items: [],
    structures: [],
    ...overrides,
  };
}

function makeCollection(overrides: Partial<IIIFCollection> = {}): IIIFCollection {
  return {
    id: 'urn:test:collection:1',
    type: 'Collection',
    label: { en: ['Test Collection'] },
    items: [],
    ...overrides,
  };
}

function makeRange(overrides: Partial<IIIFRange> = {}): IIIFRange {
  return {
    id: 'urn:test:range:1',
    type: 'Range',
    label: { en: ['Chapter 1'] },
    items: [],
    ...overrides,
  };
}

function makeGenericItem(overrides: Partial<IIIFItem> = {}): IIIFItem {
  return {
    id: 'urn:test:item:1',
    type: 'Annotation',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// isCanvas
// ═══════════════════════════════════════════════════════════════════════

describe('isCanvas', () => {
  it('returns true for Canvas type', () => {
    expect(isCanvas(makeCanvas())).toBe(true);
  });

  it('narrows to IIIFCanvas with width/height', () => {
    const item: IIIFItem = makeCanvas({ width: 2048, height: 1536 });
    if (isCanvas(item)) {
      // TypeScript narrowing: these should compile without error
      expect(item.width).toBe(2048);
      expect(item.height).toBe(1536);
      expect(item.type).toBe('Canvas');
    } else {
      throw new Error('Expected isCanvas to return true');
    }
  });

  it('narrows to expose optional duration field', () => {
    const item: IIIFItem = makeCanvas({ duration: 120.5 });
    if (isCanvas(item)) {
      expect(item.duration).toBe(120.5);
    } else {
      throw new Error('Expected isCanvas to return true');
    }
  });

  it('returns false for Manifest', () => {
    expect(isCanvas(makeManifest())).toBe(false);
  });

  it('returns false for Collection', () => {
    expect(isCanvas(makeCollection())).toBe(false);
  });

  it('returns false for Range', () => {
    expect(isCanvas(makeRange())).toBe(false);
  });

  it('returns false for other types', () => {
    expect(isCanvas(makeGenericItem())).toBe(false);
  });

  it('returns false for null', () => {
    expect(isCanvas(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isCanvas(undefined)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// isManifest
// ═══════════════════════════════════════════════════════════════════════

describe('isManifest', () => {
  it('returns true for Manifest type', () => {
    expect(isManifest(makeManifest())).toBe(true);
  });

  it('narrows to IIIFManifest with structures', () => {
    const range = makeRange();
    const item: IIIFItem = makeManifest({ structures: [range] });
    if (isManifest(item)) {
      expect(item.structures).toHaveLength(1);
      expect(item.structures![0].type).toBe('Range');
      expect(item.type).toBe('Manifest');
    } else {
      throw new Error('Expected isManifest to return true');
    }
  });

  it('narrows to expose viewingDirection', () => {
    const item: IIIFItem = makeManifest({ viewingDirection: 'right-to-left' });
    if (isManifest(item)) {
      expect(item.viewingDirection).toBe('right-to-left');
    } else {
      throw new Error('Expected isManifest to return true');
    }
  });

  it('narrows to expose items as IIIFCanvas[]', () => {
    const canvas = makeCanvas();
    const item: IIIFItem = makeManifest({ items: [canvas] });
    if (isManifest(item)) {
      expect(item.items).toHaveLength(1);
      expect(item.items[0].type).toBe('Canvas');
      expect(item.items[0].width).toBe(1024);
    } else {
      throw new Error('Expected isManifest to return true');
    }
  });

  it('returns false for Canvas', () => {
    expect(isManifest(makeCanvas())).toBe(false);
  });

  it('returns false for Collection', () => {
    expect(isManifest(makeCollection())).toBe(false);
  });

  it('returns false for Range', () => {
    expect(isManifest(makeRange())).toBe(false);
  });

  it('returns false for null', () => {
    expect(isManifest(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isManifest(undefined)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// isCollection
// ═══════════════════════════════════════════════════════════════════════

describe('isCollection', () => {
  it('returns true for Collection type', () => {
    expect(isCollection(makeCollection())).toBe(true);
  });

  it('narrows to IIIFCollection with items as IIIFItem[]', () => {
    const manifest = makeManifest();
    const item: IIIFItem = makeCollection({ items: [manifest] });
    if (isCollection(item)) {
      expect(item.items).toHaveLength(1);
      expect(item.items[0].type).toBe('Manifest');
      expect(item.type).toBe('Collection');
    } else {
      throw new Error('Expected isCollection to return true');
    }
  });

  it('returns false for Canvas', () => {
    expect(isCollection(makeCanvas())).toBe(false);
  });

  it('returns false for Manifest', () => {
    expect(isCollection(makeManifest())).toBe(false);
  });

  it('returns false for Range', () => {
    expect(isCollection(makeRange())).toBe(false);
  });

  it('returns false for null', () => {
    expect(isCollection(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isCollection(undefined)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// isRange
// ═══════════════════════════════════════════════════════════════════════

describe('isRange', () => {
  it('returns true for Range type', () => {
    expect(isRange(makeRange())).toBe(true);
  });

  it('narrows to IIIFRange with items as mixed array', () => {
    const item: IIIFItem = makeRange({
      items: [
        { id: 'urn:test:canvas:1', type: 'Canvas' as const },
        makeRange({ id: 'urn:test:range:nested' }),
      ],
    });
    if (isRange(item)) {
      expect(item.items).toHaveLength(2);
      expect(item.type).toBe('Range');
    } else {
      throw new Error('Expected isRange to return true');
    }
  });

  it('returns false for Canvas', () => {
    expect(isRange(makeCanvas())).toBe(false);
  });

  it('returns false for Manifest', () => {
    expect(isRange(makeManifest())).toBe(false);
  });

  it('returns false for Collection', () => {
    expect(isRange(makeCollection())).toBe(false);
  });

  it('returns false for null', () => {
    expect(isRange(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isRange(undefined)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// isAnnotationPage
// ═══════════════════════════════════════════════════════════════════════

describe('isAnnotationPage', () => {
  it('returns true for AnnotationPage type', () => {
    expect(isAnnotationPage({ type: 'AnnotationPage' })).toBe(true);
  });

  it('returns false for Canvas type', () => {
    expect(isAnnotationPage(makeCanvas())).toBe(false);
  });

  it('returns false for null', () => {
    expect(isAnnotationPage(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAnnotationPage(undefined)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Cross-guard mutual exclusion
// ═══════════════════════════════════════════════════════════════════════

describe('type guards are mutually exclusive', () => {
  const items = [makeCanvas(), makeManifest(), makeCollection(), makeRange()];

  it('each item matches exactly one guard', () => {
    for (const item of items) {
      const matches = [
        isCanvas(item),
        isManifest(item),
        isCollection(item),
        isRange(item),
      ].filter(Boolean);
      expect(matches).toHaveLength(1);
    }
  });
});
