/**
 * Unit Tests for services/validator.ts
 *
 * Tests IIIF validation service for data integrity and spec compliance.
 */

import { describe, expect, it } from 'vitest';
import {
  getValidationForField,
  ValidationIssue,
  ValidationService,
  validator,
} from '@/services/validator';
import type {
  IIIFCanvas,
  IIIFCollection,
  IIIFManifest,
} from '@/types';

describe('ValidationService', () => {
  describe('validateTree', () => {
    it('should return empty object for null root', () => {
      const service = new ValidationService();
      const issues = service.validateTree(null);
      expect(issues).toEqual({});
    });

    it('should detect duplicate IDs', () => {
      const duplicateManifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/duplicate',
        type: 'Manifest',
        label: { en: ['Duplicate'] },
        items: [
          {
            id: 'https://example.com/duplicate',
            type: 'Canvas',
            label: { en: ['Canvas'] },
            width: 100,
            height: 100,
            items: [],
          },
        ],
      };

      const service = new ValidationService();
      const issues = service.validateTree(duplicateManifest);

      const allIssues = Object.values(issues).flat();
      const duplicateIssue = allIssues.find(i => i.message.includes('Duplicate ID'));

      // Verify issue exists with specific properties
      expect(duplicateIssue).not.toBeUndefined();
      expect(duplicateIssue?.level).toBe('error');
      expect(duplicateIssue?.message).toContain('Duplicate ID');
      expect(duplicateIssue?.category).toBe('Identity');
    });

    it('should validate valid manifest without errors', () => {
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest',
        type: 'Manifest',
        label: { en: ['Valid Manifest'] },
        items: [
          {
            id: 'https://example.com/canvas1',
            type: 'Canvas',
            label: { en: ['Canvas'] },
            width: 1000,
            height: 1000,
            items: [],
          },
        ],
      };

      const service = new ValidationService();
      const issues = service.validateTree(manifest);

      // Should have no errors (warnings are OK)
      const errors = Object.values(issues).flat().filter(i => i.level === 'error');
      expect(errors).toEqual([]);
    });

    it('should validate collection', () => {
      const collection: IIIFCollection = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/collection',
        type: 'Collection',
        label: { en: ['Collection'] },
        items: [
          {
            id: 'https://example.com/manifest',
            type: 'Manifest',
            label: { en: ['Manifest'] },
            items: [],
          },
        ],
      };

      const service = new ValidationService();
      const issues = service.validateTree(collection);

      expect(issues).toBeDefined();
    });
  });

  describe('validateItem', () => {
    it('should require HTTP URI for ID', () => {
      const service = new ValidationService();
      const manifest = {
        id: 'not-a-uri',
        type: 'Manifest',
        label: { en: ['Test'] },
        items: [],
      } as IIIFManifest;

      const issues = service.validateItem(manifest);
      const idIssue = issues.find(i => i.message.includes('HTTP'));

      // Verify issue exists with correct properties
      expect(idIssue).not.toBeUndefined();
      expect(idIssue?.level).toBe('error');
      expect(idIssue?.category).toBe('Identity');
      expect(idIssue?.message).toMatch(/HTTP/i);
    });

    it('should require at least one canvas in manifest', () => {
      const service = new ValidationService();
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest',
        type: 'Manifest',
        label: { en: ['Empty Manifest'] },
        items: [],
      };

      const issues = service.validateItem(manifest);
      const canvasIssue = issues.find(i => i.message.includes('at least one Canvas'));
      expect(canvasIssue).toBeDefined();
      expect(canvasIssue?.level).toBe('error');
    });

    it('should warn about missing canvas painting content', () => {
      const service = new ValidationService();
      const canvas: IIIFCanvas = {
        id: 'https://example.com/canvas',
        type: 'Canvas',
        label: { en: ['Canvas'] },
        width: 100,
        height: 100,
        items: [],
      };

      const issues = service.validateItem(canvas);
      const paintingIssue = issues.find(i => i.message.includes('painting'));
      expect(paintingIssue).toBeDefined();
      expect(paintingIssue?.level).toBe('warning');
    });

    it('should warn about missing summary', () => {
      const service = new ValidationService();
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest',
        type: 'Manifest',
        label: { en: ['Manifest'] },
        items: [
          {
            id: 'https://example.com/canvas',
            type: 'Canvas',
            label: { en: ['Canvas'] },
            width: 100,
            height: 100,
            items: [],
          },
        ],
      };

      const issues = service.validateItem(manifest);
      const summaryIssue = issues.find(i => i.message.includes('summary'));
      expect(summaryIssue).toBeDefined();
      expect(summaryIssue?.level).toBe('warning');
    });

    it('should validate behavior conflicts', () => {
      const service = new ValidationService();
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest',
        type: 'Manifest',
        label: { en: ['Manifest'] },
        behavior: ['paged', 'continuous'], // Conflicting
        items: [
          {
            id: 'https://example.com/canvas',
            type: 'Canvas',
            label: { en: ['Canvas'] },
            width: 100,
            height: 100,
            items: [],
          },
        ],
      };

      const issues = service.validateItem(manifest);
      const conflictIssue = issues.find(i => i.message.includes('Conflicting'));
      expect(conflictIssue).toBeDefined();
    });

    it('should validate invalid behavior for type', () => {
      const service = new ValidationService();
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest',
        type: 'Manifest',
        label: { en: ['Manifest'] },
        behavior: ['multi-part'] as any, // Invalid for Manifest
        items: [
          {
            id: 'https://example.com/canvas',
            type: 'Canvas',
            label: { en: ['Canvas'] },
            width: 100,
            height: 100,
            items: [],
          },
        ],
      };

      const issues = service.validateItem(manifest);
      const behaviorIssue = issues.find(i => i.message.includes('not valid'));
      expect(behaviorIssue).toBeDefined();
    });
  });

  describe('mapSchemaErrors', () => {
    it('should categorize identity errors', () => {
      const service = new ValidationService();
      const manifest: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest',
        type: 'Manifest',
        label: { en: ['Test'] },
        items: [
          {
            id: 'https://example.com/canvas',
            type: 'Canvas',
            label: { en: ['Canvas'] },
            width: 100,
            height: 100,
            items: [],
          },
        ],
      };

      // Access private method through any cast
      const errors = (service as any).mapSchemaErrors(manifest, ['Missing required field: id']);
      expect(errors[0].category).toBe('Identity');
    });

    it('should categorize dimension errors', () => {
      const service = new ValidationService();
      const canvas: IIIFCanvas = {
        id: 'https://example.com/canvas',
        type: 'Canvas',
        label: { en: ['Canvas'] },
        width: 100,
        height: 100,
        items: [],
      };

      // Test dimension errors with words containing 'id' (width, height, duration)
      // The validator now uses word boundaries to avoid false matches
      const errors = (service as any).mapSchemaErrors(canvas, ['Invalid width value', 'Height required', 'Missing duration']);
      expect(errors[0].category).toBe('Content');
      expect(errors[1].category).toBe('Content');
      expect(errors[2].category).toBe('Content');
    });

    it('should not confuse id substring with id word', () => {
      const service = new ValidationService();
      const canvas: IIIFCanvas = {
        id: 'https://example.com/canvas',
        type: 'Canvas',
        label: { en: ['Canvas'] },
        width: 100,
        height: 100,
        items: [],
      };

      // 'width' contains 'id' but should be categorized as Content, not Identity
      const errors = (service as any).mapSchemaErrors(canvas, ['Invalid width']);
      expect(errors[0].category).toBe('Content');
    });
  });
});

