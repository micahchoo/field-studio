/**
 * Trash Service - Comprehensive Trash/Restore System
 *
 * Provides soft deletion, restoration, and management of trashed IIIF entities.
 * Features:
 * - Soft delete with full data preservation
 * - Restore with parent-child relationship recovery
 * - Auto-cleanup (30-day retention)
 * - Trash size limits
 * - Bulk operations
 * - Provenance integration for audit trail
 *
 * @see Phase 2: Trash/Restore System (P0 - Data Safety)
 */

import {
  NormalizedState,
  TrashedEntity,
  moveEntityToTrash,
  restoreEntityFromTrash,
  emptyTrash,
  getEntity,
  getDescendants
} from './vault';
import { provenanceService, PropertyChange } from './provenanceService';
import { USE_TRASH_SYSTEM, USE_TRASH_AUTO_CLEANUP, USE_TRASH_SIZE_LIMITS } from '../constants/features';
import { IIIFItem, ResourceState } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Trash operation options
 */
export interface TrashOptions {
  /** Skip provenance recording */
  skipProvenance?: boolean;
  /** Custom retention period in days (overrides default) */
  retentionDays?: number;
  /** Reason for deletion (for audit trail) */
  reason?: string;
}

/**
 * Restore operation options
 */
export interface RestoreOptions {
  /** Optional new parent ID for restoration */
  parentId?: string;
  /** Optional index for positioning in parent */
  index?: number;
  /** Skip provenance recording */
  skipProvenance?: boolean;
  /** Reason for restoration (for audit trail) */
  reason?: string;
}

/**
 * Trash statistics
 */
export interface TrashStats {
  /** Total number of trashed items */
  itemCount: number;
  /** Estimated total size in bytes */
  totalSize: number;
  /** Oldest trashed item timestamp */
  oldestItem: number | null;
  /** Newest trashed item timestamp */
  newestItem: number | null;
  /** Items by entity type */
  itemsByType: Record<string, number>;
  /** Items approaching expiration (within 7 days) */
  expiringSoon: number;
}

/**
 * Trash operation result
 */
export interface TrashOperationResult {
  success: boolean;
  /** Entity ID affected */
  entityId?: string;
  /** Updated state */
  state?: NormalizedState;
  /** Error message if failed */
  error?: string;
  /** Provenance entry ID if recorded */
  provenanceId?: string;
}

/**
 * Batch trash operation result
 */
export interface BatchTrashResult {
  success: boolean;
  /** Number of items successfully processed */
  processedCount: number;
  /** Number of items failed */
  failedCount: number;
  /** Individual operation results */
  results: TrashOperationResult[];
  /** Updated state */
  state?: NormalizedState;
  /** Combined error messages */
  errors: string[];
}

/**
 * Trash configuration
 */
export interface TrashConfig {
  /** Retention period in days (default: 30) */
  retentionDays: number;
  /** Maximum trash size in bytes (default: 1GB) */
  maxSizeBytes: number;
  /** Maximum number of items in trash (default: 1000) */
  maxItemCount: number;
  /** Enable auto-cleanup on access */
  autoCleanup: boolean;
  /** Enable size limit enforcement */
  enforceSizeLimits: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_TRASH_CONFIG: TrashConfig = {
  retentionDays: 30,
  maxSizeBytes: 1024 * 1024 * 1024, // 1GB
  maxItemCount: 1000,
  autoCleanup: USE_TRASH_AUTO_CLEANUP,
  enforceSizeLimits: USE_TRASH_SIZE_LIMITS
};

// ============================================================================
// Trash Service Class
// ============================================================================

class TrashService {
  private config: TrashConfig = { ...DEFAULT_TRASH_CONFIG };

  /**
   * Configure trash service
   */
  configure(config: Partial<TrashConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): TrashConfig {
    return { ...this.config };
  }

  // ============================================================================
  // Core Operations
  // ============================================================================

