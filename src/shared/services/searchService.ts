/**
 * Content Search API 2.0 Client — Framework-agnostic
 *
 * Handles both local full-text search (via FlexSearch) and remote
 * SearchService2 endpoint queries. Parses AnnotationPage responses
 * into unified SearchResult objects with TextQuoteSelector highlighting.
 *
 * @see https://iiif.io/api/search/2.0/
 */

import type {
  SearchQuery,
  SearchAnnotationPage,
  SearchAnnotation,
  SearchResult,
  SearchHighlight,
  SearchFacets,
  SearchIndexEntry,
  TextQuoteSelector,
  TermPage,
  Term,
} from '@/src/shared/types/search-api';

// ---------------------------------------------------------------------------
// Local Index Management
// ---------------------------------------------------------------------------

/**
 * Index entries extracted from vault entities.
 * Call this after ingest or when entities change.
 */
export function buildIndexEntries(
  entityId: string,
  entityType: string,
  fields: {
    label?: Record<string, string[]>;
    summary?: Record<string, string[]>;
    metadata?: Array<{ label: Record<string, string[]>; value: Record<string, string[]> }>;
    annotationBodies?: Array<{ value: string; language?: string; motivation?: string }>;
  },
  parentCanvasId?: string,
  parentManifestId?: string,
): SearchIndexEntry[] {
  const entries: SearchIndexEntry[] = [];
  let idx = 0;
  const makeId = () => `${entityId}:${idx++}`;

  // Label text (all languages)
  if (fields.label) {
    for (const [lang, values] of Object.entries(fields.label)) {
      for (const text of values) {
        entries.push({
          id: makeId(),
          entityId,
          entityType,
          field: 'label',
          text,
          language: lang === 'none' ? undefined : lang,
          parentCanvasId,
          parentManifestId,
        });
      }
    }
  }

  // Summary text
  if (fields.summary) {
    for (const [lang, values] of Object.entries(fields.summary)) {
      for (const text of values) {
        entries.push({
          id: makeId(),
          entityId,
          entityType,
          field: 'summary',
          text,
          language: lang === 'none' ? undefined : lang,
          parentCanvasId,
          parentManifestId,
        });
      }
    }
  }

  // Metadata key-value pairs (concatenated)
  if (fields.metadata) {
    for (const pair of fields.metadata) {
      const labelText = Object.values(pair.label).flat().join(' ');
      const valueText = Object.values(pair.value).flat().join(' ');
      entries.push({
        id: makeId(),
        entityId,
        entityType,
        field: 'metadata',
        text: `${labelText}: ${valueText}`,
        parentCanvasId,
        parentManifestId,
      });
    }
  }

  // Annotation bodies (commenting, describing, tagging)
  if (fields.annotationBodies) {
    for (const body of fields.annotationBodies) {
      const field =
        body.motivation === 'tagging' ? 'annotation_tag' : 'annotation_body';
      entries.push({
        id: makeId(),
        entityId,
        entityType,
        field,
        text: body.value,
        language: body.language,
        parentCanvasId,
        parentManifestId,
      });
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Highlight Extraction
// ---------------------------------------------------------------------------

/** Extract highlights from a TextQuoteSelector */
export function extractHighlight(selector: TextQuoteSelector): SearchHighlight {
  return {
    prefix: selector.prefix ?? '',
    exact: selector.exact,
    suffix: selector.suffix ?? '',
  };
}

/**
 * Generate highlights from a plain text match.
 * Used when the search engine returns offsets rather than TextQuoteSelectors.
 */
export function generateHighlight(
  text: string,
  matchStart: number,
  matchEnd: number,
  contextChars = 60,
): SearchHighlight {
  const prefixStart = Math.max(0, matchStart - contextChars);
  const suffixEnd = Math.min(text.length, matchEnd + contextChars);
  return {
    prefix: (prefixStart > 0 ? '...' : '') + text.slice(prefixStart, matchStart),
    exact: text.slice(matchStart, matchEnd),
    suffix: text.slice(matchEnd, suffixEnd) + (suffixEnd < text.length ? '...' : ''),
  };
}

// ---------------------------------------------------------------------------
// Remote Search — SearchService2
// ---------------------------------------------------------------------------

/**
 * Query a remote SearchService2 endpoint and parse the AnnotationPage response.
 */
export async function queryRemoteSearch(
  serviceId: string,
  query: SearchQuery,
  authToken?: string,
): Promise<{ results: SearchResult[]; total: number; nextPage?: string }> {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.motivation) params.set('motivation', query.motivation);
  if (query.date) params.set('date', query.date);
  if (query.user) params.set('user', query.user);
  const qs = params.toString();
  const url = qs ? `${serviceId}?${qs}` : serviceId;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`Search request failed: ${resp.status} ${resp.statusText}`);

  const page: SearchAnnotationPage = await resp.json();
  return parseSearchResponse(page);
}

/**
 * Parse a SearchAnnotationPage into a flat list of SearchResult objects.
 */
export function parseSearchResponse(
  page: SearchAnnotationPage,
): { results: SearchResult[]; total: number; nextPage?: string } {
  const results: SearchResult[] = [];

  // Main results
  for (const anno of page.items) {
    const highlights = extractHighlightsFromAnnotation(anno, page);
    results.push({
      entry: annotationToIndexEntry(anno),
      score: 1.0, // Remote search doesn't expose score
      highlights,
    });
  }

  const total = page.partOf?.total ?? results.length;
  const nextPage = page.next?.id;

  return { results, total, nextPage };
}

/**
 * Extract highlights from an annotation, using the extended response
 * (annotations array with highlighting/contextualizing) if available.
 */
function extractHighlightsFromAnnotation(
  annotation: SearchAnnotation,
  page: SearchAnnotationPage,
): SearchHighlight[] {
  const highlights: SearchHighlight[] = [];

  // Check extended response for TextQuoteSelectors
  if (page.annotations) {
    for (const extPage of page.annotations) {
      for (const extAnno of extPage.items) {
        const target = extAnno.target;
        if (typeof target === 'object' && 'selector' in target) {
          const selectors = Array.isArray(target.selector)
            ? target.selector
            : target.selector
              ? [target.selector]
              : [];
          for (const sel of selectors) {
            if (sel.type === 'TextQuoteSelector') {
              highlights.push(extractHighlight(sel as TextQuoteSelector));
            }
          }
        }
      }
    }
  }

  // Fallback: use the annotation body text directly
  if (highlights.length === 0) {
    const bodies = Array.isArray(annotation.body)
      ? annotation.body
      : [annotation.body];
    for (const body of bodies) {
      if (body.value) {
        highlights.push({ prefix: '', exact: body.value, suffix: '' });
      }
    }
  }

  return highlights;
}

/** Convert a SearchAnnotation to a SearchIndexEntry for unified result handling */
function annotationToIndexEntry(anno: SearchAnnotation): SearchIndexEntry {
  const bodies = Array.isArray(anno.body) ? anno.body : [anno.body];
  const text = bodies.map((b) => b.value ?? '').join(' ');

  // Extract canvas/manifest IDs from target
  let parentCanvasId: string | undefined;
  let parentManifestId: string | undefined;
  if (typeof anno.target === 'object' && 'source' in anno.target) {
    const source = anno.target.source;
    if (typeof source === 'object') {
      parentCanvasId = source.id;
      if (source.partOf) parentManifestId = source.partOf.id;
    } else {
      // source is a URI — strip fragment to get canvas ID
      parentCanvasId = source.split('#')[0];
    }
  } else if (typeof anno.target === 'string') {
    parentCanvasId = anno.target.split('#')[0];
  }

  return {
    id: anno.id,
    entityId: anno.id,
    entityType: 'Annotation',
    field: anno.motivation === 'tagging' ? 'annotation_tag' : 'annotation_body',
    text,
    language: bodies[0]?.language,
    parentCanvasId,
    parentManifestId,
  };
}

// ---------------------------------------------------------------------------
// Autocomplete — AutoCompleteService2
// ---------------------------------------------------------------------------

/**
 * Fetch autocomplete suggestions from an AutoCompleteService2 endpoint.
 */
export async function fetchAutocompleteSuggestions(
  serviceId: string,
  q: string,
  authToken?: string,
): Promise<Term[]> {
  const url = `${serviceId}?q=${encodeURIComponent(q)}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const resp = await fetch(url, { headers });
  if (!resp.ok) return [];

  const page: TermPage = await resp.json();
  return page.items;
}

// ---------------------------------------------------------------------------
// Facet Computation (for local results)
// ---------------------------------------------------------------------------

/** Compute facet counts from a set of search results */
export function computeFacets(results: SearchResult[]): SearchFacets {
  const entityType: Record<string, number> = {};
  const field: Record<string, number> = {};
  const language: Record<string, number> = {};

  for (const r of results) {
    const et = r.entry.entityType;
    entityType[et] = (entityType[et] ?? 0) + 1;

    const f = r.entry.field;
    field[f] = (field[f] ?? 0) + 1;

    if (r.entry.language) {
      const l = r.entry.language;
      language[l] = (language[l] ?? 0) + 1;
    }
  }

  return { entityType, field, language };
}

// ---------------------------------------------------------------------------
// Target Parsing Utilities
// ---------------------------------------------------------------------------

/** Parse a fragment selector value into coordinates */
export function parseFragmentSelector(value: string): {
  type: 'spatial' | 'temporal';
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  t?: number;
  tEnd?: number;
} | null {
  // Spatial: xywh=x,y,w,h or xywh=pixel:x,y,w,h or xywh=percent:x,y,w,h
  const xywhMatch = value.match(/^xywh=(?:pixel:|percent:)?(\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)$/);
  if (xywhMatch) {
    return {
      type: 'spatial',
      x: parseFloat(xywhMatch[1]),
      y: parseFloat(xywhMatch[2]),
      w: parseFloat(xywhMatch[3]),
      h: parseFloat(xywhMatch[4]),
    };
  }

  // Temporal: t=start,end or t=start
  const tMatch = value.match(/^t=(\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?))?$/);
  if (tMatch) {
    return {
      type: 'temporal',
      t: parseFloat(tMatch[1]),
      tEnd: tMatch[2] ? parseFloat(tMatch[2]) : undefined,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Lunr.js Export Support (for staticSiteExporter)
// TODO: Copy full implementation from React source's SearchService class
// ---------------------------------------------------------------------------

/**
 * Lunr.js document format for static site exports (WAX-compatible)
 */
export interface LunrDocument {
  lunr_id: string;
  pid: string;
  title: string;
  content: string;
  thumbnail?: string;
  url: string;
  [key: string]: string | undefined;
}

/**
 * Lunr.js export result for static site generation
 */
export interface LunrExportResult {
  /** Array of documents for the search index */
  documents: LunrDocument[];
  /** Field configuration for Lunr.js index building */
  fields: Array<{ name: string; boost: number }>;
  /** Reference field name */
  ref: string;
  /** JavaScript code for Lunr.js configuration */
  lunrConfigJs: string;
}

interface SearchConfig {
  fields: Array<{ name: string; boost?: number }>;
  ref: string;
}

class SearchService {
  /**
   * Export Lunr.js search index for static site generation
   * TODO: Implement full indexing logic from React source
   */
  exportLunrIndex(
    _root: unknown,
    _searchConfig: SearchConfig,
    _baseUrl: string,
    _collectionName: string
  ): LunrExportResult {
    // TODO: Implement full Lunr.js index export
    return {
      documents: [],
      fields: [{ name: 'title', boost: 10 }, { name: 'content', boost: 1 }],
      ref: 'lunr_id',
      lunrConfigJs: '// TODO: Generate Lunr.js configuration'
    };
  }
}

export const searchService = new SearchService();
