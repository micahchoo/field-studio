/**
 * IIIF Service Module Tests
 *
 * Tests pure functions exported from the IIIF service files.
 * No DOM, IndexedDB, or network access required — all functions
 * are framework-agnostic pure computations.
 */

import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════
// 1. Search Service — buildIndexEntries
// ═══════════════════════════════════════════════════════════════════════

import {
  buildIndexEntries,
  extractHighlight,
  generateHighlight,
  parseSearchResponse,
  computeFacets,
  parseFragmentSelector,
} from '../searchService';
import type {
  SearchAnnotationPage,
  SearchResult,
  TextQuoteSelector,
} from '@/src/shared/types/search-api';

describe('searchService', () => {
  describe('buildIndexEntries', () => {
    it('extracts label entries for all languages', () => {
      const entries = buildIndexEntries(
        'canvas-1', 'Canvas',
        { label: { en: ['Sunrise'], fr: ['Lever du soleil'] } },
      );
      expect(entries).toHaveLength(2);
      expect(entries[0]).toMatchObject({
        entityId: 'canvas-1',
        entityType: 'Canvas',
        field: 'label',
        text: 'Sunrise',
        language: 'en',
      });
      expect(entries[1]).toMatchObject({
        field: 'label',
        text: 'Lever du soleil',
        language: 'fr',
      });
    });

    it('treats "none" language as undefined', () => {
      const entries = buildIndexEntries(
        'canvas-1', 'Canvas',
        { label: { none: ['Untitled'] } },
      );
      expect(entries[0].language).toBeUndefined();
    });

    it('extracts summary entries', () => {
      const entries = buildIndexEntries(
        'manifest-1', 'Manifest',
        { summary: { en: ['A medieval manuscript'] } },
      );
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        field: 'summary',
        text: 'A medieval manuscript',
        language: 'en',
      });
    });

    it('extracts metadata key-value pairs', () => {
      const entries = buildIndexEntries(
        'manifest-1', 'Manifest',
        {
          metadata: [
            {
              label: { en: ['Author'] },
              value: { en: ['John Doe'] },
            },
          ],
        },
      );
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        field: 'metadata',
        text: 'Author: John Doe',
      });
    });

    it('concatenates multi-language metadata values', () => {
      const entries = buildIndexEntries(
        'manifest-1', 'Manifest',
        {
          metadata: [
            {
              label: { en: ['Title'], fr: ['Titre'] },
              value: { en: ['The Book'], fr: ['Le Livre'] },
            },
          ],
        },
      );
      expect(entries).toHaveLength(1);
      expect(entries[0].text).toContain('Title');
      expect(entries[0].text).toContain('The Book');
    });

    it('extracts annotation body entries with correct field', () => {
      const entries = buildIndexEntries(
        'anno-1', 'Annotation',
        {
          annotationBodies: [
            { value: 'A description', language: 'en', motivation: 'commenting' },
            { value: 'architecture', motivation: 'tagging' },
          ],
        },
      );
      expect(entries).toHaveLength(2);
      expect(entries[0].field).toBe('annotation_body');
      expect(entries[1].field).toBe('annotation_tag');
    });

    it('includes parentCanvasId and parentManifestId when provided', () => {
      const entries = buildIndexEntries(
        'anno-1', 'Annotation',
        { label: { en: ['Test'] } },
        'canvas-1',
        'manifest-1',
      );
      expect(entries[0].parentCanvasId).toBe('canvas-1');
      expect(entries[0].parentManifestId).toBe('manifest-1');
    });

    it('returns empty array when no fields have content', () => {
      const entries = buildIndexEntries('id', 'Canvas', {});
      expect(entries).toHaveLength(0);
    });

    it('assigns unique IDs to each entry', () => {
      const entries = buildIndexEntries(
        'id', 'Canvas',
        {
          label: { en: ['A', 'B'] },
          summary: { en: ['C'] },
        },
      );
      const ids = entries.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('handles multiple label values in same language', () => {
      const entries = buildIndexEntries(
        'id', 'Canvas',
        { label: { en: ['Title', 'Subtitle', 'Alt title'] } },
      );
      expect(entries).toHaveLength(3);
      expect(entries.map((e) => e.text)).toEqual(['Title', 'Subtitle', 'Alt title']);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 2. Search Service — extractHighlight
  // ═══════════════════════════════════════════════════════════════════════

  describe('extractHighlight', () => {
    it('extracts all three parts from a TextQuoteSelector', () => {
      const selector: TextQuoteSelector = {
        type: 'TextQuoteSelector',
        exact: 'medieval',
        prefix: 'a ',
        suffix: ' manuscript',
      };
      const hl = extractHighlight(selector);
      expect(hl).toEqual({
        prefix: 'a ',
        exact: 'medieval',
        suffix: ' manuscript',
      });
    });

    it('uses empty string for missing prefix/suffix', () => {
      const selector: TextQuoteSelector = {
        type: 'TextQuoteSelector',
        exact: 'illuminated',
      };
      const hl = extractHighlight(selector);
      expect(hl.prefix).toBe('');
      expect(hl.suffix).toBe('');
      expect(hl.exact).toBe('illuminated');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 3. Search Service — generateHighlight
  // ═══════════════════════════════════════════════════════════════════════

  describe('generateHighlight', () => {
    const text = 'The quick brown fox jumps over the lazy dog and the sleeping cat near the old barn';

    it('extracts exact match with surrounding context', () => {
      const hl = generateHighlight(text, 10, 19); // "brown fox"
      expect(hl.exact).toBe('brown fox');
      expect(hl.prefix).toContain('The quick ');
      expect(hl.suffix).toContain(' jumps');
    });

    it('prepends ellipsis when prefix is truncated', () => {
      const hl = generateHighlight(text, 70, 78, 10);
      expect(hl.prefix).toMatch(/^\.\.\./);
    });

    it('appends ellipsis when suffix is truncated', () => {
      const hl = generateHighlight(text, 4, 9, 3); // "quick"
      expect(hl.suffix).toMatch(/\.\.\.$/);
    });

    it('no ellipsis when match is at start', () => {
      const hl = generateHighlight(text, 0, 3); // "The"
      expect(hl.prefix).not.toContain('...');
      expect(hl.exact).toBe('The');
    });

    it('no suffix ellipsis when match reaches end', () => {
      const hl = generateHighlight(text, text.length - 4, text.length); // "barn"
      expect(hl.suffix).not.toContain('...');
      expect(hl.exact).toBe('barn');
    });

    it('respects custom contextChars', () => {
      const hl = generateHighlight(text, 20, 25, 5);
      // prefix should be at most 5 chars + possible ellipsis
      expect(hl.prefix.replace('...', '').length).toBeLessThanOrEqual(8);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 4. Search Service — parseSearchResponse
  // ═══════════════════════════════════════════════════════════════════════

  describe('parseSearchResponse', () => {
    it('parses a SearchAnnotationPage into results', () => {
      const page: SearchAnnotationPage = {
        '@context': 'http://iiif.io/api/search/2/context.json',
        id: 'https://example.org/search?q=test',
        type: 'AnnotationPage',
        items: [
          {
            id: 'https://example.org/anno/1',
            type: 'Annotation',
            motivation: 'commenting',
            body: { type: 'TextualBody', value: 'Test result', language: 'en' },
            target: 'https://example.org/canvas/1#xywh=100,200,50,30',
          },
        ],
      };

      const { results, total } = parseSearchResponse(page);
      expect(results).toHaveLength(1);
      expect(results[0].entry.text).toBe('Test result');
      expect(results[0].entry.parentCanvasId).toBe('https://example.org/canvas/1');
      expect(total).toBe(1);
    });

    it('extracts total from partOf', () => {
      const page: SearchAnnotationPage = {
        '@context': 'http://iiif.io/api/search/2/context.json',
        id: 'https://example.org/search?q=test',
        type: 'AnnotationPage',
        items: [
          {
            id: 'anno-1',
            type: 'Annotation',
            motivation: 'commenting',
            body: { type: 'TextualBody', value: 'Match' },
            target: 'canvas-1',
          },
        ],
        partOf: {
          id: 'https://example.org/search',
          type: 'AnnotationCollection',
          total: 42,
        },
      };
      const { total } = parseSearchResponse(page);
      expect(total).toBe(42);
    });

    it('extracts nextPage link', () => {
      const page: SearchAnnotationPage = {
        '@context': 'http://iiif.io/api/search/2/context.json',
        id: 'https://example.org/search?q=test&page=1',
        type: 'AnnotationPage',
        items: [],
        next: { id: 'https://example.org/search?q=test&page=2', type: 'AnnotationPage' },
      };
      const { nextPage } = parseSearchResponse(page);
      expect(nextPage).toBe('https://example.org/search?q=test&page=2');
    });

    it('returns empty results for empty items', () => {
      const page: SearchAnnotationPage = {
        '@context': 'http://iiif.io/api/search/2/context.json',
        id: 'https://example.org/search?q=nothing',
        type: 'AnnotationPage',
        items: [],
      };
      const { results, total } = parseSearchResponse(page);
      expect(results).toHaveLength(0);
      expect(total).toBe(0);
    });

    it('uses body text as fallback highlight when no extended response', () => {
      const page: SearchAnnotationPage = {
        '@context': 'http://iiif.io/api/search/2/context.json',
        id: 'https://example.org/search',
        type: 'AnnotationPage',
        items: [
          {
            id: 'anno-1',
            type: 'Annotation',
            motivation: 'commenting',
            body: { type: 'TextualBody', value: 'Exact match text' },
            target: 'canvas-1',
          },
        ],
      };
      const { results } = parseSearchResponse(page);
      expect(results[0].highlights).toHaveLength(1);
      expect(results[0].highlights[0].exact).toBe('Exact match text');
    });

    it('handles annotations with structured target source', () => {
      const page: SearchAnnotationPage = {
        '@context': 'http://iiif.io/api/search/2/context.json',
        id: 'https://example.org/search',
        type: 'AnnotationPage',
        items: [
          {
            id: 'anno-1',
            type: 'Annotation',
            motivation: 'commenting',
            body: { type: 'TextualBody', value: 'result' },
            target: {
              type: 'SpecificResource',
              source: {
                id: 'https://example.org/canvas/1',
                type: 'Canvas',
                partOf: { id: 'https://example.org/manifest/1', type: 'Manifest' },
              },
            },
          },
        ],
      };
      const { results } = parseSearchResponse(page);
      expect(results[0].entry.parentCanvasId).toBe('https://example.org/canvas/1');
      expect(results[0].entry.parentManifestId).toBe('https://example.org/manifest/1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 5. Search Service — computeFacets
  // ═══════════════════════════════════════════════════════════════════════

  describe('computeFacets', () => {
    it('computes counts by entityType, field, and language', () => {
      const results: SearchResult[] = [
        { entry: { id: '1', entityId: 'e1', entityType: 'Canvas', field: 'label', text: 'a', language: 'en' }, score: 1, highlights: [] },
        { entry: { id: '2', entityId: 'e2', entityType: 'Canvas', field: 'label', text: 'b', language: 'en' }, score: 1, highlights: [] },
        { entry: { id: '3', entityId: 'e3', entityType: 'Manifest', field: 'summary', text: 'c', language: 'fr' }, score: 1, highlights: [] },
        { entry: { id: '4', entityId: 'e4', entityType: 'Annotation', field: 'annotation_body', text: 'd' }, score: 1, highlights: [] },
      ];
      const facets = computeFacets(results);
      expect(facets.entityType).toEqual({ Canvas: 2, Manifest: 1, Annotation: 1 });
      expect(facets.field).toEqual({ label: 2, summary: 1, annotation_body: 1 });
      expect(facets.language).toEqual({ en: 2, fr: 1 });
    });

    it('returns empty objects for empty results', () => {
      const facets = computeFacets([]);
      expect(facets.entityType).toEqual({});
      expect(facets.field).toEqual({});
      expect(facets.language).toEqual({});
    });

    it('omits entries without language from language facet', () => {
      const results: SearchResult[] = [
        { entry: { id: '1', entityId: 'e1', entityType: 'Canvas', field: 'label', text: 'a' }, score: 1, highlights: [] },
      ];
      const facets = computeFacets(results);
      expect(facets.language).toEqual({});
    });

    it('handles mixed language and no-language entries', () => {
      const results: SearchResult[] = [
        { entry: { id: '1', entityId: 'e1', entityType: 'Canvas', field: 'label', text: 'a', language: 'de' }, score: 1, highlights: [] },
        { entry: { id: '2', entityId: 'e2', entityType: 'Canvas', field: 'label', text: 'b' }, score: 1, highlights: [] },
      ];
      const facets = computeFacets(results);
      expect(facets.language).toEqual({ de: 1 });
      expect(facets.entityType).toEqual({ Canvas: 2 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 6. Search Service — parseFragmentSelector
  // ═══════════════════════════════════════════════════════════════════════

  describe('parseFragmentSelector', () => {
    it('parses spatial xywh fragment', () => {
      const result = parseFragmentSelector('xywh=100,200,300,400');
      expect(result).toEqual({ type: 'spatial', x: 100, y: 200, w: 300, h: 400 });
    });

    it('parses spatial xywh=pixel: fragment', () => {
      const result = parseFragmentSelector('xywh=pixel:50,75,100,150');
      expect(result).toEqual({ type: 'spatial', x: 50, y: 75, w: 100, h: 150 });
    });

    it('parses spatial xywh=percent: fragment', () => {
      const result = parseFragmentSelector('xywh=percent:10.5,20.3,50,50');
      expect(result).toEqual({ type: 'spatial', x: 10.5, y: 20.3, w: 50, h: 50 });
    });

    it('parses temporal t=start,end fragment', () => {
      const result = parseFragmentSelector('t=10.5,30.2');
      expect(result).toEqual({ type: 'temporal', t: 10.5, tEnd: 30.2 });
    });

    it('parses temporal t=start (no end) fragment', () => {
      const result = parseFragmentSelector('t=5');
      expect(result).toEqual({ type: 'temporal', t: 5, tEnd: undefined });
    });

    it('returns null for unrecognized fragments', () => {
      expect(parseFragmentSelector('invalid')).toBeNull();
      expect(parseFragmentSelector('xywh=abc')).toBeNull();
      expect(parseFragmentSelector('')).toBeNull();
    });

    it('handles integer coordinates', () => {
      const result = parseFragmentSelector('xywh=0,0,1024,768');
      expect(result).toEqual({ type: 'spatial', x: 0, y: 0, w: 1024, h: 768 });
    });

    it('handles decimal temporal values', () => {
      const result = parseFragmentSelector('t=0.0,125.567');
      expect(result).toEqual({ type: 'temporal', t: 0, tEnd: 125.567 });
    });

    it('parses single temporal value without end', () => {
      const result = parseFragmentSelector('t=42');
      expect(result).toEqual({ type: 'temporal', t: 42, tEnd: undefined });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. Auth Flow Service — Service Detection
// ═══════════════════════════════════════════════════════════════════════

import {
  detectAuthServices,
  detectProbeService,
  findTokenService,
  findLogoutService,
  authStatusFromProbe,
  AuthFlowError,
} from '../authFlowService';
import type {
  AuthAccessService2,
  AuthProbeResponse,
} from '@/src/shared/types/auth-api';

describe('authFlowService', () => {
  describe('detectAuthServices', () => {
    it('finds AuthAccessService2 in a flat services array', () => {
      const services = [
        { type: 'AuthAccessService2', id: 'https://auth.example.org/login', profile: 'active', service: [] },
        { type: 'SearchService2', id: 'https://search.example.org' },
      ];
      const result = detectAuthServices(services);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('https://auth.example.org/login');
    });

    it('finds nested AuthAccessService2', () => {
      const services = [
        {
          type: 'SomeService',
          id: 'outer',
          service: [
            { type: 'AuthAccessService2', id: 'https://auth.example.org/nested', profile: 'kiosk', service: [] },
          ],
        },
      ];
      const result = detectAuthServices(services);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('https://auth.example.org/nested');
    });

    it('finds deeply nested auth services', () => {
      const services = [
        {
          type: 'Wrapper',
          id: 'level-1',
          service: [
            {
              type: 'InnerWrapper',
              id: 'level-2',
              service: [
                { type: 'AuthAccessService2', id: 'deep-auth', profile: 'external', service: [] },
              ],
            },
          ],
        },
      ];
      const result = detectAuthServices(services);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('deep-auth');
    });

    it('returns empty for no auth services', () => {
      const services = [
        { type: 'SearchService2', id: 'https://search.example.org' },
      ];
      expect(detectAuthServices(services)).toHaveLength(0);
    });

    it('returns empty for empty array', () => {
      expect(detectAuthServices([])).toHaveLength(0);
    });

    it('skips null and non-object items', () => {
      const services = [null, undefined, 'string', 42, true];
      expect(detectAuthServices(services as unknown[])).toHaveLength(0);
    });

    it('finds multiple auth services', () => {
      const services = [
        { type: 'AuthAccessService2', id: 'auth-1', profile: 'active', service: [] },
        { type: 'AuthAccessService2', id: 'auth-2', profile: 'kiosk', service: [] },
      ];
      const result = detectAuthServices(services);
      expect(result).toHaveLength(2);
    });
  });

  describe('detectProbeService', () => {
    it('finds AuthProbeService2 in services array', () => {
      const services = [
        { type: 'AuthProbeService2', id: 'https://probe.example.org/check' },
      ];
      const result = detectProbeService(services);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('https://probe.example.org/check');
    });

    it('returns null when not found', () => {
      const services = [
        { type: 'ImageService3', id: 'https://img.example.org' },
      ];
      expect(detectProbeService(services)).toBeNull();
    });

    it('returns null for empty array', () => {
      expect(detectProbeService([])).toBeNull();
    });

    it('skips non-object items', () => {
      expect(detectProbeService([null, undefined, 'str'] as unknown[])).toBeNull();
    });
  });

  describe('findTokenService', () => {
    it('finds token service nested in access service', () => {
      const accessService: AuthAccessService2 = {
        id: 'https://auth.example.org/login',
        type: 'AuthAccessService2',
        profile: 'active',
        label: { en: ['Auth'] },
        service: [
          { type: 'AuthAccessTokenService2', id: 'https://auth.example.org/token' },
        ],
      };
      const token = findTokenService(accessService);
      expect(token).not.toBeNull();
      expect(token!.id).toBe('https://auth.example.org/token');
    });

    it('returns null when no token service', () => {
      const accessService: AuthAccessService2 = {
        id: 'https://auth.example.org/login',
        type: 'AuthAccessService2',
        profile: 'active',
        label: { en: ['Auth'] },
        service: [],
      };
      expect(findTokenService(accessService)).toBeNull();
    });

    it('finds token service among multiple nested services', () => {
      const accessService: AuthAccessService2 = {
        id: 'https://auth.example.org/login',
        type: 'AuthAccessService2',
        profile: 'active',
        label: { en: ['Auth'] },
        service: [
          { type: 'AuthLogoutService2', id: 'https://auth.example.org/logout', label: { en: ['Logout'] } },
          { type: 'AuthAccessTokenService2', id: 'https://auth.example.org/token' },
        ],
      };
      const token = findTokenService(accessService);
      expect(token!.id).toBe('https://auth.example.org/token');
    });
  });

  describe('findLogoutService', () => {
    it('finds logout service nested in access service', () => {
      const accessService: AuthAccessService2 = {
        id: 'https://auth.example.org/login',
        type: 'AuthAccessService2',
        profile: 'active',
        label: { en: ['Auth'] },
        service: [
          { type: 'AuthAccessTokenService2', id: 'https://auth.example.org/token' },
          { type: 'AuthLogoutService2', id: 'https://auth.example.org/logout', label: { en: ['Logout'] } },
        ],
      };
      const logout = findLogoutService(accessService);
      expect(logout).not.toBeNull();
      expect(logout!.id).toBe('https://auth.example.org/logout');
    });

    it('returns null when no logout service', () => {
      const accessService: AuthAccessService2 = {
        id: 'https://auth.example.org/login',
        type: 'AuthAccessService2',
        profile: 'kiosk',
        label: { en: ['Auth'] },
        service: [
          { type: 'AuthAccessTokenService2', id: 'https://auth.example.org/token' },
        ],
      };
      expect(findLogoutService(accessService)).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 8. Auth Flow Service — authStatusFromProbe
  // ═══════════════════════════════════════════════════════════════════════

  describe('authStatusFromProbe', () => {
    it('returns "authorized" for 200 without substitute', () => {
      const probe: AuthProbeResponse = { status: 200 };
      expect(authStatusFromProbe(probe)).toBe('authorized');
    });

    it('returns "degraded" for 200 with substitute', () => {
      const probe: AuthProbeResponse = {
        status: 200,
        substitute: [{ id: 'https://example.org/low-res.jpg', type: 'Image' }],
      };
      expect(authStatusFromProbe(probe)).toBe('degraded');
    });

    it('returns "unauthorized" for 401', () => {
      const probe: AuthProbeResponse = { status: 401 };
      expect(authStatusFromProbe(probe)).toBe('unauthorized');
    });

    it('returns "error" for 500', () => {
      expect(authStatusFromProbe({ status: 500 })).toBe('error');
    });

    it('returns "error" for 403', () => {
      expect(authStatusFromProbe({ status: 403 })).toBe('error');
    });

    it('returns "error" for 404', () => {
      expect(authStatusFromProbe({ status: 404 })).toBe('error');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 9. Auth Flow Service — AuthFlowError
  // ═══════════════════════════════════════════════════════════════════════

  describe('AuthFlowError', () => {
    it('creates an error with code and description', () => {
      const err = new AuthFlowError('invalidCredentials', 'Bad username or password');
      expect(err.code).toBe('invalidCredentials');
      expect(err.message).toBe('Bad username or password');
      expect(err.name).toBe('AuthFlowError');
      expect(err instanceof Error).toBe(true);
    });

    it('creates a default message from code when no description', () => {
      const err = new AuthFlowError('tokenExpired');
      expect(err.message).toBe('Auth flow error: tokenExpired');
      expect(err.code).toBe('tokenExpired');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 10. Change Discovery Service — Activity Generation
// ═══════════════════════════════════════════════════════════════════════

import {
  createLocalActivity,
  deduplicateActivities,
  detectConflict,
  createStreamState,
} from '../changeDiscoveryService';
import type { Activity, LocalActivity } from '@/src/shared/types/change-discovery';

describe('changeDiscoveryService', () => {
  describe('createLocalActivity', () => {
    it('creates an activity from vault action metadata', () => {
      const activity = createLocalActivity(
        'ADD_CANVAS',
        'canvas-1',
        'Canvas',
        'Added new canvas',
      );
      expect(activity.type).toBe('Create');
      expect(activity.entityId).toBe('canvas-1');
      expect(activity.entityType).toBe('Canvas');
      expect(activity.summary).toBe('Added new canvas');
      expect(activity.actionType).toBe('ADD_CANVAS');
      expect(activity.id).toMatch(/^urn:field-studio:activity:/);
      expect(activity.timestamp).toBeTruthy();
    });

    it('maps ADD actions to Create type', () => {
      expect(createLocalActivity('ADD_CANVAS', 'e1', 'Canvas', '').type).toBe('Create');
      expect(createLocalActivity('ADD_ENTITY', 'e1', 'Canvas', '').type).toBe('Create');
      expect(createLocalActivity('ADD_RANGE', 'e1', 'Range', '').type).toBe('Create');
      expect(createLocalActivity('ADD_ANNOTATION', 'e1', 'Annotation', '').type).toBe('Create');
      expect(createLocalActivity('ADD_COLLECTION', 'e1', 'Collection', '').type).toBe('Create');
    });

    it('maps UPDATE actions to Update type', () => {
      expect(createLocalActivity('UPDATE_LABEL', 'e1', 'Canvas', '').type).toBe('Update');
      expect(createLocalActivity('UPDATE_METADATA', 'e1', 'Canvas', '').type).toBe('Update');
      expect(createLocalActivity('UPDATE_SUMMARY', 'e1', 'Canvas', '').type).toBe('Update');
      expect(createLocalActivity('UPDATE_RIGHTS', 'e1', 'Canvas', '').type).toBe('Update');
      expect(createLocalActivity('UPDATE_BEHAVIOR', 'e1', 'Canvas', '').type).toBe('Update');
    });

    it('maps MOVE actions to Move type', () => {
      expect(createLocalActivity('MOVE_ENTITY', 'e1', 'Canvas', '').type).toBe('Move');
      expect(createLocalActivity('REORDER_CHILDREN', 'e1', 'Canvas', '').type).toBe('Move');
    });

    it('maps REMOVE_ENTITY to Delete type', () => {
      expect(createLocalActivity('REMOVE_ENTITY', 'e1', 'Canvas', '').type).toBe('Delete');
    });

    it('maps TRASH_ENTITY to Remove type', () => {
      expect(createLocalActivity('TRASH_ENTITY', 'e1', 'Canvas', '').type).toBe('Remove');
    });

    it('maps RESTORE_FROM_TRASH to Add type', () => {
      expect(createLocalActivity('RESTORE_FROM_TRASH', 'e1', 'Canvas', '').type).toBe('Add');
    });

    it('maps EMPTY_TRASH to Delete type', () => {
      expect(createLocalActivity('EMPTY_TRASH', 'e1', 'Canvas', '').type).toBe('Delete');
    });

    it('defaults unknown action types to Update', () => {
      expect(createLocalActivity('CUSTOM_ACTION', 'e1', 'Canvas', '').type).toBe('Update');
    });

    it('includes patch data when provided', () => {
      const patch = {
        label: { before: 'Old', after: 'New' },
      };
      const activity = createLocalActivity('UPDATE_LABEL', 'e1', 'Canvas', 'label changed', patch);
      expect(activity.patch).toEqual(patch);
    });

    it('generates unique IDs for concurrent calls', () => {
      const a1 = createLocalActivity('ADD_CANVAS', 'c1', 'Canvas', 'A');
      const a2 = createLocalActivity('ADD_CANVAS', 'c2', 'Canvas', 'B');
      expect(a1.id).not.toBe(a2.id);
    });

    it('generates ISO timestamp', () => {
      const activity = createLocalActivity('ADD_CANVAS', 'c1', 'Canvas', 'A');
      expect(new Date(activity.timestamp).toISOString()).toBe(activity.timestamp);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 11. Change Discovery Service — deduplicateActivities
  // ═══════════════════════════════════════════════════════════════════════

  describe('deduplicateActivities', () => {
    it('keeps only the most recent activity per resource', () => {
      const activities: Activity[] = [
        { type: 'Update', object: { id: 'r1', type: 'Canvas' }, endTime: '2024-01-01T10:00:00Z', summary: 'First' },
        { type: 'Update', object: { id: 'r1', type: 'Canvas' }, endTime: '2024-01-02T10:00:00Z', summary: 'Second' },
        { type: 'Create', object: { id: 'r2', type: 'Manifest' }, endTime: '2024-01-01T10:00:00Z', summary: 'Third' },
      ];
      const deduped = deduplicateActivities(activities);
      expect(deduped).toHaveLength(2);
      expect(deduped.find((a) => a.object.id === 'r1')!.summary).toBe('Second');
    });

    it('returns results sorted by endTime (oldest first)', () => {
      const activities: Activity[] = [
        { type: 'Update', object: { id: 'r2', type: 'Canvas' }, endTime: '2024-02-01T00:00:00Z', summary: 'B' },
        { type: 'Create', object: { id: 'r1', type: 'Canvas' }, endTime: '2024-01-01T00:00:00Z', summary: 'A' },
      ];
      const deduped = deduplicateActivities(activities);
      expect(deduped[0].summary).toBe('A');
      expect(deduped[1].summary).toBe('B');
    });

    it('uses canonical ID when available', () => {
      const activities: Activity[] = [
        { type: 'Update', object: { id: 'r1-local', type: 'Canvas', canonical: 'urn:r1' }, endTime: '2024-01-01T10:00:00Z', summary: 'Old' },
        { type: 'Update', object: { id: 'r1-remote', type: 'Canvas', canonical: 'urn:r1' }, endTime: '2024-01-02T10:00:00Z', summary: 'New' },
      ];
      const deduped = deduplicateActivities(activities);
      expect(deduped).toHaveLength(1);
      expect(deduped[0].summary).toBe('New');
    });

    it('returns empty array for empty input', () => {
      expect(deduplicateActivities([])).toEqual([]);
    });

    it('preserves all activities when each has unique resource', () => {
      const activities: Activity[] = [
        { type: 'Create', object: { id: 'r1', type: 'Canvas' }, endTime: '2024-01-01T00:00:00Z', summary: 'A' },
        { type: 'Update', object: { id: 'r2', type: 'Canvas' }, endTime: '2024-01-02T00:00:00Z', summary: 'B' },
        { type: 'Delete', object: { id: 'r3', type: 'Canvas' }, endTime: '2024-01-03T00:00:00Z', summary: 'C' },
      ];
      const deduped = deduplicateActivities(activities);
      expect(deduped).toHaveLength(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 12. Change Discovery Service — detectConflict
  // ═══════════════════════════════════════════════════════════════════════

  describe('detectConflict', () => {
    it('detects conflict when same entity modified locally after remote change', () => {
      const remote: Activity = {
        type: 'Update',
        object: { id: 'canvas-1', type: 'Canvas' },
        endTime: '2024-01-01T10:00:00Z',
        summary: 'Remote update',
      };
      const localActivities: LocalActivity[] = [
        {
          id: 'local-1',
          type: 'Update',
          entityId: 'canvas-1',
          entityType: 'Canvas',
          timestamp: '2024-01-02T10:00:00Z',
          summary: 'Local update',
          actionType: 'UPDATE_LABEL',
          patch: { label: { before: 'Old', after: 'New' } },
        },
      ];
      const conflict = detectConflict(remote, localActivities);
      expect(conflict).not.toBeNull();
      expect(conflict!.resourceId).toBe('canvas-1');
      expect(conflict!.field).toBe('label');
    });

    it('returns null when no local changes on same entity', () => {
      const remote: Activity = {
        type: 'Update',
        object: { id: 'canvas-1', type: 'Canvas' },
        endTime: '2024-01-01T10:00:00Z',
        summary: 'Remote update',
      };
      const localActivities: LocalActivity[] = [
        {
          id: 'local-1',
          type: 'Update',
          entityId: 'canvas-2',
          entityType: 'Canvas',
          timestamp: '2024-01-02T10:00:00Z',
          summary: 'Local update',
          actionType: 'UPDATE_LABEL',
        },
      ];
      expect(detectConflict(remote, localActivities)).toBeNull();
    });

    it('returns null when local changes were before remote change', () => {
      const remote: Activity = {
        type: 'Update',
        object: { id: 'canvas-1', type: 'Canvas' },
        endTime: '2024-01-02T10:00:00Z',
        summary: 'Remote',
      };
      const localActivities: LocalActivity[] = [
        {
          id: 'local-1',
          type: 'Update',
          entityId: 'canvas-1',
          entityType: 'Canvas',
          timestamp: '2024-01-01T10:00:00Z',
          summary: 'Old local',
          actionType: 'UPDATE_LABEL',
        },
      ];
      expect(detectConflict(remote, localActivities)).toBeNull();
    });

    it('returns generic conflict when no patches available', () => {
      const remote: Activity = {
        type: 'Update',
        object: { id: 'canvas-1', type: 'Canvas' },
        endTime: '2024-01-01T10:00:00Z',
        summary: 'Remote',
      };
      const localActivities: LocalActivity[] = [
        {
          id: 'local-1',
          type: 'Update',
          entityId: 'canvas-1',
          entityType: 'Canvas',
          timestamp: '2024-01-02T10:00:00Z',
          summary: 'Local',
          actionType: 'UPDATE_LABEL',
        },
      ];
      const conflict = detectConflict(remote, localActivities);
      expect(conflict).not.toBeNull();
      expect(conflict!.field).toBe('*');
    });

    it('returns null for empty local activities', () => {
      const remote: Activity = {
        type: 'Update',
        object: { id: 'canvas-1', type: 'Canvas' },
        endTime: '2024-01-01T10:00:00Z',
        summary: 'Remote',
      };
      expect(detectConflict(remote, [])).toBeNull();
    });

    it('only matches Update-type local activities', () => {
      const remote: Activity = {
        type: 'Update',
        object: { id: 'canvas-1', type: 'Canvas' },
        endTime: '2024-01-01T10:00:00Z',
        summary: 'Remote',
      };
      const localActivities: LocalActivity[] = [
        {
          id: 'local-1',
          type: 'Create',
          entityId: 'canvas-1',
          entityType: 'Canvas',
          timestamp: '2024-01-02T10:00:00Z',
          summary: 'Created',
          actionType: 'ADD_CANVAS',
        },
      ];
      expect(detectConflict(remote, localActivities)).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 13. Change Discovery Service — createStreamState
  // ═══════════════════════════════════════════════════════════════════════

  describe('createStreamState', () => {
    it('creates initial stream processing state', () => {
      const state = createStreamState('https://example.org/stream', 'My Stream');
      expect(state.streamId).toBe('https://example.org/stream');
      expect(state.label).toBe('My Stream');
      expect(state.lastProcessedTime).toBe('');
      expect(state.lastPageId).toBe('');
      expect(state.totalProcessed).toBe(0);
      expect(state.status).toBe('idle');
      expect(state.lastCheckedAt).toBeTruthy();
      expect(state.pollInterval).toBe(5 * 60 * 1000);
    });

    it('generates ISO timestamp for lastCheckedAt', () => {
      const state = createStreamState('url', 'label');
      expect(new Date(state.lastCheckedAt).toISOString()).toBe(state.lastCheckedAt);
    });
  });
});