  /**
   * Move an entity to trash (soft delete)
   *
   * @param state - Current normalized state
   * @param entityId - Entity ID to move to trash
   * @param options - Operation options
   * @returns Operation result with updated state
   */
  moveToTrash(
    state: NormalizedState,
    entityId: string,
    options: TrashOptions = {}
  ): TrashOperationResult {
    // Check if trash system is enabled
    if (!USE_TRASH_SYSTEM) {
      return {
        success: false,
        entityId,
        error: 'Trash system is disabled'
      };
    }

    // Check if entity exists
    const entity = getEntity(state, entityId);
    if (!entity) {
      return {
        success: false,
        entityId,
        error: `Entity not found: ${entityId}`
      };
    }

    // Check if already trashed
    if (state.trashedEntities[entityId]) {
      return {
        success: false,
        entityId,
        error: `Entity ${entityId} is already in trash`
      };
    }

    // Check size limits before adding
    if (this.config.enforceSizeLimits) {
      const stats = this.getTrashStats(state);
      if (stats.itemCount >= this.config.maxItemCount) {
        return {
          success: false,
          entityId,
          error: `Trash item limit (${this.config.maxItemCount}) reached`
        };
      }
    }

    try {
      // Perform the move to trash
      const newState = moveEntityToTrash(state, entityId);

      // Record provenance if enabled
      let provenanceId: string | undefined;
      if (!options.skipProvenance) {
        const changes: PropertyChange[] = [{
          property: '_state',
          oldValue: entity._state,
          newValue: 'trashed' as ResourceState
        }];
        const entry = provenanceService.recordUpdate(entityId, changes, options.reason || 'moved-to-trash');
        provenanceId = entry?.id;
      }

      return {
        success: true,
        entityId,
        state: newState,
        provenanceId
      };
    } catch (e) {
      return {
        success: false,
        entityId,
        error: e instanceof Error ? e.message : 'Failed to move entity to trash'
      };
    }
  }

  /**
   * Restore an entity from trash
   *
   * @param state - Current normalized state
   * @param entityId - Entity ID to restore
   * @param options - Restore options
   * @returns Operation result with updated state
   */
  restoreFromTrash(
    state: NormalizedState,
    entityId: string,
    options: RestoreOptions = {}
  ): TrashOperationResult {
    // Check if trash system is enabled
    if (!USE_TRASH_SYSTEM) {
      return {
        success: false,
        entityId,
        error: 'Trash system is disabled'
      };
    }

    // Check if entity is in trash
    const trashed = state.trashedEntities[entityId];
    if (!trashed) {
      return {
        success: false,
        entityId,
        error: `Entity ${entityId} not found in trash`
      };
    }

    try {
      // Validate parent if specified
      if (options.parentId) {
        const parent = getEntity(state, options.parentId);
        if (!parent) {
          return {
            success: false,
            entityId,
            error: `Parent entity ${options.parentId} not found`
          };
        }
      }

      // Perform the restore
      const newState = restoreEntityFromTrash(state, entityId, {
        parentId: options.parentId,
        index: options.index
      });

      // Record provenance if enabled
      let provenanceId: string | undefined;
      if (!options.skipProvenance) {
        const changes: PropertyChange[] = [{
          property: '_state',
          oldValue: 'trashed' as ResourceState,
          newValue: undefined
        }];
        const entry = provenanceService.recordUpdate(entityId, changes, options.reason || 'restored-from-trash');
        provenanceId = entry?.id;
      }

      return {
        success: true,
        entityId,
        state: newState,
        provenanceId
      };
    } catch (e) {
      return {
        success: false,
        entityId,
        error: e instanceof Error ? e.message : 'Failed to restore entity from trash'
      };
    }
  }

  /**
   * Permanently delete all entities in trash
   *
   * @param state - Current normalized state
   * @returns Result with deleted count and any errors
   */
  emptyTrash(state: NormalizedState): { state: NormalizedState; deletedCount: number; errors: string[] } {
    const errors: string[] = [];

    if (!USE_TRASH_SYSTEM) {
      return { state, deletedCount: 0, errors: ['Trash system is disabled'] };
    }

    // Record provenance for bulk deletion
    const trashedIds = Object.keys(state.trashedEntities);
    if (trashedIds.length > 0) {
      provenanceService.recordBatchUpdate(
        trashedIds,
        [{ property: '_state', oldValue: 'trashed', newValue: 'deleted' }],
        'empty-trash'
      );
    }

    const result = emptyTrash(state);

    return {
      state: result.state,
      deletedCount: result.deletedCount,
      errors: [...errors, ...result.errors]
    };
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Move multiple entities to trash
   *
   * @param state - Current normalized state
   * @param entityIds - Entity IDs to move to trash
   * @param options - Operation options
   * @returns Batch operation result
   */
  batchMoveToTrash(
    state: NormalizedState,
    entityIds: string[],
    options: TrashOptions = {}
  ): BatchTrashResult {
    const results: TrashOperationResult[] = [];
    let currentState = state;
    let processedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const entityId of entityIds) {
      const result = this.moveToTrash(currentState, entityId, {
        ...options,
        skipProvenance: true // Record batch provenance at end
      });

      results.push(result);

      if (result.success) {
        processedCount++;
        if (result.state) {
          currentState = result.state;
        }
      } else {
        failedCount++;
        if (result.error) {
          errors.push(`${entityId}: ${result.error}`);
        }
      }
    }

    // Record batch provenance
    if (processedCount > 0 && !options.skipProvenance) {
      provenanceService.recordBatchUpdate(
        entityIds.filter((_, i) => results[i].success),
        [{ property: '_state', oldValue: null, newValue: 'trashed' }],
        options.reason || 'batch-move-to-trash'
      );
    }

    return {
      success: failedCount === 0,
      processedCount,
      failedCount,
      results,
      state: currentState,
      errors
    };
  }

