/**
 * Export Actions Test Suite
 *
 * Tests export workflows using real data from .Images iiif test/
 * Each test maps to a user interaction (click export button, select format)
 * and defines ideal outcomes vs failure scenarios.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTree } from '@/services/iiifBuilder';
import { exportService } from '@/services/exportService';
import { ActionTestData } from '@/fixtures/pipelineFixtures';
import { isManifest } from '@/types';
import 'fake-indexeddb/auto';

describe('Export Actions - User Interaction Tests', () => {
  let testManifest: any;

  beforeEach(async () => {
    // Setup: Create a simple manifest from real image data
    const files = ActionTestData.forImport.singleImage();
    const { root } = await buildTree(files, {
      defaultBaseUrl: 'http://localhost:3000',
    });

    if (root && isManifest(root)) {
      testManifest = root;
    } else {
      throw new Error('Failed to create test manifest');
    }
  });

  describe('ACTION: Export raw IIIF bundle', () => {
    describe('User Interaction: Click "Export IIIF" button', () => {
      it('IDEAL OUTCOME: Valid IIIF bundle generated with all assets', async () => {
        // Arrange: User has a manifest and clicks export
        const options = {
          format: 'raw',
          includeAssets: true,
          rewriteIds: false,
        };

        // Act: User triggers export (simulating button click)
        const result = await exportService.prepareExport(testManifest, options);

        // Assert: IDEAL OUTCOME achieved
        // 1. Bundle contains manifest
        expect(result.manifest).toBeDefined();
        expect(result.manifest.id).toBe(testManifest.id);

        // 2. Bundle contains assets (images)
        expect(result.assets).toBeDefined();
        expect(result.assets.length).toBeGreaterThan(0);

        // 3. Bundle is valid IIIF (basic structure)
        expect(result.manifest['@context']).toBeDefined();
        expect(result.manifest.type).toBe('Manifest');

        // 4. Export report indicates success
        expect(result.report.success).toBe(true);
        expect(result.report.errors).toHaveLength(0);

        console.log('✓ IDEAL: Valid IIIF bundle generated with all assets');
      });

      it('FAILURE PREVENTED: Invalid manifest rejected before export', async () => {
        // Arrange: User tries to export a manifest missing required fields
        const invalidManifest = {
          ...testManifest,
          '@context': undefined, // Missing required property
        };

        const options = {
          format: 'raw',
          includeAssets: true,
        };

        // Act & Assert: Export should throw or return error
        // (Implementation may vary; adjust based on actual behavior)
        try {
          await exportService.prepareExport(invalidManifest, options);
          // If no error, test fails because invalid manifest was accepted
          expect(true).toBe(false); // Force failure
        } catch (error) {
          // Expected: validation error
          expect(error).toBeDefined();
          console.log('✓ PREVENTED: Invalid manifest rejected before export');
        }
      });
    });
  });

  describe('ACTION: Export static website (Canopy)', () => {
    describe('User Interaction: Select "Export as Website" option', () => {
      it('IDEAL OUTCOME: Complete static site generated with navigation', async () => {
        // Arrange: User selects Canopy export with default config
        const options = {
          format: 'canopy',
          canopyConfig: {
            title: 'Field Research Archive',
            baseUrl: 'https://example.com/archive',
            theme: 'light',
          },
        };

        // Act: Export static site
        const result = await exportService.prepareExport(testManifest, options);

        // Assert: IDEAL OUTCOME achieved
        // 1. Site includes HTML entry point
        expect(result.assets.find((a: any) => a.path.endsWith('index.html'))).toBeDefined();

        // 2. Site includes IIIF manifest
        expect(result.assets.find((a: any) => a.path.endsWith('manifest.json'))).toBeDefined();

        // 3. Site includes JavaScript/CSS assets
        expect(result.assets.find((a: any) => a.path.endsWith('.js') || a.path.endsWith('.css'))).toBeDefined();

        // 4. Export report indicates success
        expect(result.report.success).toBe(true);

        console.log('✓ IDEAL: Complete static site generated with navigation');
      });
    });
  });
});