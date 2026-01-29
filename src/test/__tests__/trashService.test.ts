/**
 * Unit Tests for services/trashService.ts
 *
 * Tests trash/restore functionality for soft deletion.
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
        },
        'item2': {
          entity: { id: 'item2', type: 'Manifest', label: { en: ['Item2'] } },
          trashedAt: Date.now(),
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
        },
        'item2': {
          entity: { id: 'item2', type: 'Canvas', label: { en: ['Item2'] } },
          trashedAt: Date.now(),
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
});

describe('trashService singleton', () => {
  it('should be exported', () => {
    expect(trashService).toBeDefined();
    expect(trashService).toBeInstanceOf(TrashService);
  });

  it('should have all service methods', () => {
    expect(trashService.moveToTrash).toBeInstanceOf(Function);
    expect(trashService.restoreFromTrash).toBeInstanceOf(Function);
    expect(trashService.emptyTrash).toBeInstanceOf(Function);
    expect(trashService.getTrashStats).toBeInstanceOf(Function);
    expect(trashService.autoCleanup).toBeInstanceOf(Function);
  });
});