describe('getValidationForField', () => {
  it('should return pristine for empty issues', () => {
    const result = getValidationForField([], 'label');
    expect(result?.status).toBe('pristine');
  });

  it('should return pristine for unknown field', () => {
    const issues: ValidationIssue[] = [
      { id: '1', itemId: '1', itemLabel: 'Test', level: 'error', category: 'Identity', message: 'Error', fixable: false },
    ];
    const result = getValidationForField(issues, 'unknown-field');
    expect(result?.status).toBe('pristine');
  });

  it('should detect invalid status for label errors', () => {
    const issues: ValidationIssue[] = [
      { id: '1', itemId: '1', itemLabel: 'Test', level: 'error', category: 'Metadata', message: 'Missing required label', fixable: true },
    ];
    const result = getValidationForField(issues, 'label');
    expect(result?.status).toBe('invalid');
    expect(result?.message).toContain('label');
  });

  it('should detect valid status for warnings', () => {
    const issues: ValidationIssue[] = [
      { id: '1', itemId: '1', itemLabel: 'Test', level: 'warning', category: 'Metadata', message: 'Summary missing', fixable: true },
    ];
    const result = getValidationForField(issues, 'summary');
    expect(result?.status).toBe('valid');
  });

  it('should include fix function when fixable and callback provided', () => {
    const issues: ValidationIssue[] = [
      { id: '1', itemId: '1', itemLabel: 'Test', level: 'error', category: 'Metadata', message: 'Missing required label', fixable: true },
    ];
    const onFix = vi.fn();
    const result = getValidationForField(issues, 'label', onFix);
    expect(result?.fix).toBeDefined();
    expect(result?.fixDescription).toBeDefined();
  });

  it('should not include fix when not fixable', () => {
    const issues: ValidationIssue[] = [
      { id: '1', itemId: '1', itemLabel: 'Test', level: 'error', category: 'Identity', message: 'Invalid ID', fixable: false },
    ];
    const onFix = vi.fn();
    const result = getValidationForField(issues, 'id', onFix);
    expect(result?.fix).toBeUndefined();
  });

  it('should prioritize errors over warnings', () => {
    const issues: ValidationIssue[] = [
      { id: '1', itemId: '1', itemLabel: 'Test', level: 'warning', category: 'Metadata', message: 'Label could be better', fixable: true },
      { id: '2', itemId: '1', itemLabel: 'Test', level: 'error', category: 'Metadata', message: 'Label is required', fixable: true },
    ];
    const result = getValidationForField(issues, 'label');
    expect(result?.status).toBe('invalid');
    expect(result?.message).toContain('required');
  });
});

