/**
 * IIIF Content Search API 2.0 Types
 * @see https://iiif.io/api/search/2.0/
 */

// ---------------------------------------------------------------------------
// Service Descriptors (found in manifest.service array)
// ---------------------------------------------------------------------------

export interface SearchService2 {
  id: string;
  type: 'SearchService2';
  label?: LanguageMap;
  service?: AutoCompleteService2[];
}

export interface AutoCompleteService2 {
  id: string;
  type: 'AutoCompleteService2';
  label?: LanguageMap;
}

// ---------------------------------------------------------------------------
// Search Query
// ---------------------------------------------------------------------------

export interface SearchQuery {
  /** Free-text query string */
  q?: string;
  /** Filter by annotation motivation (e.g., 'painting', 'commenting', 'tagging') */
  motivation?: string;
  /** Filter by date (ISO 8601) */
  date?: string;
  /** Filter by creator */
  user?: string;
}

/** Build a query URL from a SearchService2 endpoint and parameters */
export function buildSearchUrl(serviceId: string, query: SearchQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.motivation) params.set('motivation', query.motivation);
  if (query.date) params.set('date', query.date);
  if (query.user) params.set('user', query.user);
  const qs = params.toString();
  return qs ? `${serviceId}?${qs}` : serviceId;
}

// ---------------------------------------------------------------------------
// Search Response — AnnotationPage
// ---------------------------------------------------------------------------

export interface SearchAnnotationPage {
  '@context': string;
  id: string;
  type: 'AnnotationPage';
  /** Annotations matching the query */
  items: SearchAnnotation[];
  /**
   * Paging: if results are paged, this wraps the response in an AnnotationCollection.
   * partOf.total gives the total result count.
   */
  partOf?: SearchAnnotationCollection;
  /** Next page of results */
  next?: { id: string; type: 'AnnotationPage' };
  /** Previous page of results */
  prev?: { id: string; type: 'AnnotationPage' };
  /**
   * Extended response: contextualizing and highlighting annotations.
   * - motivation: 'contextualizing' → surrounding text for each hit
   * - motivation: 'highlighting' → exact match with prefix/suffix via TextQuoteSelector
   */
  annotations?: AnnotationPage[];
}

export interface SearchAnnotationCollection {
  id: string;
  type: 'AnnotationCollection';
  total: number;
  first?: { id: string; type: 'AnnotationPage' };
  last?: { id: string; type: 'AnnotationPage' };
}

export interface SearchAnnotation {
  id: string;
  type: 'Annotation';
  motivation: string;
  body: AnnotationBody | AnnotationBody[];
  target: string | AnnotationTarget;
}

export interface AnnotationBody {
  type: string;
  value?: string;
  format?: string;
  language?: string;
}

export interface AnnotationTarget {
  type: 'SpecificResource';
  source: string | { id: string; type: string; partOf?: { id: string; type: string } };
  selector?: Selector | Selector[];
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export type Selector = TextQuoteSelector | FragmentSelector | PointSelector;

export interface TextQuoteSelector {
  type: 'TextQuoteSelector';
  /** Text before the match */
  prefix?: string;
  /** The matched text */
  exact: string;
  /** Text after the match */
  suffix?: string;
}

export interface FragmentSelector {
  type: 'FragmentSelector';
  /** Fragment value, e.g., 'xywh=100,200,300,400' or 't=10,20' */
  value: string;
  conformsTo?: string;
}

export interface PointSelector {
  type: 'PointSelector';
  x?: number;
  y?: number;
  t?: number;
}

// ---------------------------------------------------------------------------
// Autocomplete Response
// ---------------------------------------------------------------------------

export interface TermPage {
  '@context': string;
  id: string;
  type: 'TermPage';
  ignored?: string[];
  items: Term[];
}

export interface Term {
  type: 'Term';
  /** The suggested term value */
  value: string;
  /** Total annotations matching this term */
  total?: number;
  /** Display label */
  label?: LanguageMap;
  /** Language of the term */
  language?: string;
  /** If clicking this term should search a specific service */
  service?: SearchService2;
}

// ---------------------------------------------------------------------------
// Local Search Index Types (for FlexSearch integration)
// ---------------------------------------------------------------------------

export interface SearchIndexEntry {
  id: string;
  entityId: string;
  entityType: string;
  /** Which field this entry came from */
  field: 'label' | 'summary' | 'metadata' | 'annotation_body' | 'annotation_tag';
  /** The searchable text content */
  text: string;
  /** Language code if known */
  language?: string;
  /** Parent canvas/manifest ID for navigation */
  parentCanvasId?: string;
  parentManifestId?: string;
}

export interface SearchResult {
  /** The matched index entry */
  entry: SearchIndexEntry;
  /** Score from the search engine (higher = better match) */
  score: number;
  /** Highlighting info for rendering */
  highlights: SearchHighlight[];
}

export interface SearchHighlight {
  /** Text before the match */
  prefix: string;
  /** The matched text */
  exact: string;
  /** Text after the match */
  suffix: string;
}

export interface SearchFacets {
  entityType?: Record<string, number>;
  motivation?: Record<string, number>;
  field?: Record<string, number>;
  language?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Re-export shared types
// ---------------------------------------------------------------------------

interface LanguageMap {
  [lang: string]: string[];
}

interface AnnotationPage {
  id: string;
  type: 'AnnotationPage';
  items: SearchAnnotation[];
}
