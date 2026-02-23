/**
 * ContentSearchService Tests
 *
 * Tests the pure parsing, matching, and local-search methods
 * of the IIIF Content Search API 2.0 service.
 * No fetch mocking — only exercises synchronous logic.
 */

import { describe, it, expect } from 'vitest';

import contentSearchService from '../model/contentSearchService';
import type {
  SearchService,
  SearchResponse,
  SearchAnnotation,
  TextQuoteSelector,
  SearchResult,
} from '../model/contentSearchService';
import type { IIIFCanvas } from '@/src/shared/types';

// ============================================================================
// Helpers
// ============================================================================

function makeCanvas(id: string): IIIFCanvas {
  return { id, type: 'Canvas', width: 1000, height: 800, items: [], label: { en: [id] } };
}

function makeSearchResponse(items: SearchAnnotation[]): SearchResponse {
  return {
    '@context': 'http://iiif.io/api/search/2/context.json',
    id: 'https://example.org/manifest/search?q=test',
    type: 'AnnotationPage',
    items,
  };
}

// ============================================================================
// 1. extractSearchService
// ============================================================================

describe('extractSearchService', () => {
  it('finds SearchService2 in resource.service array', () => {
    const resource = {
      id: 'https://example.org/manifest/1',
      service: [
        { id: 'https://example.org/search', type: 'SearchService2' },
      ],
    };
    const result = contentSearchService.extractSearchService(resource);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('SearchService2');
    expect(result!.id).toBe('https://example.org/search');
  });

  it('finds SearchService2 in resource.services array', () => {
    const resource = {
      id: 'https://example.org/manifest/1',
      services: [
        { id: 'https://example.org/search', type: 'SearchService2' },
      ],
    };
    const result = contentSearchService.extractSearchService(resource);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('SearchService2');
  });

  it('returns null if no search service found', () => {
    const resource = {
      id: 'https://example.org/manifest/1',
      service: [
        { id: 'https://example.org/image', type: 'ImageService3' },
      ],
    };
    expect(contentSearchService.extractSearchService(resource)).toBeNull();
  });

  it('returns null for null/undefined resource', () => {
    expect(contentSearchService.extractSearchService(null as unknown as Record<string, unknown>)).toBeNull();
  });

  it('handles @type string for v2 compatibility', () => {
    const resource = {
      id: 'https://example.org/manifest/1',
      service: [
        { id: 'https://example.org/search', '@type': 'SearchService1' },
      ],
    };
    const result = contentSearchService.extractSearchService(resource);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('https://example.org/search');
  });
});

// ============================================================================
// 2. extractAutocompleteService
// ============================================================================

describe('extractAutocompleteService', () => {
  it('finds AutoCompleteService2 in search service', () => {
    const searchService: SearchService = {
      id: 'https://example.org/search',
      type: 'SearchService2',
      service: [
        { id: 'https://example.org/autocomplete', type: 'AutoCompleteService2' },
      ],
    };
    const result = contentSearchService.extractAutocompleteService(searchService);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('AutoCompleteService2');
    expect(result!.id).toBe('https://example.org/autocomplete');
  });

  it('returns null if not present', () => {
    const searchService: SearchService = {
      id: 'https://example.org/search',
      type: 'SearchService2',
    };
    const result = contentSearchService.extractAutocompleteService(searchService);
    expect(result).toBeNull();
  });
});

// ============================================================================
// 3. parseResults
// ============================================================================