  /**
   * Restore multiple entities from trash
   *
   * @param state - Current normalized state
   * @param entityIds - Entity IDs to restore
   * @param options - Restore options
   * @returns Batch operation result
   */
  batchRestore(
    state: NormalizedState,
    entityIds: string[],
    options: RestoreOptions = {}
  ): BatchTrashResult {
    const results: TrashOperationResult[] = [];
    let currentState = state;
    let processedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const entityId of entityIds) {
      const result = this.restoreFromTrash(currentState, entityId, {
        ...options,
        skipProvenance: true // Record batch provenance at end
      });

      results.push(result);

      if (result.success) {
        processedCount++;
        if (result.state) {
          currentState = result.state;
        }
      } else {
        failedCount++;
        if (result.error) {
          errors.push(`${entityId}: ${result.error}`);
        }
      }
    }

    // Record batch provenance
    if (processedCount > 0 && !options.skipProvenance) {
      provenanceService.recordBatchUpdate(
        entityIds.filter((_, i) => results[i].success),
        [{ property: '_state', oldValue: 'trashed', newValue: null }],
        options.reason || 'batch-restore-from-trash'
      );
    }

    return {
      success: failedCount === 0,
      processedCount,
      failedCount,
      results,
      state: currentState,
      errors
    };
  }

  // ============================================================================
  // Query Operations
  // ============================================================================

  /**
   * Get all trashed entity IDs
   */
  getTrashedIds(state: NormalizedState): string[] {
    return Object.keys(state.trashedEntities || {});
  }

  /**
   * Get trashed entity metadata
   */
  getTrashedEntity(state: NormalizedState, entityId: string): TrashedEntity | null {
    return state.trashedEntities?.[entityId] || null;
  }

  /**
   * Get all trashed entities
   */
  getAllTrashed(state: NormalizedState): Array<{ id: string; entity: TrashedEntity }> {
    return Object.entries(state.trashedEntities || {}).map(([id, entity]) => ({
      id,
      entity
    }));
  }

  /**
   * Check if entity is in trash
   */
  isTrashed(state: NormalizedState, entityId: string): boolean {
    return entityId in (state.trashedEntities || {});
  }

  /**
   * Get trash statistics
   */
  getTrashStats(state: NormalizedState): TrashStats {
    const trashedEntities = state.trashedEntities || {};
    const entries = Object.entries(trashedEntities);

    let totalSize = 0;
    let oldestItem: number | null = null;
    let newestItem: number | null = null;
    const itemsByType: Record<string, number> = {};
    let expiringSoon = 0;

    const now = Date.now();
    const expirationThreshold = now - (this.config.retentionDays - 7) * 24 * 60 * 60 * 1000;

    for (const [id, trashed] of entries) {
      // Estimate size (rough approximation)
      totalSize += this.estimateEntitySize(trashed.entity);

      // Track timestamps
      if (!oldestItem || trashed.trashedAt < oldestItem) {
        oldestItem = trashed.trashedAt;
      }
      if (!newestItem || trashed.trashedAt > newestItem) {
        newestItem = trashed.trashedAt;
      }

      // Count by type
      const type = trashed.entity.type;
      itemsByType[type] = (itemsByType[type] || 0) + 1;

      // Check expiration
      if (trashed.trashedAt < expirationThreshold) {
        expiringSoon++;
      }
    }

    return {
      itemCount: entries.length,
      totalSize,
      oldestItem,
      newestItem,
      itemsByType,
      expiringSoon
    };
  }

