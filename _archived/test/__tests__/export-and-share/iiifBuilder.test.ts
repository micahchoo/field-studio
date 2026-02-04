/**
 * Unit Tests for services/iiifBuilder.ts
 *
 * Tests IIIF resource construction, manifest generation, and validation.
 */

import { describe, expect, it } from 'vitest';
import {
  buildManifestFromFiles,
  createAnnotation,
  createAnnotationPage,
  createCanvas,
  createCollection,
  createManifest,
  createRange,
  validateIIIFResource,
} from '@/services/iiifBuilder';

// ============================================================================
// Manifest Creation Tests
// ============================================================================

describe('createManifest', () => {
  it('should create valid IIIF 3.0 manifest', () => {
    const manifest = createManifest({
      id: 'https://example.com/manifest',
      label: { en: ['Test Manifest'] },
    });

    expect(manifest['@context']).toBe('http://iiif.io/api/presentation/3/context.json');
    expect(manifest.type).toBe('Manifest');
    expect(manifest.id).toBe('https://example.com/manifest');
    expect(manifest.label).toEqual({ en: ['Test Manifest'] });
  });

  it('should include optional properties', () => {
    const manifest = createManifest({
      id: 'https://example.com/manifest',
      label: { en: ['Test'] },
      summary: { en: ['Summary'] },
      metadata: [
        {
          label: { en: ['Creator'] },
          value: { en: ['John Doe'] },
        },
      ],
      rights: 'https://creativecommons.org/licenses/by/4.0/',
    });

    expect(manifest.summary).toEqual({ en: ['Summary'] });
    expect(manifest.metadata).toHaveLength(1);
    expect(manifest.rights).toBe('https://creativecommons.org/licenses/by/4.0/');
  });

  it('should initialize empty items array', () => {
    const manifest = createManifest({
      id: 'https://example.com/manifest',
      label: { en: ['Test'] },
    });

    expect(manifest.items).toEqual([]);
  });

  it('should add behaviors', () => {
    const manifest = createManifest({
      id: 'https://example.com/manifest',
      label: { en: ['Test'] },
      behavior: ['paged'],
    });

    expect(manifest.behavior).toContain('paged');
  });
});

// ============================================================================
// Canvas Creation Tests
// ============================================================================

describe('createCanvas', () => {
  it('should create valid canvas with dimensions', () => {
    const canvas = createCanvas({
      id: 'https://example.com/canvas/1',
      label: { en: ['Page 1'] },
      width: 1000,
      height: 1500,
    });

    expect(canvas.type).toBe('Canvas');
    expect(canvas.width).toBe(1000);
    expect(canvas.height).toBe(1500);
  });

  it('should initialize items array for annotations', () => {
    const canvas = createCanvas({
      id: 'https://example.com/canvas/1',
      label: { en: ['Page 1'] },
      width: 1000,
      height: 1000,
    });

    expect(canvas.items).toEqual([]);
  });

  it('should add duration for time-based media', () => {
    const canvas = createCanvas({
      id: 'https://example.com/canvas/1',
      label: { en: ['Video'] },
      width: 1920,
      height: 1080,
      duration: 120.5,
    });

    expect(canvas.duration).toBe(120.5);
  });
});

// ============================================================================
// Annotation Creation Tests
// ============================================================================

describe('createAnnotation', () => {
  it('should create painting annotation', () => {
    const annotation = createAnnotation({
      id: 'https://example.com/annotation/1',
      motivation: 'painting',
      target: 'https://example.com/canvas/1',
      body: {
        id: 'https://example.com/image.jpg',
        type: 'Image',
        format: 'image/jpeg',
        width: 1000,
        height: 1000,
      },
    });

    expect(annotation.type).toBe('Annotation');
    expect(annotation.motivation).toBe('painting');
    expect(annotation.target).toBe('https://example.com/canvas/1');
  });

  it('should create text annotation', () => {
    const annotation = createAnnotation({
      id: 'https://example.com/annotation/1',
      motivation: 'commenting',
      target: 'https://example.com/canvas/1#xywh=100,100,200,200',
      body: {
        type: 'TextualBody',
        value: 'This is a comment',
        format: 'text/plain',
        language: 'en',
      },
    });

    expect(annotation.motivation).toBe('commenting');
    expect((annotation.body as any).value).toBe('This is a comment');
  });

  it('should handle fragment selector', () => {
    const annotation = createAnnotation({
      id: 'https://example.com/annotation/1',
      motivation: 'painting',
      target: {
        type: 'SpecificResource',
        source: 'https://example.com/canvas/1',
        selector: {
          type: 'FragmentSelector',
          value: 'xywh=100,100,500,500',
        },
      },
      body: {
        id: 'https://example.com/image.jpg',
        type: 'Image',
      },
    });

    expect((annotation.target as any).selector.type).toBe('FragmentSelector');
  });
});

