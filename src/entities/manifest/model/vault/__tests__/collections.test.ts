import { describe, it, expect, beforeEach } from 'vitest';
import { normalize } from '../normalization';
import {
  addToCollection,
  removeFromCollection,
  isOrphanManifest,
  getOrphanManifests,
  getCollectionMembers,
  getCollectionsContaining,
} from '../collections';
import { resetIds, createMinimalCollection, createManifest } from './fixtures';
import type { IIIFItem } from '@/src/shared/types';
import { addEntity } from '../updates';

beforeEach(() => resetIds());

describe('addToCollection', () => {
  it('adds resource to collection with bidirectional indexes', () => {
    const collection = createMinimalCollection();
    const state = normalize(collection);

    // Create a new manifest and add it to the state
    const newManifest = createManifest({ canvasCount: 1 });
    let newState = addEntity(state, newManifest as IIIFItem, collection.id);
    newState = addToCollection(newState, collection.id, newManifest.id);

    expect(getCollectionMembers(newState, collection.id)).toContain(newManifest.id);
    expect(getCollectionsContaining(newState, newManifest.id)).toContain(collection.id);
  });

  it('prevents duplicate membership', () => {
    const collection = createMinimalCollection();
    const state = normalize(collection);
    const manifest1Id = collection.items[0].id;

    const newState = addToCollection(state, collection.id, manifest1Id);
    // Should not duplicate
    const members = getCollectionMembers(newState, collection.id);
    const count = members.filter(id => id === manifest1Id).length;
    expect(count).toBe(1);
  });

  it('returns same state when entity not found', () => {
    const collection = createMinimalCollection();
    const state = normalize(collection);

    const newState = addToCollection(state, collection.id, 'nonexistent');
    expect(newState).toBe(state);
  });
});

describe('removeFromCollection', () => {
  it('removes resource from collection', () => {
    const collection = createMinimalCollection();
    const state = normalize(collection);
    const manifest1Id = collection.items[0].id;

    const newState = removeFromCollection(state, collection.id, manifest1Id);

    expect(getCollectionMembers(newState, collection.id)).not.toContain(manifest1Id);
    expect(getCollectionsContaining(newState, manifest1Id)).not.toContain(collection.id);
  });

  it('preserves other members when removing one', () => {
    const collection = createMinimalCollection();
    const state = normalize(collection);
    const manifest1Id = collection.items[0].id;
    const manifest2Id = collection.items[1].id;

    const newState = removeFromCollection(state, collection.id, manifest1Id);

    expect(getCollectionMembers(newState, collection.id)).toContain(manifest2Id);
  });
});

describe('isOrphanManifest', () => {
  it('returns false for manifest in a collection', () => {
    const collection = createMinimalCollection();
    const state = normalize(collection);
    const manifest1Id = collection.items[0].id;

    expect(isOrphanManifest(state, manifest1Id)).toBe(false);
  });

  it('returns true for manifest removed from all collections', () => {
    const collection = createMinimalCollection();
    const state = normalize(collection);
    const manifest1Id = collection.items[0].id;

    const newState = removeFromCollection(state, collection.id, manifest1Id);
    expect(isOrphanManifest(newState, manifest1Id)).toBe(true);
  });

  it('returns false for non-manifest types', () => {
    const collection = createMinimalCollection();
    const state = normalize(collection);
    expect(isOrphanManifest(state, collection.id)).toBe(false);
  });
});

describe('getOrphanManifests', () => {
  it('returns empty for collection with all members', () => {
    const collection = createMinimalCollection();
    const state = normalize(collection);
    expect(getOrphanManifests(state)).toHaveLength(0);
  });

  it('returns manifests removed from all collections', () => {
    const collection = createMinimalCollection();
    const state = normalize(collection);
    const manifest1Id = collection.items[0].id;

    const newState = removeFromCollection(state, collection.id, manifest1Id);
    const orphans = getOrphanManifests(newState);

    expect(orphans).toHaveLength(1);
    expect(orphans[0].id).toBe(manifest1Id);
  });
});
