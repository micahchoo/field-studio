/**
 * IIIF Content Search API 2.0 Implementation
 *
 * Provides client-side integration with IIIF Content Search services
 * for searching within manifests (OCR, transcriptions, etc.)
 *
 * Features:
 * - SearchService2 client
 * - TextQuoteSelector for hit highlighting
 * - Autocomplete service support
 * - Result rendering as Annotations
 *
 * @see https://iiif.io/api/search/2.0/
 */

import { IIIFAnnotation, IIIFCanvas, LanguageMap } from '../types';
import { IIIF_SPEC } from '../constants';

// ============================================================================
// Types
// ============================================================================

export interface SearchService {
  '@context'?: string;
  id: string;
  type: 'SearchService2';
  profile?: string;
  label?: LanguageMap;
  service?: AutocompleteService[];
}

export interface AutocompleteService {
  id: string;
  type: 'AutoCompleteService2';
  profile?: string;
  label?: LanguageMap;
}

export interface SearchResponse {
  '@context': string;
  id: string;
  type: 'AnnotationPage';
  ignored?: string[];
  partOf?: {
    id: string;
    type: 'AnnotationCollection';
    total: number;
    first?: { id: string; type: 'AnnotationPage' };
    last?: { id: string; type: 'AnnotationPage' };
  };
  next?: { id: string; type: 'AnnotationPage' };
  prev?: { id: string; type: 'AnnotationPage' };
  startIndex?: number;
  items: SearchAnnotation[];
}

export interface SearchAnnotation {
  id: string;
  type: 'Annotation';
  motivation: 'highlighting' | 'supplementing';
  body: SearchAnnotationBody | SearchAnnotationBody[];
  target: SearchTarget;
}

export interface SearchAnnotationBody {
  type: 'TextualBody';
  value: string;
  format?: string;
  language?: string;
}

export type SearchTarget = string | SpecificResourceTarget;

export interface SpecificResourceTarget {
  type: 'SpecificResource';
  source: string | { id: string; type: string };
  selector?: TextQuoteSelector | FragmentSelector | (TextQuoteSelector | FragmentSelector)[];
}

export interface TextQuoteSelector {
  type: 'TextQuoteSelector';
  exact: string;
  prefix?: string;
  suffix?: string;
}

export interface FragmentSelector {
  type: 'FragmentSelector';
  conformsTo: string;
  value: string; // e.g., "xywh=100,200,50,30" or "t=10,20"
}

export interface AutocompleteResponse {
  '@context': string;
  id: string;
  type: 'TermList';
  ignored?: string[];
  terms: AutocompleteTerm[];
}

export interface AutocompleteTerm {
  value: string;
  count?: number;
  label?: LanguageMap;
  language?: string;
  match?: string; // The matching portion (for highlighting)
}

export interface SearchResult {
  annotation: SearchAnnotation;
  canvasId: string;
  text: string;
  selector?: TextQuoteSelector;
  region?: { x: number; y: number; w: number; h: number };
  time?: { start: number; end?: number };
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  total: number;
  loading: boolean;
  error: string | null;
  currentPage: number;
  hasMore: boolean;
  ignored: string[];
}

// ============================================================================
// Content Search Service
// ============================================================================

class ContentSearchService {
  private cache: Map<string, SearchResponse> = new Map();
  private autocompleteCache: Map<string, AutocompleteResponse> = new Map();

  /**
   * Extract search services from a IIIF resource
   */
  extractSearchService(resource: any): SearchService | null {
    if (!resource) return null;

    const services = resource.service || resource.services || [];
    const serviceArray = Array.isArray(services) ? services : [services];

    for (const svc of serviceArray) {
      if (svc.type === 'SearchService2' || svc['@type']?.includes('SearchService')) {
        return svc as SearchService;
      }
    }

    return null;
  }

  /**
   * Extract autocomplete service from a search service
   */
  extractAutocompleteService(searchService: SearchService): AutocompleteService | null {
    if (!searchService.service) return null;

    for (const svc of searchService.service) {
      if (svc.type === 'AutoCompleteService2' || (svc as any)['@type']?.includes('AutoComplete')) {
        return svc;
      }
    }

    return null;
  }