  /**
   * Get trashed items sorted by trash date (newest first)
   */
  getTrashedSorted(state: NormalizedState): Array<{ id: string; entity: TrashedEntity }> {
    return this.getAllTrashed(state).sort((a, b) => b.entity.trashedAt - a.entity.trashedAt);
  }

  /**
   * Get trashed items that are expiring soon (within 7 days)
   */
  getExpiringSoon(state: NormalizedState): Array<{ id: string; entity: TrashedEntity }> {
    const now = Date.now();
    const expirationThreshold = now - (this.config.retentionDays - 7) * 24 * 60 * 60 * 1000;

    return this.getAllTrashed(state).filter(
      ({ entity }) => entity.trashedAt < expirationThreshold
    );
  }

  // ============================================================================
  // Auto-Cleanup
  // ============================================================================

  /**
   * Auto-cleanup expired trash items
   *
   * @param state - Current normalized state
   * @returns Updated state and cleanup results
   */
  autoCleanup(state: NormalizedState): {
    state: NormalizedState;
    deletedCount: number;
    deletedIds: string[];
  } {
    if (!USE_TRASH_AUTO_CLEANUP || !this.config.autoCleanup) {
      return { state, deletedCount: 0, deletedIds: [] };
    }

    const now = Date.now();
    const expirationTime = now - this.config.retentionDays * 24 * 60 * 60 * 1000;

    const expiredIds = this.getAllTrashed(state)
      .filter(({ entity }) => entity.trashedAt < expirationTime)
      .map(({ id }) => id);

    if (expiredIds.length === 0) {
      return { state, deletedCount: 0, deletedIds: [] };
    }

    // Permanently delete expired items
    let currentState = state;
    for (const id of expiredIds) {
      const result = emptyTrash(currentState);
      currentState = result.state;
    }

    return {
      state: currentState,
      deletedCount: expiredIds.length,
      deletedIds: expiredIds
    };
  }

  /**
   * Check if trash needs cleanup
   */
  needsCleanup(state: NormalizedState): boolean {
    if (!USE_TRASH_AUTO_CLEANUP || !this.config.autoCleanup) {
      return false;
    }

    const stats = this.getTrashStats(state);

    // Check retention
    const now = Date.now();
    const expirationTime = now - this.config.retentionDays * 24 * 60 * 60 * 1000;

    const hasExpired = this.getAllTrashed(state).some(
      ({ entity }) => entity.trashedAt < expirationTime
    );

    // Check size limits
    const exceedsSize = this.config.enforceSizeLimits && (
      stats.totalSize > this.config.maxSizeBytes ||
      stats.itemCount > this.config.maxItemCount
    );

    return hasExpired || exceedsSize;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Estimate entity size in bytes (rough approximation)
   */
  private estimateEntitySize(entity: IIIFItem): number {
    try {
      const json = JSON.stringify(entity);
      return new Blob([json]).size;
    } catch {
      return 1024; // Fallback: assume 1KB
    }
  }

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Format timestamp to relative time string
   */
  formatRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
    return `${Math.floor(seconds / 2592000)} months ago`;
  }

  /**
   * Get days until expiration for a trashed item
   */
  getDaysUntilExpiration(trashedAt: number): number {
    const expirationTime = trashedAt + this.config.retentionDays * 24 * 60 * 60 * 1000;
    const remaining = expirationTime - Date.now();
    return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const trashService = new TrashService();

// ============================================================================
// Convenience Functions (direct exports)
// ============================================================================

/**
 * Move entity to trash (convenience function)
 */
export function moveToTrash(
  state: NormalizedState,
  entityId: string,
  options?: TrashOptions
): TrashOperationResult {
  return trashService.moveToTrash(state, entityId, options);
}

/**
 * Restore entity from trash (convenience function)
 */
export function restoreFromTrash(
  state: NormalizedState,
  entityId: string,
  options?: RestoreOptions
): TrashOperationResult {
  return trashService.restoreFromTrash(state, entityId, options);
}

/**
 * Empty trash (convenience function)
 */
export function emptyTrashService(
  state: NormalizedState
): { state: NormalizedState; deletedCount: number; errors: string[] } {
  return trashService.emptyTrash(state);
}

/**
 * Get trash stats (convenience function)
 */
export function getTrashStats(state: NormalizedState): TrashStats {
  return trashService.getTrashStats(state);
}

/**
 * Check if entity is trashed (convenience function)
 */
export function isTrashed(state: NormalizedState, entityId: string): boolean {
  return trashService.isTrashed(state, entityId);
}
