/**
 * Vault Reactive Module Tests
 *
 * Validates the Svelte 5 reactive module (.svelte.ts) wrapping the Vault class.
 * Uses direct property access (vault.state, vault.rootId) instead of
 * get() from svelte/store — the reactive module is class-based.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { vault } from '@/src/shared/stores/vault.svelte';
import type { IIIFItem, IIIFCollection } from '@/src/shared/types';
import { resetIds, createMinimalManifest, createMinimalCollection, createFullTree } from './fixtures';

beforeEach(() => {
  resetIds();
  // Reset by loading an empty manifest
  const emptyManifest = createMinimalManifest();
  vault.load(emptyManifest);
});

// ============================================================================
// Reactive state reads
// ============================================================================

describe('vault.state (reactive)', () => {
  it('reflects loaded state', () => {
    const manifest = createMinimalManifest();
    vault.load(manifest);

    expect(vault.state.rootId).toBe(manifest.id);
    expect(Object.keys(vault.state.entities.Manifest)).toHaveLength(1);
  });

  it('updates on vault mutations', () => {
    const manifest = createMinimalManifest();
    vault.load(manifest);

    vault.update(manifest.id, { label: { en: ['Reactive Update'] } });

    const entity = vault.state.entities.Manifest[manifest.id];
    expect(entity.label).toEqual({ en: ['Reactive Update'] });
  });
});

// ============================================================================
// vault.rootId
// ============================================================================

describe('vault.rootId', () => {
  it('returns root entity ID', () => {
    const manifest = createMinimalManifest();
    vault.load(manifest);

    expect(vault.rootId).toBe(manifest.id);
  });

  it('updates when new tree is loaded', () => {
    const manifest1 = createMinimalManifest();
    vault.load(manifest1);
    expect(vault.rootId).toBe(manifest1.id);

    resetIds();
    const manifest2 = createMinimalManifest();
    vault.load(manifest2);
    expect(vault.rootId).toBe(manifest2.id);
  });
});

// ============================================================================
// vault.trashedCount
// ============================================================================

describe('vault.trashedCount', () => {
  it('starts at 0', () => {
    const manifest = createMinimalManifest();
    vault.load(manifest);
    expect(vault.trashedCount).toBe(0);
  });

  it('increments when entity is trashed', () => {
    const manifest = createMinimalManifest();
    vault.load(manifest);
    const canvasId = manifest.items[0].id;

    vault.moveToTrash(canvasId);
    expect(vault.trashedCount).toBe(1);
  });

  it('decrements when entity is restored', () => {
    const manifest = createMinimalManifest();
    vault.load(manifest);
    const canvasId = manifest.items[0].id;

    vault.moveToTrash(canvasId);
    expect(vault.trashedCount).toBe(1);

    vault.restoreFromTrash(canvasId);
    expect(vault.trashedCount).toBe(0);
  });
});

// ============================================================================
// vault.getEntity() — reactive entity accessor
// ============================================================================

describe('vault.getEntity()', () => {
  it('returns entity data for valid ID', () => {
    const manifest = createMinimalManifest();
    vault.load(manifest);

    const entity = vault.getEntity(manifest.id);
    expect(entity).not.toBeNull();
    expect(entity!.id).toBe(manifest.id);
    expect(entity!.type).toBe('Manifest');
  });

  it('returns null for nonexistent ID', () => {
    const manifest = createMinimalManifest();
    vault.load(manifest);

    expect(vault.getEntity('nonexistent')).toBeNull();
  });

  it('reflects updates after mutation', () => {
    const manifest = createMinimalManifest();
    vault.load(manifest);

    vault.update(manifest.id, { label: { en: ['Updated via store'] } });

    expect(vault.getEntity(manifest.id)!.label).toEqual({ en: ['Updated via store'] });
  });

  it('returns null when entity is trashed', () => {
    const manifest = createMinimalManifest();
    vault.load(manifest);
    const canvasId = manifest.items[0].id;

    expect(vault.getEntity(canvasId)).not.toBeNull();

    vault.moveToTrash(canvasId);
    expect(vault.getEntity(canvasId)).toBeNull();
  });

  it('returns entity again after restore', () => {
    const manifest = createMinimalManifest();
    vault.load(manifest);
    const canvasId = manifest.items[0].id;

    vault.moveToTrash(canvasId);
    expect(vault.getEntity(canvasId)).toBeNull();

    vault.restoreFromTrash(canvasId);
    expect(vault.getEntity(canvasId)).not.toBeNull();
    expect(vault.getEntity(canvasId)!.id).toBe(canvasId);
  });
});

// ============================================================================
// vault.getChildIds() — reactive children accessor
// ============================================================================

describe('vault.getChildIds()', () => {
  it('returns child IDs', () => {
    const manifest = createMinimalManifest();
    vault.load(manifest);

    const children = vault.getChildIds(manifest.id);
    expect(children).toHaveLength(1);
    expect(children[0]).toBe(manifest.items[0].id);
  });

  it('reflects new children after add', () => {
    const manifest = createMinimalManifest();
    vault.load(manifest);

    expect(vault.getChildIds(manifest.id)).toHaveLength(1);

    const newCanvas: IIIFItem = {
      id: 'https://example.org/canvas/dynamic',
      type: 'Canvas',
      width: 100,
      height: 100,
      items: [],
    } as unknown as IIIFItem;
    vault.add(newCanvas, manifest.id);

    expect(vault.getChildIds(manifest.id)).toHaveLength(2);
  });
});

// ============================================================================
// Non-reactive peek API (one-shot reads, no tracking)
// ============================================================================

describe('vault peek API (non-reactive)', () => {
  it('peekEntity() works synchronously', () => {
    const manifest = createMinimalManifest();
    vault.load(manifest);

    const result = vault.peekEntity(manifest.id);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(manifest.id);
  });

  it('peekHas() checks existence', () => {
    const manifest = createMinimalManifest();
    vault.load(manifest);

    expect(vault.peekHas(manifest.id)).toBe(true);
    expect(vault.peekHas('nonexistent')).toBe(false);
  });

  it('peekState() returns current state snapshot', () => {
    const manifest = createMinimalManifest();
    vault.load(manifest);

    const snap = vault.peekState();
    expect(snap.rootId).toBe(manifest.id);
    expect(snap.entities.Manifest[manifest.id]).toBeDefined();
  });

  it('export() returns IIIF tree', () => {
    const tree = createFullTree();
    vault.load(tree);

    const exported = vault.export() as IIIFCollection;
    expect(exported.type).toBe('Collection');
    expect(exported.items).toHaveLength(2);
  });

  it('peekChildren() returns child IDs', () => {
    const manifest = createMinimalManifest();
    vault.load(manifest);

    const children = vault.peekChildren(manifest.id);
    expect(children).toHaveLength(1);
  });

  it('peekParent() returns parent ID', () => {
    const manifest = createMinimalManifest();
    vault.load(manifest);
    const canvasId = manifest.items[0].id;

    expect(vault.peekParent(canvasId)).toBe(manifest.id);
    expect(vault.peekParent(manifest.id)).toBeNull();
  });

  it('snapshot() and restore() work', () => {
    const manifest = createMinimalManifest();
    vault.load(manifest);

    const snap = vault.snapshot();
    vault.update(manifest.id, { label: { en: ['Changed'] } });

    vault.restore(snap);
    expect(vault.peekEntity(manifest.id)!.label).toEqual({ en: ['Test Manifest'] });
  });
});
