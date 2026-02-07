/**
 * Vault Widget (Widget Layer)
 *
 * Stateful wrapper around the normalized state management functions.
 * Provides a convenient API for UI components to interact with IIIF resources.
 *
 * The Vault class maintains internal state and notifies subscribers of changes.
 * This follows the widget pattern - a self-contained unit with state and behavior.
 */

import type { IIIFItem, IIIFManifest, NormalizedState, VaultSnapshot } from '@/src/shared/types';
import { createEmptyState, normalize } from './normalization';
import { denormalize } from './denormalization';
import { getChildIds, getEntitiesByType, getEntity, getParentId } from './queries';
import { addToCollection, getCollectionMembers, getCollectionsContaining, getOrphanManifests, isOrphanManifest, removeFromCollection } from './collections';
import { addEntity, removeEntity, updateEntity } from './updates';
import { emptyTrash, moveEntityToTrash, restoreEntityFromTrash } from './trash';
import { moveEntity, reorderChildren } from './movement';

/**
 * Vault class - Stateful wrapper for IIIF resource management
 *
 * Implements the Digirati Manifest Editor pattern of flat, normalized storage
 * for O(1) entity lookups and efficient updates without full-tree cloning.
 */
export class Vault {
  private state: NormalizedState;
  private listeners: Set<(state: NormalizedState) => void> = new Set();

  constructor(initial?: IIIFItem) {
    this.state = initial ? normalize(initial) : createEmptyState();
  }

  /**
   * Load a new IIIF tree, replacing current state
   */
  load(root: IIIFItem): void {
    this.state = normalize(root);
    this.notify();
  }

  /**
   * Reload the vault from a potentially modified IIIF tree.
   * Use this when the tree has been modified externally (e.g., by healing)
   * and you need to sync the vault's normalized state.
   *
   * This is safer than individual updateEntity calls because it ensures
   * all IDs are properly indexed and the typeIndex is fresh.
   */
  reload(root: IIIFItem): void {
    this.state = normalize(root);
    this.notify();
  }

  /**
   * Check if an entity exists in the vault by ID.
   * Useful for validating that healing hasn't broken ID references.
   */
  has(id: string): boolean {
    const type = this.state.typeIndex[id];
    if (!type) return false;
    return !!this.state.entities[type][id];
  }

  /**
   * Export as nested IIIF tree
   */
  export(): IIIFItem | null {
    return denormalize(this.state);
  }

  /**
   * Get current state (read-only)
   */
  getState(): Readonly<NormalizedState> {
    return this.state;
  }

  /**
   * Get entity by ID - O(1)
   */
  get(id: string): IIIFItem | null {
    return getEntity(this.state, id);
  }

  /**
   * Update entity
   */
  update(id: string, updates: Partial<IIIFItem>): void {
    this.state = updateEntity(this.state, id, updates);
    this.notify();
  }

  /**
   * Add entity to parent
   */
  add(entity: IIIFItem, parentId: string): void {
    this.state = addEntity(this.state, entity, parentId);
    this.notify();
  }

  /**
   * Remove entity (soft delete by default, use permanent: true for hard delete)
   */
  remove(id: string, options?: { permanent?: boolean }): void {
    this.state = removeEntity(this.state, id, options);
    this.notify();
  }

  /**
   * Move entity to trash (soft delete)
   */
  moveToTrash(id: string): void {
    this.state = moveEntityToTrash(this.state, id);
    this.notify();
  }

  /**
   * Restore entity from trash
   */
  restoreFromTrash(id: string, options?: { parentId?: string; index?: number }): void {
    this.state = restoreEntityFromTrash(this.state, id, options);
    this.notify();
  }

  /**
   * Empty trash (permanently delete all trashed entities)
   */
  emptyTrash(): { deletedCount: number; errors: string[] } {
    const result = emptyTrash(this.state);
    this.state = result.state;
    this.notify();
    return { deletedCount: result.deletedCount, errors: result.errors };
  }

  /**
   * Get all trashed entity IDs
   */
  getTrashedIds(): string[] {
    return Object.keys(this.state.trashedEntities);
  }

  /**
   * Get trashed entity metadata
   */
  getTrashedEntity(id: string): import('./types').TrashedEntity | null {
    return this.state.trashedEntities[id] || null;
  }

  /**
   * Check if entity is in trash
   */
  isTrashed(id: string): boolean {
    return id in this.state.trashedEntities;
  }

  /**
   * Move entity
   */
  move(id: string, newParentId: string, index?: number): void {
    this.state = moveEntity(this.state, id, newParentId, index);
    this.notify();
  }

  /**
   * Get parent ID
   */
  getParent(id: string): string | null {
    return getParentId(this.state, id);
  }

  /**
   * Get child IDs
   */
  getChildren(id: string): string[] {
    return getChildIds(this.state, id);
  }

  // ============================================================================
  // Collection Membership (Non-hierarchical, many-to-many)
  // ============================================================================

  /**
   * Get all Collections that contain a resource
   */
  getCollectionsContaining(resourceId: string): string[] {
    return getCollectionsContaining(this.state, resourceId);
  }

  /**
   * Get all members of a Collection
   */
  getCollectionMembers(collectionId: string): string[] {
    return getCollectionMembers(this.state, collectionId);
  }

  /**
   * Check if a Manifest is standalone (not in any Collection)
   */
  isOrphanManifest(manifestId: string): boolean {
    return isOrphanManifest(this.state, manifestId);
  }

  /**
   * Get all standalone Manifests
   */
  getOrphanManifests(): IIIFManifest[] {
    return getOrphanManifests(this.state);
  }

  /**
   * Add a resource to a Collection (reference, not ownership)
   */
  addToCollection(collectionId: string, resourceId: string): void {
    this.state = addToCollection(this.state, collectionId, resourceId);
    this.notify();
  }

  /**
   * Remove a resource from a Collection (removes reference only)
   */
  removeFromCollection(collectionId: string, resourceId: string): void {
    this.state = removeFromCollection(this.state, collectionId, resourceId);
    this.notify();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: NormalizedState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  /**
   * Create snapshot for undo/redo
   */
  snapshot(): VaultSnapshot {
    return {
      state: this.state, // Immutable, safe to share
      timestamp: Date.now()
    };
  }

  /**
   * Restore from snapshot
   */
  restore(snapshot: VaultSnapshot): void {
    this.state = snapshot.state;
    this.notify();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let vaultInstance: Vault | null = null;

/**
 * Get the singleton vault instance
 */
export function getVault(): Vault {
  if (!vaultInstance) {
    vaultInstance = new Vault();
  }
  return vaultInstance;
}

/**
 * Reset the singleton vault instance (useful for testing)
 */
export function resetVault(): void {
  vaultInstance = null;
}