describe('parseResults', () => {
  it('parses simple string target (extracts canvas ID)', () => {
    const response = makeSearchResponse([
      {
        id: 'anno-1',
        type: 'Annotation',
        motivation: 'highlighting',
        body: { type: 'TextualBody', value: 'hello world' },
        target: 'https://example.org/canvas/1',
      },
    ]);

    const results = contentSearchService.parseResults(response);
    expect(results).toHaveLength(1);
    expect(results[0].canvasId).toBe('https://example.org/canvas/1');
    expect(results[0].text).toBe('hello world');
  });

  it('parses SpecificResource target with TextQuoteSelector', () => {
    const response = makeSearchResponse([
      {
        id: 'anno-2',
        type: 'Annotation',
        motivation: 'highlighting',
        body: { type: 'TextualBody', value: 'matched' },
        target: {
          type: 'SpecificResource',
          source: 'https://example.org/canvas/2',
          selector: {
            type: 'TextQuoteSelector',
            exact: 'matched',
            prefix: 'was ',
            suffix: ' here',
          },
        },
      },
    ]);

    const results = contentSearchService.parseResults(response);
    expect(results).toHaveLength(1);
    expect(results[0].canvasId).toBe('https://example.org/canvas/2');
    expect(results[0].selector).toBeDefined();
    expect(results[0].selector!.exact).toBe('matched');
    expect(results[0].selector!.prefix).toBe('was ');
    expect(results[0].selector!.suffix).toBe(' here');
  });

  it('parses SpecificResource target with FragmentSelector (xywh)', () => {
    const response = makeSearchResponse([
      {
        id: 'anno-3',
        type: 'Annotation',
        motivation: 'highlighting',
        body: { type: 'TextualBody', value: 'region text' },
        target: {
          type: 'SpecificResource',
          source: { id: 'https://example.org/canvas/3', type: 'Canvas' },
          selector: {
            type: 'FragmentSelector',
            conformsTo: 'http://www.w3.org/TR/media-frags/',
            value: 'xywh=100,200,50,30',
          },
        },
      },
    ]);

    const results = contentSearchService.parseResults(response);
    expect(results).toHaveLength(1);
    expect(results[0].canvasId).toBe('https://example.org/canvas/3');
    expect(results[0].region).toEqual({ x: 100, y: 200, w: 50, h: 30 });
  });

  it('handles time fragments (t=start,end)', () => {
    const response = makeSearchResponse([
      {
        id: 'anno-4',
        type: 'Annotation',
        motivation: 'highlighting',
        body: { type: 'TextualBody', value: 'spoken word' },
        target: 'https://example.org/canvas/4#t=10.5,20.3',
      },
    ]);

    const results = contentSearchService.parseResults(response);
    expect(results).toHaveLength(1);
    expect(results[0].time).toEqual({ start: 10.5, end: 20.3 });
  });

  it('handles time fragment with only start', () => {
    const response = makeSearchResponse([
      {
        id: 'anno-4b',
        type: 'Annotation',
        motivation: 'highlighting',
        body: { type: 'TextualBody', value: 'spoken word' },
        target: 'https://example.org/canvas/4#t=5',
      },
    ]);

    const results = contentSearchService.parseResults(response);
    expect(results).toHaveLength(1);
    expect(results[0].time).toEqual({ start: 5, end: undefined });
  });

  it('skips annotations with no extractable canvas ID', () => {
    const response = makeSearchResponse([
      {
        id: 'anno-5',
        type: 'Annotation',
        motivation: 'highlighting',
        body: { type: 'TextualBody', value: 'orphan' },
        target: {
          type: 'SpecificResource',
          source: '',
        },
      },
    ]);

    const results = contentSearchService.parseResults(response);
    expect(results).toHaveLength(0);
  });

  it('parses both TextQuoteSelector and FragmentSelector together', () => {
    const response = makeSearchResponse([
      {
        id: 'anno-6',
        type: 'Annotation',
        motivation: 'highlighting',
        body: { type: 'TextualBody', value: 'dual selector' },
        target: {
          type: 'SpecificResource',
          source: 'https://example.org/canvas/6',
          selector: [
            { type: 'TextQuoteSelector', exact: 'dual selector', prefix: 'a ' },
            { type: 'FragmentSelector', conformsTo: 'http://www.w3.org/TR/media-frags/', value: 'xywh=10,20,30,40' },
          ],
        },
      },
    ]);

    const results = contentSearchService.parseResults(response);
    expect(results).toHaveLength(1);
    expect(results[0].selector!.exact).toBe('dual selector');
    expect(results[0].region).toEqual({ x: 10, y: 20, w: 30, h: 40 });
  });
});

