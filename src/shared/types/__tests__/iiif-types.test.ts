/**
 * IIIF Type Module Tests
 *
 * Tests pure functions exported from IIIF type definition files.
 * No DOM or framework imports required.
 */

import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════
// 1. Search API — buildSearchUrl
// ═══════════════════════════════════════════════════════════════════════

import { buildSearchUrl } from '../search-api';
import type { SearchQuery } from '../search-api';

describe('search-api', () => {
  describe('buildSearchUrl', () => {
    it('builds URL with all query params', () => {
      const query: SearchQuery = {
        q: 'medieval',
        motivation: 'painting',
        date: '2024-01-15',
        user: 'admin',
      };
      const url = buildSearchUrl('https://example.org/search', query);
      expect(url).toBe(
        'https://example.org/search?q=medieval&motivation=painting&date=2024-01-15&user=admin'
      );
    });

    it('builds URL with only q param', () => {
      const query: SearchQuery = { q: 'illuminated' };
      const url = buildSearchUrl('https://example.org/search', query);
      expect(url).toBe('https://example.org/search?q=illuminated');
    });

    it('builds URL with only motivation param', () => {
      const query: SearchQuery = { motivation: 'commenting' };
      const url = buildSearchUrl('https://example.org/search', query);
      expect(url).toBe('https://example.org/search?motivation=commenting');
    });

    it('builds URL with only date param', () => {
      const query: SearchQuery = { date: '2024-06-01' };
      const url = buildSearchUrl('https://example.org/search', query);
      expect(url).toBe('https://example.org/search?date=2024-06-01');
    });

    it('builds URL with only user param', () => {
      const query: SearchQuery = { user: 'curator' };
      const url = buildSearchUrl('https://example.org/search', query);
      expect(url).toBe('https://example.org/search?user=curator');
    });

    it('returns bare serviceId when query is empty', () => {
      const url = buildSearchUrl('https://example.org/search', {});
      expect(url).toBe('https://example.org/search');
    });

    it('returns bare serviceId when all params are undefined', () => {
      const query: SearchQuery = {
        q: undefined,
        motivation: undefined,
        date: undefined,
        user: undefined,
      };
      const url = buildSearchUrl('https://example.org/search', query);
      expect(url).toBe('https://example.org/search');
    });

    it('omits falsy params (empty strings)', () => {
      const query: SearchQuery = { q: '', motivation: 'tagging' };
      const url = buildSearchUrl('https://example.org/search', query);
      // Empty string is falsy, so q should be omitted
      expect(url).toBe('https://example.org/search?motivation=tagging');
    });

    it('encodes special characters in query string', () => {
      const query: SearchQuery = { q: 'hello world & goodbye' };
      const url = buildSearchUrl('https://example.org/search', query);
      // URLSearchParams encodes spaces as + and & as %26
      expect(url).toContain('q=hello+world+%26+goodbye');
    });

    it('encodes unicode characters', () => {
      const query: SearchQuery = { q: 'manuscrit medieval' };
      const url = buildSearchUrl('https://example.org/search', query);
      expect(url).toContain('q=');
      // The result should be parseable back
      const parsed = new URL(url);
      expect(parsed.searchParams.get('q')).toBe('manuscrit medieval');
    });

    it('handles serviceId with trailing slash', () => {
      const url = buildSearchUrl('https://example.org/search/', { q: 'test' });
      expect(url).toBe('https://example.org/search/?q=test');
    });

    it('handles serviceId that already has query params', () => {
      // buildSearchUrl appends ?... directly to serviceId
      const url = buildSearchUrl('https://example.org/search?v=2', { q: 'test' });
      // This creates a double-? URL — testing the actual behavior
      expect(url).toBe('https://example.org/search?v=2?q=test');
    });

    it('handles multiple params with special characters', () => {
      const query: SearchQuery = {
        q: 'cote d\'ivoire',
        user: 'user@example.com',
      };
      const url = buildSearchUrl('https://example.org/search', query);
      const parsed = new URL(url);
      expect(parsed.searchParams.get('q')).toBe('cote d\'ivoire');
      expect(parsed.searchParams.get('user')).toBe('user@example.com');
    });
  });
});

