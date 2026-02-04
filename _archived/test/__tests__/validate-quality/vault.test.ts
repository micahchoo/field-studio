/**
 * Unit Tests for services/vault.ts
 *
 * Tests normalized state management, entity operations, and vault functions.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  addEntity,
  createEmptyVault,
  denormalizeIIIF,
  getChildren,
  getEntity,
  getParent,
  normalizeIIIF,
  removeEntity,
  updateEntity,
} from '@/services/vault';
import type { IIIFCanvas, IIIFManifest, NormalizedState } from '@/types';

// ============================================================================
// Vault Creation Tests
// ============================================================================

describe('createEmptyVault', () => {
  it('should create an empty normalized state', () => {
    const vault = createEmptyVault();

    expect(vault).toHaveProperty('entities');
    expect(vault).toHaveProperty('references');
    expect(vault).toHaveProperty('reverseRefs');
    expect(vault).toHaveProperty('rootId');
    expect(vault.rootId).toBeNull();
  });

  it('should have empty entity maps', () => {
    const vault = createEmptyVault();

    expect(vault.entities.Collection).toEqual({});
    expect(vault.entities.Manifest).toEqual({});
    expect(vault.entities.Canvas).toEqual({});
  });
});

// ============================================================================
// Normalization Tests
// ============================================================================

describe('normalizeIIIF', () => {
  it('should normalize a simple manifest', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test Manifest'] },
      items: [],
    };

    const normalized = normalizeIIIF(manifest);

    expect(normalized.rootId).toBe('https://example.com/manifest');
    expect(normalized.entities.Manifest['https://example.com/manifest']).toBeDefined();
  });

  it('should normalize manifest with canvases', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [
        {
          id: 'https://example.com/canvas/1',
          type: 'Canvas',
          label: { en: ['Canvas 1'] },
          width: 1000,
          height: 1000,
        },
      ],
    };

    const normalized = normalizeIIIF(manifest);

    expect(normalized.entities.Canvas['https://example.com/canvas/1']).toBeDefined();
    expect(normalized.references['https://example.com/manifest']).toContain('https://example.com/canvas/1');
    expect(normalized.reverseRefs['https://example.com/canvas/1']).toBe('https://example.com/manifest');
  });

  it('should create typeIndex for all entities', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [
        {
          id: 'https://example.com/canvas/1',
          type: 'Canvas',
          label: { en: ['Canvas 1'] },
          width: 1000,
          height: 1000,
        },
      ],
    };

    const normalized = normalizeIIIF(manifest);

    expect(normalized.typeIndex['https://example.com/manifest']).toBe('Manifest');
    expect(normalized.typeIndex['https://example.com/canvas/1']).toBe('Canvas');
  });
});

// ============================================================================
// Denormalization Tests
// ============================================================================

describe('denormalizeIIIF', () => {
  it('should reconstruct IIIF tree from normalized state', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [
        {
          id: 'https://example.com/canvas/1',
          type: 'Canvas',
          label: { en: ['Canvas 1'] },
          width: 1000,
          height: 1000,
        },
      ],
    };

    const normalized = normalizeIIIF(manifest);
    const denormalized = denormalizeIIIF(normalized);

    expect(denormalized.id).toBe('https://example.com/manifest');
    expect(denormalized.items).toHaveLength(1);
    expect(denormalized.items[0].id).toBe('https://example.com/canvas/1');
  });

  it('should preserve extension properties', () => {
    const manifest: any = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      'custom:property': 'custom value',
      items: [],
    };

    const normalized = normalizeIIIF(manifest);
    const denormalized: any = denormalizeIIIF(normalized);

    expect(denormalized['custom:property']).toBe('custom value');
  });
});

// ============================================================================
// Entity Operations Tests
// ============================================================================

describe('getEntity', () => {
  let vault: NormalizedState;

  beforeEach(() => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };
    vault = normalizeIIIF(manifest);
  });

  it('should retrieve entity by ID', () => {
    const entity = getEntity(vault, 'https://example.com/manifest');
    expect(entity).toBeDefined();
    expect(entity?.type).toBe('Manifest');
  });

  it('should return null for non-existent entity', () => {
    const entity = getEntity(vault, 'https://example.com/nonexistent');
    expect(entity).toBeNull();
  });

  it('should use typeIndex for lookup', () => {
    const entity = getEntity(vault, 'https://example.com/manifest');
    expect(entity).toBeDefined();
  });
});

describe('updateEntity', () => {
  it('should update entity properties immutably', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    const vault = normalizeIIIF(manifest);
    const updated = updateEntity(vault, 'https://example.com/manifest', {
      label: { en: ['Updated Label'] },
    });

    expect(updated).not.toBe(vault);
    expect(getEntity(updated, 'https://example.com/manifest')?.label).toEqual({
      en: ['Updated Label'],
    });
    expect(getEntity(vault, 'https://example.com/manifest')?.label).toEqual({
      en: ['Test'],
    });
  });

  it('should preserve other properties', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      summary: { en: ['Summary'] },
      items: [],
    };

    const vault = normalizeIIIF(manifest);
    const updated = updateEntity(vault, 'https://example.com/manifest', {
      label: { en: ['Updated'] },
    });

    const entity: any = getEntity(updated, 'https://example.com/manifest');
    expect(entity?.summary).toEqual({ en: ['Summary'] });
  });
});

describe('addEntity', () => {
  it('should add new canvas to manifest', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    const vault = normalizeIIIF(manifest);

    const newCanvas: IIIFCanvas = {
      id: 'https://example.com/canvas/new',
      type: 'Canvas',
      label: { en: ['New Canvas'] },
      width: 1000,
      height: 1000,
    };

    const updated = addEntity(vault, newCanvas, 'https://example.com/manifest');

    expect(getEntity(updated, 'https://example.com/canvas/new')).toBeDefined();
    expect(getChildren(updated, 'https://example.com/manifest')).toContain('https://example.com/canvas/new');
  });

  it('should update references correctly', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    const vault = normalizeIIIF(manifest);

    const newCanvas: IIIFCanvas = {
      id: 'https://example.com/canvas/new',
      type: 'Canvas',
      label: { en: ['New Canvas'] },
      width: 1000,
      height: 1000,
    };

    const updated = addEntity(vault, newCanvas, 'https://example.com/manifest');

    expect(updated.reverseRefs['https://example.com/canvas/new']).toBe('https://example.com/manifest');
  });
});

describe('removeEntity', () => {
  it('should remove entity and update references', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [
        {
          id: 'https://example.com/canvas/1',
          type: 'Canvas',
          label: { en: ['Canvas 1'] },
          width: 1000,
          height: 1000,
        },
      ],
    };

    const vault = normalizeIIIF(manifest);
    const updated = removeEntity(vault, 'https://example.com/canvas/1');

    expect(getEntity(updated, 'https://example.com/canvas/1')).toBeNull();
    expect(getChildren(updated, 'https://example.com/manifest')).not.toContain('https://example.com/canvas/1');
  });
});

// ============================================================================
// Relationship Tests
// ============================================================================

describe('getChildren', () => {
  it('should return child entity IDs', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [
        {
          id: 'https://example.com/canvas/1',
          type: 'Canvas',
          label: { en: ['Canvas 1'] },
          width: 1000,
          height: 1000,
        },
        {
          id: 'https://example.com/canvas/2',
          type: 'Canvas',
          label: { en: ['Canvas 2'] },
          width: 1000,
          height: 1000,
        },
      ],
    };

    const vault = normalizeIIIF(manifest);
    const children = getChildren(vault, 'https://example.com/manifest');

    expect(children).toHaveLength(2);
    expect(children).toContain('https://example.com/canvas/1');
    expect(children).toContain('https://example.com/canvas/2');
  });
});

describe('getParent', () => {
  it('should return parent entity ID', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [
        {
          id: 'https://example.com/canvas/1',
          type: 'Canvas',
          label: { en: ['Canvas 1'] },
          width: 1000,
          height: 1000,
        },
      ],
    };

    const vault = normalizeIIIF(manifest);
    const parent = getParent(vault, 'https://example.com/canvas/1');

    expect(parent).toBe('https://example.com/manifest');
  });

  it('should return null for root entity', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    const vault = normalizeIIIF(manifest);
    const parent = getParent(vault, 'https://example.com/manifest');

    expect(parent).toBeNull();
  });
});

// ============================================================================
// Concurrency Tests
// ============================================================================

/**
 * IMPORTANT: These are IMMUTABILITY tests, not true concurrency tests.
 *
 * updateEntity() is synchronous - it returns a value immediately, not a Promise.
 * Promise.resolve(updateEntity(...)) executes the function BEFORE wrapping the result.
 * This means these operations run SEQUENTIALLY, not concurrently.
 *
 * What these tests actually verify:
 * - Each update creates independent vault state (immutability)
 * - Multiple updates don't interfere with each other
 * - State changes are isolated and predictable
 *
 * True concurrency testing would require:
 * - Async operations with shared mutable state
 * - Race condition simulation
 * - Lock/mutex testing
 * - But vault is immutable by design, so true concurrency issues don't apply
 */