// ============================================================================
// 4. highlightText
// ============================================================================

describe('highlightText', () => {
  it('finds exact match in full text', () => {
    const result = contentSearchService.highlightText(
      'The quick brown fox jumps over the lazy dog',
      { type: 'TextQuoteSelector', exact: 'brown fox' },
    );
    expect(result).not.toBeNull();
    expect(result!.match).toBe('brown fox');
    expect(result!.before).toBe('The quick ');
    expect(result!.after).toBe(' jumps over the lazy dog');
  });

  it('uses prefix to disambiguate', () => {
    const text = 'cat sat on a cat mat with a cat hat';
    const result = contentSearchService.highlightText(text, {
      type: 'TextQuoteSelector',
      exact: 'cat',
      prefix: 'with a ',
    });
    expect(result).not.toBeNull();
    expect(result!.before).toBe('cat sat on a cat mat with a ');
    expect(result!.match).toBe('cat');
    expect(result!.after).toBe(' hat');
  });

  it('uses suffix for verification — rejects when suffix does not match', () => {
    const text = 'AAA BBB AAA CCC';
    // First (and only reachable) "AAA" is at index 0 followed by " BBB", not " CCC"
    const rejected = contentSearchService.highlightText(text, {
      type: 'TextQuoteSelector',
      exact: 'AAA',
      suffix: ' CCC',
    });
    expect(rejected).toBeNull();
  });

  it('uses suffix for verification — accepts when suffix matches', () => {
    const text = 'The brown fox jumps high';
    const result = contentSearchService.highlightText(text, {
      type: 'TextQuoteSelector',
      exact: 'fox',
      suffix: ' jumps',
    });
    expect(result).not.toBeNull();
    expect(result!.match).toBe('fox');
    expect(result!.before).toBe('The brown ');
    expect(result!.after).toBe(' jumps high');
  });

  it('returns null when match not found', () => {
    const result = contentSearchService.highlightText(
      'The quick brown fox',
      { type: 'TextQuoteSelector', exact: 'purple elephant' },
    );
    expect(result).toBeNull();
  });

  it('returns null when prefix is not found', () => {
    const result = contentSearchService.highlightText(
      'The quick brown fox',
      { type: 'TextQuoteSelector', exact: 'brown', prefix: 'nonexistent ' },
    );
    expect(result).toBeNull();
  });
});

// ============================================================================
// 5. createLocalSearchService
// ============================================================================

describe('createLocalSearchService', () => {
  const canvases = [
    makeCanvas('canvas-a'),
    makeCanvas('canvas-b'),
    makeCanvas('canvas-c'),
  ];

  const textContent = new Map<string, string>([
    ['canvas-a', 'The quick brown fox jumps over the lazy dog'],
    ['canvas-b', 'A quick brown rabbit hops over the quick fence'],
    ['canvas-c', 'Nothing relevant here'],
  ]);

  const local = contentSearchService.createLocalSearchService(
    'https://example.org/manifest',
    canvases,
    textContent,
  );

  describe('search', () => {
    it('finds text across canvases', () => {
      const response = local.search('quick');
      expect(response.type).toBe('AnnotationPage');
      expect(response.items.length).toBeGreaterThanOrEqual(2);

      const canvasIds = response.items.map(item => {
        const target = item.target as { source: string };
        return target.source;
      });
      expect(canvasIds).toContain('canvas-a');
      expect(canvasIds).toContain('canvas-b');
    });

    it('returns multiple matches per canvas', () => {
      const response = local.search('quick');
      const canvasBHits = response.items.filter(item => {
        const target = item.target as { source: string };
        return target.source === 'canvas-b';
      });
      // "quick" appears twice in canvas-b text
      expect(canvasBHits).toHaveLength(2);
    });

    it('returns empty results for no match', () => {
      const response = local.search('xylophone');
      expect(response.items).toHaveLength(0);
      expect(response.partOf?.total).toBe(0);
    });

    it('includes TextQuoteSelector with prefix and suffix', () => {
      const response = local.search('fox');
      expect(response.items).toHaveLength(1);
      const target = response.items[0].target as {
        type: string;
        selector: TextQuoteSelector;
      };
      expect(target.selector.type).toBe('TextQuoteSelector');
      expect(target.selector.exact).toBe('fox');
      expect(target.selector.prefix).toBeTruthy();
      expect(target.selector.suffix).toBeTruthy();
    });
  });

  describe('autocomplete', () => {
    it('suggests words starting with query', () => {
      const response = local.autocomplete('qui');
      expect(response.type).toBe('TermList');
      const values = response.terms.map(t => t.value);
      expect(values).toContain('quick');
    });

    it('sorts by frequency', () => {
      const response = local.autocomplete('qui');
      // "quick" appears 3 times across canvases (1 in A, 2 in B)
      const quickTerm = response.terms.find(t => t.value === 'quick');
      expect(quickTerm).toBeDefined();
      expect(quickTerm!.count).toBe(3);

      // All terms should be sorted descending by count
      for (let i = 1; i < response.terms.length; i++) {
        expect(response.terms[i - 1].count!).toBeGreaterThanOrEqual(response.terms[i].count!);
      }
    });

    it('does not include exact match of query', () => {
      const response = local.autocomplete('the');
      const values = response.terms.map(t => t.value);
      expect(values).not.toContain('the');
    });
  });
});

