/**
 * Unit Tests for utils/iiifValidation.ts
 * 
 * Tests ID validation, URI checking, duplicate detection, and URI utilities.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  convertToHttpUri,
  findDuplicateIds,
  generateResourceId,
  generateUUID,
  generateValidUri,
  getUriLastSegment,
  hasDuplicateIds,
  hasFragmentIdentifier,
  isValidHttpUri,
  isValidId,
  normalizeUri,
  removeTrailingSlash,
} from '@/utils/iiifValidation';
import type { IIIFItem } from '@/types';

// ============================================================================
// isValidHttpUri Tests
// ============================================================================

describe('isValidHttpUri', () => {
  it('should validate HTTPS URIs', () => {
    expect(isValidHttpUri('https://example.com')).toBe(true);
    expect(isValidHttpUri('https://example.com/path')).toBe(true);
    expect(isValidHttpUri('https://example.com:8080/path')).toBe(true);
  });

  it('should validate HTTP URIs', () => {
    expect(isValidHttpUri('http://example.com')).toBe(true);
    expect(isValidHttpUri('http://localhost:3000')).toBe(true);
  });

  it('should reject FTP URIs', () => {
    expect(isValidHttpUri('ftp://example.com/file.txt')).toBe(false);
  });

  it('should reject relative paths', () => {
    expect(isValidHttpUri('/path/to/resource')).toBe(false);
    expect(isValidHttpUri('path/to/resource')).toBe(false);
  });

  it('should reject bare hostnames', () => {
    expect(isValidHttpUri('example.com')).toBe(false);
    expect(isValidHttpUri('www.example.com')).toBe(false);
  });

  it('should reject empty or invalid values', () => {
    expect(isValidHttpUri('')).toBe(false);
    expect(isValidHttpUri(null as any)).toBe(false);
    expect(isValidHttpUri(undefined as any)).toBe(false);
    expect(isValidHttpUri(123 as any)).toBe(false);
  });

  it('should handle URIs with query parameters and fragments', () => {
    expect(isValidHttpUri('https://example.com?query=value')).toBe(true);
    expect(isValidHttpUri('https://example.com#fragment')).toBe(true);
  });
});

// ============================================================================
// hasFragmentIdentifier Tests
// ============================================================================

describe('hasFragmentIdentifier', () => {
  it('should detect fragment identifiers', () => {
    expect(hasFragmentIdentifier('https://example.com#section')).toBe(true);
    expect(hasFragmentIdentifier('https://example.com/resource#id')).toBe(true);
    expect(hasFragmentIdentifier('https://example.com/path#fragment')).toBe(true);
  });

  it('should return false for URIs without fragments', () => {
    expect(hasFragmentIdentifier('https://example.com')).toBe(false);
    expect(hasFragmentIdentifier('https://example.com/path')).toBe(false);
    expect(hasFragmentIdentifier('https://example.com?query=value')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(hasFragmentIdentifier('')).toBe(false);
    expect(hasFragmentIdentifier('#')).toBe(true);
    expect(hasFragmentIdentifier('##')).toBe(true);
  });
});

// ============================================================================
// isValidId Tests
// ============================================================================

describe('isValidId', () => {
  it('should validate correct HTTP IDs', () => {
    const result = isValidId('https://example.com/resource', 'Manifest');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject empty IDs', () => {
    const result = isValidId('', 'Manifest');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('ID is required');
  });

  it('should reject non-HTTP URIs', () => {
    const result = isValidId('urn:uuid:12345', 'Manifest');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('ID must be a valid HTTP(S) URI');
  });

  it('should reject fragment identifiers for Canvas', () => {
    const result = isValidId('https://example.com/canvas#1', 'Canvas');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Canvas ID must not contain a fragment identifier');
  });

  it('should allow fragment identifiers for non-Canvas resources', () => {
    const result = isValidId('https://example.com/annotation#1', 'Annotation');
    expect(result.valid).toBe(true);
  });

  it('should handle various resource types', () => {
    expect(isValidId('https://example.com/manifest', 'Manifest').valid).toBe(true);
    expect(isValidId('https://example.com/collection', 'Collection').valid).toBe(true);
    expect(isValidId('https://example.com/range', 'Range').valid).toBe(true);
  });
});

// ============================================================================
// generateValidUri Tests
// ============================================================================

describe('generateValidUri', () => {
  it('should generate valid HTTP URIs', () => {
    const uri = generateValidUri('Manifest');
    expect(uri).toMatch(/^http:\/\/archive\.local\/iiif\/manifest\/[\w-]+$/);
  });

  it('should use provided suffix', () => {
    const uri = generateValidUri('Canvas', 'my-canvas-id');
    expect(uri).toBe('http://archive.local/iiif/canvas/my-canvas-id');
  });

  it('should handle empty resource type', () => {
    const uri = generateValidUri('', 'id');
    expect(uri).toMatch(/^http:\/\/archive\.local\/iiif\/resource\/id$/);
  });

  it('should handle lowercase conversion', () => {
    const uri = generateValidUri('MANIFEST', 'test');
    expect(uri).toContain('/iiif/manifest/');
  });

  it('should generate unique URIs when no suffix provided', () => {
    const uri1 = generateValidUri('Manifest');
    const uri2 = generateValidUri('Manifest');
    expect(uri1).not.toBe(uri2);
  });
});

// ============================================================================
// convertToHttpUri Tests
// ============================================================================

describe('convertToHttpUri', () => {
  it('should return HTTP URIs unchanged', () => {
    const httpUri = 'https://example.com/resource';
    expect(convertToHttpUri(httpUri, 'Manifest')).toBe(httpUri);
  });

  it('should convert URN to HTTP URI', () => {
    const result = convertToHttpUri('urn:uuid:12345', 'Manifest');
    expect(result).toMatch(/^http:\/\/archive\.local\/iiif\/manifest\//);
    expect(result).toContain('urn%3Auuid%3A12345');
  });

  it('should convert plain IDs to HTTP URI', () => {
    const result = convertToHttpUri('my-custom-id', 'Canvas');
    expect(result).toMatch(/^http:\/\/archive\.local\/iiif\/canvas\//);
    expect(result).toContain('my-custom-id');
  });

  it('should handle special characters in IDs', () => {
    const result = convertToHttpUri('id with spaces & special chars!', 'Manifest');
    expect(result).toContain(encodeURIComponent('id with spaces & special chars!'));
  });

  it('should handle empty ID', () => {
    const result = convertToHttpUri('', 'Manifest');
    expect(result).toContain('item');
  });
});

// ============================================================================
// findDuplicateIds Tests
// ============================================================================

describe('findDuplicateIds', () => {
  const createMockItem = (id: string, children: IIIFItem[] = []): IIIFItem => ({
    id,
    type: 'Manifest',
    label: { none: ['Test'] },
    items: children,
  });

  it('should find no duplicates in unique items', () => {
    const items: IIIFItem[] = [
      createMockItem('https://example.com/1'),
      createMockItem('https://example.com/2'),
      createMockItem('https://example.com/3'),
    ];

    const result = findDuplicateIds(items);
    expect(result.duplicates).toHaveLength(0);
    expect(result.uniqueCount).toBe(3);
    expect(result.totalItems).toBe(3);
  });

  it('should find duplicate IDs', () => {
    const items: IIIFItem[] = [
      createMockItem('https://example.com/1'),
      createMockItem('https://example.com/2'),
      createMockItem('https://example.com/1'), // duplicate
    ];

    const result = findDuplicateIds(items);
    expect(result.duplicates).toContain('https://example.com/1');
    expect(result.duplicates).toHaveLength(1);
    expect(result.idCounts.get('https://example.com/1')).toBe(2);
  });

  it('should find duplicates in nested children', () => {
    const items: IIIFItem[] = [
      createMockItem('https://example.com/1', [
        createMockItem('https://example.com/2'),
      ]),
      createMockItem('https://example.com/2'), // duplicate of child
    ];

    const result = findDuplicateIds(items);
    expect(result.duplicates).toContain('https://example.com/2');
  });

  it('should handle items without IDs', () => {
    const items: IIIFItem[] = [
      { type: 'Canvas', label: { none: ['Test'] } } as IIIFItem,
      createMockItem('https://example.com/1'),
    ];

    const result = findDuplicateIds(items);
    expect(result.duplicates).toHaveLength(0);
    expect(result.uniqueCount).toBe(1);
  });

  it('should handle single item (tree)', () => {
    const tree = createMockItem('https://example.com/1', [
      createMockItem('https://example.com/1'), // duplicate
    ]);

    const result = findDuplicateIds(tree);
    expect(result.duplicates).toContain('https://example.com/1');
  });

  it('should handle empty array', () => {
    const result = findDuplicateIds([]);
    expect(result.duplicates).toHaveLength(0);
    expect(result.uniqueCount).toBe(0);
    expect(result.totalItems).toBe(0);
  });

  it('should count occurrences correctly', () => {
    const items: IIIFItem[] = [
      createMockItem('https://example.com/1'),
      createMockItem('https://example.com/1'),
      createMockItem('https://example.com/1'),
      createMockItem('https://example.com/2'),
    ];

    const result = findDuplicateIds(items);
    expect(result.idCounts.get('https://example.com/1')).toBe(3);
    expect(result.idCounts.get('https://example.com/2')).toBe(1);
    expect(result.uniqueCount).toBe(2);
    expect(result.totalItems).toBe(4);
  });
});

// ============================================================================
// hasDuplicateIds Tests
// ============================================================================

describe('hasDuplicateIds', () => {
  const createMockItem = (id: string, children: IIIFItem[] = []): IIIFItem => ({
    id,
    type: 'Manifest',
    label: { none: ['Test'] },
    items: children,
  });

  it('should return false for unique IDs', () => {
    const items: IIIFItem[] = [
      createMockItem('https://example.com/1'),
      createMockItem('https://example.com/2'),
    ];

    expect(hasDuplicateIds(items)).toBe(false);
  });

  it('should return true when duplicates exist', () => {
    const items: IIIFItem[] = [
      createMockItem('https://example.com/1'),
      createMockItem('https://example.com/1'),
    ];

    expect(hasDuplicateIds(items)).toBe(true);
  });

  it('should return false for empty array', () => {
    expect(hasDuplicateIds([])).toBe(false);
  });

  it('should detect duplicates in nested items', () => {
    const items: IIIFItem[] = [
      createMockItem('https://example.com/1', [
        createMockItem('https://example.com/2'),
      ]),
      createMockItem('https://example.com/2'),
    ];

    expect(hasDuplicateIds(items)).toBe(true);
  });

  it('should handle items without IDs', () => {
    const items: IIIFItem[] = [
      { type: 'Canvas' } as IIIFItem,
      { type: 'Canvas' } as IIIFItem,
    ];

    expect(hasDuplicateIds(items)).toBe(false);
  });
});

// ============================================================================
// generateUUID Tests
// ============================================================================

describe('generateUUID', () => {
  it('should generate valid UUID format', () => {
    const uuid = generateUUID();
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should generate unique UUIDs', () => {
    const uuids = new Set();
    for (let i = 0; i < 100; i++) {
      uuids.add(generateUUID());
    }
    expect(uuids.size).toBe(100);
  });
});

// ============================================================================
// generateResourceId Tests
// ============================================================================

describe('generateResourceId', () => {
  it('should generate URN format', () => {
    const id = generateResourceId('Manifest');
    expect(id).toMatch(/^urn:uuid:manifest-\d+-[a-z0-9]+$/);
  });

  it('should include resource type', () => {
    const id = generateResourceId('Canvas');
    expect(id).toContain('canvas');
  });

  it('should generate unique IDs', () => {
    const id1 = generateResourceId('Manifest');
    // Small delay to ensure different timestamp
    const id2 = generateResourceId('Manifest');
    expect(id1).not.toBe(id2);
  });

  it('should handle lowercase type', () => {
    const id = generateResourceId('manifest');
    expect(id).toContain('manifest');
  });
});

// ============================================================================
// normalizeUri Tests
// ============================================================================

describe('normalizeUri', () => {
  it('should remove trailing slash', () => {
    expect(normalizeUri('https://example.com/')).toBe('https://example.com');
    expect(normalizeUri('https://example.com/path/')).toBe('https://example.com/path');
  });

  it('should preserve URL without trailing slash', () => {
    expect(normalizeUri('https://example.com')).toBe('https://example.com');
    expect(normalizeUri('https://example.com/path')).toBe('https://example.com/path');
  });

  it('should lowercase HTTP protocol', () => {
    expect(normalizeUri('HTTP://example.com')).toBe('http://example.com');
    expect(normalizeUri('HTTPS://example.com')).toBe('https://example.com');
  });

  it('should handle empty string', () => {
    expect(normalizeUri('')).toBe('');
  });

  it('should handle null/undefined gracefully', () => {
    expect(normalizeUri(null as any)).toBeNull();
    expect(normalizeUri(undefined as any)).toBeUndefined();
  });

  it('should preserve path, query, and fragment', () => {
    expect(normalizeUri('https://example.com/path?query=value#fragment')).toBe('https://example.com/path?query=value#fragment');
  });
});

// ============================================================================
// removeTrailingSlash Tests
// ============================================================================

describe('removeTrailingSlash', () => {
  it('should remove single trailing slash', () => {
    expect(removeTrailingSlash('https://example.com/')).toBe('https://example.com');
  });

  it('should remove only one trailing slash', () => {
    expect(removeTrailingSlash('https://example.com//')).toBe('https://example.com/');
  });

  it('should return unchanged if no trailing slash', () => {
    expect(removeTrailingSlash('https://example.com')).toBe('https://example.com');
    expect(removeTrailingSlash('https://example.com/path')).toBe('https://example.com/path');
  });

  it('should handle root path', () => {
    expect(removeTrailingSlash('/')).toBe('');
  });

  it('should handle empty string', () => {
    expect(removeTrailingSlash('')).toBe('');
  });

  it('should handle path only', () => {
    expect(removeTrailingSlash('/path/to/resource/')).toBe('/path/to/resource');
  });
});

// ============================================================================
// getUriLastSegment Tests
// ============================================================================

describe('getUriLastSegment', () => {
  it('should extract last path segment from URL', () => {
    expect(getUriLastSegment('https://example.com/path/to/resource')).toBe('resource');
    expect(getUriLastSegment('https://example.com/path/to/resource/')).toBe('resource');
  });

  it('should handle single path segment', () => {
    expect(getUriLastSegment('https://example.com/resource')).toBe('resource');
  });

  it('should handle root URL', () => {
    expect(getUriLastSegment('https://example.com/')).toBe('');
    expect(getUriLastSegment('https://example.com')).toBe('');
  });

  it('should handle non-URL strings', () => {
    expect(getUriLastSegment('path/to/resource')).toBe('resource');
    expect(getUriLastSegment('/path/to/resource')).toBe('resource');
  });

  it('should handle empty string', () => {
    expect(getUriLastSegment('')).toBe('');
  });

  it('should ignore query parameters and fragments', () => {
    expect(getUriLastSegment('https://example.com/path?query=value')).toBe('path');
    expect(getUriLastSegment('https://example.com/path#fragment')).toBe('path');
  });

  it('should handle URN schemes', () => {
    expect(getUriLastSegment('urn:uuid:12345')).toBe('12345');
    expect(getUriLastSegment('urn:isbn:1234567890')).toBe('1234567890');
  });
});
