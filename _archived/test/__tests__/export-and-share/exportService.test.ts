/**
 * Unit Tests for services/exportService.ts
 *
 * Tests IIIF export functionality including:
 * - Raw IIIF export
 * - Static site export
 * - Canopy export with configuration
 * - Image API options
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type CanopyConfig,
  DEFAULT_IIIF_PORT,
  type ExportOptions,
  exportService,
} from '@/services/exportService';
import type { IIIFCanvas, IIIFCollection, IIIFManifest } from '@/types';

// Mock JSZip
vi.mock('jszip', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      file: vi.fn(),
      generateAsync: vi.fn().mockResolvedValue(new Blob(['zip content'], { type: 'application/zip' })),
    })),
  };
});

// Mock validator
vi.mock('../../../services/validator', () => ({
  validator: {
    validateTree: vi.fn().mockReturnValue({}),
  },
}));

describe('ExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('prepareExport', () => {
    it('should prepare raw IIIF export structure', async () => {
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest',
        type: 'Manifest',
        label: { en: ['Test Manifest'] },
        items: [],
      };

      const options: ExportOptions = {
        includeAssets: false,
        format: 'raw-iiif',
      };

      const files = await exportService.prepareExport(manifest, options);

      // Should include manifest JSON
      const manifestFile = files.find(f => f.path.includes('manifest'));
      expect(manifestFile).toBeDefined();
      expect(manifestFile?.type).toBe('json');
    });

    it('should prepare static site export with HTML', async () => {
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest',
        type: 'Manifest',
        label: { en: ['Test Manifest'] },
        items: [],
      };

      const options: ExportOptions = {
        includeAssets: false,
        format: 'static-site',
      };

      const files = await exportService.prepareExport(manifest, options);

      // Should include index.html
      const htmlFile = files.find(f => f.path === 'index.html');
      expect(htmlFile).toBeDefined();
      expect(htmlFile?.type).toBe('html');
    });

    it('should prepare Canopy export with config', async () => {
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest',
        type: 'Manifest',
        label: { en: ['Test Manifest'] },
        items: [],
      };

      const canopyConfig: CanopyConfig = {
        title: 'Test Collection',
        baseUrl: 'http://localhost:8000',
        port: 9999,
        theme: {
          accentColor: 'blue',
          grayColor: 'gray',
          appearance: 'light',
        },
        search: {
          enabled: true,
          indexSummary: true,
        },
        metadata: ['label', 'creator'],
        featured: [],
      };

      const options: ExportOptions = {
        includeAssets: false,
        format: 'canopy',
        canopyConfig,
      };

      const files = await exportService.prepareExport(manifest, options);

      // Should include canopy.yml
      const configFile = files.find(f => f.path === 'canopy.yml');
      expect(configFile).toBeDefined();
      expect(configFile?.type).toBe('info');
    });

    it('should handle collection with manifests', async () => {
      const collection: IIIFCollection = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/collection',
        type: 'Collection',
        label: { en: ['Test Collection'] },
        items: [
          {
            id: 'https://example.com/manifest1',
            type: 'Manifest',
            label: { en: ['Manifest 1'] },
            items: [],
          },
          {
            id: 'https://example.com/manifest2',
            type: 'Manifest',
            label: { en: ['Manifest 2'] },
            items: [],
          },
        ],
      };

      const options: ExportOptions = {
        includeAssets: false,
        format: 'raw-iiif',
      };

      const files = await exportService.prepareExport(collection, options);

      // Should include collection and both manifests
      const collectionFile = files.find(f => f.path.includes('collection'));
      const manifestFiles = files.filter(f => f.path.includes('manifest'));

      expect(collectionFile).toBeDefined();
      expect(manifestFiles.length).toBeGreaterThanOrEqual(2);
    });

    it('should use correct directory naming for Canopy format', async () => {
      const collection: IIIFCollection = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/collection',
        type: 'Collection',
        label: { en: ['Test Collection'] },
        items: [
          {
            id: 'https://example.com/manifest1',
            type: 'Manifest',
            label: { en: ['Manifest 1'] },
            items: [],
          },
        ],
      };

      const options: ExportOptions = {
        includeAssets: false,
        format: 'canopy',
        canopyConfig: {
          title: 'Test',
          theme: { accentColor: 'blue', grayColor: 'gray', appearance: 'light' },
          search: { enabled: false, indexSummary: false },
          metadata: [],
          featured: [],
        },
      };

      const files = await exportService.prepareExport(collection, options);

      // Canopy uses plural directory names
      expect(files.some(f => f.path.includes('collections/'))).toBe(true);
      expect(files.some(f => f.path.includes('manifests/'))).toBe(true);
    });

    it('should rewrite IDs for Canopy format', async () => {
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/my-manifest',
        type: 'Manifest',
        label: { en: ['Test'] },
        items: [],
      };

      const options: ExportOptions = {
        includeAssets: false,
        format: 'canopy',
        canopyConfig: {
          title: 'Test',
          baseUrl: 'http://localhost:8000',
          theme: { accentColor: 'blue', grayColor: 'gray', appearance: 'light' },
          search: { enabled: false, indexSummary: false },
          metadata: [],
          featured: [],
        },
      };

      const files = await exportService.prepareExport(manifest, options);
      const manifestFile = files.find(f => f.path.includes('manifest'));
      
      expect(manifestFile).toBeDefined();
      if (manifestFile && typeof manifestFile.content === 'string') {
        const content = JSON.parse(manifestFile.content);
        expect(content.id).toContain('localhost:8000');
      }
    });
  });

  describe('exportArchive', () => {
    it('should export as ZIP archive', async () => {
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest',
        type: 'Manifest',
        label: { en: ['Test'] },
        items: [],
      };

      const options: ExportOptions = {
        includeAssets: false,
        format: 'raw-iiif',
      };

      const progressMock = vi.fn();
      const blob = await exportService.exportArchive(manifest, options, progressMock);

      expect(blob).toBeInstanceOf(Blob);
      expect(progressMock).toHaveBeenCalledWith(expect.objectContaining({ percent: 100 }));
    });

    it('should call progress callback during export', async () => {
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest',
        type: 'Manifest',
        label: { en: ['Test'] },
        items: [],
      };

      const options: ExportOptions = {
        includeAssets: false,
        format: 'raw-iiif',
      };

      const progressMock = vi.fn();
      await exportService.exportArchive(manifest, options, progressMock);

      expect(progressMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'Synthesizing structure...' }));
      expect(progressMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'Export Complete' }));
    });

    it('should throw on validation errors when ignoreErrors is false', async () => {
      const { validator } = await import('../../../services/validator');
      vi.mocked(validator.validateTree).mockReturnValueOnce({
        'test-id': [{
          id: '1',
          itemId: 'test-id',
          itemLabel: 'Test',
          level: 'error',
          category: 'Identity',
          message: 'Invalid ID',
          fixable: false,
        }],
      });

      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest',
        type: 'Manifest',
        label: { en: ['Test'] },
        items: [],
      };

      const options: ExportOptions = {
        includeAssets: false,
        format: 'raw-iiif',
        ignoreErrors: false,
      };

      await expect(exportService.exportArchive(manifest, options, vi.fn())).rejects.toThrow('Archive Integrity Failed');
    });

    it('should not throw on validation errors when ignoreErrors is true', async () => {
      const { validator } = await import('../../../services/validator');
      vi.mocked(validator.validateTree).mockReturnValueOnce({
        'test-id': [{
          id: '1',
          itemId: 'test-id',
          itemLabel: 'Test',
          level: 'error',
          category: 'Identity',
          message: 'Invalid ID',
          fixable: false,
        }],
      });

      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest',
        type: 'Manifest',
        label: { en: ['Test'] },
        items: [],
      };

      const options: ExportOptions = {
        includeAssets: false,
        format: 'raw-iiif',
        ignoreErrors: true,
      };

      await expect(exportService.exportArchive(manifest, options, vi.fn())).resolves.toBeDefined();
    });
  });

  describe('constants', () => {
    it('should have correct default IIIF port', () => {
      expect(DEFAULT_IIIF_PORT).toBe(8765);
    });
  });

  // NOTE: Removed trivial "should be exported" and "should have public methods" tests.
  // These tests provide zero behavioral value and simply verify that a module exports something.
  // The actual functionality of exportService is tested throughout the ExportService test suite above.
});