// ============================================================================
// 6. resultsToOverlayAnnotations
// ============================================================================

describe('resultsToOverlayAnnotations', () => {
  const searchResults: SearchResult[] = [
    {
      annotation: { id: 'a1', type: 'Annotation', motivation: 'highlighting', body: { type: 'TextualBody', value: 'word1' }, target: 'canvas-1' },
      canvasId: 'canvas-1',
      text: 'word1',
      region: { x: 10, y: 20, w: 100, h: 50 },
    },
    {
      annotation: { id: 'a2', type: 'Annotation', motivation: 'highlighting', body: { type: 'TextualBody', value: 'word2' }, target: 'canvas-2' },
      canvasId: 'canvas-2',
      text: 'word2',
      region: { x: 30, y: 40, w: 80, h: 60 },
    },
    {
      annotation: { id: 'a3', type: 'Annotation', motivation: 'highlighting', body: { type: 'TextualBody', value: 'word3' }, target: 'canvas-1' },
      canvasId: 'canvas-1',
      text: 'word3',
      // no region
    },
  ];

  it('converts search results to IIIF annotations for viewer overlay', () => {
    const annotations = contentSearchService.resultsToOverlayAnnotations(searchResults, 'canvas-1');
    expect(annotations).toHaveLength(1); // only a1 has region + matching canvasId
    expect(annotations[0].id).toBe('search-result-0');
    expect(annotations[0].type).toBe('Annotation');
    expect(annotations[0].motivation).toBe('highlighting');
    expect(annotations[0].target).toBe('canvas-1#xywh=10,20,100,50');
    expect((annotations[0].body as { value: string }).value).toBe('word1');
  });

  it('filters by canvas ID', () => {
    const annotations = contentSearchService.resultsToOverlayAnnotations(searchResults, 'canvas-2');
    expect(annotations).toHaveLength(1);
    expect((annotations[0].body as { value: string }).value).toBe('word2');
    expect(annotations[0].target).toBe('canvas-2#xywh=30,40,80,60');
  });

  it('only includes results with regions', () => {
    // canvas-1 has two results but only one has a region
    const annotations = contentSearchService.resultsToOverlayAnnotations(searchResults, 'canvas-1');
    expect(annotations).toHaveLength(1);
    expect((annotations[0].body as { value: string }).value).toBe('word1');
  });

  it('returns empty array when no results match canvas', () => {
    const annotations = contentSearchService.resultsToOverlayAnnotations(searchResults, 'canvas-999');
    expect(annotations).toHaveLength(0);
  });
});
