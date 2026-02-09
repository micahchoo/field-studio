/**
 * Tile Worker - Stub Implementation
 *
 * NOTE: Original tileWorker.ts was removed as unused/dead code in commit 9857b003.
 * This stub prevents import errors while tile generation is disabled.
 *
 * If tile generation is needed in the future, recover the original implementation
 * from git history or implement a new solution.
 */

import { workerLog } from '@/src/shared/services/logger';

/**
 * Mock tile worker pool that does nothing
 */
export function getTileWorkerPool() {
  return {
    async generateDerivatives(assetId: string, file: File, sizes: number[]) {
      workerLog.warn('[TileWorker Stub] Tile generation is disabled. AssetId:', assetId);
      return {
        derivatives: new Map<number, Blob>(), // Empty map - no tiles generated
        errors: []
      };
    },

    terminate() {
      // No-op
    }
  };
}

/**
 * Mock derivative generation function
 */
export async function generateDerivativeAsync(
  file: File,
  size: number
): Promise<Blob | null> {
  workerLog.warn('[TileWorker Stub] Derivative generation is disabled');
  return null;
}