// ============================================================================
// Annotation Page Creation Tests
// ============================================================================

describe('createAnnotationPage', () => {
  it('should create annotation page', () => {
    const page = createAnnotationPage({
      id: 'https://example.com/page/1',
      items: [],
    });

    expect(page.type).toBe('AnnotationPage');
    expect(page.items).toEqual([]);
  });

  it('should contain annotations', () => {
    const annotation = createAnnotation({
      id: 'https://example.com/annotation/1',
      motivation: 'painting',
      target: 'https://example.com/canvas/1',
      body: {
        id: 'https://example.com/image.jpg',
        type: 'Image',
      },
    });

    const page = createAnnotationPage({
      id: 'https://example.com/page/1',
      items: [annotation],
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0].type).toBe('Annotation');
  });
});

// ============================================================================
// Collection Creation Tests - REMOVED (Redundant with iiifHierarchy.test.ts)
// ============================================================================
// Basic collection creation tests removed - comprehensive collection operations
// are tested in iiifHierarchy.test.ts (getCollectionManifests, addManifestToCollection,
// removeManifestFromCollection, etc.)

// ============================================================================
// Range Creation Tests
// ============================================================================

describe('createRange', () => {
  it('should create range', () => {
    const range = createRange({
      id: 'https://example.com/range/1',
      label: { en: ['Chapter 1'] },
      items: [],
    });

    expect(range.type).toBe('Range');
    expect(range.label).toEqual({ en: ['Chapter 1'] });
  });

  it('should reference canvases', () => {
    const range = createRange({
      id: 'https://example.com/range/1',
      label: { en: ['Chapter 1'] },
      items: [
        {
          id: 'https://example.com/canvas/1',
          type: 'Canvas',
        },
        {
          id: 'https://example.com/canvas/2',
          type: 'Canvas',
        },
      ],
    });

    expect(range.items).toHaveLength(2);
  });

  it('should support nested ranges', () => {
    const childRange = createRange({
      id: 'https://example.com/range/1.1',
      label: { en: ['Section 1.1'] },
      items: [],
    });

    const parentRange = createRange({
      id: 'https://example.com/range/1',
      label: { en: ['Chapter 1'] },
      items: [
        {
          id: childRange.id,
          type: 'Range',
        },
      ],
    });

    expect(parentRange.items[0].type).toBe('Range');
  });
});

// ============================================================================
// Build Manifest from Files Tests
// ============================================================================

describe('buildManifestFromFiles', () => {
  it('should create manifest from image files', async () => {
    const files = [
      {
        name: 'image1.jpg',
        type: 'image/jpeg',
        size: 1024,
        blob: new Blob(['fake image'], { type: 'image/jpeg' }),
      },
      {
        name: 'image2.jpg',
        type: 'image/jpeg',
        size: 2048,
        blob: new Blob(['fake image'], { type: 'image/jpeg' }),
      },
    ];

    const manifest = await buildManifestFromFiles(files, {
      label: { en: ['Generated Manifest'] },
    });

    expect(manifest.type).toBe('Manifest');
    expect(manifest.items.length).toBe(2);
  });

  it('should preserve file order', async () => {
    const files = [
      { name: 'page001.jpg', type: 'image/jpeg', size: 1024, blob: new Blob() },
      { name: 'page002.jpg', type: 'image/jpeg', size: 1024, blob: new Blob() },
      { name: 'page003.jpg', type: 'image/jpeg', size: 1024, blob: new Blob() },
    ];

    const manifest = await buildManifestFromFiles(files, {
      label: { en: ['Test'] },
    });

    expect(manifest.items[0].label).toMatchObject({ en: expect.arrayContaining(['page001.jpg']) });
    expect(manifest.items[2].label).toMatchObject({ en: expect.arrayContaining(['page003.jpg']) });
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe('validateIIIFResource', () => {
  it('should validate correct manifest', () => {
    const manifest = createManifest({
      id: 'https://example.com/manifest',
      label: { en: ['Test'] },
    });

    const result = validateIIIFResource(manifest);
    expect(result.valid).toBe(true);
  });

  it('should detect missing required fields', () => {
    const invalid = {
      type: 'Manifest',
      // missing id and label
    };

    const result = validateIIIFResource(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should validate language maps', () => {
    const manifest = createManifest({
      id: 'https://example.com/manifest',
      label: 'invalid' as any, // Should be language map
    });

    const result = validateIIIFResource(manifest);
    expect(result.valid).toBe(false);
  });

  it('should validate canvas dimensions', () => {
    const canvas = createCanvas({
      id: 'https://example.com/canvas/1',
      label: { en: ['Test'] },
      width: -100, // Invalid
      height: 1000,
    });

    const result = validateIIIFResource(canvas);
    expect(result.valid).toBe(false);
  });
});
