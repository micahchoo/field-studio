/**
 * Comprehensive Vault class tests — built from the ground up.
 * Tests the stateful Vault wrapper independently from the pure functions.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Vault, getVault, resetVault } from '../vault';
import type { IIIFItem, IIIFManifest, IIIFCollection } from '@/src/shared/types';
import {
  resetIds,
  createMinimalManifest,
  createMinimalCollection,
  createManifest,
  createFullTree,
} from './fixtures';

beforeEach(() => {
  resetIds();
  resetVault();
});

// ============================================================================
// Constructor
// ============================================================================

describe('Vault constructor', () => {
  it('creates empty vault with no arguments', () => {
    const vault = new Vault();
    expect(vault.getState().rootId).toBeNull();
    expect(vault.export()).toBeNull();
  });

  it('creates vault from initial IIIF tree', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);
    expect(vault.getState().rootId).toBe(manifest.id);
  });

  it('normalizes initial tree on construction', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);
    const state = vault.getState();

    expect(Object.keys(state.entities.Manifest)).toHaveLength(1);
    expect(Object.keys(state.entities.Canvas)).toHaveLength(1);
    expect(Object.keys(state.entities.AnnotationPage)).toHaveLength(1);
    expect(Object.keys(state.entities.Annotation)).toHaveLength(1);
  });
});

// ============================================================================
// Load / Reload
// ============================================================================

describe('Vault.load()', () => {
  it('replaces current state with new tree', () => {
    const vault = new Vault();
    const manifest = createMinimalManifest();

    vault.load(manifest);

    expect(vault.getState().rootId).toBe(manifest.id);
    expect(vault.get(manifest.id)).not.toBeNull();
  });

  it('clears previous state on load', () => {
    const manifest1 = createMinimalManifest();
    const vault = new Vault(manifest1);
    const canvas1Id = manifest1.items[0].id;

    // Don't reset IDs — second manifest gets different IDs so we can verify old ones are gone
    const manifest2 = createMinimalManifest();
    vault.load(manifest2);

    // Old entity should not be accessible (different canvas ID)
    expect(vault.get(canvas1Id)).toBeNull();
    // New entity should be accessible
    expect(vault.get(manifest2.id)).not.toBeNull();
  });

  it('notifies subscribers', () => {
    const vault = new Vault();
    const states: any[] = [];
    vault.subscribe((s) => states.push(s));

    const manifest = createMinimalManifest();
    vault.load(manifest);

    expect(states).toHaveLength(1);
    expect(states[0].rootId).toBe(manifest.id);
  });
});

describe('Vault.reload()', () => {
  it('re-normalizes from modified tree', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);

    // Simulate external modification
    manifest.label = { en: ['Modified Label'] };
    vault.reload(manifest);

    const entity = vault.get(manifest.id);
    expect(entity!.label).toEqual({ en: ['Modified Label'] });
  });
});

// ============================================================================
// Get / Has
// ============================================================================

describe('Vault.get()', () => {
  it('returns entity by ID', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);

    const result = vault.get(manifest.id);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('Manifest');
  });

  it('returns null for nonexistent entity', () => {
    const vault = new Vault();
    expect(vault.get('nonexistent')).toBeNull();
  });

  it('returns canvas by ID', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);
    const canvasId = manifest.items[0].id;

    const canvas = vault.get(canvasId);
    expect(canvas).not.toBeNull();
    expect(canvas!.type).toBe('Canvas');
  });
});

describe('Vault.has()', () => {
  it('returns true for existing entity', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);
    expect(vault.has(manifest.id)).toBe(true);
  });

  it('returns false for nonexistent entity', () => {
    const vault = new Vault();
    expect(vault.has('nonexistent')).toBe(false);
  });
});

// ============================================================================
// Update
// ============================================================================

describe('Vault.update()', () => {
  it('updates entity properties', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);

    vault.update(manifest.id, { label: { en: ['New Label'] } });

    const updated = vault.get(manifest.id);
    expect(updated!.label).toEqual({ en: ['New Label'] });
  });

  it('preserves unmodified properties', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);
    const originalType = vault.get(manifest.id)!.type;

    vault.update(manifest.id, { label: { en: ['New Label'] } });

    expect(vault.get(manifest.id)!.type).toBe(originalType);
  });

  it('notifies subscribers on update', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);
    let notified = false;
    vault.subscribe(() => { notified = true; });

    vault.update(manifest.id, { label: { en: ['Changed'] } });

    expect(notified).toBe(true);
  });

  it('multiple rapid updates accumulate correctly', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);

    vault.update(manifest.id, { label: { en: ['First'] } });
    vault.update(manifest.id, { summary: { en: ['A summary'] } });

    const result = vault.get(manifest.id)!;
    expect(result.label).toEqual({ en: ['First'] });
    expect(result.summary).toEqual({ en: ['A summary'] });
  });
});

// ============================================================================
// Add / Remove
// ============================================================================

describe('Vault.add()', () => {
  it('adds new entity as child', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);

    const newCanvas: IIIFItem = {
      id: 'https://example.org/canvas/added',
      type: 'Canvas',
      width: 600,
      height: 400,
      items: [],
    } as unknown as IIIFItem;

    vault.add(newCanvas, manifest.id);

    expect(vault.has(newCanvas.id)).toBe(true);
    expect(vault.getChildren(manifest.id)).toContain(newCanvas.id);
    expect(vault.getParent(newCanvas.id)).toBe(manifest.id);
  });
});

describe('Vault.remove()', () => {
  it('soft-deletes by default', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);
    const canvasId = manifest.items[0].id;

    vault.remove(canvasId);

    expect(vault.has(canvasId)).toBe(false);
    expect(vault.isTrashed(canvasId)).toBe(true);
  });

  it('permanently deletes with permanent: true', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);
    const canvasId = manifest.items[0].id;

    vault.remove(canvasId, { permanent: true });

    expect(vault.has(canvasId)).toBe(false);
    expect(vault.isTrashed(canvasId)).toBe(false);
  });
});

// ============================================================================
// Trash / Restore / EmptyTrash
// ============================================================================

describe('Vault trash operations', () => {
  it('moveToTrash → isTrashed → restoreFromTrash cycle', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);
    const canvasId = manifest.items[0].id;

    vault.moveToTrash(canvasId);
    expect(vault.isTrashed(canvasId)).toBe(true);
    expect(vault.has(canvasId)).toBe(false);
    expect(vault.getTrashedIds()).toContain(canvasId);

    vault.restoreFromTrash(canvasId);
    expect(vault.isTrashed(canvasId)).toBe(false);
    expect(vault.has(canvasId)).toBe(true);
  });

  it('getTrashedEntity returns metadata', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);
    const canvasId = manifest.items[0].id;

    vault.moveToTrash(canvasId);
    const trashed = vault.getTrashedEntity(canvasId);

    expect(trashed).not.toBeNull();
    expect(trashed!.entity.id).toBe(canvasId);
    expect(trashed!.originalParentId).toBe(manifest.id);
  });

  it('emptyTrash clears all trashed entities', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);
    const canvasId = manifest.items[0].id;

    vault.moveToTrash(canvasId);
    const result = vault.emptyTrash();

    expect(result.deletedCount).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
    expect(vault.getTrashedIds()).toHaveLength(0);
  });
});

// ============================================================================
// Move / Parent / Children
// ============================================================================

describe('Vault.move()', () => {
  it('moves entity between parents', () => {
    const manifest = createManifest({ canvasCount: 2 });
    const vault = new Vault(manifest);
    const canvas1 = manifest.items[0].id;
    const _canvas2 = manifest.items[1].id;

    // We need a second parent. Add another manifest as child.
    const manifest2 = createManifest({ canvasCount: 0 });
    vault.add(manifest2 as IIIFItem, manifest.id);

    vault.move(canvas1, manifest2.id);

    expect(vault.getParent(canvas1)).toBe(manifest2.id);
    expect(vault.getChildren(manifest.id)).not.toContain(canvas1);
    expect(vault.getChildren(manifest2.id)).toContain(canvas1);
  });
});

// ============================================================================
// Collections
// ============================================================================

describe('Vault collection operations', () => {
  it('addToCollection creates bidirectional membership', () => {
    const collection = createMinimalCollection();
    const vault = new Vault(collection);
    const manifest3 = createManifest({ canvasCount: 0 });

    // Add manifest3 to state first
    vault.add(manifest3 as IIIFItem, collection.id);
    vault.addToCollection(collection.id, manifest3.id);

    expect(vault.getCollectionMembers(collection.id)).toContain(manifest3.id);
    expect(vault.getCollectionsContaining(manifest3.id)).toContain(collection.id);
  });

  it('removeFromCollection removes membership', () => {
    const collection = createMinimalCollection();
    const vault = new Vault(collection);
    const manifest1Id = collection.items[0].id;

    vault.removeFromCollection(collection.id, manifest1Id);

    expect(vault.getCollectionMembers(collection.id)).not.toContain(manifest1Id);
  });

  it('isOrphanManifest detects orphans', () => {
    const collection = createMinimalCollection();
    const vault = new Vault(collection);
    const manifest1Id = collection.items[0].id;

    expect(vault.isOrphanManifest(manifest1Id)).toBe(false);

    vault.removeFromCollection(collection.id, manifest1Id);
    expect(vault.isOrphanManifest(manifest1Id)).toBe(true);
  });

  it('getOrphanManifests returns all orphans', () => {
    const collection = createMinimalCollection();
    const vault = new Vault(collection);
    const manifest1Id = collection.items[0].id;

    vault.removeFromCollection(collection.id, manifest1Id);
    const orphans = vault.getOrphanManifests();

    expect(orphans).toHaveLength(1);
    expect(orphans[0].id).toBe(manifest1Id);
  });
});

// ============================================================================
// Export
// ============================================================================

describe('Vault.export()', () => {
  it('returns null for empty vault', () => {
    const vault = new Vault();
    expect(vault.export()).toBeNull();
  });

  it('reconstructs full IIIF tree', () => {
    const original = createFullTree();
    const vault = new Vault(original);
    const exported = vault.export() as IIIFCollection;

    expect(exported.type).toBe('Collection');
    expect(exported.items).toHaveLength(2);
    const manifest = exported.items[0] as IIIFManifest;
    expect(manifest.items).toHaveLength(3);
  });

  it('reflects mutations in export', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);

    vault.update(manifest.id, { label: { en: ['Exported Label'] } });
    const exported = vault.export() as IIIFManifest;

    expect(exported.label).toEqual({ en: ['Exported Label'] });
  });
});

// ============================================================================
// Subscribe
// ============================================================================

describe('Vault.subscribe()', () => {
  it('notifies on load', () => {
    const vault = new Vault();
    const calls: number[] = [];
    vault.subscribe(() => calls.push(1));

    vault.load(createMinimalManifest());
    expect(calls).toHaveLength(1);
  });

  it('notifies on update', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);
    let count = 0;
    vault.subscribe(() => count++);

    vault.update(manifest.id, { label: { en: ['Changed'] } });
    expect(count).toBe(1);
  });

  it('unsubscribe stops notifications', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);
    let count = 0;
    const unsub = vault.subscribe(() => count++);

    vault.update(manifest.id, { label: { en: ['1'] } });
    expect(count).toBe(1);

    unsub();
    vault.update(manifest.id, { label: { en: ['2'] } });
    expect(count).toBe(1); // No additional notification
  });

  it('multiple subscribers all receive notifications', () => {
    const vault = new Vault();
    const results: string[] = [];
    vault.subscribe(() => results.push('a'));
    vault.subscribe(() => results.push('b'));

    vault.load(createMinimalManifest());
    expect(results).toEqual(['a', 'b']);
  });
});

// ============================================================================
// Snapshot / Restore
// ============================================================================

describe('Vault snapshot/restore', () => {
  it('snapshot captures current state', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);
    const snap = vault.snapshot();

    expect(snap.state.rootId).toBe(manifest.id);
    expect(snap.timestamp).toBeGreaterThan(0);
  });

  it('restore rolls back to snapshot', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);

    const snap = vault.snapshot();
    vault.update(manifest.id, { label: { en: ['Modified'] } });

    vault.restore(snap);
    expect(vault.get(manifest.id)!.label).toEqual({ en: ['Test Manifest'] });
  });

  it('restore notifies subscribers', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);
    const snap = vault.snapshot();
    let notified = false;
    vault.subscribe(() => { notified = true; });

    vault.restore(snap);
    expect(notified).toBe(true);
  });
});

// ============================================================================
// Singleton
// ============================================================================

describe('getVault / resetVault', () => {
  it('getVault returns same instance', () => {
    const a = getVault();
    const b = getVault();
    expect(a).toBe(b);
  });

  it('resetVault creates new instance', () => {
    const a = getVault();
    resetVault();
    const b = getVault();
    expect(a).not.toBe(b);
  });
});
