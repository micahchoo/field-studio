/**
 * Inspector Validation Tests
 *
 * Tests the 18-rule IIIF resource validation engine, auto-fix functions,
 * and batch fix logic. Pure TypeScript -- no DOM required.
 */

import { describe, it, expect } from 'vitest';
import {
  validateResource,
  fixIssue,
  fixAll,
  type ValidationIssue,
  type ValidationResult,
} from '../inspectorValidation';

// ------------------------------------------------------------------
// Helpers: resource factories
// ------------------------------------------------------------------

/** Minimal valid Manifest with no issues (except info-level) */
function makeValidManifest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'https://example.org/manifest/1',
    type: 'Manifest',
    label: { en: ['Test Manifest'] },
    summary: { en: ['A test summary'] },
    rights: 'http://creativecommons.org/licenses/by/4.0/',
    viewingDirection: 'left-to-right',
    metadata: [
      { label: { en: ['Author'] }, value: { en: ['Jane Doe'] } },
    ],
    items: [
      { id: 'https://example.org/canvas/1', type: 'Canvas', width: 1000, height: 1000 },
    ],
    ...overrides,
  };
}

/** Minimal valid Canvas */
function makeValidCanvas(overrides: Record<string, unknown> = {}) {
  return {
    id: 'https://example.org/canvas/1',
    type: 'Canvas',
    label: { en: ['Canvas 1'] },
    width: 1000,
    height: 800,
    ...overrides,
  };
}

/** Minimal valid Collection */
function makeValidCollection(overrides: Record<string, unknown> = {}) {
  return {
    id: 'https://example.org/collection/1',
    type: 'Collection',
    label: { en: ['Test Collection'] },
    summary: { en: ['A collection summary'] },
    rights: 'http://creativecommons.org/licenses/by/4.0/',
    viewingDirection: 'left-to-right',
    items: [
      { id: 'https://example.org/manifest/1', type: 'Manifest' },
    ],
    ...overrides,
  };
}

/** Minimal valid Range */
function makeValidRange(overrides: Record<string, unknown> = {}) {
  return {
    id: 'https://example.org/range/1',
    type: 'Range',
    label: { en: ['Test Range'] },
    ...overrides,
  };
}

/** Helper to find an issue by its id (or id prefix) in a validation result */
function findIssue(result: ValidationResult, idOrPrefix: string): ValidationIssue | undefined {
  return result.issues.find(i => i.id === idOrPrefix || i.id.startsWith(idOrPrefix));
}

/** Helper to check that a specific issue id is present */
function hasIssue(result: ValidationResult, idOrPrefix: string): boolean {
  return findIssue(result, idOrPrefix) !== undefined;
}

// ==================================================================
// validateResource()
// ==================================================================

