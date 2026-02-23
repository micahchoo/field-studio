/**
 * Export Feature Model Tests
 *
 * Tests pure functions in the three export service singletons:
 * - archivalPackageService (OCFL/BagIt digital preservation)
 * - staticSiteExporter (Wax-compatible static sites)
 * - exportService (IIIF Image API exports)
 *
 * Private methods are accessed via bracket notation since they are
 * on class singletons.
 */

import { describe, it, expect } from 'vitest';
import { exportService } from '../model/exportService';
import { staticSiteExporter } from '../model/staticSiteExporter';
import { archivalPackageService } from '../model/archivalPackageService';

import type {
  IIIFItem,
  IIIFCanvas,
  IIIFCollection,
  IIIFManifest,
} from '@/src/shared/types';
import type { CanopyConfig, ImageApiOptions } from '../model/exportService';

// ============================================================================
// Test Helpers
// ============================================================================

function makeCanvas(id: string, overrides?: Partial<IIIFCanvas>): IIIFCanvas {
  return {
    id,
    type: 'Canvas',
    label: { none: [`Canvas ${id}`] },
    width: 1000,
    height: 800,
    items: [{
      id: `${id}/page/1`,
      type: 'AnnotationPage',
      items: [{
        id: `${id}/page/1/annotation/1`,
        type: 'Annotation',
        motivation: 'painting',
        body: {
          id: `${id}/image.jpg`,
          type: 'Image',
          format: 'image/jpeg',
        },
        target: id,
      }],
    }],
    ...overrides,
  } as IIIFCanvas;
}

function makeManifest(id: string, canvases: IIIFCanvas[]): IIIFManifest {
  return {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id,
    type: 'Manifest',
    label: { none: [`Manifest ${id}`] },
    items: canvases,
  } as IIIFManifest;
}

function makeCollection(id: string, items: IIIFItem[]): IIIFCollection {
  return {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id,
    type: 'Collection',
    label: { none: [`Collection ${id}`] },
    items,
  } as IIIFCollection;
}

function makeItem(overrides: Partial<IIIFItem>): IIIFItem {
  return {
    id: 'http://example.org/item/1',
    type: 'Manifest',
    label: { none: ['Test Item'] },
    ...overrides,
  } as IIIFItem;
}

// Cast helpers for bracket notation access
const archival = archivalPackageService as any;
const staticExporter = staticSiteExporter as any;
const exporter = exportService as any;

// ============================================================================
// 1. archivalPackageService Tests
// ============================================================================

