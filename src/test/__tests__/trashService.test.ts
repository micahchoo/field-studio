/**
 * Unit Tests for services/trashService.ts
 *
 * Tests trash/restore functionality for soft deletion.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TrashService,
  trashService,
  type TrashOptions,
  type RestoreOptions,
} from '../../../services/trashService';
import type { NormalizedState } from '../../../services/vault';
import type { IIIFItem } from '../../../types';

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

      const beforeTime = Date.now();
      const result = service.moveToTrash(mockState, 'test-entity');
      const afterTime = Date.now();

      const trashed = result.state?.trashedEntities?.['test-entity'];
      expect(trashed?.trashedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(trashed?.trashedAt).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('restore', () => {
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
        },
      };

      const result = service.restore(mockState, 'test-entity');

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

      mockState.trashedEntities = {
        'test-entity': {
          entity,
          trashedAt: Date.now(),
          originalParentId: 'original-parent',
        },
      };

      const options: RestoreOptions = { parentId: 'new-parent' };
      const result = service.restore(mockState, 'test-entity', options);

      expect(result.success).toBe(true);
    });

    it('should fail when entity not in trash', () => {
      const result = service.restore(mockState, 'nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('emptyTrash', () => {
    it('should permanently delete all trashed items', () => {
      mockState.trashedEntities = {
        'item1': {
          entity: { id: 'item1', type: 'Manifest', label: { en: ['Item1'] } },
          trashedAt: Date.now(),
        },
        'item2': {
          entity: { id: 'item2', type: 'Canvas', label: { en: ['Item2'] } },
          trashedAt: Date.now(),
        },
      };

      const result = service.emptyTrash(mockState);

      expect(result.success).toBe(true);
      expect(Object.keys(result.state?.trashedEntities || {})).toHaveLength(0);
    });

    it('should succeed when trash is empty', () => {
      const result = service.emptyTrash(mockState);

      expect(result.success).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return trash statistics', () => {
      mockState.trashedEntities = {
        'item1': {
          entity: { id: 'item1', type: 'Manifest', label: { en: ['Item1'] } },
          trashedAt: Date.now() - 1000000,
        },
        'item2': {
          entity: { id: 'item2', type: 'Manifest', label: { en: ['Item2'] } },
          trashedAt: Date.now(),
        },
      };

      const stats = service.getStats(mockState);

      expect(stats.itemCount).toBe(2);
      expect(stats.oldestItem).toBeLessThan(stats.newestItem!);
      expect(stats.itemsByType['Manifest']).toBe(2);
    });

    it('should return zero stats for empty trash', () => {
      const stats = service.getStats(mockState);

      expect(stats.itemCount).toBe(0);
      expect(stats.oldestItem).toBeNull();
      expect(stats.newestItem).toBeNull();
    });

    it('should count expiring items', () => {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const twentyDaysAgo = Date.now() - twentyDaysAgo;

      mockState.trashedEntities = {
        'item1': {
          entity: { id: 'item1', type: 'Manifest', label: { en: ['Item1'] } },
          trashedAt: twentyDaysAgo, // Expiring soon (< 30 days)
        },
      };

      const stats = service.getStats(mockState);

      expect(stats.expiringSoon).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should remove items older than retention period', () => {
      const fortyDaysAgo = Date.now() - 40 * 24 * 60 * 60 * 1000;

      mockState.trashedEntities = {
        'old-item': {
          entity: { id: 'old-item', type: 'Manifest', label: { en: ['Old'] } },
          trashedAt: fortyDaysAgo,
        },
        'new-item': {
          entity: { id: 'new-item', type: 'Manifest', label: { en: ['New'] } },
          trashedAt: Date.now(),
        },
      };

      const result = service.cleanup(mockState, 30); // 30 day retention

      expect(result.state?.trashedEntities?.['old-item']).toBeUndefined();
      expect(result.state?.trashedEntities?.['new-item']).toBeDefined();
    });
  });
});

describe('trashService singleton', () => {
  it('should be exported', () => {
    expect(trashService).toBeDefined();
    expect(trashService).toBeInstanceOf(TrashService);
  });
});