describe('validateResource', () => {
  // ----------------------------------------------------------------
  // Rule 1: missing-label
  // ----------------------------------------------------------------
  describe('Rule 1: missing-label', () => {
    it('flags a resource with no label', () => {
      const result = validateResource({ id: 'https://x.org/m', type: 'Manifest' }, 'Manifest');
      expect(hasIssue(result, 'missing-label')).toBe(true);
      const issue = findIssue(result, 'missing-label')!;
      expect(issue.severity).toBe('error');
      expect(issue.field).toBe('label');
      expect(issue.autoFixable).toBe(false);
    });

    it('flags a resource with an empty label object', () => {
      const result = validateResource({ id: 'https://x.org/m', type: 'Manifest', label: {} }, 'Manifest');
      expect(hasIssue(result, 'missing-label')).toBe(true);
    });

    it('flags a resource with a label containing only empty arrays', () => {
      const result = validateResource({ id: 'https://x.org/m', type: 'Manifest', label: { en: [] } }, 'Manifest');
      expect(hasIssue(result, 'missing-label')).toBe(true);
    });

    it('does not flag a resource with a valid label', () => {
      const result = validateResource(makeValidManifest(), 'Manifest');
      expect(hasIssue(result, 'missing-label')).toBe(false);
    });

    it('accepts a plain string label', () => {
      const result = validateResource(
        { id: 'https://x.org/m', type: 'Manifest', label: 'Hello' },
        'Manifest',
      );
      expect(hasIssue(result, 'missing-label')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Rule 2: missing-rights
  // ----------------------------------------------------------------
  describe('Rule 2: missing-rights', () => {
    it('flags a resource with no rights property', () => {
      const manifest = makeValidManifest();
      delete (manifest as any).rights;
      const result = validateResource(manifest, 'Manifest');
      expect(hasIssue(result, 'missing-rights')).toBe(true);
      const issue = findIssue(result, 'missing-rights')!;
      expect(issue.severity).toBe('warning');
    });

    it('does not flag a resource with a rights property', () => {
      const result = validateResource(makeValidManifest(), 'Manifest');
      expect(hasIssue(result, 'missing-rights')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Rule 3: short-label
  // ----------------------------------------------------------------
  describe('Rule 3: short-label', () => {
    it('flags a label shorter than 3 characters', () => {
      const result = validateResource(
        { id: 'https://x.org/m', type: 'Manifest', label: { en: ['AB'] } },
        'Manifest',
      );
      expect(hasIssue(result, 'short-label')).toBe(true);
      const issue = findIssue(result, 'short-label')!;
      expect(issue.severity).toBe('warning');
      expect(issue.currentValue).toBe('AB');
    });

    it('does not flag a label of exactly 3 characters', () => {
      const result = validateResource(
        { id: 'https://x.org/m', type: 'Manifest', label: { en: ['ABC'] } },
        'Manifest',
      );
      expect(hasIssue(result, 'short-label')).toBe(false);
    });

    it('does not flag a missing label (handled by rule 1)', () => {
      const result = validateResource(
        { id: 'https://x.org/m', type: 'Manifest' },
        'Manifest',
      );
      expect(hasIssue(result, 'short-label')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Rule 4: missing-summary
  // ----------------------------------------------------------------
  describe('Rule 4: missing-summary', () => {
    it('flags a resource with no summary', () => {
      const manifest = makeValidManifest();
      delete (manifest as any).summary;
      const result = validateResource(manifest, 'Manifest');
      expect(hasIssue(result, 'missing-summary')).toBe(true);
      const issue = findIssue(result, 'missing-summary')!;
      expect(issue.severity).toBe('info');
    });

    it('flags an empty summary object', () => {
      const result = validateResource(
        makeValidManifest({ summary: {} }),
        'Manifest',
      );
      expect(hasIssue(result, 'missing-summary')).toBe(true);
    });

    it('does not flag a resource with a valid summary', () => {
      const result = validateResource(makeValidManifest(), 'Manifest');
      expect(hasIssue(result, 'missing-summary')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Rule 5: empty-metadata
  // ----------------------------------------------------------------
  describe('Rule 5: empty-metadata', () => {
    it('flags metadata entries with no label and no value', () => {
      const result = validateResource(
        makeValidManifest({
          metadata: [
            { label: { en: ['Author'] }, value: { en: ['Jane'] } },
            { label: {}, value: {} },
          ],
        }),
        'Manifest',
      );
      expect(hasIssue(result, 'empty-metadata-')).toBe(true);
      const issue = findIssue(result, 'empty-metadata-1')!;
      expect(issue.severity).toBe('warning');
      expect(issue.autoFixable).toBe(true);
      expect(issue.field).toBe('metadata[1]');
    });

    it('does not flag metadata entries with at least a label', () => {
      const result = validateResource(
        makeValidManifest({
          metadata: [{ label: { en: ['Author'] }, value: {} }],
        }),
        'Manifest',
      );
      expect(hasIssue(result, 'empty-metadata-')).toBe(false);
    });

    it('does not run when metadata is absent', () => {
      const manifest = makeValidManifest();
      delete (manifest as any).metadata;
      const result = validateResource(manifest, 'Manifest');
      expect(hasIssue(result, 'empty-metadata-')).toBe(false);
    });

    it('creates separate issues for multiple empty entries', () => {
      const result = validateResource(
        makeValidManifest({
          metadata: [
            { label: {}, value: {} },
            { label: { en: ['Title'] }, value: { en: ['Foo'] } },
            { label: {}, value: {} },
          ],
        }),
        'Manifest',
      );
      expect(findIssue(result, 'empty-metadata-0')).toBeDefined();
      expect(findIssue(result, 'empty-metadata-2')).toBeDefined();
      expect(findIssue(result, 'empty-metadata-1')).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------
  // Rule 6: missing-viewing-direction
  // ----------------------------------------------------------------
  describe('Rule 6: missing-viewing-direction', () => {
    it('flags a Manifest with no viewingDirection', () => {
      const manifest = makeValidManifest();
      delete (manifest as any).viewingDirection;
      const result = validateResource(manifest, 'Manifest');
      expect(hasIssue(result, 'missing-viewing-direction')).toBe(true);
      const issue = findIssue(result, 'missing-viewing-direction')!;
      expect(issue.severity).toBe('info');
      expect(issue.autoFixable).toBe(true);
    });

    it('flags a Collection with no viewingDirection', () => {
      const collection = makeValidCollection();
      delete (collection as any).viewingDirection;
      const result = validateResource(collection, 'Collection');
      expect(hasIssue(result, 'missing-viewing-direction')).toBe(true);
    });

    it('does not flag a Canvas (not applicable)', () => {
      const canvas = makeValidCanvas();
      const result = validateResource(canvas, 'Canvas');
      expect(hasIssue(result, 'missing-viewing-direction')).toBe(false);
    });

    it('does not flag a Range (not applicable)', () => {
      const range = makeValidRange();
      const result = validateResource(range, 'Range');
      expect(hasIssue(result, 'missing-viewing-direction')).toBe(false);
    });

    it('does not flag when viewingDirection is set', () => {
      const result = validateResource(makeValidManifest(), 'Manifest');
      expect(hasIssue(result, 'missing-viewing-direction')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Rule 7: empty-collection
  // ----------------------------------------------------------------
  describe('Rule 7: empty-collection', () => {
    it('flags a Collection with no items', () => {
      const result = validateResource(
        makeValidCollection({ items: [] }),
        'Collection',
      );
      expect(hasIssue(result, 'empty-collection')).toBe(true);
      const issue = findIssue(result, 'empty-collection')!;
      expect(issue.severity).toBe('error');
    });

    it('does not flag a Collection with items', () => {
      const result = validateResource(makeValidCollection(), 'Collection');
      expect(hasIssue(result, 'empty-collection')).toBe(false);
    });

    it('does not apply to Manifest type', () => {
      const result = validateResource(makeValidManifest({ items: [] }), 'Manifest');
      expect(hasIssue(result, 'empty-collection')).toBe(false);
    });

    it('accepts members array as well', () => {
      const collection = makeValidCollection({ items: undefined, members: [{ id: 'x' }] });
      const result = validateResource(collection, 'Collection');
      expect(hasIssue(result, 'empty-collection')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Rule 8: empty-manifest
  // ----------------------------------------------------------------
  describe('Rule 8: empty-manifest', () => {
    it('flags a Manifest with no canvases', () => {
      const result = validateResource(
        makeValidManifest({ items: [] }),
        'Manifest',
      );
      expect(hasIssue(result, 'empty-manifest')).toBe(true);
      const issue = findIssue(result, 'empty-manifest')!;
      expect(issue.severity).toBe('error');
    });

    it('does not flag a Manifest with canvases', () => {
      const result = validateResource(makeValidManifest(), 'Manifest');
      expect(hasIssue(result, 'empty-manifest')).toBe(false);
    });

    it('does not apply to Collection type', () => {
      const result = validateResource(makeValidCollection({ items: [] }), 'Collection');
      expect(hasIssue(result, 'empty-manifest')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Rule 9: duplicate-metadata-labels
  // ----------------------------------------------------------------
  describe('Rule 9: duplicate-metadata-labels', () => {
    it('flags duplicate metadata labels (case-insensitive)', () => {
      const result = validateResource(
        makeValidManifest({
          metadata: [
            { label: { en: ['Author'] }, value: { en: ['Alice'] } },
            { label: { en: ['author'] }, value: { en: ['Bob'] } },
          ],
        }),
        'Manifest',
      );
      expect(hasIssue(result, 'duplicate-metadata-labels-')).toBe(true);
      const issue = findIssue(result, 'duplicate-metadata-labels-author')!;
      expect(issue.severity).toBe('warning');
      expect(issue.description).toContain('2 times');
    });

    it('does not flag unique metadata labels', () => {
      const result = validateResource(
        makeValidManifest({
          metadata: [
            { label: { en: ['Author'] }, value: { en: ['Alice'] } },
            { label: { en: ['Title'] }, value: { en: ['Book'] } },
          ],
        }),
        'Manifest',
      );
      expect(hasIssue(result, 'duplicate-metadata-labels-')).toBe(false);
    });

    it('ignores entries with empty labels', () => {
      const result = validateResource(
        makeValidManifest({
          metadata: [
            { label: {}, value: { en: ['Alice'] } },
            { label: {}, value: { en: ['Bob'] } },
          ],
        }),
        'Manifest',
      );
      expect(hasIssue(result, 'duplicate-metadata-labels-')).toBe(false);
    });

    it('does not trigger with fewer than 2 metadata entries', () => {
      const result = validateResource(
        makeValidManifest({
          metadata: [
            { label: { en: ['Author'] }, value: { en: ['Alice'] } },
          ],
        }),
        'Manifest',
      );
      expect(hasIssue(result, 'duplicate-metadata-labels-')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Rule 10: missing-id
  // ----------------------------------------------------------------
  describe('Rule 10: missing-id', () => {
    it('flags a resource with no id', () => {
      const result = validateResource(
        { type: 'Manifest', label: { en: ['Foo'] } },
        'Manifest',
      );
      expect(hasIssue(result, 'missing-id')).toBe(true);
      const issue = findIssue(result, 'missing-id')!;
      expect(issue.severity).toBe('error');
    });

    it('does not flag a resource with an id', () => {
      const result = validateResource(makeValidManifest(), 'Manifest');
      expect(hasIssue(result, 'missing-id')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Rule 11: non-https-id
  // ----------------------------------------------------------------
  describe('Rule 11: non-https-id', () => {
    it('flags an http:// id', () => {
      const result = validateResource(
        makeValidManifest({ id: 'http://example.org/manifest/1' }),
        'Manifest',
      );
      expect(hasIssue(result, 'non-https-id')).toBe(true);
      const issue = findIssue(result, 'non-https-id')!;
      expect(issue.severity).toBe('warning');
      expect(issue.autoFixable).toBe(true);
      expect(issue.currentValue).toBe('http://example.org/manifest/1');
    });

    it('does not flag an https:// id', () => {
      const result = validateResource(makeValidManifest(), 'Manifest');
      expect(hasIssue(result, 'non-https-id')).toBe(false);
    });

    it('does not flag a non-string id', () => {
      const result = validateResource(
        makeValidManifest({ id: 12345 }),
        'Manifest',
      );
      expect(hasIssue(result, 'non-https-id')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Rule 12: invalid-navdate-format
  // ----------------------------------------------------------------
  describe('Rule 12: invalid-navdate-format', () => {
    it('flags an invalid navDate string', () => {
      const result = validateResource(
        makeValidManifest({ navDate: '2024-01-15' }),
        'Manifest',
      );
      expect(hasIssue(result, 'invalid-navdate-format')).toBe(true);
      const issue = findIssue(result, 'invalid-navdate-format')!;
      expect(issue.severity).toBe('error');
      expect(issue.autoFixable).toBe(true);
    });

    it('does not flag a valid xsd:dateTime with Z', () => {
      const result = validateResource(
        makeValidManifest({ navDate: '2024-01-15T10:00:00Z' }),
        'Manifest',
      );
      expect(hasIssue(result, 'invalid-navdate-format')).toBe(false);
    });

    it('does not flag a valid xsd:dateTime with timezone offset', () => {
      const result = validateResource(
        makeValidManifest({ navDate: '2024-01-15T10:00:00+05:30' }),
        'Manifest',
      );
      expect(hasIssue(result, 'invalid-navdate-format')).toBe(false);
    });

    it('marks as not auto-fixable when date is completely unparseable', () => {
      const result = validateResource(
        makeValidManifest({ navDate: 'not-a-date-at-all' }),
        'Manifest',
      );
      expect(hasIssue(result, 'invalid-navdate-format')).toBe(true);
      const issue = findIssue(result, 'invalid-navdate-format')!;
      expect(issue.autoFixable).toBe(false);
    });

    it('does not run when navDate is absent', () => {
      const result = validateResource(makeValidManifest(), 'Manifest');
      expect(hasIssue(result, 'invalid-navdate-format')).toBe(false);
    });

    it('does not run when navDate is not a string', () => {
      const result = validateResource(
        makeValidManifest({ navDate: 12345 }),
        'Manifest',
      );
      expect(hasIssue(result, 'invalid-navdate-format')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Rule 13: invalid-behavior-for-type
  // ----------------------------------------------------------------
  describe('Rule 13: invalid-behavior-for-type', () => {
    it('flags behaviors not valid for the resource type', () => {
      const result = validateResource(
        makeValidCanvas({ behavior: ['facing-pages', 'paged'] }),
        'Canvas',
      );
      // 'paged' is not valid for Canvas
      expect(hasIssue(result, 'invalid-behavior-for-type')).toBe(true);
      const issue = findIssue(result, 'invalid-behavior-for-type')!;
      expect(issue.severity).toBe('warning');
      expect(issue.autoFixable).toBe(true);
      expect(issue.description).toContain('paged');
    });

    it('does not flag valid behaviors for the type', () => {
      const result = validateResource(
        makeValidCanvas({ behavior: ['facing-pages'] }),
        'Canvas',
      );
      expect(hasIssue(result, 'invalid-behavior-for-type')).toBe(false);
    });

    it('does not run when behavior is absent', () => {
      const result = validateResource(makeValidManifest(), 'Manifest');
      expect(hasIssue(result, 'invalid-behavior-for-type')).toBe(false);
    });

    it('does not run when behavior is empty', () => {
      const result = validateResource(
        makeValidManifest({ behavior: [] }),
        'Manifest',
      );
      expect(hasIssue(result, 'invalid-behavior-for-type')).toBe(false);
    });

    it('does not run for unknown resource types with no valid set', () => {
      const result = validateResource(
        { id: 'x', type: 'Unknown', behavior: ['foo'] },
        'Unknown',
      );
      expect(hasIssue(result, 'invalid-behavior-for-type')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Rule 14: conflicting-behaviors
  // ----------------------------------------------------------------
  describe('Rule 14: conflicting-behaviors', () => {
    it('flags mutually exclusive behaviors (individuals + continuous)', () => {
      const result = validateResource(
        makeValidManifest({ behavior: ['individuals', 'continuous'] }),
        'Manifest',
      );
      expect(hasIssue(result, 'conflicting-behaviors-')).toBe(true);
      const issue = findIssue(result, 'conflicting-behaviors-')!;
      expect(issue.severity).toBe('warning');
      expect(issue.autoFixable).toBe(true);
      expect(issue.fixSuggestion).toContain('individuals');
    });

    it('flags auto-advance + no-auto-advance conflict', () => {
      const result = validateResource(
        makeValidManifest({ behavior: ['auto-advance', 'no-auto-advance'] }),
        'Manifest',
      );
      expect(hasIssue(result, 'conflicting-behaviors-auto-advance-no-auto-advance')).toBe(true);
    });

    it('flags together + sequence conflict', () => {
      const result = validateResource(
        makeValidManifest({ behavior: ['together', 'sequence'] }),
        'Manifest',
      );
      expect(hasIssue(result, 'conflicting-behaviors-together-sequence')).toBe(true);
    });

    it('does not flag non-conflicting behaviors', () => {
      const result = validateResource(
        makeValidManifest({ behavior: ['individuals', 'auto-advance'] }),
        'Manifest',
      );
      expect(hasIssue(result, 'conflicting-behaviors-')).toBe(false);
    });

    it('does not run with fewer than 2 behaviors', () => {
      const result = validateResource(
        makeValidManifest({ behavior: ['individuals'] }),
        'Manifest',
      );
      expect(hasIssue(result, 'conflicting-behaviors-')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Rule 15: behavior-missing-precondition
  // ----------------------------------------------------------------
  describe('Rule 15: behavior-missing-precondition', () => {
    it('flags paged behavior on Manifest with fewer than 2 canvases', () => {
      const result = validateResource(
        makeValidManifest({ behavior: ['paged'] }),
        'Manifest',
      );
      // Only 1 canvas in makeValidManifest()
      expect(hasIssue(result, 'behavior-missing-precondition-paged')).toBe(true);
      const issue = findIssue(result, 'behavior-missing-precondition-paged')!;
      expect(issue.severity).toBe('info');
      expect(issue.autoFixable).toBe(false);
    });

    it('does not flag paged with 2+ canvases', () => {
      const result = validateResource(
        makeValidManifest({
          behavior: ['paged'],
          items: [
            { id: 'c1', type: 'Canvas' },
            { id: 'c2', type: 'Canvas' },
          ],
        }),
        'Manifest',
      );
      expect(hasIssue(result, 'behavior-missing-precondition-paged')).toBe(false);
    });

    it('flags auto-advance when canvases lack duration', () => {
      const result = validateResource(
        makeValidManifest({
          behavior: ['auto-advance'],
          items: [
            { id: 'c1', type: 'Canvas' },
          ],
        }),
        'Manifest',
      );
      expect(hasIssue(result, 'behavior-missing-precondition-auto-advance')).toBe(true);
    });

    it('does not flag auto-advance when all canvases have duration', () => {
      const result = validateResource(
        makeValidManifest({
          behavior: ['auto-advance'],
          items: [
            { id: 'c1', type: 'Canvas', duration: 10 },
            { id: 'c2', type: 'Canvas', duration: 20 },
          ],
        }),
        'Manifest',
      );
      expect(hasIssue(result, 'behavior-missing-precondition-auto-advance')).toBe(false);
    });

    it('does not apply to non-Manifest types', () => {
      const result = validateResource(
        makeValidCanvas({ behavior: ['auto-advance'] }),
        'Canvas',
      );
      expect(hasIssue(result, 'behavior-missing-precondition-')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Rule 16: invalid-rights-uri
  // ----------------------------------------------------------------
  describe('Rule 16: invalid-rights-uri', () => {
    it('flags a non-URI rights value', () => {
      const result = validateResource(
        makeValidManifest({ rights: 'Public Domain' }),
        'Manifest',
      );
      expect(hasIssue(result, 'invalid-rights-uri')).toBe(true);
      const issue = findIssue(result, 'invalid-rights-uri')!;
      expect(issue.severity).toBe('error');
      expect(issue.currentValue).toBe('Public Domain');
    });

    it('does not flag http:// rights URIs', () => {
      const result = validateResource(
        makeValidManifest({ rights: 'http://creativecommons.org/licenses/by/4.0/' }),
        'Manifest',
      );
      expect(hasIssue(result, 'invalid-rights-uri')).toBe(false);
    });

    it('does not flag https:// rights URIs', () => {
      const result = validateResource(
        makeValidManifest({ rights: 'https://creativecommons.org/licenses/by/4.0/' }),
        'Manifest',
      );
      expect(hasIssue(result, 'invalid-rights-uri')).toBe(false);
    });

    it('does not run when rights is absent', () => {
      const manifest = makeValidManifest();
      delete (manifest as any).rights;
      const result = validateResource(manifest, 'Manifest');
      expect(hasIssue(result, 'invalid-rights-uri')).toBe(false);
    });

    it('does not run when rights is not a string', () => {
      const result = validateResource(
        makeValidManifest({ rights: 123 }),
        'Manifest',
      );
      expect(hasIssue(result, 'invalid-rights-uri')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Rule 17: unknown-rights-uri
  // ----------------------------------------------------------------
  describe('Rule 17: unknown-rights-uri', () => {
    it('flags a valid URI that is not a known CC/RS URI', () => {
      const result = validateResource(
        makeValidManifest({ rights: 'https://example.org/my-custom-license' }),
        'Manifest',
      );
      expect(hasIssue(result, 'unknown-rights-uri')).toBe(true);
      const issue = findIssue(result, 'unknown-rights-uri')!;
      expect(issue.severity).toBe('info');
    });

    it('does not flag a known CC license URI (http)', () => {
      const result = validateResource(
        makeValidManifest({ rights: 'http://creativecommons.org/licenses/by/4.0/' }),
        'Manifest',
      );
      expect(hasIssue(result, 'unknown-rights-uri')).toBe(false);
    });

    it('does not flag a known CC license URI (https variant)', () => {
      const result = validateResource(
        makeValidManifest({ rights: 'https://creativecommons.org/licenses/by/4.0/' }),
        'Manifest',
      );
      expect(hasIssue(result, 'unknown-rights-uri')).toBe(false);
    });

    it('does not flag a known RightsStatements URI', () => {
      const result = validateResource(
        makeValidManifest({ rights: 'http://rightsstatements.org/vocab/InC/1.0/' }),
        'Manifest',
      );
      expect(hasIssue(result, 'unknown-rights-uri')).toBe(false);
    });

    it('does not flag a non-URI string (handled by rule 16)', () => {
      const result = validateResource(
        makeValidManifest({ rights: 'Public Domain' }),
        'Manifest',
      );
      expect(hasIssue(result, 'unknown-rights-uri')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Rule 18: unsafe-html-content
  // ----------------------------------------------------------------
  describe('Rule 18: unsafe-html-content', () => {
    it('flags unsafe HTML in summary', () => {
      const result = validateResource(
        makeValidManifest({ summary: { en: ['Hello <script>alert(1)</script>'] } }),
        'Manifest',
      );
      expect(hasIssue(result, 'unsafe-html-content-summary')).toBe(true);
      const issue = findIssue(result, 'unsafe-html-content-summary')!;
      expect(issue.severity).toBe('warning');
      expect(issue.autoFixable).toBe(true);
    });

    it('does not flag allowed HTML in summary', () => {
      const result = validateResource(
        makeValidManifest({ summary: { en: ['Hello <b>world</b> <em>test</em>'] } }),
        'Manifest',
      );
      expect(hasIssue(result, 'unsafe-html-content-summary')).toBe(false);
    });

    it('flags unsafe HTML in metadata values', () => {
      const result = validateResource(
        makeValidManifest({
          metadata: [
            { label: { en: ['Note'] }, value: { en: ['<div>bad</div>'] } },
          ],
        }),
        'Manifest',
      );
      expect(hasIssue(result, 'unsafe-html-content-metadata-0')).toBe(true);
    });

    it('does not flag allowed HTML in metadata values', () => {
      const result = validateResource(
        makeValidManifest({
          metadata: [
            { label: { en: ['Note'] }, value: { en: ['<b>bold</b>'] } },
          ],
        }),
        'Manifest',
      );
      expect(hasIssue(result, 'unsafe-html-content-metadata-')).toBe(false);
    });

    it('flags unsafe HTML in requiredStatement value', () => {
      const result = validateResource(
        makeValidManifest({
          requiredStatement: {
            label: { en: ['Attribution'] },
            value: { en: ['Credit <iframe src="evil.com"></iframe>'] },
          },
        }),
        'Manifest',
      );
      expect(hasIssue(result, 'unsafe-html-content-requiredStatement')).toBe(true);
    });

    it('does not flag when summary has no HTML', () => {
      const result = validateResource(
        makeValidManifest({ summary: { en: ['Just plain text'] } }),
        'Manifest',
      );
      expect(hasIssue(result, 'unsafe-html-content-summary')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Result aggregation
  // ----------------------------------------------------------------
  describe('result aggregation', () => {
    it('counts errors, warnings, and info correctly', () => {
      // A resource with missing-label (error), missing-rights (warning), missing-summary (info)
      const result = validateResource({ id: 'https://x.org/m', type: 'Manifest', items: [] }, 'Manifest');
      expect(result.errorCount).toBeGreaterThan(0);
      expect(result.warningCount).toBeGreaterThanOrEqual(0);
      expect(result.issues.length).toBe(
        result.errorCount + result.warningCount + result.infoCount,
      );
    });

    it('isValid is true when no errors', () => {
      const result = validateResource(makeValidManifest(), 'Manifest');
      expect(result.isValid).toBe(true);
      expect(result.errorCount).toBe(0);
    });

    it('isValid is false when there are errors', () => {
      // missing-id is an error
      const result = validateResource(
        { type: 'Manifest', label: { en: ['Test'] }, items: [] },
        'Manifest',
      );
      expect(result.isValid).toBe(false);
      expect(result.errorCount).toBeGreaterThan(0);
    });

    it('autoFixableIssues includes only fixable issues', () => {
      const result = validateResource(
        makeValidManifest({ id: 'http://example.org/m' }),
        'Manifest',
      );
      for (const issue of result.autoFixableIssues) {
        expect(issue.autoFixable).toBe(true);
      }
    });
  });

  // ----------------------------------------------------------------
  // Null/undefined resource
  // ----------------------------------------------------------------
  describe('null or undefined resource', () => {
    it('returns empty valid result for null', () => {
      const result = validateResource(null);
      expect(result.isValid).toBe(true);
      expect(result.issues).toEqual([]);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBe(0);
      expect(result.infoCount).toBe(0);
    });

    it('returns empty valid result for undefined', () => {
      const result = validateResource(undefined);
      expect(result.isValid).toBe(true);
      expect(result.issues).toEqual([]);
    });
  });

  // ----------------------------------------------------------------
  // Type detection
  // ----------------------------------------------------------------
  describe('type detection', () => {
    it('uses explicit type hint when provided', () => {
      const result = validateResource(
        { id: 'https://x.org/x', label: { en: ['Test'] }, items: [] },
        'Manifest',
      );
      // Should apply Manifest-specific rules (empty-manifest)
      expect(hasIssue(result, 'empty-manifest')).toBe(true);
      expect(hasIssue(result, 'empty-collection')).toBe(false);
    });

    it('falls back to resource.type when no hint given', () => {
      const result = validateResource({
        id: 'https://x.org/x',
        type: 'Collection',
        label: { en: ['Test'] },
        items: [],
        summary: { en: ['Summary'] },
        rights: 'http://creativecommons.org/licenses/by/4.0/',
        viewingDirection: 'left-to-right',
      });
      expect(hasIssue(result, 'empty-collection')).toBe(true);
      expect(hasIssue(result, 'empty-manifest')).toBe(false);
    });

    it('uses heuristic: width+height = Canvas', () => {
      const result = validateResource({
        id: 'https://x.org/c',
        label: { en: ['Canvas'] },
        width: 100,
        height: 200,
      });
      // Should not trigger Manifest/Collection specific rules
      expect(hasIssue(result, 'empty-manifest')).toBe(false);
      expect(hasIssue(result, 'empty-collection')).toBe(false);
    });

    it('uses heuristic: items with Manifest children = Collection', () => {
      const result = validateResource({
        id: 'https://x.org/col',
        label: { en: ['Collection'] },
        summary: { en: ['Summary'] },
        rights: 'http://creativecommons.org/licenses/by/4.0/',
        viewingDirection: 'left-to-right',
        items: [{ type: 'Manifest' }],
      });
      expect(hasIssue(result, 'empty-collection')).toBe(false);
      expect(hasIssue(result, 'empty-manifest')).toBe(false);
    });

    it('uses heuristic: items with Canvas children = Manifest', () => {
      const result = validateResource({
        id: 'https://x.org/m',
        label: { en: ['Manifest'] },
        summary: { en: ['Summary'] },
        rights: 'http://creativecommons.org/licenses/by/4.0/',
        viewingDirection: 'left-to-right',
        items: [{ type: 'Canvas' }],
      });
      expect(hasIssue(result, 'empty-manifest')).toBe(false);
    });
  });
});

// ==================================================================
// fixIssue()
// ==================================================================

describe('fixIssue', () => {
  it('returns the resource unchanged for non-auto-fixable issues', () => {
    const resource = makeValidManifest();
    const issue: ValidationIssue = {
      id: 'missing-label',
      severity: 'error',
      title: 'Missing label',
      description: 'test',
      autoFixable: false,
    };
    const fixed = fixIssue(resource, issue);
    expect(fixed).toBe(resource); // same reference, not modified
  });

  // ----------------------------------------------------------------
  // Rule 5 fix: empty-metadata removal
  // ----------------------------------------------------------------
  describe('fix: empty-metadata', () => {
    it('removes the empty metadata entry by index', () => {
      const resource = makeValidManifest({
        metadata: [
          { label: { en: ['Author'] }, value: { en: ['Alice'] } },
          { label: {}, value: {} },
          { label: { en: ['Date'] }, value: { en: ['2024'] } },
        ],
      });
      const issue: ValidationIssue = {
        id: 'empty-metadata-1',
        severity: 'warning',
        title: 'Empty metadata entry',
        description: '',
        field: 'metadata[1]',
        autoFixable: true,
      };
      const fixed = fixIssue(resource, issue);
      expect(fixed.metadata).toHaveLength(2);
      expect(fixed.metadata[0].label).toEqual({ en: ['Author'] });
      expect(fixed.metadata[1].label).toEqual({ en: ['Date'] });
    });

    it('does not mutate the original resource', () => {
      const resource = makeValidManifest({
        metadata: [{ label: {}, value: {} }],
      });
      const issue: ValidationIssue = {
        id: 'empty-metadata-0',
        severity: 'warning',
        title: 'Empty metadata entry',
        description: '',
        autoFixable: true,
      };
      const fixed = fixIssue(resource, issue);
      expect(resource.metadata).toHaveLength(1);
      expect(fixed.metadata).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------------
  // Rule 6 fix: missing-viewing-direction
  // ----------------------------------------------------------------
  describe('fix: missing-viewing-direction', () => {
    it('sets viewingDirection to left-to-right', () => {
      const resource = makeValidManifest();
      delete (resource as any).viewingDirection;
      const issue: ValidationIssue = {
        id: 'missing-viewing-direction',
        severity: 'info',
        title: 'Missing viewing direction',
        description: '',
        autoFixable: true,
      };
      const fixed = fixIssue(resource, issue);
      expect(fixed.viewingDirection).toBe('left-to-right');
    });
  });

  // ----------------------------------------------------------------
  // Rule 11 fix: non-https-id
  // ----------------------------------------------------------------
  describe('fix: non-https-id', () => {
    it('upgrades http:// to https://', () => {
      const resource = makeValidManifest({ id: 'http://example.org/manifest/1' });
      const issue: ValidationIssue = {
        id: 'non-https-id',
        severity: 'warning',
        title: 'Non-HTTPS resource ID',
        description: '',
        autoFixable: true,
        currentValue: 'http://example.org/manifest/1',
      };
      const fixed = fixIssue(resource, issue);
      expect(fixed.id).toBe('https://example.org/manifest/1');
    });

    it('does not touch already https:// ids', () => {
      const resource = makeValidManifest({ id: 'https://example.org/m' });
      const issue: ValidationIssue = {
        id: 'non-https-id',
        severity: 'warning',
        title: '',
        description: '',
        autoFixable: true,
      };
      const fixed = fixIssue(resource, issue);
      expect(fixed.id).toBe('https://example.org/m');
    });
  });

  // ----------------------------------------------------------------
  // Rule 12 fix: invalid-navdate-format
  // ----------------------------------------------------------------
  describe('fix: invalid-navdate-format', () => {
    it('reformats a parseable but non-xsd:dateTime navDate', () => {
      const resource = makeValidManifest({ navDate: '2024-01-15' });
      const issue: ValidationIssue = {
        id: 'invalid-navdate-format',
        severity: 'error',
        title: 'Invalid navDate format',
        description: '',
        autoFixable: true,
        currentValue: '2024-01-15',
      };
      const fixed = fixIssue(resource, issue);
      // Should produce xsd:dateTime format ending with Z
      expect(fixed.navDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });

    it('leaves navDate unchanged if completely unparseable', () => {
      const resource = makeValidManifest({ navDate: 'not-a-date' });
      const issue: ValidationIssue = {
        id: 'invalid-navdate-format',
        severity: 'error',
        title: 'Invalid navDate format',
        description: '',
        autoFixable: true,
        currentValue: 'not-a-date',
      };
      const fixed = fixIssue(resource, issue);
      expect(fixed.navDate).toBe('not-a-date');
    });
  });

  // ----------------------------------------------------------------
  // Rule 13 fix: invalid-behavior-for-type
  // ----------------------------------------------------------------
  describe('fix: invalid-behavior-for-type', () => {
    it('removes behaviors invalid for the resource type', () => {
      const resource = {
        id: 'https://x.org/c',
        type: 'Canvas',
        label: { en: ['C'] },
        behavior: ['facing-pages', 'paged', 'continuous'],
      };
      const issue: ValidationIssue = {
        id: 'invalid-behavior-for-type',
        severity: 'warning',
        title: 'Invalid behavior',
        description: '',
        autoFixable: true,
      };
      const fixed = fixIssue(resource, issue);
      // 'facing-pages' is valid for Canvas; 'paged' and 'continuous' are not
      expect(fixed.behavior).toEqual(['facing-pages']);
    });
  });

  // ----------------------------------------------------------------
  // Rule 14 fix: conflicting-behaviors
  // ----------------------------------------------------------------
  describe('fix: conflicting-behaviors', () => {
    it('keeps the first behavior from each disjoint group', () => {
      const resource = makeValidManifest({
        behavior: ['continuous', 'individuals', 'auto-advance'],
      });
      const issue: ValidationIssue = {
        id: 'conflicting-behaviors-continuous-individuals',
        severity: 'warning',
        title: 'Conflicting behaviors',
        description: '',
        autoFixable: true,
      };
      const fixed = fixIssue(resource, issue);
      // 'continuous' appears first in the behavior array, should be kept
      expect(fixed.behavior).toContain('continuous');
      expect(fixed.behavior).not.toContain('individuals');
      // 'auto-advance' is not in the same disjoint group, should remain
      expect(fixed.behavior).toContain('auto-advance');
    });

    it('handles auto-advance / no-auto-advance conflict', () => {
      const resource = makeValidManifest({
        behavior: ['auto-advance', 'no-auto-advance'],
      });
      const issue: ValidationIssue = {
        id: 'conflicting-behaviors-auto-advance-no-auto-advance',
        severity: 'warning',
        title: 'Conflicting behaviors',
        description: '',
        autoFixable: true,
      };
      const fixed = fixIssue(resource, issue);
      expect(fixed.behavior).toEqual(['auto-advance']);
    });
  });

  // ----------------------------------------------------------------
  // Rule 18 fix: unsafe-html-content
  // ----------------------------------------------------------------
  describe('fix: unsafe-html-content', () => {
    it('strips disallowed HTML from summary (language map)', () => {
      const resource = makeValidManifest({
        summary: { en: ['Hello <script>bad</script> <b>world</b>'] },
      });
      const issue: ValidationIssue = {
        id: 'unsafe-html-content-summary',
        severity: 'warning',
        title: 'Potentially unsafe HTML in summary',
        description: '',
        autoFixable: true,
      };
      const fixed = fixIssue(resource, issue);
      expect(fixed.summary.en[0]).toBe('Hello bad <b>world</b>');
      expect(fixed.summary.en[0]).not.toContain('<script>');
    });

    it('strips disallowed HTML from summary (plain string)', () => {
      const resource = makeValidManifest({
        summary: 'Hello <div>oops</div> <em>ok</em>',
      });
      const issue: ValidationIssue = {
        id: 'unsafe-html-content-summary',
        severity: 'warning',
        title: 'Potentially unsafe HTML in summary',
        description: '',
        autoFixable: true,
      };
      const fixed = fixIssue(resource, issue);
      expect(fixed.summary).toBe('Hello oops <em>ok</em>');
    });

    it('strips disallowed HTML from metadata value at specific index', () => {
      const resource = makeValidManifest({
        metadata: [
          { label: { en: ['Note'] }, value: { en: ['<div>bad</div> <b>ok</b>'] } },
        ],
      });
      const issue: ValidationIssue = {
        id: 'unsafe-html-content-metadata-0',
        severity: 'warning',
        title: 'Potentially unsafe HTML',
        description: '',
        autoFixable: true,
      };
      const fixed = fixIssue(resource, issue);
      expect(fixed.metadata[0].value.en[0]).toBe('bad <b>ok</b>');
    });

    it('strips disallowed HTML from requiredStatement value', () => {
      const resource = makeValidManifest({
        requiredStatement: {
          label: { en: ['Attribution'] },
          value: { en: ['Credit <form>evil</form> <i>ok</i>'] },
        },
      });
      const issue: ValidationIssue = {
        id: 'unsafe-html-content-requiredStatement',
        severity: 'warning',
        title: 'Potentially unsafe HTML',
        description: '',
        autoFixable: true,
      };
      const fixed = fixIssue(resource, issue);
      expect(fixed.requiredStatement.value.en[0]).toBe('Credit evil <i>ok</i>');
    });

    it('does not mutate the original metadata array', () => {
      const originalMetadata = [
        { label: { en: ['Note'] }, value: { en: ['<div>bad</div>'] } },
      ];
      const resource = makeValidManifest({ metadata: originalMetadata });
      const issue: ValidationIssue = {
        id: 'unsafe-html-content-metadata-0',
        severity: 'warning',
        title: '',
        description: '',
        autoFixable: true,
      };
      const fixed = fixIssue(resource, issue);
      // Original unchanged
      expect(originalMetadata[0].value.en[0]).toBe('<div>bad</div>');
      // Fixed version sanitized
      expect(fixed.metadata[0].value.en[0]).toBe('bad');
    });
  });

  // ----------------------------------------------------------------
  // Unknown auto-fix id
  // ----------------------------------------------------------------
  describe('unknown auto-fix id', () => {
    it('returns a shallow copy without changes for an unknown fixable id', () => {
      const resource = makeValidManifest();
      const issue: ValidationIssue = {
        id: 'some-unknown-rule-id',
        severity: 'warning',
        title: 'Unknown',
        description: '',
        autoFixable: true,
      };
      const fixed = fixIssue(resource, issue);
      expect(fixed).not.toBe(resource); // shallow copy
      expect(fixed.id).toBe(resource.id);
      expect(fixed.label).toBe(resource.label);
    });
  });
});

// ==================================================================
// fixAll()
// ==================================================================

describe('fixAll', () => {
  it('applies all auto-fixable issues in sequence', () => {
    const resource = makeValidManifest({
      id: 'http://example.org/m',
      viewingDirection: undefined,
      metadata: [
        { label: { en: ['Author'] }, value: { en: ['Alice'] } },
        { label: {}, value: {} },
      ],
    });
    const result = validateResource(resource, 'Manifest');
    const fixed = fixAll(resource, result.issues);

    // non-https-id should be fixed
    expect(fixed.id).toBe('https://example.org/m');
    // missing-viewing-direction should be fixed
    expect(fixed.viewingDirection).toBe('left-to-right');
    // empty-metadata-1 should be removed
    expect(fixed.metadata).toHaveLength(1);
    expect(fixed.metadata[0].label).toEqual({ en: ['Author'] });
  });

  it('handles metadata removal indices correctly (descending order)', () => {
    const resource = makeValidManifest({
      metadata: [
        { label: {}, value: {} },       // index 0 -- empty
        { label: { en: ['X'] }, value: { en: ['Y'] } },  // index 1 -- valid
        { label: {}, value: {} },       // index 2 -- empty
        { label: {}, value: {} },       // index 3 -- empty
      ],
    });
    const result = validateResource(resource, 'Manifest');
    const fixed = fixAll(resource, result.issues);

    // Only the valid entry should remain
    expect(fixed.metadata).toHaveLength(1);
    expect(fixed.metadata[0].label).toEqual({ en: ['X'] });
  });

  it('skips non-auto-fixable issues', () => {
    const resource = makeValidManifest();
    const issues: ValidationIssue[] = [
      {
        id: 'missing-label',
        severity: 'error',
        title: 'Missing label',
        description: '',
        autoFixable: false,
      },
    ];
    const fixed = fixAll(resource, issues);
    // Should be unchanged
    expect(fixed.label).toEqual(resource.label);
  });

  it('returns the original resource when there are no fixable issues', () => {
    const resource = makeValidManifest();
    const fixed = fixAll(resource, []);
    expect(fixed).toBe(resource); // no copies made when nothing to fix
  });

  it('applies multiple different fix types together', () => {
    const resource = {
      id: 'http://example.org/manifest',
      type: 'Manifest',
      label: { en: ['Test Manifest'] },
      summary: { en: ['Hello <script>evil</script> <b>ok</b>'] },
      rights: 'http://creativecommons.org/licenses/by/4.0/',
      items: [{ type: 'Canvas', id: 'c1' }],
      behavior: ['auto-advance', 'no-auto-advance'],
      metadata: [
        { label: {}, value: {} },
      ],
    };
    const result = validateResource(resource, 'Manifest');
    const fixed = fixAll(resource, result.issues);

    // non-https-id fixed
    expect(fixed.id).toBe('https://example.org/manifest');
    // unsafe-html-content-summary fixed
    expect(fixed.summary.en[0]).not.toContain('<script>');
    expect(fixed.summary.en[0]).toContain('<b>ok</b>');
    // conflicting-behaviors fixed (keep auto-advance)
    expect(fixed.behavior).toContain('auto-advance');
    expect(fixed.behavior).not.toContain('no-auto-advance');
    // empty-metadata removed
    expect(fixed.metadata).toHaveLength(0);
    // missing-viewing-direction fixed
    expect(fixed.viewingDirection).toBe('left-to-right');
  });
});

// ==================================================================
// Edge cases
// ==================================================================

describe('edge cases', () => {
  describe('resource with no issues (fully valid)', () => {
    it('returns zero issues for a well-formed Manifest', () => {
      const result = validateResource(makeValidManifest(), 'Manifest');
      expect(result.isValid).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBe(0);
      // May have info-level issues (like missing-summary if not set), but 0 for our helper
    });

    it('has no auto-fixable issues', () => {
      const result = validateResource(makeValidManifest(), 'Manifest');
      expect(result.autoFixableIssues).toHaveLength(0);
    });
  });

  describe('resource with maximum issues', () => {
    it('detects many issues on a badly formed Manifest', () => {
      const badManifest = {
        // no id -- missing-id (error)
        // no type -- needs hint
        // no label -- missing-label (error)
        // no rights -- missing-rights (warning)
        // no summary -- missing-summary (info)
        // no viewingDirection -- missing-viewing-direction (info, auto-fix)
        items: [], // empty-manifest (error)
        navDate: 'bad-date',
        behavior: ['individuals', 'continuous', 'paged', 'facing-pages'],
        metadata: [
          { label: {}, value: {} },
          { label: { en: ['X'] }, value: { en: ['<div>unsafe</div>'] } },
          { label: { en: ['x'] }, value: { en: ['dup'] } },
        ],
      };
      const result = validateResource(badManifest, 'Manifest');

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThanOrEqual(6);
      expect(result.errorCount).toBeGreaterThanOrEqual(3); // missing-id, missing-label, empty-manifest, invalid-navdate
      expect(result.autoFixableIssues.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('different entity types', () => {
    it('validates a Canvas resource', () => {
      const canvas = makeValidCanvas();
      const result = validateResource(canvas, 'Canvas');
      expect(result.isValid).toBe(true);
      // Canvas should not trigger Manifest/Collection rules
      expect(hasIssue(result, 'empty-manifest')).toBe(false);
      expect(hasIssue(result, 'empty-collection')).toBe(false);
      expect(hasIssue(result, 'missing-viewing-direction')).toBe(false);
    });

    it('validates a Collection resource', () => {
      const collection = makeValidCollection();
      const result = validateResource(collection, 'Collection');
      expect(result.isValid).toBe(true);
      expect(hasIssue(result, 'empty-manifest')).toBe(false);
    });

    it('validates a Range resource', () => {
      const range = makeValidRange();
      const result = validateResource(range, 'Range');
      // Range should not trigger empty-manifest or empty-collection
      expect(hasIssue(result, 'empty-manifest')).toBe(false);
      expect(hasIssue(result, 'empty-collection')).toBe(false);
      expect(hasIssue(result, 'missing-viewing-direction')).toBe(false);
    });

    it('validates a Range with valid behavior', () => {
      const range = makeValidRange({ behavior: ['sequence', 'auto-advance'] });
      const result = validateResource(range, 'Range');
      expect(hasIssue(result, 'invalid-behavior-for-type')).toBe(false);
    });

    it('validates a Range with invalid behavior', () => {
      const range = makeValidRange({ behavior: ['paged'] });
      const result = validateResource(range, 'Range');
      // 'paged' is not valid for Range
      expect(hasIssue(result, 'invalid-behavior-for-type')).toBe(true);
    });

    it('validates AnnotationPage with no valid behaviors', () => {
      const ap = {
        id: 'https://x.org/ap/1',
        type: 'AnnotationPage',
        label: { en: ['Annotations'] },
        behavior: ['individuals'],
      };
      const result = validateResource(ap, 'AnnotationPage');
      // AnnotationPage has no valid behaviors, so 'individuals' should be flagged
      expect(hasIssue(result, 'invalid-behavior-for-type')).toBe(true);
    });
  });

  describe('immutability guarantees', () => {
    it('fixIssue returns a new object (shallow copy)', () => {
      const resource = makeValidManifest({ id: 'http://example.org/m' });
      const issue: ValidationIssue = {
        id: 'non-https-id',
        severity: 'warning',
        title: '',
        description: '',
        autoFixable: true,
      };
      const fixed = fixIssue(resource, issue);
      expect(fixed).not.toBe(resource);
      expect(fixed.id).toBe('https://example.org/m');
      expect(resource.id).toBe('http://example.org/m');
    });

    it('fixAll does not mutate the original resource', () => {
      const resource = makeValidManifest({
        id: 'http://example.org/m',
        metadata: [{ label: {}, value: {} }],
      });
      const originalId = resource.id;
      const originalMetadataLength = resource.metadata.length;

      const result = validateResource(resource, 'Manifest');
      fixAll(resource, result.issues);

      expect(resource.id).toBe(originalId);
      expect(resource.metadata).toHaveLength(originalMetadataLength);
    });
  });

  describe('label extraction edge cases', () => {
    it('handles a numeric label gracefully (not a string or object)', () => {
      const result = validateResource(
        { id: 'https://x.org/m', type: 'Manifest', label: 12345 },
        'Manifest',
      );
      // extractLabel returns '' for non-string/non-object, so missing-label fires
      expect(hasIssue(result, 'missing-label')).toBe(true);
    });

    it('handles label with multiple languages', () => {
      const result = validateResource(
        { id: 'https://x.org/m', type: 'Manifest', label: { en: ['English'], fr: ['French'] } },
        'Manifest',
      );
      // Should pick the first language's first value
      expect(hasIssue(result, 'missing-label')).toBe(false);
    });
  });
});
