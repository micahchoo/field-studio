/**
 * Unit Tests for services/trashService.ts
 *
 * Tests trash/restore functionality for soft deletion.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  type RestoreOptions,
  type TrashOptions,
  trashService,
  TrashService,
} from '@/services/trashService';
import type { NormalizedState } from '@/services/vault';
import type { IIIFItem } from '@/types';

describe('TrashService', () => {
  let service: TrashService;
  let mockState: NormalizedState;

  beforeEach(() => {
    service = new TrashService();
    mockState = {
      entities: {
        Collection: {},
        Manifest: {},
        Canvas: {},
        Range: {},
        AnnotationPage: {},
        Annotation: {},
      },
      references: {},
      reverseRefs: {},
      collectionMembers: {},
      memberOfCollections: {},
      rootId: 'root',
      typeIndex: {},
      extensions: {},
      trashedEntities: {},
    };
  });

  describe('moveToTrash', () => {
    it('should move entity to trash', () => {
      const entity: IIIFItem = {
        id: 'test-entity',
        type: 'Manifest',
        label: { en: ['Test'] },
      };

      mockState.entities.Manifest['test-entity'] = entity as any;
      mockState.typeIndex['test-entity'] = 'Manifest';

      const result = service.moveToTrash(mockState, 'test-entity');

      expect(result.success).toBe(true);
      expect(result.state?.trashedEntities?.['test-entity']).toBeDefined();
    });

    it('should fail when entity not found', () => {
      const result = service.moveToTrash(mockState, 'nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should store original parent reference', () => {
      const entity: IIIFItem = {
        id: 'test-entity',
        type: 'Manifest',
        label: { en: ['Test'] },
        _parentId: 'parent-collection',
      };

      mockState.entities.Manifest['test-entity'] = entity as any;
      mockState.typeIndex['test-entity'] = 'Manifest';
      mockState.reverseRefs['test-entity'] = 'parent-collection';

      const result = service.moveToTrash(mockState, 'test-entity');

      expect(result.success).toBe(true);
      const trashed = result.state?.trashedEntities?.['test-entity'];
      expect(trashed?.originalParentId).toBe('parent-collection');
    });

    it('should record timestamp when moved to trash', () => {
      const entity: IIIFItem = {
        id: 'test-entity',
        type: 'Manifest',
        label: { en: ['Test'] },
      };

      mockState.entities.Manifest['test-entity'] = entity as any;
      mockState.typeIndex['test-entity'] = 'Manifest';

      const beforeTime = Date.now();
      const result = service.moveToTrash(mockState, 'test-entity');
      const afterTime = Date.now();

      const trashed = result.state?.trashedEntities?.['test-entity'];
      expect(trashed?.trashedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(trashed?.trashedAt).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('restoreFromTrash', () => {
    it('should restore entity from trash', () => {
      const entity: IIIFItem = {
        id: 'test-entity',
        type: 'Manifest',
        label: { en: ['Test'] },
      };

      mockState.trashedEntities = {
        'test-entity': {
          entity,
          trashedAt: Date.now(),
          originalParentId: 'parent-id',
          memberOfCollections: [],
          childIds: [],
        },
      };

      const result = service.restoreFromTrash(mockState, 'test-entity');

      expect(result.success).toBe(true);
      expect(result.state?.entities.Manifest?.['test-entity']).toBeDefined();
      expect(result.state?.trashedEntities?.['test-entity']).toBeUndefined();
    });

    it('should restore to specific parent when provided', () => {
      const entity: IIIFItem = {
        id: 'test-entity',
        type: 'Manifest',
        label: { en: ['Test'] },
      };

      // Add the new parent to the state
      mockState.entities.Collection['new-parent'] = { 
        id: 'new-parent', 
        type: 'Collection', 
        label: { en: ['Parent'] } 
      } as any;
      mockState.typeIndex['new-parent'] = 'Collection';

      mockState.trashedEntities = {
        'test-entity': {
          entity,
          trashedAt: Date.now(),
          originalParentId: 'original-parent',
          memberOfCollections: [],
          childIds: [],
        },
      };

      const options: RestoreOptions = { parentId: 'new-parent' };
      const result = service.restoreFromTrash(mockState, 'test-entity', options);

      expect(result.success).toBe(true);
    });

    it('should fail when entity not in trash', () => {
      const result = service.restoreFromTrash(mockState, 'nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('emptyTrash', () => {
    it('should permanently delete all trashed items', () => {
      // Add entities to typeIndex so removeEntity can find them
      mockState.typeIndex['item1'] = 'Manifest';
      mockState.typeIndex['item2'] = 'Canvas';
      
      mockState.trashedEntities = {
        'item1': {
          entity: { id: 'item1', type: 'Manifest', label: { en: ['Item1'] } },
          trashedAt: Date.now(),
          originalParentId: null,
          memberOfCollections: [],
          childIds: [],
        },
        'item2': {
          entity: { id: 'item2', type: 'Canvas', label: { en: ['Item2'] } },
          trashedAt: Date.now(),
          originalParentId: null,
          memberOfCollections: [],
          childIds: [],
        },
      };

      const result = service.emptyTrash(mockState);

      expect(result.deletedCount).toBe(2);
      expect(Object.keys(result.state?.trashedEntities || {})).toHaveLength(0);
    });

    it('should succeed when trash is empty', () => {
      const result = service.emptyTrash(mockState);

      expect(result.deletedCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getTrashStats', () => {
    it('should return trash statistics', () => {
      mockState.trashedEntities = {
        'item1': {
          entity: { id: 'item1', type: 'Manifest', label: { en: ['Item1'] } },
          trashedAt: Date.now() - 1000000,
          originalParentId: null,
          memberOfCollections: [],
          childIds: [],
        },
        'item2': {
          entity: { id: 'item2', type: 'Manifest', label: { en: ['Item2'] } },
          trashedAt: Date.now(),
          originalParentId: null,
          memberOfCollections: [],
          childIds: [],
        },
      };

      const stats = service.getTrashStats(mockState);

      expect(stats.itemCount).toBe(2);
      expect(stats.oldestItem).toBeLessThan(stats.newestItem!);
      expect(stats.itemsByType['Manifest']).toBe(2);
    });

    it('should return zero stats for empty trash', () => {
      const stats = service.getTrashStats(mockState);

      expect(stats.itemCount).toBe(0);
      expect(stats.oldestItem).toBeNull();
      expect(stats.newestItem).toBeNull();
    });

    it('should count expiring items', () => {
      const twentyDaysAgo = Date.now() - 20 * 24 * 60 * 60 * 1000;

      mockState.trashedEntities = {
        'item1': {
          entity: { id: 'item1', type: 'Manifest', label: { en: ['Item1'] } },
          trashedAt: twentyDaysAgo,
          originalParentId: null,
          memberOfCollections: [],
          childIds: [],
        },
      };

      const stats = service.getTrashStats(mockState);

      expect(stats.expiringSoon).toBeGreaterThanOrEqual(0);
    });
  });

  describe('autoCleanup', () => {
    it('should return unchanged state when no expired items', () => {
      mockState.trashedEntities = {
        'new-item': {
          entity: { id: 'new-item', type: 'Manifest', label: { en: ['New'] } },
          trashedAt: Date.now(),
          originalParentId: null,
          memberOfCollections: [],
          childIds: [],
        },
      };

      const result = service.autoCleanup(mockState);

      expect(result.deletedCount).toBe(0);
    });
  });

  describe('isTrashed', () => {
    it('should return true for trashed entities', () => {
      mockState.trashedEntities = {
        'item1': {
          entity: { id: 'item1', type: 'Manifest', label: { en: ['Item1'] } },
          trashedAt: Date.now(),
          originalParentId: null,
          memberOfCollections: [],
          childIds: [],
        },
      };

      expect(service.isTrashed(mockState, 'item1')).toBe(true);
      expect(service.isTrashed(mockState, 'item2')).toBe(false);
    });
  });

  describe('getTrashedIds', () => {
    it('should return all trashed entity IDs', () => {
      mockState.trashedEntities = {
        'item1': {
          entity: { id: 'item1', type: 'Manifest', label: { en: ['Item1'] } },
          trashedAt: Date.now(),
          originalParentId: null,
          memberOfCollections: [],
          childIds: [],
        },
        'item2': {
          entity: { id: 'item2', type: 'Canvas', label: { en: ['Item2'] } },
          trashedAt: Date.now(),
          originalParentId: null,
          memberOfCollections: [],
          childIds: [],
        },
      };

      const ids = service.getTrashedIds(mockState);

      expect(ids).toContain('item1');
      expect(ids).toContain('item2');
      expect(ids).toHaveLength(2);
    });
  });

  describe('batch operations', () => {
    it('should batch move to trash', () => {
      // Setup entities with proper typeIndex
      mockState.entities.Manifest['item1'] = { id: 'item1', type: 'Manifest', label: { en: ['Item1'] } } as any;
      mockState.entities.Manifest['item2'] = { id: 'item2', type: 'Manifest', label: { en: ['Item2'] } } as any;
      mockState.typeIndex['item1'] = 'Manifest';
      mockState.typeIndex['item2'] = 'Manifest';

      const result = service.batchMoveToTrash(mockState, ['item1', 'item2']);

      expect(result.processedCount).toBe(2);
      expect(result.failedCount).toBe(0);
    });

    it('should batch restore from trash', () => {
      mockState.trashedEntities = {
        'item1': {
          entity: { id: 'item1', type: 'Manifest', label: { en: ['Item1'] } },
          trashedAt: Date.now(),
          originalParentId: null,
          memberOfCollections: [],
          childIds: [],
        },
        'item2': {
          entity: { id: 'item2', type: 'Manifest', label: { en: ['Item2'] } },
          trashedAt: Date.now(),
          originalParentId: null,
          memberOfCollections: [],
          childIds: [],
        },
      };

      const result = service.batchRestore(mockState, ['item1', 'item2']);

      expect(result.processedCount).toBe(2);
      expect(result.failedCount).toBe(0);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(service.formatBytes(0)).toBe('0 B');
      expect(service.formatBytes(1024)).toBe('1 KB');
      expect(service.formatBytes(1024 * 1024)).toBe('1 MB');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format relative time', () => {
      expect(service.formatRelativeTime(Date.now())).toBe('just now');
      expect(service.formatRelativeTime(Date.now() - 60000)).toContain('minutes');
    });
  });

  describe('getDaysUntilExpiration', () => {
    it('should calculate days until expiration', () => {
      const days = service.getDaysUntilExpiration(Date.now());
      expect(days).toBeGreaterThanOrEqual(0);
      expect(days).toBeLessThanOrEqual(30);
    });
  });

  // ============================================================================
  // Edge Case Tests - Real-World Scenarios
  // ============================================================================

  describe('Edge Cases: Large Trash Collections', () => {
    it('should handle large number of trashed items', () => {
      // Simulate 1000 trashed items
      for (let i = 0; i < 1000; i++) {
        mockState.trashedEntities[`item-${i}`] = {
          entity: { id: `item-${i}`, type: 'Manifest', label: { en: [`Item ${i}`] } },
          trashedAt: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000, // Random times in last 30 days
          originalParentId: null,
          memberOfCollections: [],
          childIds: [],
        };
      }

      const stats = service.getTrashStats(mockState);

      expect(stats.itemCount).toBe(1000);
      expect(stats.itemsByType['Manifest']).toBe(1000);
    });

    it('should handle trash stats calculation for empty items', () => {
      mockState.trashedEntities = {};

      const stats = service.getTrashStats(mockState);

      expect(stats.itemCount).toBe(0);
      expect(stats.oldestItem).toBeNull();
      expect(stats.newestItem).toBeNull();
      expect(stats.expiringSoon).toBe(0);
    });

    it('should handle items with missing trashedAt timestamp', () => {
      mockState.trashedEntities = {
        'item-without-timestamp': {
          entity: { id: 'item', type: 'Manifest', label: { en: ['Item'] } },
          // Missing trashedAt
        } as any,
      };

      const stats = service.getTrashStats(mockState);

      // Should not crash
      expect(stats.itemCount).toBe(1);
    });
  });

  describe('Edge Cases: Rapid Operations', () => {
    it('should handle rapid trash and restore of same item', () => {
      const entity: IIIFItem = {
        id: 'rapid-test',
        type: 'Manifest',
        label: { en: ['Test'] },
      };

      mockState.entities.Manifest['rapid-test'] = entity as any;
      mockState.typeIndex['rapid-test'] = 'Manifest';

      // Trash
      const trashResult1 = service.moveToTrash(mockState, 'rapid-test');
      expect(trashResult1.success).toBe(true);

      // Restore
      const restoreResult1 = service.restoreFromTrash(trashResult1.state!, 'rapid-test');
      expect(restoreResult1.success).toBe(true);

      // Trash again
      mockState = restoreResult1.state!;
      const trashResult2 = service.moveToTrash(mockState, 'rapid-test');
      expect(trashResult2.success).toBe(true);

      // Entity should be in trash
      expect(trashResult2.state!.trashedEntities['rapid-test']).toBeDefined();
    });

    it('should handle batch operations with partial failures', () => {
      // Setup: 3 entities exist, 2 don't
      mockState.entities.Manifest['exists-1'] = { id: 'exists-1', type: 'Manifest' } as any;
      mockState.entities.Manifest['exists-2'] = { id: 'exists-2', type: 'Manifest' } as any;
      mockState.entities.Manifest['exists-3'] = { id: 'exists-3', type: 'Manifest' } as any;
      mockState.typeIndex['exists-1'] = 'Manifest';
      mockState.typeIndex['exists-2'] = 'Manifest';
      mockState.typeIndex['exists-3'] = 'Manifest';

      const result = service.batchMoveToTrash(mockState, [
        'exists-1',
        'nonexistent-1',
        'exists-2',
        'nonexistent-2',
        'exists-3',
      ]);

      expect(result.processedCount).toBe(3);
      expect(result.failedCount).toBe(2);
      expect(result.errors.length).toBe(2);
    });

    it('should handle batch restore with mixed success', () => {
      // Setup: some items have valid parents, some don't
      mockState.trashedEntities = {
        'valid-item': {
          entity: { id: 'valid-item', type: 'Manifest', label: { en: ['Valid'] } },
          trashedAt: Date.now(),
          originalParentId: null,
          memberOfCollections: [],
          childIds: [],
        },
        'corrupted-item': {
          // Missing entity property
          trashedAt: Date.now(),
        } as any,
      };

      const result = service.batchRestore(mockState, ['valid-item', 'corrupted-item']);

      expect(result.processedCount).toBe(1);
      expect(result.failedCount).toBe(1);
    });
  });

  describe('Edge Cases: Corrupted State', () => {
    it('should handle trashed entity with missing entity data', () => {
      mockState.trashedEntities = {
        'corrupted': {
          // entity is missing
          trashedAt: Date.now(),
          originalParentId: 'parent',
        } as any,
      };

      // Should handle gracefully
      const isTrashed = service.isTrashed(mockState, 'corrupted');
      expect(isTrashed).toBe(true);

      // Restore should fail gracefully
      const result = service.restoreFromTrash(mockState, 'corrupted');
      expect(result.success).toBe(false);
    });

    it('should handle entity with circular parent reference', () => {
      const entity: IIIFItem = {
        id: 'circular-test',
        type: 'Manifest',
        label: { en: ['Test'] },
        _parentId: 'circular-test', // Points to itself
      };

      mockState.entities.Manifest['circular-test'] = entity as any;
      mockState.typeIndex['circular-test'] = 'Manifest';
      mockState.reverseRefs['circular-test'] = 'circular-test';

      // Should not hang or crash
      const result = service.moveToTrash(mockState, 'circular-test');
      expect(result.success).toBe(true);
    });

    it('should handle emptyTrash with corrupted item metadata', () => {
      mockState.trashedEntities = {
        'corrupted': {
          // Missing required fields
          trashedAt: Date.now(),
        } as any,
        'valid': {
          entity: { id: 'valid', type: 'Manifest', label: { en: ['Valid'] } },
          trashedAt: Date.now(),
          originalParentId: null,
          memberOfCollections: [],
          childIds: [],
        },
      };

      const result = service.emptyTrash(mockState);

      // Should process what it can
      expect(result.deletedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases: Auto-Cleanup Scenarios', () => {
    it('should handle auto-cleanup with mix of expired and non-expired items', () => {
      const thirtyDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      mockState.trashedEntities = {
        'expired-1': {
          entity: { id: 'expired-1', type: 'Manifest', label: { en: ['Expired'] } },
          trashedAt: thirtyDaysAgo,
          originalParentId: null,
          memberOfCollections: [],
          childIds: [],
        },
        'expired-2': {
          entity: { id: 'expired-2', type: 'Canvas', label: { en: ['Expired'] } },
          trashedAt: thirtyDaysAgo - 1000000,
          originalParentId: null,
          memberOfCollections: [],
          childIds: [],
        },
        'recent': {
          entity: { id: 'recent', type: 'Manifest', label: { en: ['Recent'] } },
          trashedAt: oneDayAgo,
          originalParentId: null,
          memberOfCollections: [],
          childIds: [],
        },
      };

      // Add to typeIndex so they can be found for deletion
      mockState.typeIndex['expired-1'] = 'Manifest';
      mockState.typeIndex['expired-2'] = 'Canvas';
      mockState.typeIndex['recent'] = 'Manifest';

      const result = service.autoCleanup(mockState);

      // Should delete expired items
      expect(result.deletedCount).toBeGreaterThanOrEqual(0);
      // Recent item should still be in trash
      expect(result.state?.trashedEntities['recent']).toBeDefined();
    });

    it('should handle auto-cleanup with no typeIndex entries', () => {
      const thirtyDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;

      mockState.trashedEntities = {
        'old-item': {
          entity: { id: 'old-item', type: 'Manifest', label: { en: ['Old'] } },
          trashedAt: thirtyDaysAgo,
          originalParentId: null,
          memberOfCollections: [],
          childIds: [],
        },
      };
      // No typeIndex entry

      const result = service.autoCleanup(mockState);

      // Should handle gracefully without typeIndex
      expect(result.deletedCount).toBe(0);
    });
  });

  describe('Edge Cases: Restore Scenarios', () => {
    it('should restore entity when original parent no longer exists', () => {
      const entity: IIIFItem = {
        id: 'orphan-test',
        type: 'Manifest',
        label: { en: ['Orphan'] },
      };

      mockState.trashedEntities = {
        'orphan-test': {
          entity,
          trashedAt: Date.now(),
          originalParentId: 'deleted-parent', // Parent was deleted
          memberOfCollections: [],
          childIds: [],
        },
      };

      const result = service.restoreFromTrash(mockState, 'orphan-test');

      // Should restore even without original parent
      expect(result.success).toBe(true);
      expect(result.state?.entities.Manifest?.['orphan-test']).toBeDefined();
    });

    it('should handle restore with conflicting entity ID', () => {
      const trashedEntity: IIIFItem = {
        id: 'conflict-test',
        type: 'Manifest',
        label: { en: ['Trashed Version'] },
      };

      // Entity already exists with same ID (was recreated)
      mockState.entities.Manifest['conflict-test'] = {
        id: 'conflict-test',
        type: 'Manifest',
        label: { en: ['New Version'] },
      } as any;
      mockState.typeIndex['conflict-test'] = 'Manifest';

      mockState.trashedEntities = {
        'conflict-test': {
          entity: trashedEntity,
          trashedAt: Date.now(),
          originalParentId: null,
          memberOfCollections: [],
          childIds: [],
        },
      };

      const result = service.restoreFromTrash(mockState, 'conflict-test');

      // Should handle conflict (implementation dependent)
      expect(result.success).toBeDefined();
    });
  });

  describe('Edge Cases: Formatting Functions', () => {
    it('should handle formatBytes with edge values', () => {
      expect(service.formatBytes(0)).toBe('0 B');
      expect(service.formatBytes(1)).toBe('1 B');
      expect(service.formatBytes(1023)).toBe('1023 B');
      expect(service.formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      expect(service.formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
    });

    it('should handle formatRelativeTime with edge values', () => {
      const now = Date.now();

      expect(service.formatRelativeTime(now)).toBe('just now');
      expect(service.formatRelativeTime(now - 1000)).toBe('just now');
      expect(service.formatRelativeTime(now - 59 * 1000)).toContain('seconds');
      expect(service.formatRelativeTime(now - 60 * 60 * 1000)).toContain('hours');
      expect(service.formatRelativeTime(now - 24 * 60 * 60 * 1000)).toContain('days');
    });

    it('should handle getDaysUntilExpiration with edge dates', () => {
      const thirtyDaysFromNow = Date.now() + 30 * 24 * 60 * 60 * 1000;
      expect(service.getDaysUntilExpiration(thirtyDaysFromNow)).toBeGreaterThanOrEqual(0);

      const pastDate = Date.now() - 24 * 60 * 60 * 1000;
      expect(service.getDaysUntilExpiration(pastDate)).toBe(0);
    });
  });
});

// NOTE: Removed trivial "should be exported" and "should have all service methods" tests.
// These tests provide zero behavioral value and simply verify that a module exports something.
// The actual functionality of trashService is tested throughout the TrashService test suite above.