describe('archivalPackageService', () => {
  // --------------------------------------------------------------------------
  // sanitizeId
  // --------------------------------------------------------------------------
  describe('sanitizeId', () => {
    it('strips http:// protocol from URLs', () => {
      const result = archival['sanitizeId']('http://example.org/item/1');
      expect(result).toBe('example_org_item_1');
    });

    it('strips https:// protocol from URLs', () => {
      const result = archival['sanitizeId']('https://example.org/item/1');
      expect(result).toBe('example_org_item_1');
    });

    it('replaces slashes with underscores', () => {
      const result = archival['sanitizeId']('some/path/here');
      expect(result).toBe('some_path_here');
    });

    it('replaces special characters with underscores', () => {
      const result = archival['sanitizeId']('id with spaces & symbols!');
      expect(result).toBe('id_with_spaces___symbols_');
    });

    it('handles empty string', () => {
      const result = archival['sanitizeId']('');
      expect(result).toBe('');
    });

    it('handles complex URLs with query params', () => {
      const result = archival['sanitizeId']('https://iiif.example.org/api/v3/manifest?format=json&id=123');
      expect(result).not.toContain('://');
      expect(result).not.toContain('?');
      expect(result).not.toContain('&');
      expect(result).not.toContain('=');
    });

    it('truncates long IDs to 100 characters', () => {
      const longId = 'a'.repeat(200);
      const result = archival['sanitizeId'](longId);
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('preserves alphanumeric characters, underscores, and hyphens', () => {
      const result = archival['sanitizeId']('valid-id_123');
      expect(result).toBe('valid-id_123');
    });

    it('handles URL with port number', () => {
      const result = archival['sanitizeId']('http://localhost:8080/manifest');
      expect(result).toBe('localhost_8080_manifest');
    });

    it('handles URL with fragment', () => {
      const result = archival['sanitizeId']('https://example.org/page#section');
      expect(result).toBe('example_org_page_section');
    });
  });

  // --------------------------------------------------------------------------
  // formatSize
  // --------------------------------------------------------------------------
  describe('formatSize', () => {
    it('formats 0 bytes', () => {
      const result = archival['formatSize'](0);
      expect(result).toBe('0 bytes');
    });

    it('formats bytes (< 1024)', () => {
      const result = archival['formatSize'](512);
      expect(result).toBe('512 bytes');
    });

    it('formats 1 byte', () => {
      const result = archival['formatSize'](1);
      expect(result).toBe('1 bytes');
    });

    it('formats 1023 bytes (edge of KB)', () => {
      const result = archival['formatSize'](1023);
      expect(result).toBe('1023 bytes');
    });

    it('formats exact 1 KB', () => {
      const result = archival['formatSize'](1024);
      expect(result).toBe('1.0 KB');
    });

    it('formats KB range', () => {
      const result = archival['formatSize'](5120);
      expect(result).toBe('5.0 KB');
    });

    it('formats fractional KB', () => {
      const result = archival['formatSize'](1536);
      expect(result).toBe('1.5 KB');
    });

    it('formats exact 1 MB', () => {
      const result = archival['formatSize'](1024 * 1024);
      expect(result).toBe('1.0 MB');
    });

    it('formats MB range', () => {
      const result = archival['formatSize'](5.5 * 1024 * 1024);
      expect(result).toBe('5.5 MB');
    });

    it('formats exact 1 GB', () => {
      const result = archival['formatSize'](1024 * 1024 * 1024);
      expect(result).toBe('1.00 GB');
    });

    it('formats GB range', () => {
      const result = archival['formatSize'](2.5 * 1024 * 1024 * 1024);
      expect(result).toBe('2.50 GB');
    });

    it('formats large GB values', () => {
      const result = archival['formatSize'](100 * 1024 * 1024 * 1024);
      expect(result).toBe('100.00 GB');
    });
  });

  // --------------------------------------------------------------------------
  // computeDigest
  // --------------------------------------------------------------------------
  describe('computeDigest', () => {
    const hasCrypto = typeof globalThis.crypto?.subtle?.digest === 'function';

    it.skipIf(!hasCrypto)('computes SHA-256 of known string', async () => {
      // SHA-256 of empty string is well-known
      const result = await archival['computeDigest']('', 'sha256');
      expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it.skipIf(!hasCrypto)('computes SHA-512 of empty string', async () => {
      const result = await archival['computeDigest']('', 'sha512');
      expect(result).toBe(
        'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce' +
        '47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e'
      );
    });

    it.skipIf(!hasCrypto)('computes SHA-256 of known string "hello"', async () => {
      const result = await archival['computeDigest']('hello', 'sha256');
      // SHA-256 of "hello"
      expect(result).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    it.skipIf(!hasCrypto)('computes SHA-256 of Blob input', async () => {
      const blob = new Blob(['hello'], { type: 'text/plain' });
      const result = await archival['computeDigest'](blob, 'sha256');
      // Same hash as the string "hello"
      expect(result).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    it.skipIf(!hasCrypto)('computes SHA-512 of known string "hello"', async () => {
      const result = await archival['computeDigest']('hello', 'sha512');
      expect(result).toBe(
        '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7' +
        '2323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043'
      );
    });

    it.skipIf(!hasCrypto)('produces different hashes for different algorithms', async () => {
      const sha256 = await archival['computeDigest']('test-data', 'sha256');
      const sha512 = await archival['computeDigest']('test-data', 'sha512');
      expect(sha256).not.toBe(sha512);
      expect(sha256.length).toBe(64); // SHA-256 = 32 bytes = 64 hex chars
      expect(sha512.length).toBe(128); // SHA-512 = 64 bytes = 128 hex chars
    });

    it.skipIf(!hasCrypto)('produces consistent results for same input', async () => {
      const result1 = await archival['computeDigest']('consistent', 'sha256');
      const result2 = await archival['computeDigest']('consistent', 'sha256');
      expect(result1).toBe(result2);
    });

    it.skipIf(!hasCrypto)('handles Blob with binary data', async () => {
      const data = new Uint8Array([0, 1, 2, 3, 255]);
      const blob = new Blob([data]);
      const result = await archival['computeDigest'](blob, 'sha256');
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  // --------------------------------------------------------------------------
  // collectCanvases
  // --------------------------------------------------------------------------
  describe('collectCanvases', () => {
    it('extracts canvases from a flat manifest', () => {
      const canvas1 = makeCanvas('http://example.org/c1');
      const canvas2 = makeCanvas('http://example.org/c2');
      const manifest = makeManifest('http://example.org/m1', [canvas1, canvas2]);

      const result: IIIFCanvas[] = archival['collectCanvases'](manifest);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('http://example.org/c1');
      expect(result[1].id).toBe('http://example.org/c2');
    });

    it('extracts canvases from nested collection -> manifests -> canvases', () => {
      const canvas1 = makeCanvas('http://example.org/c1');
      const canvas2 = makeCanvas('http://example.org/c2');
      const manifest1 = makeManifest('http://example.org/m1', [canvas1]);
      const manifest2 = makeManifest('http://example.org/m2', [canvas2]);
      const collection = makeCollection('http://example.org/col', [manifest1, manifest2]);

      const result: IIIFCanvas[] = archival['collectCanvases'](collection);
      expect(result).toHaveLength(2);
      expect(result.map((c: IIIFCanvas) => c.id)).toContain('http://example.org/c1');
      expect(result.map((c: IIIFCanvas) => c.id)).toContain('http://example.org/c2');
    });

    it('returns empty array for item with no canvases', () => {
      const collection = makeCollection('http://example.org/empty', []);
      const result: IIIFCanvas[] = archival['collectCanvases'](collection);
      expect(result).toHaveLength(0);
    });

    it('returns empty array for item with no items property', () => {
      const item = makeItem({ id: 'http://example.org/bare', items: undefined });
      const result: IIIFCanvas[] = archival['collectCanvases'](item);
      expect(result).toHaveLength(0);
    });

    it('handles deeply nested structures', () => {
      const canvas = makeCanvas('http://example.org/deep-canvas');
      const manifest = makeManifest('http://example.org/m', [canvas]);
      const innerCol = makeCollection('http://example.org/inner', [manifest]);
      const outerCol = makeCollection('http://example.org/outer', [innerCol]);

      const result: IIIFCanvas[] = archival['collectCanvases'](outerCol);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('http://example.org/deep-canvas');
    });

    it('collects canvases from multiple manifests at same level', () => {
      const c1 = makeCanvas('http://example.org/c1');
      const c2 = makeCanvas('http://example.org/c2');
      const c3 = makeCanvas('http://example.org/c3');
      const m1 = makeManifest('http://example.org/m1', [c1, c2]);
      const m2 = makeManifest('http://example.org/m2', [c3]);
      const col = makeCollection('http://example.org/col', [m1, m2]);

      const result: IIIFCanvas[] = archival['collectCanvases'](col);
      expect(result).toHaveLength(3);
    });

    it('does not return manifests or collections as canvases', () => {
      const canvas = makeCanvas('http://example.org/c1');
      const manifest = makeManifest('http://example.org/m1', [canvas]);
      const col = makeCollection('http://example.org/col', [manifest]);

      const result: IIIFCanvas[] = archival['collectCanvases'](col);
      for (const item of result) {
        expect(item.type).toBe('Canvas');
      }
    });
  });
});

// ============================================================================
// 2. staticSiteExporter Tests
// ============================================================================

describe('staticSiteExporter', () => {
  // --------------------------------------------------------------------------
  // slugify
  // --------------------------------------------------------------------------
  describe('slugify', () => {
    it('converts regular string to lowercase-hyphenated', () => {
      const result = staticExporter['slugify']('Hello World');
      expect(result).toBe('hello-world');
    });

    it('strips URL protocol and slugifies', () => {
      const result = staticExporter['slugify']('https://example.org/manifest/1');
      expect(result).not.toContain('://');
      expect(result).toMatch(/^[a-z0-9-]+$/);
    });

    it('returns "item" for null', () => {
      const result = staticExporter['slugify'](null);
      expect(result).toBe('item');
    });

    it('returns "item" for undefined', () => {
      const result = staticExporter['slugify'](undefined);
      expect(result).toBe('item');
    });

    it('returns "item" for empty string', () => {
      const result = staticExporter['slugify']('');
      expect(result).toBe('item');
    });

    it('truncates long string at 50 characters', () => {
      const longStr = 'a-very-long-string-that-exceeds-the-maximum-allowed-length-for-slugs-in-this-system';
      const result = staticExporter['slugify'](longStr);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('removes special characters', () => {
      const result = staticExporter['slugify']('test!@#$%string');
      expect(result).not.toMatch(/[!@#$%]/);
      expect(result).toMatch(/^[a-z0-9-]+$/);
    });

    it('collapses multiple hyphens', () => {
      const result = staticExporter['slugify']('hello   world   test');
      expect(result).not.toContain('--');
    });

    it('removes leading and trailing hyphens', () => {
      const result = staticExporter['slugify']('---hello---');
      expect(result).not.toMatch(/^-/);
      expect(result).not.toMatch(/-$/);
    });

    it('handles numeric strings', () => {
      const result = staticExporter['slugify']('12345');
      expect(result).toBe('12345');
    });

    it('converts uppercase to lowercase', () => {
      const result = staticExporter['slugify']('UPPERCASE');
      expect(result).toBe('uppercase');
    });

    it('handles string with only special characters', () => {
      const result = staticExporter['slugify']('!@#$%^&*()');
      // After removing all special chars and trimming hyphens, falls back to 'item'
      expect(result).toBe('item');
    });
  });

  // --------------------------------------------------------------------------
  // escapeHtml
  // --------------------------------------------------------------------------
  describe('escapeHtml', () => {
    it('escapes < and > in script tag', () => {
      const result = staticExporter['escapeHtml']('<script>alert("xss")</script>');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).not.toContain('<script>');
    });

    it('escapes ampersand', () => {
      const result = staticExporter['escapeHtml']('a & b');
      expect(result).toBe('a &amp; b');
    });

    it('escapes double quotes', () => {
      const result = staticExporter['escapeHtml']('say "hello"');
      expect(result).toBe('say &quot;hello&quot;');
    });

    it('returns empty string for null', () => {
      const result = staticExporter['escapeHtml'](null);
      expect(result).toBe('');
    });

    it('returns empty string for undefined', () => {
      const result = staticExporter['escapeHtml'](undefined);
      expect(result).toBe('');
    });

    it('leaves plain text unmodified', () => {
      const result = staticExporter['escapeHtml']('hello world');
      expect(result).toBe('hello world');
    });

    it('escapes multiple special characters in one string', () => {
      const result = staticExporter['escapeHtml']('<div class="test">a & b</div>');
      expect(result).toBe('&lt;div class=&quot;test&quot;&gt;a &amp; b&lt;/div&gt;');
    });

    it('handles empty string', () => {
      const result = staticExporter['escapeHtml']('');
      expect(result).toBe('');
    });

    it('handles string with only HTML entities', () => {
      const result = staticExporter['escapeHtml']('<<<>>>');
      expect(result).toBe('&lt;&lt;&lt;&gt;&gt;&gt;');
    });
  });

  // --------------------------------------------------------------------------
  // escapeYaml
  // --------------------------------------------------------------------------
  describe('escapeYaml', () => {
    it('escapes double quotes in YAML', () => {
      const result = staticExporter['escapeYaml']('say "hello"');
      expect(result).toBe('say \\"hello\\"');
    });

    it('escapes newlines by replacing with space', () => {
      const result = staticExporter['escapeYaml']('line1\nline2');
      expect(result).toBe('line1 line2');
    });

    it('returns empty string for null', () => {
      const result = staticExporter['escapeYaml'](null);
      expect(result).toBe('');
    });

    it('returns empty string for undefined', () => {
      const result = staticExporter['escapeYaml'](undefined);
      expect(result).toBe('');
    });

    it('leaves plain text unmodified', () => {
      const result = staticExporter['escapeYaml']('hello world');
      expect(result).toBe('hello world');
    });

    it('handles string with both quotes and newlines', () => {
      const result = staticExporter['escapeYaml']('"quoted"\nnew line');
      expect(result).toBe('\\"quoted\\" new line');
    });

    it('handles empty string', () => {
      const result = staticExporter['escapeYaml']('');
      expect(result).toBe('');
    });

    it('handles multiple consecutive newlines', () => {
      const result = staticExporter['escapeYaml']('a\n\n\nb');
      expect(result).toBe('a   b');
    });
  });

  // --------------------------------------------------------------------------
  // normalizeForSearch
  // --------------------------------------------------------------------------
  describe('normalizeForSearch', () => {
    it('strips HTML tags', () => {
      const result = staticExporter['normalizeForSearch']('<p>Hello <b>World</b></p>');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).toContain('hello');
      expect(result).toContain('world');
    });

    it('collapses extra whitespace', () => {
      const result = staticExporter['normalizeForSearch']('hello     world');
      expect(result).toBe('hello world');
    });

    it('trims leading and trailing whitespace', () => {
      const result = staticExporter['normalizeForSearch']('  hello world  ');
      expect(result).toBe('hello world');
    });

    it('returns empty string for null', () => {
      const result = staticExporter['normalizeForSearch'](null);
      expect(result).toBe('');
    });

    it('returns empty string for undefined', () => {
      const result = staticExporter['normalizeForSearch'](undefined);
      expect(result).toBe('');
    });

    it('converts to lowercase', () => {
      const result = staticExporter['normalizeForSearch']('HELLO WORLD');
      expect(result).toBe('hello world');
    });

    it('replaces special characters with spaces', () => {
      const result = staticExporter['normalizeForSearch']('hello! @world #test');
      expect(result).toMatch(/^[a-z0-9\s]+$/);
    });

    it('handles complex HTML with attributes', () => {
      const result = staticExporter['normalizeForSearch']('<div class="test" id="main"><span>content</span></div>');
      expect(result).toBe('content');
    });

    it('handles empty string', () => {
      const result = staticExporter['normalizeForSearch']('');
      expect(result).toBe('');
    });

    it('handles string with only HTML tags', () => {
      const result = staticExporter['normalizeForSearch']('<br/><hr/>');
      expect(result).toBe('');
    });

    it('handles nested tags with text', () => {
      const result = staticExporter['normalizeForSearch']('<div><p>Hello</p> <p>World</p></div>');
      expect(result).toBe('hello world');
    });
  });
});

// ============================================================================
// 3. exportService Tests
// ============================================================================

describe('exportService', () => {
  // --------------------------------------------------------------------------
  // sanitizePathSegment
  // --------------------------------------------------------------------------
  describe('sanitizePathSegment', () => {
    it('converts to lowercase', () => {
      const result = exporter['sanitizePathSegment']('HelloWorld');
      expect(result).toBe('helloworld');
    });

    it('replaces special characters with hyphens', () => {
      const result = exporter['sanitizePathSegment']('hello world!');
      expect(result).toMatch(/^[a-z0-9-]+$/);
    });

    it('replaces spaces with hyphens', () => {
      const result = exporter['sanitizePathSegment']('hello world');
      expect(result).toBe('hello-world');
    });

    it('removes leading hyphens', () => {
      const result = exporter['sanitizePathSegment']('---hello');
      expect(result).not.toMatch(/^-/);
    });

    it('removes trailing hyphens', () => {
      const result = exporter['sanitizePathSegment']('hello---');
      expect(result).not.toMatch(/-$/);
    });

    it('collapses multiple consecutive special chars into single hyphen', () => {
      const result = exporter['sanitizePathSegment']('hello!!!world');
      expect(result).toBe('hello-world');
    });

    it('truncates to 100 characters', () => {
      const longStr = 'a'.repeat(200);
      const result = exporter['sanitizePathSegment'](longStr);
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('handles empty string', () => {
      const result = exporter['sanitizePathSegment']('');
      expect(result).toBe('');
    });

    it('handles string with only special characters', () => {
      const result = exporter['sanitizePathSegment']('!@#$%');
      expect(result).toBe('');
    });

    it('preserves numbers', () => {
      const result = exporter['sanitizePathSegment']('item-123');
      expect(result).toBe('item-123');
    });

    it('handles mixed case with special chars', () => {
      const result = exporter['sanitizePathSegment']('Creator: John Doe');
      expect(result).toBe('creator-john-doe');
    });
  });

  // --------------------------------------------------------------------------
  // extractIIIFValue
  // --------------------------------------------------------------------------
  describe('extractIIIFValue', () => {
    it('extracts value from "none" language key', () => {
      const result = exporter['extractIIIFValue']({ none: ['Test Value'] });
      expect(result).toBe('Test Value');
    });

    it('extracts value from "en" language key when "none" is absent', () => {
      const result = exporter['extractIIIFValue']({ en: ['English Value'] });
      expect(result).toBe('English Value');
    });

    it('prefers "none" over "en"', () => {
      const result = exporter['extractIIIFValue']({ none: ['None Value'], en: ['English Value'] });
      expect(result).toBe('None Value');
    });

    it('returns empty string for null', () => {
      const result = exporter['extractIIIFValue'](null);
      expect(result).toBe('');
    });

    it('returns empty string for undefined', () => {
      const result = exporter['extractIIIFValue'](undefined);
      expect(result).toBe('');
    });

    it('returns empty string for empty object', () => {
      const result = exporter['extractIIIFValue']({});
      expect(result).toBe('');
    });
  });

  // --------------------------------------------------------------------------
  // generateImageInfoJsonForExport
  // --------------------------------------------------------------------------
  describe('generateImageInfoJsonForExport', () => {
    it('returns valid JSON', () => {
      const result = exporter['generateImageInfoJsonForExport'](
        'test-asset', 2000, 1500, false, false
      );
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('has correct @context for IIIF Image API 3.0', () => {
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 2000, 1500, false, false)
      );
      expect(result['@context']).toBe('http://iiif.io/api/image/3/context.json');
    });

    it('has correct profile value', () => {
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 2000, 1500, false, false)
      );
      expect(result.profile).toBe('level0');
    });

    it('has correct type', () => {
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 2000, 1500, false, false)
      );
      expect(result.type).toBe('ImageService3');
    });

    it('has correct width and height', () => {
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 2000, 1500, false, false)
      );
      expect(result.width).toBe(2000);
      expect(result.height).toBe(1500);
    });

    it('has protocol field', () => {
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 2000, 1500, false, false)
      );
      expect(result.protocol).toBe('http://iiif.io/api/image');
    });

    it('has sizes array', () => {
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 2000, 1500, false, false)
      );
      expect(result.sizes).toBeDefined();
      expect(Array.isArray(result.sizes)).toBe(true);
      expect(result.sizes.length).toBeGreaterThan(0);
    });

    it('has tiles array when tiling is enabled', () => {
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 2000, 1500, false, true)
      );
      expect(result.tiles).toBeDefined();
      expect(Array.isArray(result.tiles)).toBe(true);
      expect(result.tiles.length).toBeGreaterThan(0);
      expect(result.tiles[0].width).toBeDefined();
      expect(result.tiles[0].scaleFactors).toBeDefined();
    });

    it('does not have tiles when tiling is disabled', () => {
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 2000, 1500, false, false)
      );
      expect(result.tiles).toBeUndefined();
    });

    it('uses localhost URL for Canopy format', () => {
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 2000, 1500, true, false)
      );
      expect(result.id).toContain('http://localhost');
      expect(result.id).toContain('test-asset');
    });

    it('uses relative path for non-Canopy format', () => {
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 2000, 1500, false, false)
      );
      expect(result.id).toBe('images/test-asset');
    });

    it('includes rights property when provided', () => {
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport'](
          'test-asset', 2000, 1500, false, false, undefined,
          'http://creativecommons.org/licenses/by/4.0/'
        )
      );
      expect(result.rights).toBe('http://creativecommons.org/licenses/by/4.0/');
    });

    it('does not include rights when not provided', () => {
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 2000, 1500, false, false)
      );
      expect(result.rights).toBeUndefined();
    });

    it('includes WebP format when enabled in options', () => {
      const opts: ImageApiOptions = { includeWebP: true };
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 2000, 1500, false, false, opts)
      );
      expect(result.preferredFormats).toBeDefined();
      expect(result.preferredFormats).toContain('webp');
      expect(result.extraFormats).toContain('webp');
    });

    it('includes grayscale quality when enabled in options', () => {
      const opts: ImageApiOptions = { includeGrayscale: true };
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 2000, 1500, false, false, opts)
      );
      expect(result.extraQualities).toContain('gray');
      expect(result.extraQualities).toContain('color');
    });

    it('includes regionSquare feature when square option enabled', () => {
      const opts: ImageApiOptions = { includeSquare: true };
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 2000, 1500, false, false, opts)
      );
      expect(result.extraFeatures).toContain('regionSquare');
    });

    it('always includes sizeByWh in extraFeatures', () => {
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 2000, 1500, false, false)
      );
      expect(result.extraFeatures).toContain('sizeByWh');
    });

    it('uses custom tile size from options', () => {
      const opts: ImageApiOptions = { tileSize: 256 };
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 2000, 1500, false, true, opts)
      );
      expect(result.tiles[0].width).toBe(256);
    });

    it('defaults to tile size 512 when not specified', () => {
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 2000, 1500, false, true)
      );
      expect(result.tiles[0].width).toBe(512);
    });

    it('uses custom port for Canopy', () => {
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport'](
          'test-asset', 2000, 1500, true, false, undefined, undefined, 9999
        )
      );
      expect(result.id).toContain('9999');
    });

    it('defaults to port 8765 for Canopy', () => {
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 2000, 1500, true, false)
      );
      expect(result.id).toContain('8765');
    });

    it('tile scaleFactors increase by powers of 2', () => {
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 4000, 3000, false, true)
      );
      const scaleFactors = result.tiles[0].scaleFactors;
      for (let i = 0; i < scaleFactors.length; i++) {
        expect(scaleFactors[i]).toBe(Math.pow(2, i));
      }
    });

    it('sizes array entries have width and height', () => {
      const result = JSON.parse(
        exporter['generateImageInfoJsonForExport']('test-asset', 2000, 1500, false, false)
      );
      for (const size of result.sizes) {
        expect(size.width).toBeDefined();
        expect(size.height).toBeDefined();
        expect(typeof size.width).toBe('number');
        expect(typeof size.height).toBe('number');
      }
    });
  });

  // --------------------------------------------------------------------------
  // countManifests (via extractIIIFValue we already tested, but let's do a
  // quick structural test)
  // --------------------------------------------------------------------------
  describe('countManifests', () => {
    it('counts manifests in a collection', () => {
      const m1 = makeManifest('http://example.org/m1', [makeCanvas('c1')]);
      const m2 = makeManifest('http://example.org/m2', [makeCanvas('c2')]);
      const col = makeCollection('http://example.org/col', [m1, m2]);

      const result = exporter['countManifests'](col);
      expect(result).toBe(2);
    });

    it('returns 0 for empty collection', () => {
      const col = makeCollection('http://example.org/col', []);
      const result = exporter['countManifests'](col);
      expect(result).toBe(0);
    });

    it('counts a single manifest as 1', () => {
      const m = makeManifest('http://example.org/m', [makeCanvas('c1')]);
      const result = exporter['countManifests'](m);
      expect(result).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // generateCanopyConfig
  // --------------------------------------------------------------------------
  describe('generateCanopyConfig', () => {
    const baseConfig: CanopyConfig = {
      title: 'Test Collection',
      theme: { accentColor: 'blue', grayColor: 'slate', appearance: 'light' },
      search: { enabled: true, indexSummary: false },
      metadata: ['Creator', 'Date'],
      featured: [],
    };

    it('generates YAML with collection title', () => {
      const root = makeCollection('http://example.org/col', []);
      const result: string = exporter['generateCanopyConfig'](root, baseConfig);
      expect(result).toContain('title: "Test Collection"');
    });

    it('uses "collection:" key for collection root', () => {
      const root = makeCollection('http://example.org/col', []);
      const result: string = exporter['generateCanopyConfig'](root, baseConfig);
      expect(result).toContain('collection:');
    });

    it('uses "manifest:" key for manifest root', () => {
      const root = makeManifest('http://example.org/m', []);
      const result: string = exporter['generateCanopyConfig'](root, baseConfig);
      expect(result).toContain('manifest:');
    });

    it('includes metadata fields', () => {
      const root = makeCollection('http://example.org/col', []);
      const result: string = exporter['generateCanopyConfig'](root, baseConfig);
      expect(result).toContain('metadata:');
      expect(result).toContain('  - Creator');
      expect(result).toContain('  - Date');
    });

    it('includes theme configuration', () => {
      const root = makeCollection('http://example.org/col', []);
      const result: string = exporter['generateCanopyConfig'](root, baseConfig);
      expect(result).toContain('accentColor: blue');
      expect(result).toContain('grayColor: slate');
      expect(result).toContain('appearance: light');
    });

    it('includes search configuration', () => {
      const root = makeCollection('http://example.org/col', []);
      const result: string = exporter['generateCanopyConfig'](root, baseConfig);
      expect(result).toContain('enabled: true');
      expect(result).toContain('enabled: false');
    });

    it('includes featured items when present', () => {
      const config = { ...baseConfig, featured: ['http://example.org/m1'] };
      const root = makeCollection('http://example.org/col', []);
      const result: string = exporter['generateCanopyConfig'](root, config);
      expect(result).toContain('featured:');
    });

    it('omits featured section when no featured items', () => {
      const root = makeCollection('http://example.org/col', []);
      const result: string = exporter['generateCanopyConfig'](root, baseConfig);
      expect(result).not.toContain('featured:');
    });

    it('uses configured port in URL', () => {
      const config = { ...baseConfig, port: 9000 };
      const root = makeCollection('http://example.org/col', []);
      const result: string = exporter['generateCanopyConfig'](root, config);
      expect(result).toContain('9000');
    });

    it('uses default port 8765 when not specified', () => {
      const root = makeCollection('http://example.org/col', []);
      const result: string = exporter['generateCanopyConfig'](root, baseConfig);
      expect(result).toContain('8765');
    });

    it('escapes quotes in title', () => {
      const config = { ...baseConfig, title: 'A "quoted" title' };
      const root = makeCollection('http://example.org/col', []);
      const result: string = exporter['generateCanopyConfig'](root, config);
      expect(result).toContain('\\"quoted\\"');
    });
  });

  // --------------------------------------------------------------------------
  // generateCanopyReadme
  // --------------------------------------------------------------------------
  describe('generateCanopyReadme', () => {
    const baseConfig: CanopyConfig = {
      title: 'My Collection',
      theme: { accentColor: 'blue', grayColor: 'slate', appearance: 'light' },
      search: { enabled: true, indexSummary: false },
      metadata: ['Creator'],
      featured: [],
    };

    it('includes collection title in heading', () => {
      const result: string = exporter['generateCanopyReadme'](baseConfig);
      expect(result).toContain('# My Collection');
    });

    it('includes npm install instructions', () => {
      const result: string = exporter['generateCanopyReadme'](baseConfig);
      expect(result).toContain('npm install');
    });

    it('includes port in serve:iiif instructions', () => {
      const config = { ...baseConfig, port: 9000 };
      const result: string = exporter['generateCanopyReadme'](config);
      expect(result).toContain('9000');
    });

    it('includes featured info when items present', () => {
      const config = { ...baseConfig, featured: ['a', 'b', 'c'] };
      const result: string = exporter['generateCanopyReadme'](config);
      expect(result).toContain('3 items selected for homepage');
    });

    it('includes metadata facets info', () => {
      const config = { ...baseConfig, metadata: ['Creator', 'Date', 'Subject'] };
      const result: string = exporter['generateCanopyReadme'](config);
      expect(result).toContain('Creator, Date, Subject');
    });

    it('indicates when search is disabled', () => {
      const config = { ...baseConfig, search: { enabled: false, indexSummary: false } };
      const result: string = exporter['generateCanopyReadme'](config);
      expect(result).toContain('Disabled');
    });

    it('uses default port 8765 when not specified', () => {
      const result: string = exporter['generateCanopyReadme'](baseConfig);
      expect(result).toContain('8765');
    });
  });
});
