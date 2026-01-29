/**
 * Unit Tests for services/csvImporter.ts
 *
 * Tests CSV parsing and metadata import functionality.
 */

import { describe, it, expect } from 'vitest';
import {
  CSVImporterService,
  csvImporter,
  parseCSV,
  validateCSVColumns,
  generateCSVTemplate,
  type CSVRow,
  type ColumnMapping,
} from '../../../services/csvImporter';
import type { IIIFManifest } from '../../../types';

describe('CSVImporterService', () => {
  describe('parseCSV', () => {
    it('should parse simple CSV', () => {
      const csv = 'id,label\n1,Test Item\n2,Another Item';
      const result = parseCSV(csv);

      expect(result.headers).toEqual(['id', 'label']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({ id: '1', label: 'Test Item' });
    });

    it('should handle quoted fields with commas', () => {
      const csv = 'id,label,description\n1,Item,"Description, with comma"';
      const result = parseCSV(csv);

      expect(result.rows[0].description).toBe('Description, with comma');
    });

    it('should handle empty values', () => {
      const csv = 'id,label,optional\n1,Test,';
      const result = parseCSV(csv);

      expect(result.rows[0].optional).toBe('');
    });

    it('should handle Windows line endings', () => {
      const csv = 'id,label\r\n1,Test\r\n2,Another';
      const result = parseCSV(csv);

      expect(result.rows).toHaveLength(2);
    });
  });

  describe('validateCSVColumns', () => {
    it('should validate supported columns', () => {
      const headers = ['id', 'label', 'summary', 'rights'];
      const result = validateCSVColumns(headers);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about unknown columns', () => {
      const headers = ['id', 'label', 'unknown_column'];
      const result = validateCSVColumns(headers);

      expect(result.valid).toBe(true);
      expect(result.warnings?.length).toBeGreaterThan(0);
    });

    it('should require id column', () => {
      const headers = ['label', 'summary'];
      const result = validateCSVColumns(headers);

      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('id'))).toBe(true);
    });

    it('should suggest column mappings', () => {
      const headers = ['title', 'creator', 'date'];
      const result = validateCSVColumns(headers);

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.['title']).toBeDefined();
    });
  });

  describe('generateCSVTemplate', () => {
    it('should generate template with standard columns', () => {
      const template = generateCSVTemplate();

      expect(template).toContain('id');
      expect(template).toContain('label');
      expect(template).toContain('summary');
    });

    it('should include example row', () => {
      const template = generateCSVTemplate();

      expect(template).toContain('example');
      expect(template.split('\n').length).toBeGreaterThan(1);
    });

    it('should include metadata columns when requested', () => {
      const template = generateCSVTemplate({ includeMetadata: true });

      expect(template).toContain('metadata');
    });
  });

  describe('mapRowToMetadata', () => {
    it('should map CSV row to IIIF metadata', () => {
      const row: CSVRow = {
        id: 'https://example.com/manifest',
        label: 'Test Manifest',
        'metadata.creator': 'John Doe',
        'metadata.date': '2024',
      };

      const mapping: ColumnMapping[] = [
        { csvColumn: 'id', iiifProperty: 'id' },
        { csvColumn: 'label', iiifProperty: 'label' },
        { csvColumn: 'metadata.creator', iiifProperty: 'metadata.creator' },
        { csvColumn: 'metadata.date', iiifProperty: 'metadata.date' },
      ];

      const service = new CSVImporterService();
      const result = service.mapRowToMetadata(row, mapping);

      expect(result.id).toBe('https://example.com/manifest');
      expect(result.label).toEqual({ none: ['Test Manifest'] });
      expect(result.metadata).toBeDefined();
    });

    it('should handle language-specific labels', () => {
      const row: CSVRow = {
        id: 'https://example.com/manifest',
        'label:en': 'English Label',
        'label:fr': 'French Label',
      };

      const mapping: ColumnMapping[] = [
        { csvColumn: 'id', iiifProperty: 'id' },
        { csvColumn: 'label:en', iiifProperty: 'label.en' },
        { csvColumn: 'label:fr', iiifProperty: 'label.fr' },
      ];

      const service = new CSVImporterService();
      const result = service.mapRowToMetadata(row, mapping);

      expect(result.label?.en).toEqual(['English Label']);
      expect(result.label?.fr).toEqual(['French Label']);
    });
  });

  describe('importToManifest', () => {
    it('should update manifest with CSV data', () => {
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest',
        type: 'Manifest',
        label: { en: ['Original'] },
        items: [],
      };

      const csvData = {
        id: 'https://example.com/manifest',
        label: 'Updated Label',
        summary: 'Updated Summary',
      };

      const service = new CSVImporterService();
      const updated = service.importToManifest(manifest, csvData);

      expect(updated.label).toEqual({ none: ['Updated Label'] });
      expect(updated.summary).toEqual({ none: ['Updated Summary'] });
    });

    it('should not change ID', () => {
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest',
        type: 'Manifest',
        label: { en: ['Test'] },
        items: [],
      };

      const csvData = {
        id: 'https://example.com/different-id',
        label: 'Updated',
      };

      const service = new CSVImporterService();
      const updated = service.importToManifest(manifest, csvData);

      expect(updated.id).toBe('https://example.com/manifest');
    });
  });

  describe('detectColumnTypes', () => {
    it('should detect ID column', () => {
      const rows: CSVRow[] = [
        { id: 'https://example.com/1', label: 'Item 1' },
        { id: 'https://example.com/2', label: 'Item 2' },
      ];

      const service = new CSVImporterService();
      const types = service.detectColumnTypes(rows);

      expect(types['id']).toBe('uri');
    });

    it('should detect date columns', () => {
      const rows: CSVRow[] = [
        { date: '2024-01-15', label: 'Item' },
        { date: '2023-12-01', label: 'Item' },
      ];

      const service = new CSVImporterService();
      const types = service.detectColumnTypes(rows);

      expect(types['date']).toBe('date');
    });

    it('should detect number columns', () => {
      const rows: CSVRow[] = [
        { count: '10', label: 'Item' },
        { count: '25', label: 'Item' },
      ];

      const service = new CSVImporterService();
      const types = service.detectColumnTypes(rows);

      expect(types['count']).toBe('number');
    });
  });
});

describe('csvImporter singleton', () => {
  it('should be exported', () => {
    expect(csvImporter).toBeDefined();
    expect(csvImporter).toBeInstanceOf(CSVImporterService);
  });
});
