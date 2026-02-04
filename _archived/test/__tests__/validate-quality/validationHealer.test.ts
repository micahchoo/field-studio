/**
 * Unit Tests for services/validationHealer.ts
 *
 * Tests auto-fix capabilities for IIIF validation issues including:
 * - Identity & ID fixes
 * - Metadata fixes (label, summary)
 * - Structure fixes
 * - Content fixes (dimensions, duration)
 * - Rights & attribution fixes
 * - Behavior fixes
 * - Batch healing operations
 */

import { describe, expect, it } from 'vitest';
import {
  applyHealToTree,
  getFixDescription,
  getHealingPriority,
  getHealingStats,
  healAllIssues,
  healIssue,
  HealResult,
  safeHealAll
} from '@/services/validationHealer';
import { ValidationIssue } from '@/services/validator';
import type { IIIFCanvas, IIIFCollection, IIIFManifest } from '@/types';

describe('validationHealer', () => {

  // =========================================================================
  // HEAL ISSUE - IDENTITY FIXES
  // =========================================================================

  describe('healIssue - Identity Fixes', () => {
    it('should return error for item without type (structure validation fails)', () => {
      const item: any = {
        id: 'https://example.com/manifest1',
        label: { none: ['Test'] }
        // Missing type - will fail structure validation
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Test',
        level: 'error',
        category: 'Identity',
        message: 'missing required field: type',
        fixable: true
      };

      const result = healIssue(item, issue);
      // Cannot heal because item fails structure validation
      expect(result.success).toBe(false);
      expect(result.error).toContain('type');
    });

    it('should fix missing ID', () => {
      const item: any = {
        id: '', // Empty ID
        type: 'Manifest',
        label: { none: ['Test'] },
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: '',
        itemLabel: 'Test',
        level: 'error',
        category: 'Identity',
        message: 'missing required field: id',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      expect(result.updatedItem?.id).toBeDefined();
      expect(result.updatedItem?.id).toMatch(/^http/);
      expect(result.updatedItem?.id).not.toBe('');
      // Verify ID is a valid HTTP URI with proper structure
      expect(result.updatedItem?.id).toMatch(/^https?:\/\/.+/);
      expect(result.updatedItem?.id.length).toBeGreaterThan(10);
      // Verify ID actually changed from empty string
      expect(result.updatedItem?.id).not.toBe(item.id);
    });

    it('should fix non-HTTP ID', () => {
      const item: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'not-a-uri',
        type: 'Manifest',
        label: { none: ['Test'] },
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Test',
        level: 'error',
        category: 'Identity',
        message: 'id must be a valid http',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      expect(result.updatedItem?.id).toMatch(/^https?:\/\/.+/);
      expect(result.updatedItem?.id).not.toBe('not-a-uri');
      expect(result.updatedItem?.id.length).toBeGreaterThan(10);
      // The invalid ID may be incorporated into the new URI as a suffix,
      // so we just verify it's now a valid HTTP URI
    });

    it('should not fix duplicate ID (requires manual intervention)', () => {
      const item: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/duplicate',
        type: 'Manifest',
        label: { none: ['Test'] },
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Test',
        level: 'error',
        category: 'Identity',
        message: 'Duplicate ID detected',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(false);
      expect(result.message).toContain('manual');
    });

    it('should remove fragment from Canvas ID', () => {
      const item: IIIFCanvas = {
        id: 'https://example.com/canvas/1#fragment',
        type: 'Canvas',
        label: { none: ['Test'] },
        width: 1000,
        height: 1000,
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Test',
        level: 'error',
        category: 'Identity',
        message: 'canvas id must not contain a fragment',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      expect(result.updatedItem?.id).toBe('https://example.com/canvas/1');
      expect(result.updatedItem?.id).not.toContain('#');
      // Fragments can be safely removed without breaking vault sync
    });

    it('should preserve valid IDs to maintain vault sync', () => {
      const validId = 'https://example.com/manifest/123';
      const item: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: validId,
        type: 'Manifest',
        label: { none: ['Test'] },
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Test',
        level: 'error',
        category: 'Metadata',
        message: 'Missing required label', // Non-ID issue
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      expect(result.updatedItem?.id).toBe(validId);
      // Valid IDs must be preserved to prevent breaking vault references
    });
  });

  // =========================================================================
  // HEAL ISSUE - METADATA FIXES
  // =========================================================================

  describe('healIssue - Metadata Fixes', () => {
    it('should add missing required label', () => {
      const item: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Untitled',
        level: 'error',
        category: 'Metadata',
        message: 'Missing required label',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      expect(result.updatedItem?.label).toBeDefined();
    });

    it('should convert string label to language map', () => {
      const item: any = {
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        label: 'Plain string label',
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Test',
        level: 'error',
        category: 'Metadata',
        message: 'Label must be a language map',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      expect(result.updatedItem?.label).toBeTypeOf('object');
      expect(result.updatedItem?.label).not.toBeTypeOf('string');
    });

    it('should add placeholder summary', () => {
      const item: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        label: { none: ['Test'] },
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Test',
        level: 'warning',
        category: 'Metadata',
        message: 'Adding a summary improves search',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      expect(result.updatedItem?.summary).toBeDefined();
    });

    it('should fix malformed metadata entries', () => {
      const item: any = {
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        label: { none: ['Test'] },
        metadata: [
          { label: { en: ['Field'] } }, // Missing value
          { value: { en: ['Value'] } }  // Missing label
        ],
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Test',
        level: 'error',
        category: 'Metadata',
        message: 'Metadata entries must have both label and value',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      // Should fix or filter malformed entries
      expect(Array.isArray(result.updatedItem?.metadata)).toBe(true);
    });
  });

  // =========================================================================
  // HEAL ISSUE - DIMENSION FIXES
  // =========================================================================

  describe('healIssue - Dimension Fixes', () => {
    it('should set default canvas dimensions', () => {
      const item: IIIFCanvas = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        label: { none: ['Canvas'] },
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Canvas',
        level: 'error',
        category: 'Content',
        message: 'Canvas must have width and height dimensions',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      expect(result.updatedItem?.width).toBeDefined();
      expect(result.updatedItem?.height).toBeDefined();
    });

    it('should set height to match width if only width present', () => {
      const item: any = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        label: { none: ['Canvas'] },
        width: 1000,
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Canvas',
        level: 'error',
        category: 'Content',
        message: 'Missing height dimension',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      expect(result.updatedItem?.height).toBe(1000);
    });

    it('should add duration field for time-based canvas', () => {
      const item: IIIFCanvas = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        label: { none: ['Audio'] },
        width: 1000,
        height: 1000,
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Audio',
        level: 'error',
        category: 'Content',
        message: 'Canvas with audio requires duration',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      expect(result.updatedItem?.duration).toBeDefined();
    });
  });

  // =========================================================================
  // HEAL ISSUE - STRUCTURE FIXES
  // =========================================================================

  describe('healIssue - Structure Fixes', () => {
    it('should add placeholder canvas to empty Manifest', () => {
      const item: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        label: { none: ['Empty'] },
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Empty',
        level: 'error',
        category: 'Structure',
        message: 'items must have at least one item',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      expect(result.updatedItem?.items?.length).toBeGreaterThan(0);
    });

    it('should remove invalid structures from Collection', () => {
      const item: any = {
        id: 'https://example.com/collection1',
        type: 'Collection',
        label: { none: ['Collection'] },
        items: [],
        structures: [] // Not allowed on Collection
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Collection',
        level: 'error',
        category: 'Structure',
        message: 'structures property not allowed on Collection',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      expect(result.updatedItem?.structures).toBeUndefined();
    });

    it('should filter out invalid item types', () => {
      const item: any = {
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        label: { none: ['Test'] },
        items: [
          { id: 'valid', type: 'Canvas', label: { none: ['Canvas'] }, width: 100, height: 100, items: [] },
          { id: 'invalid', type: 'Range', label: { none: ['Invalid'] }, items: [] }
        ]
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Test',
        level: 'error',
        category: 'Structure',
        message: 'items invalid type parent type',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      // Should filter out the Range (not valid in Manifest items)
      expect(result.updatedItem?.items?.length).toBe(1);
    });
  });

  // =========================================================================
  // HEAL ISSUE - RIGHTS & ATTRIBUTION
  // =========================================================================

  describe('healIssue - Rights Fixes', () => {
    it('should add default rights URI', () => {
      const item: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        label: { none: ['Test'] },
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Test',
        level: 'warning',
        category: 'Metadata',
        message: 'Missing rights statement',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      expect(result.updatedItem?.rights).toBeDefined();
      expect(result.updatedItem?.rights).toMatch(/^http/);
    });

    it('should add default requiredStatement', () => {
      const item: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        label: { none: ['Test'] },
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Test',
        level: 'warning',
        category: 'Metadata',
        message: 'Missing requiredStatement',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      expect(result.updatedItem?.requiredStatement).toBeDefined();
    });

    it('should add default provider', () => {
      const item: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        label: { none: ['Test'] },
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Test',
        level: 'warning',
        category: 'Metadata',
        message: 'Missing provider',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      expect(result.updatedItem?.provider).toBeDefined();
      expect(Array.isArray(result.updatedItem?.provider)).toBe(true);
    });
  });

  // =========================================================================
  // HEAL ISSUE - BEHAVIOR FIXES
  // =========================================================================

  describe('healIssue - Behavior Fixes', () => {
    it('should remove invalid behaviors for type', () => {
      const item: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        label: { none: ['Test'] },
        behavior: ['multi-part'] as any, // Not valid for Manifest
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Test',
        level: 'error',
        category: 'Structure',
        message: 'behavior not allowed',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      // Should remove invalid behavior (either undefined or doesn't contain 'multi-part')
      if (result.updatedItem?.behavior) {
        expect(result.updatedItem.behavior).not.toContain('multi-part');
      } else {
        expect(result.updatedItem?.behavior).toBeUndefined();
      }
    });

    it('should resolve conflicting behaviors', () => {
      const item: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        label: { none: ['Test'] },
        behavior: ['paged', 'continuous'], // Conflicting
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Test',
        level: 'error',
        category: 'Structure',
        message: 'Conflicting behaviors: paged and continuous',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      // Should keep only one from the conflicting pair
      expect(result.updatedItem?.behavior?.length).toBe(1);
    });
  });

  // =========================================================================
  // HEAL ISSUE - CONTEXT & MISCELLANEOUS
  // =========================================================================

  describe('healIssue - Context Fixes', () => {
    it('should add @context to top-level resource', () => {
      const item: any = {
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        label: { none: ['Test'] },
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Test',
        level: 'error',
        category: 'Structure',
        message: '@context must have IIIF Presentation API 3.0 context',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      expect(result.updatedItem?.['@context']).toBeDefined();
    });

    it('should remove @context from embedded resource', () => {
      const item: any = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        label: { none: ['Canvas'] },
        width: 1000,
        height: 1000,
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Canvas',
        level: 'warning',
        category: 'Structure',
        message: '@context should only be on top-level resources',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      expect(result.updatedItem?.['@context']).toBeUndefined();
    });
  });

  // =========================================================================
  // HEAL ISSUE - ERROR HANDLING
  // =========================================================================

  describe('healIssue - Error Handling', () => {
    it('should handle null item', () => {
      const result = healIssue(null as any, {
        id: '1',
        itemId: '',
        itemLabel: '',
        level: 'error',
        category: 'Identity',
        message: 'Test',
        fixable: true
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle null issue', () => {
      const item: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        label: { none: ['Test'] },
        items: []
      };
      const result = healIssue(item, null as any);
      expect(result.success).toBe(false);
    });

    it('should handle non-fixable issue', () => {
      const item: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        label: { none: ['Test'] },
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Test',
        level: 'error',
        category: 'Identity',
        message: 'Cannot fix this',
        fixable: false
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(false);
      expect(result.message).toContain('not auto-fixable');
    });

    it('should preserve original ID after healing', () => {
      const originalId = 'https://example.com/manifest1';
      const item: any = {
        id: originalId,
        type: 'Manifest',
        items: []
      };
      const issue: ValidationIssue = {
        id: '1',
        itemId: item.id,
        itemLabel: 'Test',
        level: 'error',
        category: 'Metadata',
        message: 'Missing required label',
        fixable: true
      };

      const result = healIssue(item, issue);
      expect(result.success).toBe(true);
      expect(result.updatedItem?.id).toBe(originalId);
    });
  });

  // =========================================================================
  // BATCH HEALING
  // =========================================================================

  describe('healAllIssues', () => {
    it('should heal multiple issues', () => {
      const item: any = {
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        items: []
      };
      const issues: ValidationIssue[] = [
        {
          id: '1',
          itemId: item.id,
          itemLabel: 'Test',
          level: 'error',
          category: 'Metadata',
          message: 'Missing required label',
          fixable: true
        },
        {
          id: '2',
          itemId: item.id,
          itemLabel: 'Test',
          level: 'warning',
          category: 'Metadata',
          message: 'Adding a summary improves search',
          fixable: true
        }
      ];

      const result = healAllIssues(item, issues);
      expect(result.healed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.item.label).toBeDefined();
      expect(result.item.summary).toBeDefined();
    });

    it('should handle null item', () => {
      const result = healAllIssues(null as any, []);
      expect(result.healed).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should skip non-fixable issues', () => {
      const item: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        label: { none: ['Test'] },
        items: []
      };
      const issues: ValidationIssue[] = [
        {
          id: '1',
          itemId: item.id,
          itemLabel: 'Test',
          level: 'error',
          category: 'Identity',
          message: 'Non-fixable error',
          fixable: false
        }
      ];

      const result = healAllIssues(item, issues);
      expect(result.healed).toBe(0);
    });
  });

  describe('safeHealAll', () => {
    it('should heal all fixable issues', () => {
      const item: any = {
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        items: []
      };
      const issues: ValidationIssue[] = [
        {
          id: '1',
          itemId: item.id,
          itemLabel: 'Test',
          level: 'error',
          category: 'Metadata',
          message: 'Missing required label',
          fixable: true
        }
      ];

      const result = safeHealAll(item, issues);
      expect(result.success).toBe(true);
      expect(result.updatedItem).toBeDefined();
      expect(result.message).toContain('Healed');
    });

    it('should handle null item', () => {
      const result = safeHealAll(null as any, []);
      expect(result.success).toBe(false);
    });

    it('should handle empty issues array', () => {
      const item: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        label: { none: ['Test'] },
        items: []
      };

      const result = safeHealAll(item, []);
      expect(result.success).toBe(true);
      expect(result.message).toContain('No issues');
    });
  });

  describe('applyHealToTree', () => {
    it('should apply healed item to tree', () => {
      const root: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        label: { none: ['Root'] },
        items: [
          {
            id: 'https://example.com/canvas/1',
            type: 'Canvas',
            label: { none: ['Canvas'] },
            width: 1000,
            height: 1000,
            items: []
          }
        ]
      };

      const healedCanvas: IIIFCanvas = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        label: { none: ['Updated Canvas'] },
        width: 2000,
        height: 2000,
        items: []
      };

      const result = applyHealToTree(root, 'https://example.com/canvas/1', healedCanvas);
      expect(result).not.toBeNull();
      // Should update the canvas in the tree
      expect(result?.items?.[0]?.width).toBe(2000);
    });

    it('should handle null root', () => {
      const healedItem: IIIFCanvas = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        label: { none: ['Canvas'] },
        width: 1000,
        height: 1000,
        items: []
      };

      const result = applyHealToTree(null as any, 'test-id', healedItem);
      expect(result).toBeNull();
    });

    it('should handle item not found in tree', () => {
      const root: IIIFManifest = {
        '@context': 'http://iiif.io/api/presentation/3/context.json',
        id: 'https://example.com/manifest1',
        type: 'Manifest',
        label: { none: ['Root'] },
        items: []
      };

      const healedItem: IIIFCanvas = {
        id: 'https://example.com/nonexistent',
        type: 'Canvas',
        label: { none: ['Canvas'] },
        width: 1000,
        height: 1000,
        items: []
      };

      const result = applyHealToTree(root, 'https://example.com/nonexistent', healedItem);
      expect(result).toBeDefined();
      // Should return tree unchanged
    });
  });

  // =========================================================================
  // UTILITY FUNCTIONS
  // =========================================================================

  describe('getFixDescription', () => {
    it('should return description for missing ID', () => {
      const issue: ValidationIssue = {
        id: '1',
        itemId: '',
        itemLabel: 'Test',
        level: 'error',
        category: 'Identity',
        message: 'Missing required field: id',
        fixable: true
      };

      const desc = getFixDescription(issue);
      expect(desc).toContain('ID');
    });

    it('should return description for label fix', () => {
      const issue: ValidationIssue = {
        id: '1',
        itemId: 'test',
        itemLabel: 'Test',
        level: 'error',
        category: 'Metadata',
        message: 'Label is required',
        fixable: true
      };

      const desc = getFixDescription(issue);
      expect(desc).toContain('label');
    });

    it('should return generic description for unknown issue', () => {
      const issue: ValidationIssue = {
        id: '1',
        itemId: 'test',
        itemLabel: 'Test',
        level: 'error',
        category: 'Structure',
        message: 'Unknown error',
        fixable: true
      };

      const desc = getFixDescription(issue);
      expect(desc).toBeTruthy();
    });
  });

  describe('getHealingStats', () => {
    it('should calculate statistics', () => {
      const issues: ValidationIssue[] = [
        {
          id: '1',
          itemId: 'test',
          itemLabel: 'Test',
          level: 'error',
          category: 'Identity',
          message: 'Error 1',
          fixable: true
        },
        {
          id: '2',
          itemId: 'test',
          itemLabel: 'Test',
          level: 'warning',
          category: 'Metadata',
          message: 'Warning 1',
          fixable: true
        },
        {
          id: '3',
          itemId: 'test',
          itemLabel: 'Test',
          level: 'error',
          category: 'Identity',
          message: 'Error 2',
          fixable: false
        }
      ];

      const stats = getHealingStats(issues);
      expect(stats.total).toBe(3);
      expect(stats.fixable).toBe(2);
      expect(stats.byCategory['Identity']).toBe(2);
      expect(stats.byCategory['Metadata']).toBe(1);
    });

    it('should handle null issues', () => {
      const stats = getHealingStats(null as any);
      expect(stats.total).toBe(0);
      expect(stats.fixable).toBe(0);
    });
  });

  describe('getHealingPriority', () => {
    it('should prioritize errors over warnings', () => {
      const issues: ValidationIssue[] = [
        {
          id: '1',
          itemId: 'test',
          itemLabel: 'Test',
          level: 'warning',
          category: 'Metadata',
          message: 'Warning',
          fixable: true
        },
        {
          id: '2',
          itemId: 'test',
          itemLabel: 'Test',
          level: 'error',
          category: 'Identity',
          message: 'Error',
          fixable: true
        }
      ];

      const sorted = getHealingPriority(issues);
      expect(sorted[0].level).toBe('error');
      expect(sorted[1].level).toBe('warning');
    });

    it('should prioritize fixable issues', () => {
      const issues: ValidationIssue[] = [
        {
          id: '1',
          itemId: 'test',
          itemLabel: 'Test',
          level: 'error',
          category: 'Identity',
          message: 'Error 1',
          fixable: false
        },
        {
          id: '2',
          itemId: 'test',
          itemLabel: 'Test',
          level: 'error',
          category: 'Identity',
          message: 'Error 2',
          fixable: true
        }
      ];

      const sorted = getHealingPriority(issues);
      expect(sorted[0].fixable).toBe(true);
      expect(sorted[1].fixable).toBe(false);
    });

    it('should handle null issues', () => {
      const sorted = getHealingPriority(null as any);
      expect(sorted).toEqual([]);
    });
  });
});
