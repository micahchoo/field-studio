/**
 * File Lifecycle Manager
 *
 * Tracks File object references on IIIF entities and cleans them up
 * when entities are removed from the vault. This prevents memory leaks
 * from large File objects being held indefinitely.
 *
 * @see ARCHITECTURE_FIXES_SUMMARY.md for Phase 1 implementation details
 */

import { FEATURE_FLAGS } from '../constants/features';
import type { IIIFCanvas, IIIFItem } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Reference tracking entry for a File object
 */
interface FileRefEntry {
  /** Entity ID that holds the file reference */
  entityId: string;
  /** The File object being tracked */
  file: File;
  /** Timestamp when the reference was registered */
  registeredAt: number;
  /** Optional callback to run before cleanup */
  onBeforeCleanup?: () => void;
}

/**
 * Statistics for monitoring file lifecycle
 */
export interface FileLifecycleStats {
  /** Number of active file references */
  activeRefs: number;
  /** Total size of tracked files in bytes */
  totalSize: number;
  /** Number of references cleaned up */
  cleanedUpCount: number;
}

// ============================================================================
// Feature Flag Check
// ============================================================================

/**
 * Check if file lifecycle management is enabled
 */
const isEnabled = (): boolean => {
  // Check for the feature flag (added to features.ts)
  return (FEATURE_FLAGS as Record<string, boolean>).USE_FILE_LIFECYCLE !== false;
};

// ============================================================================
// File Lifecycle Manager Class
// ============================================================================

/**
 * Manages the lifecycle of File objects attached to IIIF entities.
 *
 * This class tracks which entities have File references and provides
 * cleanup functionality when entities are removed. File objects can
 * be large (hundreds of MBs), so explicit cleanup is critical for
 * preventing memory leaks.
 *
 * @example
 * ```typescript
 * // Register a file reference when creating a canvas
 * fileLifecycleManager.register(canvas.id, file);
 *
 * // Clean up when entity is removed
 * fileLifecycleManager.cleanupEntity(canvas.id);
 *
 * // Or integrate with vault deletion
 * vault.subscribe((state) => {
 *   const removedIds = detectRemovedIds(previousState, state);
 *   removedIds.forEach(id => fileLifecycleManager.cleanupEntity(id));
 * });
 * ```
 */
export class FileLifecycleManager {
  private fileRefs: Map<string, FileRefEntry> = new Map();
  private cleanedUpCount = 0;
  private debugMode: boolean;

  constructor(options: { debug?: boolean } = {}) {
    this.debugMode = options.debug ?? false;
  }

  /**
   * Register a File reference for an entity
   *
   * @param entityId - The ID of the entity (usually a Canvas)
   * @param file - The File object to track
   * @param onBeforeCleanup - Optional callback before cleanup
   * @returns True if registered successfully
   */
  register(entityId: string, file: File, onBeforeCleanup?: () => void): boolean {
    if (!isEnabled()) {
      this.log('FileLifecycleManager disabled by feature flag');
      return false;
    }

    if (!entityId || !file) {
      this.warn('Cannot register: missing entityId or file');
      return false;
    }

    // If already registered for this entity, clean up the old reference first
    if (this.fileRefs.has(entityId)) {
      this.cleanupEntity(entityId);
    }

    this.fileRefs.set(entityId, {
      entityId,
      file,
      registeredAt: Date.now(),
      onBeforeCleanup,
    });

    this.log(`Registered file reference for ${entityId}`, {
      size: file.size,
      name: file.name,
    });

    return true;
  }

  /**
   * Clean up the File reference for a specific entity
   *
   * This revokes any blob URLs and removes the reference to allow
   * garbage collection of the File object.
   *
   * @param entityId - The ID of the entity to clean up
   * @returns True if a reference was found and cleaned up
   */
  cleanupEntity(entityId: string): boolean {
    if (!isEnabled()) return false;

    const entry = this.fileRefs.get(entityId);
    if (!entry) return false;

    // Run pre-cleanup callback if provided
    if (entry.onBeforeCleanup) {
      try {
        entry.onBeforeCleanup();
      } catch (e) {
        this.warn(`Pre-cleanup callback failed for ${entityId}:`, e);
      }
    }

    // Remove the reference - File object will be GC'd when no other refs exist
    this.fileRefs.delete(entityId);
    this.cleanedUpCount++;

    this.log(`Cleaned up file reference for ${entityId}`, {
      heldFor: Date.now() - entry.registeredAt,
      size: entry.file.size,
    });

    return true;
  }