describe('validator singleton', () => {
  // NOTE: Removed trivial "should be exported" test.
  // This test provides zero behavioral value and simply verifies that a module exports something.
  // The actual functionality of validator is tested throughout the test suite.

  it('should validate manifest', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [
        {
          id: 'https://example.com/canvas',
          type: 'Canvas',
          label: { en: ['Canvas'] },
          width: 100,
          height: 100,
          items: [],
        },
      ],
    };

    const issues = validator.validateTree(manifest);
    expect(issues).toBeDefined();
  });
});

describe('User Interaction: Validate IIIF content', () => {
  it('IDEAL OUTCOME: Valid manifest passes validation with no errors', () => {
    // Arrange: User imports a well-formed IIIF manifest
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/valid-manifest',
      type: 'Manifest',
      label: { en: ['Field Research Photos'] },
      summary: { en: ['A collection of field research images from 2019'] },
      items: [
        {
          id: 'https://example.com/canvas1',
          type: 'Canvas',
          label: { en: ['Canvas 1'] },
          width: 1000,
          height: 800,
          items: [],
        },
      ],
    };

    // Act: Validation runs automatically (as happens in the Inspector)
    const issues = validator.validateTree(manifest);

    // Assert: IDEAL OUTCOME achieved
    // IDEAL OUTCOME: Valid manifest passes validation with no errors
    // 1. No errors (warnings are acceptable)
    const errors = Object.values(issues).flat().filter(i => i.level === 'error');
    expect(errors).toEqual([]);

    // 2. Validation completed without crashing
    expect(issues).toBeDefined();

    // 3. User can safely export/share this manifest
    console.log('✓ IDEAL: Valid manifest passes validation with no errors');
  });

  it('FAILURE PREVENTED: Invalid manifest with duplicate IDs caught before export', () => {
    // Arrange: User accidentally creates duplicate IDs (what app prevents)
    const duplicateManifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/duplicate',
      type: 'Manifest',
      label: { en: ['Duplicate ID Manifest'] },
      items: [
        {
          id: 'https://example.com/duplicate', // Same ID as manifest – invalid
          type: 'Canvas',
          label: { en: ['Canvas'] },
          width: 100,
          height: 100,
          items: [],
        },
      ],
    };

    // Act: Validation runs (should detect duplicate IDs)
    const issues = validator.validateTree(duplicateManifest);

    // Assert: FAILURE PREVENTED
    // FAILURE PREVENTED: Invalid manifest with duplicate IDs caught before export
    // 1. Duplicate ID error detected
    const allIssues = Object.values(issues).flat();
    const duplicateIssue = allIssues.find(i =>
      i.message.includes('Duplicate ID') || i.message.includes('duplicate')
    );
    expect(duplicateIssue).toBeDefined();
    expect(duplicateIssue?.level).toBe('error');

    // 2. Error is categorized correctly
    expect(duplicateIssue?.category).toBe('Identity');

    // 3. User sees clear error in Inspector before export
    console.log('✓ PREVENTED: Duplicate IDs caught before export');
  });
});

// vi import for mocking
import { vi } from 'vitest';
