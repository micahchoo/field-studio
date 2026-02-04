/**
 * Unit Tests for services/csvImporter.ts
 *
 * Tests CSV parsing and metadata import functionality.
 */

import { describe, expect, it } from 'vitest';
import {
  csvImporter,
  CSVImporterService,
} from '@/services/csvImporter';
import type { IIIFCollection, IIIFManifest } from '@/types';

describe('CSVImporterService', () => {
  describe('parseCSV', () => {
    it('should parse simple CSV', () => {
      const csv = 'id,label\n1,Test Item\n2,Another Item';
      const service = new CSVImporterService();
      const result = service.parseCSV(csv);

      expect(result.headers).toEqual(['id', 'label']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({ id: '1', label: 'Test Item' });
    });

    it('should handle quoted fields with commas', () => {
      const csv = 'id,label,description\n1,Item,"Description, with comma"';
      const service = new CSVImporterService();
      const result = service.parseCSV(csv);

      expect(result.rows[0].description).toBe('Description, with comma');
    });

    it('should handle empty values', () => {
      const csv = 'id,label,optional\n1,Test,';
      const service = new CSVImporterService();
      const result = service.parseCSV(csv);

      expect(result.rows[0].optional).toBe('');
    });

    it('should handle Windows line endings', () => {
      const csv = 'id,label\r\n1,Test\r\n2,Another';
      const service = new CSVImporterService();
      const result = service.parseCSV(csv);

      expect(result.rows).toHaveLength(2);
    });

    it('should handle empty CSV', () => {
      const service = new CSVImporterService();
      const result = service.parseCSV('');

      expect(result.headers).toEqual([]);
      expect(result.rows).toHaveLength(0);
    });
  });

  describe('detectFilenameColumn', () => {
    it('should detect filename column', () => {
      const service = new CSVImporterService();
      const result = service.detectFilenameColumn(['id', 'filename', 'label']);

      expect(result).toBe('filename');
    });

    it('should detect file column as fallback', () => {
      const service = new CSVImporterService();
      const result = service.detectFilenameColumn(['id', 'file', 'label']);

      expect(result).toBe('file');
    });

    it('should return first column if no known filename column', () => {
      const service = new CSVImporterService();
      // 'name' is a known filename column candidate, so use columns without known names
      const result = service.detectFilenameColumn(['custom', 'data', 'field']);

      expect(result).toBe('custom');
    });
  });

  describe('autoDetectMappings', () => {
    it('should detect label mapping', () => {
      const service = new CSVImporterService();
      const mappings = service.autoDetectMappings(['filename', 'label', 'unknown'], 'filename');

      const labelMapping = mappings.find(m => m.csvColumn === 'label');
      expect(labelMapping).toBeDefined();
      expect(labelMapping?.iiifProperty).toBe('label');
    });

    it('should detect description mapping to metadata.description', () => {
      const service = new CSVImporterService();
      const mappings = service.autoDetectMappings(['filename', 'description'], 'filename');

      const descMapping = mappings.find(m => m.csvColumn === 'description');
      expect(descMapping).toBeDefined();
      // 'description' maps to 'metadata.description' in the aliases
      expect(descMapping?.iiifProperty).toBe('metadata.description');
    });

    it('should skip filename and manifest columns', () => {
      const service = new CSVImporterService();
      const mappings = service.autoDetectMappings(['filename', 'manifest', 'label'], 'filename');

      expect(mappings.some(m => m.csvColumn === 'filename')).toBe(false);
      expect(mappings.some(m => m.csvColumn === 'manifest')).toBe(false);
    });
  });

  describe('isFromStagingTemplate', () => {
    it('should identify staging template format', () => {
      const service = new CSVImporterService();
      const result = service.isFromStagingTemplate(['filename', 'manifest', 'label']);

      expect(result).toBe(true);
    });

    it('should return false without filename column', () => {
      const service = new CSVImporterService();
      const result = service.isFromStagingTemplate(['id', 'label', 'summary']);

      expect(result).toBe(false);
    });

    it('should return false without metadata properties', () => {
      const service = new CSVImporterService();
      const result = service.isFromStagingTemplate(['filename', 'manifest', 'other']);

      expect(result).toBe(false);
    });
  });

  describe('applyMappings', () => {
    it('should apply mappings to manifest', () => {
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest',
        type: 'Manifest',
        label: { en: ['Original'] },
        items: [
          {
            id: 'https://example.com/canvas1',
            type: 'Canvas',
            label: { none: ['image1.jpg'] },
          }
        ],
      };

      const rows = [
        { filename: 'image1.jpg', title: 'Updated Title' }
      ];

      const service = new CSVImporterService();
      const { updatedRoot, result } = service.applyMappings(
        manifest,
        rows,
        'filename',
        [{ csvColumn: 'title', iiifProperty: 'label', language: 'en' }]
      );

      expect(result.matched).toBe(1);
    });

    it('should track unmatched rows', () => {
      const collection: IIIFCollection = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/collection',
        type: 'Collection',
        label: { en: ['Test'] },
        items: [],
      };

      const rows = [
        { filename: 'nonexistent.jpg', label: 'Test' }
      ];

      const service = new CSVImporterService();
      const { result } = service.applyMappings(
        collection,
        rows,
        'filename',
        [{ csvColumn: 'label', iiifProperty: 'label', language: 'en' }]
      );

      expect(result.unmatched).toBe(1);
    });
  });

  describe('exportCSV', () => {
    it('should export items to CSV format', () => {
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest',
        type: 'Manifest',
        label: { en: ['Test Manifest'] },
        items: [
          {
            id: 'https://example.com/canvas1',
            type: 'Canvas',
            label: { none: ['image1.jpg'] },
          }
        ],
      };

      const service = new CSVImporterService();
      const result = service.exportCSV(manifest, { properties: ['label'] });

      expect(result.csv).toContain('id');
      expect(result.csv).toContain('filename');
      expect(result.csv).toContain('label');
      expect(result.itemCount).toBe(1);
    });

    it('should include specified properties', () => {
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest',
        type: 'Manifest',
        label: { en: ['Test'] },
        items: [],
      };

      const service = new CSVImporterService();
      const result = service.exportCSV(manifest, { properties: ['label', 'summary'] });

      expect(result.columnCount).toBeGreaterThan(0);
    });
  });

  describe('exportCSVSmart', () => {
    it('should only include properties with values', () => {
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest',
        type: 'Manifest',
        label: { en: ['Test'] },
        items: [
          {
            id: 'https://example.com/canvas1',
            type: 'Canvas',
            label: { none: ['image1.jpg'] },
            // no summary
          }
        ],
      };

      const service = new CSVImporterService();
      const result = service.exportCSVSmart(manifest);

      expect(result.itemCount).toBe(1);
    });
  });

  describe('getSupportedProperties', () => {
    it('should return supported properties', () => {
      const service = new CSVImporterService();
      const properties = service.getSupportedProperties();

      expect(properties).toContain('label');
      expect(properties).toContain('summary');
      expect(properties.length).toBeGreaterThan(0);
    });
  });

  describe('getExportColumns', () => {
    it('should return column definitions', () => {
      const service = new CSVImporterService();
      const columns = service.getExportColumns();

      expect(columns.length).toBeGreaterThan(0);
      expect(columns[0]).toHaveProperty('key');
      expect(columns[0]).toHaveProperty('label');
      expect(columns[0]).toHaveProperty('category');
    });
  });
});

// NOTE: Removed trivial "should be exported" and "should have all service methods" tests.
// These tests provide zero behavioral value and simply verify that a module exports something.
// The actual functionality of csvImporter is tested throughout the CSVImporterService test suite above.
