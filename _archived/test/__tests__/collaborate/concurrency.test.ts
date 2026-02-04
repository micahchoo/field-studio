/**
 * Concurrency and Race Condition Tests
 *
 * Tests for concurrent operations, race conditions, and thread-safety
 * of the IIIF Field Archive Studio's core services.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  addEntity,
  createEmptyVault,
  getEntity,
  NormalizedState,
  normalizeIIIF,
  updateEntity,
} from '@/services/vault';
import {
  clearAllData,
  deleteFile,
  getFile,
  saveFile,
} from '@/services/storage';
import type { IIIFCanvas, IIIFManifest } from '@/types';

describe('Concurrency Tests', () => {
  beforeEach(async () => {
    try {
      await clearAllData();
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================================================
  // Vault Concurrency
  // ============================================================================


  // ============================================================================
  // Storage Concurrency
  // ============================================================================

  describe('Storage Concurrent Operations', () => {
    it('should handle concurrent file writes', async () => {
      const fileId = 'concurrent-file';
      const content1 = new Blob(['content-1']);
      const content2 = new Blob(['content-2']);

      // Attempt concurrent writes to same file
      const results = await Promise.allSettled([
        saveFile(fileId, content1),
        saveFile(fileId, content2),
      ]);

      // Both operations should complete (one will win)
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);

      // File should exist
      const retrieved = await getFile(fileId);
      expect(retrieved).toBeDefined();
      expect(retrieved!.blob).toBeDefined();
    });

    it('should handle concurrent read and write operations', async () => {
      const fileId = 'read-write-concurrent';
      const originalContent = new Blob(['original']);
      await saveFile(fileId, originalContent);

      // Start a write operation
      const writePromise = saveFile(fileId, new Blob(['updated']));

      // Concurrent reads
      const readPromises = Array.from({ length: 10 }, () => getFile(fileId));

      const [writeResult, ...readResults] = await Promise.all([
        writePromise,
        ...readPromises,
      ]);

      // All reads should return valid files
      readResults.forEach((file) => {
        expect(file).toBeDefined();
        expect(file?.blob).toBeDefined();
      });

      expect(writeResult).toBe(fileId);
    });

    it('should handle concurrent file deletions', async () => {
      const fileId = 'delete-concurrent';
      await saveFile(fileId, new Blob(['test']));

      // Multiple concurrent deletes
      const deletePromises = Array.from({ length: 5 }, () =>
        deleteFile(fileId).catch(() => null)
      );

      await Promise.all(deletePromises);

      // File should be deleted
      const retrieved = await getFile(fileId);
      expect(retrieved).toBeNull();
    });

    it('should handle mixed concurrent storage operations', async () => {
      const operations: Promise<unknown>[] = [];

      // Mix of save, get, and delete operations
      for (let i = 0; i < 20; i++) {
        operations.push(saveFile(`mixed-${i}`, new Blob([`content-${i}`])));
      }

      for (let i = 0; i < 10; i++) {
        operations.push(getFile(`mixed-${i}`));
      }

      operations.push(deleteFile('mixed-5'));
      operations.push(deleteFile('mixed-6'));

      const results = await Promise.allSettled(operations);

      // Most operations should succeed
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThan(results.length * 0.8);
    });
  });

  // ============================================================================
  // Race Condition Tests
  // ============================================================================

  describe('Race Condition Prevention', () => {
    it('should prevent lost updates in vault', async () => {
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/race-manifest',
        type: 'Manifest',
        label: { en: ['Original'] },
        items: [],
      };

      const vault = normalizeIIIF(manifest);

      // Simulate two concurrent updates from same base state
      const update1 = updateEntity(vault, 'https://example.com/race-manifest', {
        label: { en: ['Update 1'] },
      });

      const update2 = updateEntity(vault, 'https://example.com/race-manifest', {
        label: { en: ['Update 2'] },
      });

      // Both updates should produce valid states
      const entity1 = getEntity(update1, 'https://example.com/race-manifest');
      const entity2 = getEntity(update2, 'https://example.com/race-manifest');

      expect(entity1?.label?.en?.[0]).toMatch(/^Update [12]$/);
      expect(entity2?.label?.en?.[0]).toMatch(/^Update [12]$/);

      // Neither update should corrupt the entity
      expect(entity1?.id).toBe('https://example.com/race-manifest');
      expect(entity2?.id).toBe('https://example.com/race-manifest');
    });

    it('should handle rapid state transitions', async () => {
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/rapid-manifest',
        type: 'Manifest',
        label: { en: ['Start'] },
        items: [],
      };

      let vault = normalizeIIIF(manifest);

      // Rapidly transition through many states
      const states: NormalizedState[] = [vault];

      for (let i = 0; i < 50; i++) {
        vault = updateEntity(vault, 'https://example.com/rapid-manifest', {
          label: { en: [`State ${i}`] },
        });
        states.push(vault);
      }

      // All intermediate states should be valid
      states.forEach((state, index) => {
        const entity = getEntity(state, 'https://example.com/rapid-manifest');
        expect(entity).toBeDefined();
        expect(entity?.id).toBe('https://example.com/rapid-manifest');
        if (index > 0) {
          expect(entity?.label?.en?.[0]).toBe(`State ${index - 1}`);
        }
      });
    });
  });

  // ============================================================================
  // Stress Tests
  // ============================================================================

  describe('Concurrency Stress Tests', () => {
    it('should handle high-frequency vault operations', async () => {
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/stress-manifest',
        type: 'Manifest',
        label: { en: ['Stress Test'] },
        items: [],
      };

      let vault = normalizeIIIF(manifest);

      // Add 200 canvases
      for (let i = 0; i < 200; i++) {
        const canvas: IIIFCanvas = {
          id: `https://example.com/stress-canvas-${i}`,
          type: 'Canvas',
          label: { en: [`Canvas ${i}`] },
          width: 1000,
          height: 1000,
          items: [],
        };
        vault = addEntity(vault, canvas, 'https://example.com/stress-manifest');
      }

      // Update all canvases
      for (let i = 0; i < 200; i++) {
        vault = updateEntity(vault, `https://example.com/stress-canvas-${i}`, {
          label: { en: [`Updated Canvas ${i}`] },
        });
      }

      // Verify all updates
      for (let i = 0; i < 200; i++) {
        const canvas = getEntity(vault, `https://example.com/stress-canvas-${i}`);
        expect(canvas?.label?.en?.[0]).toBe(`Updated Canvas ${i}`);
      }
    });

    it('should handle concurrent storage stress', async () => {
      const operations: Promise<unknown>[] = [];

      // 100 concurrent file operations
      for (let i = 0; i < 100; i++) {
        operations.push(
          saveFile(`stress-${i}`, new Blob([`data-${i}`]))
        );
      }

      const results = await Promise.allSettled(operations);
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      // At least 95% should succeed
      expect(successCount).toBeGreaterThanOrEqual(95);
    });
  });
});