  /**
   * Perform a search query
   */
  async search(
    serviceUrl: string,
    query: string,
    options: {
      motivation?: string;
      date?: string;
      user?: string;
      page?: number;
    } = {}
  ): Promise<SearchResponse> {
    const url = new URL(serviceUrl);
    url.searchParams.set('q', query);

    if (options.motivation) {
      url.searchParams.set('motivation', options.motivation);
    }
    if (options.date) {
      url.searchParams.set('date', options.date);
    }
    if (options.user) {
      url.searchParams.set('user', options.user);
    }

    const cacheKey = url.toString();

    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/ld+json, application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as SearchResponse;

      // Cache the result
      this.cache.set(cacheKey, data);

      return data;
    } catch (error) {
      console.error('[ContentSearch] Search failed:', error);
      throw error;
    }
  }

  /**
   * Get autocomplete suggestions
   */
  async autocomplete(
    serviceUrl: string,
    query: string,
    options: {
      motivation?: string;
      min?: number;
    } = {}
  ): Promise<AutocompleteResponse> {
    const url = new URL(serviceUrl);
    url.searchParams.set('q', query);

    if (options.motivation) {
      url.searchParams.set('motivation', options.motivation);
    }
    if (options.min !== undefined) {
      url.searchParams.set('min', String(options.min));
    }

    const cacheKey = url.toString();

    // Check cache (short TTL for autocomplete)
    if (this.autocompleteCache.has(cacheKey)) {
      return this.autocompleteCache.get(cacheKey)!;
    }

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/ld+json, application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Autocomplete failed: ${response.status}`);
      }

      const data = await response.json() as AutocompleteResponse;

      // Cache briefly
      this.autocompleteCache.set(cacheKey, data);
      setTimeout(() => this.autocompleteCache.delete(cacheKey), 30000);

      return data;
    } catch (error) {
      console.error('[ContentSearch] Autocomplete failed:', error);
      throw error;
    }
  }

  /**
   * Parse search results into a more usable format
   */
  parseResults(response: SearchResponse): SearchResult[] {
    const results: SearchResult[] = [];

    for (const annotation of response.items) {
      const result = this.parseAnnotation(annotation);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Parse a single search annotation
   */
  private parseAnnotation(annotation: SearchAnnotation): SearchResult | null {
    // Extract text from body
    const bodies = Array.isArray(annotation.body) ? annotation.body : [annotation.body];
    const textBody = bodies.find(b => b.type === 'TextualBody');
    const text = textBody?.value || '';

    // Extract canvas ID and selectors from target
    let canvasId = '';
    let textSelector: TextQuoteSelector | undefined;
    let region: { x: number; y: number; w: number; h: number } | undefined;
    let time: { start: number; end?: number } | undefined;

    if (typeof annotation.target === 'string') {
      // Simple target - just the canvas/resource ID
      canvasId = annotation.target.split('#')[0];

      // Check for fragment
      const hash = annotation.target.split('#')[1];
      if (hash) {
        const parsed = this.parseFragment(hash);
        region = parsed.region;
        time = parsed.time;
      }
    } else if (annotation.target.type === 'SpecificResource') {
      // Complex target with selectors
      const {source} = annotation.target;
      canvasId = typeof source === 'string' ? source : source.id;

      const selectors = Array.isArray(annotation.target.selector)
        ? annotation.target.selector
        : annotation.target.selector
          ? [annotation.target.selector]
          : [];

      for (const selector of selectors) {
        if (selector.type === 'TextQuoteSelector') {
          textSelector = selector;
        } else if (selector.type === 'FragmentSelector') {
          const parsed = this.parseFragment(selector.value);
          region = parsed.region;
          time = parsed.time;
        }
      }
    }

    if (!canvasId) return null;

    return {
      annotation,
      canvasId,
      text,
      selector: textSelector,
      region,
      time
    };
  }

  /**
   * Parse a media fragment string
   */
  private parseFragment(fragment: string): {
    region?: { x: number; y: number; w: number; h: number };
    time?: { start: number; end?: number };
  } {
    const result: {
      region?: { x: number; y: number; w: number; h: number };
      time?: { start: number; end?: number };
    } = {};

    // Parse xywh
    const xywhMatch = fragment.match(/xywh=(\d+),(\d+),(\d+),(\d+)/);
    if (xywhMatch) {
      result.region = {
        x: parseInt(xywhMatch[1]),
        y: parseInt(xywhMatch[2]),
        w: parseInt(xywhMatch[3]),
        h: parseInt(xywhMatch[4])
      };
    }

    // Parse time
    const timeMatch = fragment.match(/t=([\d.]+)(?:,([\d.]+))?/);
    if (timeMatch) {
      result.time = {
        start: parseFloat(timeMatch[1]),
        end: timeMatch[2] ? parseFloat(timeMatch[2]) : undefined
      };
    }

    return result;
  }

  /**
   * Highlight text using TextQuoteSelector
   */
  highlightText(fullText: string, selector: TextQuoteSelector): {
    before: string;
    match: string;
    after: string;
  } | null {
    const { exact, prefix, suffix } = selector;

    // Build search pattern
    let searchStart = 0;

    // If prefix is provided, find it first
    if (prefix) {
      const prefixIndex = fullText.indexOf(prefix);
      if (prefixIndex === -1) return null;
      searchStart = prefixIndex + prefix.length;
    }

    // Find the exact match
    const exactIndex = fullText.indexOf(exact, searchStart);
    if (exactIndex === -1) return null;

    // Verify suffix if provided
    if (suffix) {
      const afterExact = fullText.substring(exactIndex + exact.length);
      if (!afterExact.startsWith(suffix)) return null;
    }

    return {
      before: fullText.substring(0, exactIndex),
      match: exact,
      after: fullText.substring(exactIndex + exact.length)
    };
  }

  /**
   * Convert search results to overlay annotations for a viewer
   */
  resultsToOverlayAnnotations(
    results: SearchResult[],
    canvasId: string
  ): IIIFAnnotation[] {
    return results
      .filter(r => r.canvasId === canvasId && r.region)
      .map((result, index) => ({
        id: `search-result-${index}`,
        type: 'Annotation' as const,
        motivation: 'highlighting' as const,
        body: {
          type: 'TextualBody',
          value: result.text,
          format: 'text/plain'
        },
        target: result.region
          ? `${canvasId}#xywh=${result.region.x},${result.region.y},${result.region.w},${result.region.h}`
          : canvasId
      }));
  }

  /**
   * Get next page of results
   */
  async getNextPage(response: SearchResponse): Promise<SearchResponse | null> {
    if (!response.next) return null;

    const nextUrl = typeof response.next === 'string'
      ? response.next
      : response.next.id;

    return this.fetchPage(nextUrl);
  }

  /**
   * Get previous page of results
   */
  async getPreviousPage(response: SearchResponse): Promise<SearchResponse | null> {
    if (!response.prev) return null;

    const prevUrl = typeof response.prev === 'string'
      ? response.prev
      : response.prev.id;

    return this.fetchPage(prevUrl);
  }

  /**
   * Fetch a specific page
   */
  private async fetchPage(url: string): Promise<SearchResponse> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/ld+json, application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const data = await response.json() as SearchResponse;
    this.cache.set(url, data);

    return data;
  }

  /**
   * Clear caches
   */
  clearCache() {
    this.cache.clear();
    this.autocompleteCache.clear();
  }

  /**
   * Create a mock search service for local/client-side search
   * Useful for manifests without a server-side search service
   */
  createLocalSearchService(
    manifestId: string,
    canvases: IIIFCanvas[],
    textContent: Map<string, string> // canvasId -> text content
  ): {
    search: (query: string) => SearchResponse;
    autocomplete: (query: string) => AutocompleteResponse;
  } {
    // Build index
    const index: Array<{
      canvasId: string;
      text: string;
      words: string[];
    }> = [];

    for (const canvas of canvases) {
      const text = textContent.get(canvas.id) || '';
      if (text) {
        index.push({
          canvasId: canvas.id,
          text,
          words: text.toLowerCase().split(/\s+/).filter(w => w.length > 2)
        });
      }
    }

    // Build word frequency for autocomplete
    const wordFreq = new Map<string, number>();
    for (const entry of index) {
      for (const word of entry.words) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    return {
      search: (query: string): SearchResponse => {
        const queryLower = query.toLowerCase();
        const items: SearchAnnotation[] = [];

        for (const entry of index) {
          const textLower = entry.text.toLowerCase();
          let pos = 0;

          while ((pos = textLower.indexOf(queryLower, pos)) !== -1) {
            // Extract context
            const contextStart = Math.max(0, pos - 50);
            const contextEnd = Math.min(entry.text.length, pos + query.length + 50);

            items.push({
              id: `local-${entry.canvasId}-${pos}`,
              type: 'Annotation',
              motivation: 'highlighting',
              body: {
                type: 'TextualBody',
                value: entry.text.substring(contextStart, contextEnd)
              },
              target: {
                type: 'SpecificResource',
                source: entry.canvasId,
                selector: {
                  type: 'TextQuoteSelector',
                  exact: entry.text.substring(pos, pos + query.length),
                  prefix: entry.text.substring(Math.max(0, pos - 20), pos),
                  suffix: entry.text.substring(pos + query.length, pos + query.length + 20)
                }
              }
            });

            pos += query.length;
          }
        }

        return {
          '@context': IIIF_SPEC.SEARCH_2.CONTEXT,
          id: `${manifestId}/search?q=${encodeURIComponent(query)}`,
          type: 'AnnotationPage',
          partOf: {
            id: `${manifestId}/search`,
            type: 'AnnotationCollection',
            total: items.length
          },
          items
        };
      },

      autocomplete: (query: string): AutocompleteResponse => {
        const queryLower = query.toLowerCase();
        const terms: AutocompleteTerm[] = [];

        for (const [word, count] of wordFreq.entries()) {
          if (word.startsWith(queryLower) && word !== queryLower) {
            terms.push({ value: word, count });
          }
        }

        // Sort by frequency and limit
        terms.sort((a, b) => (b.count || 0) - (a.count || 0));
        const limited = terms.slice(0, 10);

        return {
          '@context': IIIF_SPEC.SEARCH_2.CONTEXT,
          id: `${manifestId}/autocomplete?q=${encodeURIComponent(query)}`,
          type: 'TermList',
          terms: limited
        };
      }
    };
  }
}

export const contentSearchService = new ContentSearchService();

export default contentSearchService;