  /**
   * Clean up multiple entities at once
   *
   * @param entityIds - Array of entity IDs to clean up
   * @returns Number of references cleaned up
   */
  cleanupEntities(entityIds: string[]): number {
    if (!isEnabled()) return 0;

    let count = 0;
    for (const id of entityIds) {
      if (this.cleanupEntity(id)) count++;
    }

    if (count > 0) {
      this.log(`Batch cleanup: ${count} references removed`);
    }

    return count;
  }

  /**
   * Check if an entity has a registered File reference
   */
  hasReference(entityId: string): boolean {
    return this.fileRefs.has(entityId);
  }

  /**
   * Get the File reference for an entity (if exists)
   */
  getFile(entityId: string): File | undefined {
    return this.fileRefs.get(entityId)?.file;
  }

  /**
   * Get statistics about tracked file references
   */
  getStats(): FileLifecycleStats {
    let totalSize = 0;
    this.fileRefs.forEach((entry) => {
      totalSize += entry.file.size;
    });

    return {
      activeRefs: this.fileRefs.size,
      totalSize,
      cleanedUpCount: this.cleanedUpCount,
    };
  }

  /**
   * Get all entity IDs that have registered file references
   */
  getTrackedEntityIds(): string[] {
    return Array.from(this.fileRefs.keys());
  }

  /**
   * Clean up all remaining references
   * Call this on app shutdown
   */
  dispose(): void {
    if (!isEnabled()) return;

    const count = this.fileRefs.size;

    this.fileRefs.forEach((entry, entityId) => {
      if (entry.onBeforeCleanup) {
        try {
          entry.onBeforeCleanup();
        } catch (e) {
          // Ignore errors during dispose
        }
      }
    });

    this.fileRefs.clear();
    this.cleanedUpCount += count;

    this.log(`Disposed: ${count} references cleared`);
  }

  private log(...args: unknown[]): void {
    if (this.debugMode) {
      console.log('[FileLifecycleManager]', ...args);
    }
  }

  private warn(...args: unknown[]): void {
    console.warn('[FileLifecycleManager]', ...args);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalManager: FileLifecycleManager | null = null;

/**
 * Get the global FileLifecycleManager instance
 */
export function getFileLifecycleManager(): FileLifecycleManager {
  if (!globalManager) {
    // Check for dev mode - safe for both Vite and other environments
    const isDev = typeof process !== 'undefined' &&
                  process.env &&
                  process.env.NODE_ENV === 'development';
    globalManager = new FileLifecycleManager({
      debug: isDev,
    });
  }
  return globalManager;
}

/**
 * Reset the global manager (useful for testing)
 */
export function resetFileLifecycleManager(): void {
  globalManager?.dispose();
  globalManager = null;
}

/**
 * Configure the file lifecycle manager
 */
export function configureFileLifecycleManager(options: { debug?: boolean }): void {
  if (globalManager) {
    resetFileLifecycleManager();
  }
  globalManager = new FileLifecycleManager(options);
}

// ============================================================================
// Integration Helpers
// ============================================================================

/**
 * Extract entity IDs that have _fileRef from a normalized state
 * Useful for syncing with vault state
 */
export function extractFileRefIds(state: {
  entities: { Canvas?: Record<string, IIIFCanvas> };
}): string[] {
  const canvasStore = state.entities.Canvas;
  if (!canvasStore) return [];

  return Object.entries(canvasStore)
    .filter(([, canvas]) => !!canvas._fileRef)
    .map(([id]) => id);
}

/**
 * Sync the lifecycle manager with vault state
 * Removes tracking for entities that no longer exist
 */
export function syncWithVaultState(state: {
  entities: { Canvas?: Record<string, IIIFCanvas> };
}): void {
  if (!isEnabled()) return;

  const manager = getFileLifecycleManager();
  const currentIds = new Set(Object.keys(state.entities.Canvas || {}));
  const trackedIds = manager.getTrackedEntityIds();

  // Clean up entities that no longer exist in vault
  const removedIds = trackedIds.filter((id) => !currentIds.has(id));
  if (removedIds.length > 0) {
    manager.cleanupEntities(removedIds);
  }
}

// ============================================================================
// Backward Compatibility
// ============================================================================

/**
 * Legacy cleanup function - redirects to FileLifecycleManager
 * @deprecated Use FileLifecycleManager.cleanupEntity() instead
 */
export function cleanupFileRef(entityId: string): void {
  getFileLifecycleManager().cleanupEntity(entityId);
}