describe('Vault Immutability', () => {

  it('should handle independent updates to different entities', async () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [
        {
          id: 'https://example.com/canvas/1',
          type: 'Canvas',
          label: { en: ['Canvas 1'] },
          width: 1000,
          height: 1000,
        },
        {
          id: 'https://example.com/canvas/2',
          type: 'Canvas',
          label: { en: ['Canvas 2'] },
          width: 1000,
          height: 1000,
        },
      ],
    };

    const vault = normalizeIIIF(manifest);

    // Update different entities independently
    const [result1, result2] = await Promise.all([
      Promise.resolve(updateEntity(vault, 'https://example.com/canvas/1', {
        label: { en: ['Updated Canvas 1'] },
      })),
      Promise.resolve(updateEntity(vault, 'https://example.com/canvas/2', {
        label: { en: ['Updated Canvas 2'] },
      })),
    ]);

    // Both updates should succeed
    const canvas1 = getEntity(result1, 'https://example.com/canvas/1');
    const canvas2 = getEntity(result2, 'https://example.com/canvas/2');

    expect(canvas1?.label).toEqual({ en: ['Updated Canvas 1'] });
    expect(canvas2?.label).toEqual({ en: ['Updated Canvas 2'] });
  });




  it('should not lose data during rapid sequential updates', async () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    let vault = normalizeIIIF(manifest);
    const entityId = 'https://example.com/manifest';

    // Perform 10 rapid updates
    for (let i = 0; i < 10; i++) {
      vault = updateEntity(vault, entityId, {
        label: { en: [`Update ${i}`] },
      });
    }

    // Final state should be accessible
    const entity = getEntity(vault, entityId);
    expect(entity).toBeDefined();
    expect(entity?.label).toEqual({ en: ['Update 9'] });
  });

});
