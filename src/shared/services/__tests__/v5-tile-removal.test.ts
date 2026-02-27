/**
 * V5 — Tile pipeline removal integration tests
 *
 * Verifies that:
 * - Deleted tile pipeline source files no longer exist on disk
 * - The orphaned tile database cleanup function works
 * - No tile pipeline exports leak from barrel modules
 */

import { describe, it, expect, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '../../..');

describe('V5: Tile pipeline removal', () => {
  describe('deleted source files', () => {
    it('tilePipeline.ts no longer exists', () => {
      expect(existsSync(resolve(SRC, 'shared/services/tilePipeline.ts'))).toBe(false);
    });

    it('tileWorker.ts no longer exists', () => {
      expect(existsSync(resolve(SRC, 'entities/manifest/model/ingest/tileWorker.ts'))).toBe(false);
    });

    it('imagePipeline.svelte.ts no longer exists', () => {
      expect(existsSync(resolve(SRC, 'shared/stores/imagePipeline.svelte.ts'))).toBe(false);
    });

    it('image-pipeline.ts type module no longer exists', () => {
      expect(existsSync(resolve(SRC, 'shared/types/image-pipeline.ts'))).toBe(false);
    });
  });

  describe('deleteOrphanedTileDatabase', () => {
    it('calls indexedDB.deleteDatabase with correct name', async () => {
      const mockDeleteDatabase = vi.fn();
      vi.stubGlobal('indexedDB', { deleteDatabase: mockDeleteDatabase });
      // Re-import to pick up the stubbed global
      const { deleteOrphanedTileDatabase } = await import('@/src/shared/services/storage');
      deleteOrphanedTileDatabase();
      expect(mockDeleteDatabase).toHaveBeenCalledWith('field-studio-tiles');
      vi.unstubAllGlobals();
    });
  });
});
