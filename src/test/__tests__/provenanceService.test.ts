/**
 * Unit Tests for services/provenanceService.ts
 *
 * Tests audit trail and change tracking functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ProvenanceService,
  provenanceService,
  type PropertyChange,
  type ProvenanceEntry,
} from '../../../services/provenanceService';

describe('ProvenanceService', () => {
  let service: ProvenanceService;

  beforeEach(() => {
    service = new ProvenanceService();
  });

  describe('recordUpdate', () => {
    it('should record a property change', () => {
      const changes: PropertyChange[] = [
        { property: 'label', oldValue: { en: ['Old'] }, newValue: { en: ['New'] } },
      ];

      const entry = service.recordUpdate('item-1', changes, 'UPDATE_LABEL');

      expect(entry).toBeDefined();
      expect(entry.entityId).toBe('item-1');
      expect(entry.action).toBe('UPDATE_LABEL');
      expect(entry.changes).toEqual(changes);
    });

    it('should assign timestamp', () => {
      const before = Date.now();
      const entry = service.recordUpdate('item-1', [], 'TEST');
      const after = Date.now();

      expect(entry.timestamp).toBeGreaterThanOrEqual(before);
      expect(entry.timestamp).toBeLessThanOrEqual(after);
    });

    it('should assign unique ID', () => {
      const entry1 = service.recordUpdate('item-1', [], 'TEST');
      const entry2 = service.recordUpdate('item-1', [], 'TEST');

      expect(entry1.id).not.toBe(entry2.id);
    });

    it('should store entry in history', () => {
      service.recordUpdate('item-1', [], 'TEST');

      const history = service.getHistory('item-1');
      expect(history).toHaveLength(1);
    });
  });

  describe('getHistory', () => {
    it('should return empty array for unknown entity', () => {
      const history = service.getHistory('unknown');
      expect(history).toEqual([]);
    });

    it('should return entries in chronological order', () => {
      service.recordUpdate('item-1', [{ property: 'a', oldValue: 1, newValue: 2 }], 'ACTION1');
      service.recordUpdate('item-1', [{ property: 'b', oldValue: 1, newValue: 2 }], 'ACTION2');
      service.recordUpdate('item-1', [{ property: 'c', oldValue: 1, newValue: 2 }], 'ACTION3');

      const history = service.getHistory('item-1');
      expect(history).toHaveLength(3);
      expect(history[0].action).toBe('ACTION1');
      expect(history[1].action).toBe('ACTION2');
      expect(history[2].action).toBe('ACTION3');
    });

    it('should limit history when maxEntries specified', () => {
      for (let i = 0; i < 10; i++) {
        service.recordUpdate('item-1', [], `ACTION${i}`);
      }

      const history = service.getHistory('item-1', 5);
      expect(history).toHaveLength(5);
    });
  });

  describe('getAllHistory', () => {
    it('should return all entries across entities', () => {
      service.recordUpdate('item-1', [], 'ACTION1');
      service.recordUpdate('item-2', [], 'ACTION2');
      service.recordUpdate('item-1', [], 'ACTION3');

      const all = service.getAllHistory();
      expect(all).toHaveLength(3);
    });

    it('should return entries sorted by timestamp', () => {
      service.recordUpdate('item-1', [], 'FIRST');
      vi.advanceTimersByTime(100);
      service.recordUpdate('item-2', [], 'SECOND');

      const all = service.getAllHistory();
      expect(all[0].action).toBe('FIRST');
      expect(all[1].action).toBe('SECOND');
    });
  });

  describe('getChangesSince', () => {
    it('should return entries after timestamp', () => {
      const entry1 = service.recordUpdate('item-1', [], 'OLD');
      const since = entry1.timestamp;
      
      vi.advanceTimersByTime(100);
      service.recordUpdate('item-1', [], 'NEW');

      const changes = service.getChangesSince('item-1', since);
      expect(changes).toHaveLength(1);
      expect(changes[0].action).toBe('NEW');
    });

    it('should return empty array if no changes since', () => {
      const entry = service.recordUpdate('item-1', [], 'ONLY');
      
      const changes = service.getChangesSince('item-1', entry.timestamp);
      expect(changes).toEqual([]);
    });
  });

  describe('getLastChange', () => {
    it('should return most recent entry', () => {
      service.recordUpdate('item-1', [], 'FIRST');
      service.recordUpdate('item-1', [], 'SECOND');
      service.recordUpdate('item-1', [], 'THIRD');

      const last = service.getLastChange('item-1');
      expect(last?.action).toBe('THIRD');
    });

    it('should return null for unknown entity', () => {
      const last = service.getLastChange('unknown');
      expect(last).toBeNull();
    });
  });

  describe('clearHistory', () => {
    it('should clear history for specific entity', () => {
      service.recordUpdate('item-1', [], 'ACTION');
      service.recordUpdate('item-2', [], 'ACTION');

      service.clearHistory('item-1');

      expect(service.getHistory('item-1')).toEqual([]);
      expect(service.getHistory('item-2')).toHaveLength(1);
    });

    it('should clear all history when no entity specified', () => {
      service.recordUpdate('item-1', [], 'ACTION');
      service.recordUpdate('item-2', [], 'ACTION');

      service.clearHistory();

      expect(service.getAllHistory()).toEqual([]);
    });
  });

  describe('export/import', () => {
    it('should export all history', () => {
      service.recordUpdate('item-1', [], 'ACTION1');
      service.recordUpdate('item-2', [], 'ACTION2');

      const exported = service.exportHistory();
      expect(exported).toHaveLength(2);
    });

    it('should import history', () => {
      const entries: ProvenanceEntry[] = [
        {
          id: 'test-1',
          timestamp: Date.now(),
          entityId: 'item-1',
          action: 'IMPORTED',
          changes: [],
        },
      ];

      service.importHistory(entries);

      expect(service.getHistory('item-1')).toHaveLength(1);
      expect(service.getHistory('item-1')[0].action).toBe('IMPORTED');
    });
  });

  describe('getChangeSummary', () => {
    it('should summarize changes by property', () => {
      service.recordUpdate('item-1', [
        { property: 'label', oldValue: 'A', newValue: 'B' },
      ], 'UPDATE1');
      service.recordUpdate('item-1', [
        { property: 'label', oldValue: 'B', newValue: 'C' },
      ], 'UPDATE2');
      service.recordUpdate('item-1', [
        { property: 'summary', oldValue: 'X', newValue: 'Y' },
      ], 'UPDATE3');

      const summary = service.getChangeSummary('item-1');
      expect(summary.label).toBe(2);
      expect(summary.summary).toBe(1);
    });
  });
});

describe('provenanceService singleton', () => {
  it('should be exported', () => {
    expect(provenanceService).toBeDefined();
    expect(provenanceService).toBeInstanceOf(ProvenanceService);
  });
});
