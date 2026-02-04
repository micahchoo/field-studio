/**
 * Unit Tests for services/provenanceService.ts
 *
 * Tests provenance tracking and history management.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type PropertyChange,
  provenanceService,
  ProvenanceService,
} from '@/services/provenanceService';

describe('ProvenanceService', () => {
  let service: ProvenanceService;

  beforeEach(() => {
    service = new ProvenanceService();
  });

  describe('recordCreate', () => {
    it('should record creation', () => {
      const entry = service.recordCreate('item-1', 'Manifest');

      expect(entry).toBeDefined();
      expect(entry.action).toBe('create');
      expect(entry.timestamp).toBeDefined();
    });

    it('should include agent information', () => {
      service.setAgent({ type: 'Software', name: 'TestAgent', version: '1.0' });
      const entry = service.recordCreate('item-1', 'Manifest');

      expect(entry.agent.name).toBe('TestAgent');
    });
  });

  describe('recordUpdate', () => {
    it('should record update with changes', () => {
      service.recordCreate('item-1', 'Manifest');

      const changes: PropertyChange[] = [
        { property: 'label', oldValue: 'Old', newValue: 'New' },
      ];
      const entry = service.recordUpdate('item-1', changes, 'UPDATE');

      expect(entry).toBeDefined();
      expect(entry?.action).toBe('update');
      expect(entry?.changes).toEqual(changes);
    });

    it('should return null for unknown entity', () => {
      const changes: PropertyChange[] = [
        { property: 'label', oldValue: 'Old', newValue: 'New' },
      ];
      const entry = service.recordUpdate('unknown', changes, 'UPDATE');

      expect(entry).toBeNull();
    });

    it('should assign timestamp', () => {
      service.recordCreate('item-1', 'Manifest');

      const before = Date.now();
      const entry = service.recordUpdate('item-1', [], 'UPDATE');
      const after = Date.now();
      const entryTime = new Date(entry?.timestamp || '').getTime();

      expect(entryTime).toBeGreaterThanOrEqual(before);
      expect(entryTime).toBeLessThanOrEqual(after);
    });

    it('should assign unique ID', () => {
      service.recordCreate('item-1', 'Manifest');

      const entry1 = service.recordUpdate('item-1', [], 'UPDATE1');
      const entry2 = service.recordUpdate('item-1', [], 'UPDATE2');

      expect(entry1?.id).not.toBe(entry2?.id);
    });
  });

  describe('getProvenance', () => {
    it('should return provenance for resource', () => {
      service.recordCreate('item-1', 'Manifest');

      const provenance = service.getProvenance('item-1');

      expect(provenance).toBeDefined();
      expect(provenance?.resourceId).toBe('item-1');
      expect(provenance?.resourceType).toBe('Manifest');
    });

    it('should return null for unknown resource', () => {
      const provenance = service.getProvenance('unknown');

      expect(provenance).toBeNull();
    });
  });

  describe('getHistory', () => {
    it('should return entries in chronological order', () => {
      service.recordCreate('item-1', 'Manifest');
      service.recordUpdate('item-1', [], 'UPDATE1');
      service.recordUpdate('item-1', [], 'UPDATE2');

      const history = service.getHistory('item-1');

      expect(history).toHaveLength(3);
      expect(history[0].action).toBe('create');
      expect(history[1].action).toBe('update');
      expect(history[2].action).toBe('update');
    });

    it('should return empty array for unknown entity', () => {
      const history = service.getHistory('unknown');

      expect(history).toEqual([]);
    });

    it('should include export events', () => {
      service.recordCreate('item-1', 'Manifest');
      service.recordExport('item-1', 'JSON');

      const history = service.getHistory('item-1');

      expect(history.some(h => h.action === 'export')).toBe(true);
    });
  });

  describe('recordBatchUpdate', () => {
    it('should record batch update for multiple resources', () => {
      service.recordCreate('item-1', 'Manifest');
      service.recordCreate('item-2', 'Manifest');

      const changes: PropertyChange[] = [
        { property: 'label', oldValue: 'Old', newValue: 'New' },
      ];
      const entries = service.recordBatchUpdate(['item-1', 'item-2'], changes, 'BATCH');

      expect(entries).toHaveLength(2);
      expect(entries[0].action).toBe('batch-update');
      expect(entries[0].affectedCount).toBe(2);
    });
  });

  describe('recordExport', () => {
    it('should record export event', () => {
      service.recordCreate('item-1', 'Manifest');

      const entry = service.recordExport('item-1', 'JSON', '/path/to/file');

      expect(entry).toBeDefined();
      expect(entry?.action).toBe('export');
      expect(entry?.description).toContain('JSON');
      expect(entry?.description).toContain('/path/to/file');
    });

    it('should return null for unknown entity', () => {
      const entry = service.recordExport('unknown', 'JSON');

      expect(entry).toBeNull();
    });
  });

  describe('recordExternalImport', () => {
    it('should record external import', () => {
      const entry = service.recordExternalImport('item-1', 'Manifest', 'https://example.com/manifest.json');

      expect(entry).toBeDefined();
      expect(entry.action).toBe('import-external');
      expect(entry.description).toContain('https://example.com/manifest.json');
    });
  });

  describe('exportPREMIS', () => {
    it('should export as PREMIS XML', () => {
      service.recordCreate('item-1', 'Manifest');

      const xml = service.exportPREMIS('item-1');

      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<premis:premis');
      expect(xml).toContain('item-1');
    });

    it('should return empty string for unknown resource', () => {
      const xml = service.exportPREMIS('unknown');

      expect(xml).toBe('');
    });
  });

  describe('exportMultiplePREMIS', () => {
    it('should export multiple resources', () => {
      service.recordCreate('item-1', 'Manifest');
      service.recordCreate('item-2', 'Canvas');

      const xml = service.exportMultiplePREMIS(['item-1', 'item-2']);

      expect(xml).toContain('item-1');
      expect(xml).toContain('item-2');
    });
  });

  describe('exportAllJSON', () => {
    it('should export all provenance as JSON', () => {
      service.recordCreate('item-1', 'Manifest');
      service.recordCreate('item-2', 'Canvas');

      const json = service.exportAllJSON();
      const data = JSON.parse(json);

      expect(data['item-1']).toBeDefined();
      expect(data['item-2']).toBeDefined();
    });
  });

  describe('importJSON', () => {
    it('should import provenance from JSON', () => {
      const data = {
        'item-1': {
          resourceId: 'item-1',
          resourceType: 'Manifest',
          created: {
            id: 'test-id',
            timestamp: new Date().toISOString(),
            action: 'create' as const,
            agent: { type: 'Software' as const, name: 'Test' },
          },
          modified: [],
          exports: [],
        },
      };

      service.importJSON(JSON.stringify(data));

      const provenance = service.getProvenance('item-1');
      expect(provenance).toBeDefined();
      expect(provenance?.resourceType).toBe('Manifest');
    });
  });

  describe('getStats', () => {
    it('should return statistics', () => {
      service.recordCreate('item-1', 'Manifest');
      service.recordCreate('item-2', 'Canvas');
      service.recordUpdate('item-1', [], 'UPDATE');

      const stats = service.getStats();

      expect(stats.resourceCount).toBe(2);
      expect(stats.totalModifications).toBe(1);
      expect(stats.resourcesByType['Manifest']).toBe(1);
      expect(stats.resourcesByType['Canvas']).toBe(1);
    });

    it('should return empty stats when no data', () => {
      const stats = service.getStats();

      expect(stats.resourceCount).toBe(0);
      expect(stats.totalModifications).toBe(0);
      expect(stats.totalExports).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all provenance data', () => {
      service.recordCreate('item-1', 'Manifest');
      service.recordCreate('item-2', 'Manifest');

      service.clear();

      expect(service.getProvenance('item-1')).toBeNull();
      expect(service.getProvenance('item-2')).toBeNull();
      expect(service.getStats().resourceCount).toBe(0);
    });
  });
});

// NOTE: Removed trivial "should be exported" and "should have all service methods" tests.
// These tests provide zero behavioral value and simply verify that a module exports something.
// The actual functionality of provenanceService is tested throughout the ProvenanceService test suite above.
