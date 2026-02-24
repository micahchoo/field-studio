/**
 * StagingCollections — Svelte 5 reactive class for collection CRUD
 *
 * Encapsulates the collection management state extracted from StagingWorkbench.
 * Provides reactive `archiveLayout` derived from the collections array.
 *
 * @module features/staging/model/StagingCollections
 */

import type { ArchiveNode, ArchiveLayout } from '../stores/stagingState.svelte';

export class StagingCollections {
  collections = $state<Array<{ id: string; name: string; manifestIds: string[] }>>([]);

  archiveLayout = $derived.by((): ArchiveLayout => {
    const childNodes: ArchiveNode[] = this.collections.map(c => ({
      id: c.id,
      name: c.name,
      type: 'Collection' as const,
      children: [] as ArchiveNode[],
      manifestIds: c.manifestIds,
    }));

    const root: ArchiveNode = {
      id: 'root',
      name: 'Archive',
      type: 'Collection' as const,
      children: childNodes,
      manifestIds: [],
    };

    const flatIndex = new Map<string, ArchiveNode>();
    flatIndex.set('root', root);
    for (const child of childNodes) flatIndex.set(child.id, child);

    return { root, flatIndex };
  });

  createCollection(name: string): string {
    const id = `col-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.collections = [...this.collections, { id, name, manifestIds: [] }];
    return id;
  }

  addToCollection(collectionId: string, manifestIds: string[]): void {
    this.collections = this.collections.map(c =>
      c.id === collectionId
        ? { ...c, manifestIds: [...new Set([...c.manifestIds, ...manifestIds])] }
        : c
    );
  }

  removeFromCollection(collectionId: string, manifestIds: string[]): void {
    const toRemove = new Set(manifestIds);
    this.collections = this.collections.map(c =>
      c.id === collectionId
        ? { ...c, manifestIds: c.manifestIds.filter(id => !toRemove.has(id)) }
        : c
    );
  }

  renameCollection(id: string, newName: string): void {
    this.collections = this.collections.map(c =>
      c.id === id ? { ...c, name: newName } : c
    );
  }

  deleteCollection(id: string): void {
    this.collections = this.collections.filter(c => c.id !== id);
  }
}
