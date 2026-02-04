
import * as FlexSearchModule from 'flexsearch';
import { getIIIFValue, IIIFAnnotation, IIIFCanvas, IIIFItem, isCanvas } from '../types';
import { getAllCanvases } from '../utils';
import { DEFAULT_SEARCH_CONFIG, fieldRegistry, SearchIndexConfig } from './fieldRegistry';
import { USE_WORKER_SEARCH } from '../constants';

// FlexSearch has inconsistent exports across bundlers - try all patterns
const FlexSearch = (FlexSearchModule as any).default || FlexSearchModule;

// Worker instance (lazy loaded)
let searchWorker: Worker | null = null;

/**
 * Get or create the search worker instance
 */
function getSearchWorker(): Worker {
  if (!searchWorker) {
    // Create worker from the module
    searchWorker = new Worker(
      new URL('../workers/searchIndexer.ts', import.meta.url),
      { type: 'module' }
    );
  }
  return searchWorker;
}

/**
 * Terminate the search worker (for cleanup)
 */
export function terminateSearchWorker(): void {
  if (searchWorker) {
    searchWorker.terminate();
    searchWorker = null;
  }
}

export interface SearchResult {
  id: string;
  type: string;
  label: string;
  context: string;
  match: string;
  score?: number;
}

export interface AutocompleteResult {
  value: string;
  type: 'recent' | 'suggestion' | 'type';
  count?: number;
  icon?: string;
}

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

const RECENT_SEARCHES_KEY = 'iiif-field-recent-searches';
const MAX_RECENT_SEARCHES = 10;

export class SearchService {
  private index: any = null;
  private isHealthy: boolean = false;
  private itemMap: Map<string, { item: IIIFItem | IIIFAnnotation; parent?: string }> = new Map();
  private labelIndex: Map<string, Set<string>> = new Map(); // word → item IDs for autocomplete
  private typeCount: Map<string, number> = new Map(); // type → count
  private recentSearches: string[] = [];

  constructor() {
    this.reset();
    this.loadRecentSearches();
  }

  reset() {
    // Clear existing state
    this.index = null;
    this.isHealthy = false;
    this.itemMap.clear();
    this.labelIndex.clear();
    this.typeCount.clear();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const FS = (FlexSearch as any);
    // FlexSearch 0.7.31 has inconsistent exports across bundlers - try all patterns
    const Document = FS.Document ||
                     FS.default?.Document ||
                     FS.default ||
                     (typeof FS === 'function' ? FS : null);

    if (!Document) {
      console.error("FlexSearch Document constructor not found. Keys:", Object.keys(FS));
      return;
    }

    try {
      // @ts-ignore - FlexSearch types might be mismatched
      this.index = new Document({
        document: {
          id: "id",
          index: ["label", "text"],
          store: ["id", "type", "label", "context"]
        },
        tokenize: "forward"
      });
      this.isHealthy = true;
    } catch (e) {
      console.error("Failed to initialize FlexSearch index", e);
      this.index = null;
      this.isHealthy = false;
    }
  }

  buildIndex(root: IIIFItem | null) {
    this.reset();
    if (!root || !this.isHealthy) return;
    this.traverse(root, []);
    console.log(`Indexed ${this.itemMap.size} items.`);
  }

  private traverse(item: IIIFItem, path: string[]) {
    const label = getIIIFValue(item.label, 'none') || getIIIFValue(item.label, 'en') || 'Untitled';
    const summary = getIIIFValue(item.summary, 'none') || getIIIFValue(item.summary, 'en') || '';

    // Index current item
    this.index.add({
      id: item.id,
      label,
      text: summary,
      type: item.type,
      context: path.join(' > ')
    });

    this.itemMap.set(item.id, { item });

    // Update type count
    this.typeCount.set(item.type, (this.typeCount.get(item.type) || 0) + 1);

    // Build label index for autocomplete
    this.indexWordsForAutocomplete(label, item.id);
    if (summary) {
      this.indexWordsForAutocomplete(summary, item.id);
    }

    const newPath = [...path, label];

    // Recurse Items
    if (item.items) {
      for (const child of item.items) {
        this.traverse(child, newPath);
      }
    }

    // Index Annotations (specifically for Canvases)
    if (isCanvas(item) && item.annotations) {
      item.annotations.forEach(page => {
        page.items.forEach(anno => {
          let text = '';
          if (Array.isArray(anno.body)) {
             // Complex body
          } else if (anno.body.type === 'TextualBody') {
             text = anno.body.value;
          }

          if (text) {
             const annoLabel = (anno as any).label || 'Annotation';
             this.index.add({
                id: anno.id,
                label: annoLabel,
                text,
                type: 'Annotation',
                context: [...newPath, 'Annotations'].join(' > ')
             });
             this.itemMap.set(anno.id, { item: anno, parent: item.id });
             this.indexWordsForAutocomplete(text, anno.id);
          }
        });
      });
    }
  }

  /**
   * Index words for autocomplete suggestions
   */
  private indexWordsForAutocomplete(text: string, itemId: string): void {
    const words = text.toLowerCase()
      .split(/[\s\-_.,;:!?'"()\[\]{}]+/)
      .filter(w => w.length >= 3); // Only index words with 3+ chars

    for (const word of words) {
      if (!this.labelIndex.has(word)) {
        this.labelIndex.set(word, new Set());
      }
      this.labelIndex.get(word)!.add(itemId);
    }
  }

  /**
   * Search using Web Worker when USE_WORKER_SEARCH is enabled
   * Falls back to main-thread search for compatibility
   */
  async searchWorker(query: string): Promise<SearchResult[]> {
    if (!USE_WORKER_SEARCH) {
      return this.search(query);
    }

    return new Promise((resolve, reject) => {
      const worker = getSearchWorker();
      const timeout = setTimeout(() => {
        reject(new Error('Search worker timeout'));
      }, 5000);

      const handler = (e: MessageEvent) => {
        const { type, results, error } = e.data;
        
        if (type === 'search') {
          clearTimeout(timeout);
          worker.removeEventListener('message', handler);
          resolve(results as SearchResult[]);
        } else if (type === 'error') {
          clearTimeout(timeout);
          worker.removeEventListener('message', handler);
          reject(new Error(error));
        }
      };

      worker.addEventListener('message', handler);
      worker.postMessage({
        action: 'search',
        data: { query, options: { limit: 50 } }
      });
    });
  }

  /**
   * Build index using Web Worker when USE_WORKER_SEARCH is enabled
   */
  async buildIndexWorker(root: IIIFItem | null): Promise<void> {
    if (!USE_WORKER_SEARCH || !root) {
      this.buildIndex(root);
      return;
    }

    const worker = getSearchWorker();
    
    // Reset worker index
    worker.postMessage({ action: 'reset' });

    // Collect all items for indexing
    const itemsToIndex: Array<{
      id: string;
      text: string;
      type: string;
      label: string;
      context: string;
      parent?: string;
    }> = [];

    this.collectItemsForWorker(root, [], itemsToIndex);

    // Send items to worker in batches to avoid overwhelming the worker
    const batchSize = 100;
    for (let i = 0; i < itemsToIndex.length; i += batchSize) {
      const batch = itemsToIndex.slice(i, i + batchSize);
      
      await Promise.all(batch.map(item => new Promise<void>((resolve) => {
        const handler = (e: MessageEvent) => {
          if (e.data.type === 'added' && e.data.id === item.id) {
            worker.removeEventListener('message', handler);
            resolve();
          }
        };
        worker.addEventListener('message', handler);
        worker.postMessage({ action: 'add', data: item });
      })));
    }

    console.log(`Indexed ${itemsToIndex.length} items in worker.`);
  }

  private collectItemsForWorker(
    item: IIIFItem,
    path: string[],
    items: Array<{ id: string; text: string; type: string; label: string; context: string; parent?: string }>
  ): void {
    const label = getIIIFValue(item.label, 'none') || getIIIFValue(item.label, 'en') || 'Untitled';
    const summary = getIIIFValue(item.summary, 'none') || getIIIFValue(item.summary, 'en') || '';

    items.push({
      id: item.id,
      text: `${label} ${summary}`,
      type: item.type,
      label,
      context: path.join(' > ')
    });

    const newPath = [...path, label];

    if (item.items) {
      for (const child of item.items) {
        this.collectItemsForWorker(child, newPath, items);
      }
    }

    if (isCanvas(item) && item.annotations) {
      item.annotations.forEach(page => {
        page.items.forEach(anno => {
          let text = '';
          if (Array.isArray(anno.body)) {
            // Complex body
          } else if (anno.body.type === 'TextualBody') {
            text = anno.body.value;
          }

          if (text) {
            items.push({
              id: anno.id,
              text,
              type: 'Annotation',
              label: (anno as any).label || 'Annotation',
              context: [...newPath, 'Annotations'].join(' > '),
              parent: item.id
            });
          }
        });
      });
    }
  }

  search(query: string, filterType?: string): SearchResult[] {
    if (!query || !this.isHealthy) return [];

    // Record this search
    this.addRecentSearch(query);

    const results = this.index.search(query, {
      limit: 50,
      enrich: true
    });

    const output: SearchResult[] = [];
    const seen = new Set<string>();

    for (const fieldResult of results) {
      for (const doc of fieldResult.result) {
         if (seen.has(doc.doc.id)) continue;
         if (filterType && doc.doc.type !== filterType) continue;

         seen.add(doc.doc.id);
         output.push({
           id: doc.doc.id,
           type: doc.doc.type,
           label: doc.doc.label,
           context: doc.doc.context,
           match: query // FlexSearch doesn't easily give snippets in this mode without custom logic
         });
      }
    }

    return output;
  }

  /**
   * Get autocomplete suggestions for a partial query
   */
  autocomplete(partial: string, limit: number = 8): AutocompleteResult[] {
    const results: AutocompleteResult[] = [];
    // Guard against non-string partial
    const safePartial = typeof partial === 'string' ? partial : '';
    const partialLower = safePartial.toLowerCase().trim();

    if (!partialLower) {
      // Return recent searches if no input
      return this.recentSearches.slice(0, limit).map(s => ({
        value: s,
        type: 'recent' as const,
        icon: 'history'
      }));
    }

    // Add matching recent searches first
    const matchingRecent = this.recentSearches
      .filter(s => s.toLowerCase().includes(partialLower))
      .slice(0, 3);

    for (const recent of matchingRecent) {
      results.push({
        value: recent,
        type: 'recent',
        icon: 'history'
      });
    }

    // Add type filters if query matches a type
    const typeMatches = ['Collection', 'Manifest', 'Canvas', 'Annotation', 'Range']
      .filter(t => t.toLowerCase().startsWith(partialLower));

    for (const type of typeMatches) {
      const count = this.typeCount.get(type) || 0;
      if (count > 0) {
        results.push({
          value: `type:${type}`,
          type: 'type',
          count,
          icon: this.getTypeIcon(type)
        });
      }
    }

    // Add word-based suggestions using prefix matching
    const wordSuggestions = this.getWordSuggestions(partialLower, limit - results.length);
    for (const suggestion of wordSuggestions) {
      if (!results.some(r => r.value.toLowerCase() === suggestion.toLowerCase())) {
        results.push({
          value: suggestion,
          type: 'suggestion',
          icon: 'search'
        });
      }
    }

    // Add fuzzy suggestions if we don't have enough results
    if (results.length < 4 && partialLower.length >= 3) {
      const fuzzySuggestions = this.getFuzzySuggestions(partialLower, 3);
      for (const suggestion of fuzzySuggestions) {
        if (!results.some(r => r.value.toLowerCase() === suggestion.toLowerCase())) {
          results.push({
            value: suggestion,
            type: 'suggestion',
            icon: 'lightbulb'
          });
        }
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Generic helper for scoring and filtering word suggestions
   */
  private getScoredSuggestions<T extends { word: string }>(
    scoreFn: (word: string, ids: Set<string>) => T | null,
    sortFn: (a: T, b: T) => number,
    limit: number
  ): string[] {
    const suggestions: T[] = [];

    for (const [word, ids] of this.labelIndex) {
      const scored = scoreFn(word, ids);
      if (scored) suggestions.push(scored);
    }

    suggestions.sort(sortFn);
    return suggestions.slice(0, limit).map(s => s.word);
  }

  /**
   * Get word suggestions based on prefix matching
   */
  private getWordSuggestions(prefix: string, limit: number): string[] {
    return this.getScoredSuggestions(
      (word, ids) => word.startsWith(prefix) && word !== prefix
        ? { word, count: ids.size }
        : null,
      (a, b) => b.count - a.count,
      limit
    );
  }

  /**
   * Get fuzzy suggestions using Levenshtein distance
   */
  private getFuzzySuggestions(query: string, limit: number): string[] {
    const maxDistance = Math.min(2, Math.floor(query.length / 3));

    return this.getScoredSuggestions(
      (word, ids) => {
        if (Math.abs(word.length - query.length) > maxDistance) return null;
        const distance = this.levenshteinDistance(query, word);
        if (distance > 0 && distance <= maxDistance) {
          return { word, distance, count: ids.size };
        }
        return null;
      },
      (a, b) => a.distance !== b.distance ? a.distance - b.distance : b.count - a.count,
      limit
    );
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Get icon for a resource type
   */
  private getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'Collection': 'folder',
      'Manifest': 'description',
      'Canvas': 'image',
      'Annotation': 'comment',
      'Range': 'segment'
    };
    return icons[type] || 'article';
  }

  // Recent searches management
  private loadRecentSearches(): void {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        this.recentSearches = JSON.parse(stored);
      }
    } catch (e) {
      this.recentSearches = [];
    }
  }

  private saveRecentSearches(): void {
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(this.recentSearches));
    } catch (e) {
      // Storage might be full or disabled
    }
  }

  addRecentSearch(query: string): void {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;

    // Remove if already exists
    this.recentSearches = this.recentSearches.filter(s => s !== trimmed);

    // Add to front
    this.recentSearches.unshift(trimmed);

    // Limit size
    if (this.recentSearches.length > MAX_RECENT_SEARCHES) {
      this.recentSearches = this.recentSearches.slice(0, MAX_RECENT_SEARCHES);
    }

    this.saveRecentSearches();
  }

  clearRecentSearches(): void {
    this.recentSearches = [];
    this.saveRecentSearches();
  }

  getRecentSearches(): string[] {
    return [...this.recentSearches];
  }

  /**
   * Search with type filter from autocomplete suggestion
   * Handles special syntax like "type:Manifest"
   */
  searchWithSyntax(query: string): SearchResult[] {
    const typeMatch = query.match(/^type:(\w+)$/i);
    if (typeMatch) {
      return this.search('', typeMatch[1]);
    }

    const typeFilter = query.match(/^type:(\w+)\s+(.+)$/i);
    if (typeFilter) {
      return this.search(typeFilter[2], typeFilter[1]);
    }

    return this.search(query);
  }

  getParentId(id: string): string | undefined {
      return this.itemMap.get(id)?.parent;
  }

  /**
   * Get statistics about the indexed content
   */
  getStats(): { totalItems: number; typeCounts: Record<string, number>; uniqueWords: number } {
    return {
      totalItems: this.itemMap.size,
      typeCounts: Object.fromEntries(this.typeCount),
      uniqueWords: this.labelIndex.size
    };
  }

  // ============================================================================
  // Lunr.js Export for Static Sites (WAX-compatible)
  // ============================================================================

  /**
   * Export search index for static site generation (Lunr.js format)
   *
   * Follows WAX pattern:
   * - Assigns sequential lunr_id for document indexing
   * - Per-collection configurable search_fields
   * - Normalizes diacritics for consistent search
   *
   * @param root - IIIF root item to index
   * @param config - Search configuration (fields, boosts, normalization)
   * @param baseUrl - Base URL for generated URLs
   * @param collectionName - Collection name for URL paths
   */
  exportLunrIndex(
    root: IIIFItem,
    config: SearchIndexConfig = DEFAULT_SEARCH_CONFIG,
    baseUrl: string = '',
    collectionName: string = 'objects'
  ): LunrExportResult {
    const documents: LunrDocument[] = [];
    let lunrId = 0;

    // Collect all indexable items (canvases)
    const items = this.collectIndexableItems(root);

    for (const item of items) {
      const pid = fieldRegistry.generatePid(item.id);
      const label = getIIIFValue(item.label) || '';
      const summary = getIIIFValue((item as any).summary) || '';

      // Build content from all configured search fields
      const contentParts: string[] = [];

      for (const fieldKey of config.fields) {
        const value = this.extractFieldValue(item, fieldKey);
        if (value) {
          contentParts.push(value);
        }
      }

      // Normalize content if configured (WAX pattern - diacritic removal)
      const normalizedTitle = config.normalizeDiacritics
        ? fieldRegistry.normalizeForSearch(label)
        : label;
      const normalizedContent = config.normalizeDiacritics
        ? fieldRegistry.normalizeForSearch(contentParts.join(' '))
        : contentParts.join(' ');

      documents.push({
        lunr_id: String(lunrId),
        pid,
        title: normalizedTitle,
        content: normalizedContent,
        thumbnail: `img/derivatives/iiif/${pid}/full/150,/0/default.jpg`,
        url: `${collectionName}/${pid}.html`
      });

      lunrId++;
    }

    // Build field configuration with boosts
    const fields = config.fields
      .filter(f => fieldRegistry.getField(f)?.indexable !== false)
      .map(f => ({
        name: f === 'label' ? 'title' : (f === 'summary' ? 'content' : f),
        boost: config.boosts[f] || 1
      }));

    // Deduplicate fields (title and content are always present)
    const uniqueFields = [
      { name: 'title', boost: config.boosts['label'] || 10 },
      { name: 'content', boost: config.boosts['summary'] || 1 }
    ];

    // Generate Lunr.js configuration JavaScript
    const lunrConfigJs = this.generateLunrConfigJs(baseUrl, uniqueFields);

    return {
      documents,
      fields: uniqueFields,
      ref: 'lunr_id',
      lunrConfigJs
    };
  }

  /**
   * Collect all indexable items from the IIIF tree
   */
  private collectIndexableItems(root: IIIFItem): IIIFItem[] {
    // Use centralized traversal utility
    return getAllCanvases(root);
  }

  /**
   * Extract a field value from an IIIF item
   */
  private extractFieldValue(item: IIIFItem, fieldKey: string): string {
    if (fieldKey === 'label') {
      return getIIIFValue(item.label) || '';
    }

    if (fieldKey === 'summary') {
      return getIIIFValue((item as any).summary) || '';
    }

    if (fieldKey === 'navDate') {
      return (item as any).navDate || '';
    }

    if (fieldKey === 'rights') {
      return (item as any).rights || '';
    }

    if (fieldKey.startsWith('metadata.')) {
      const metaKey = fieldKey.replace('metadata.', '').toLowerCase();
      const metadata = item.metadata || [];

      for (const entry of metadata) {
        const entryLabel = getIIIFValue(entry.label)?.toLowerCase();
        if (entryLabel === metaKey) {
          return getIIIFValue(entry.value) || '';
        }
      }
      return '';
    }

    return '';
  }

  /**
   * Generate Lunr.js configuration JavaScript for static site
   */
  private generateLunrConfigJs(baseUrl: string, fields: Array<{ name: string; boost: number }>): string {
    const fieldConfig = fields
      .map(f => `      this.field('${f.name}'${f.boost !== 1 ? `, { boost: ${f.boost} }` : ''});`)
      .join('\n');

    return `// Lunr.js Search Configuration
// Generated by IIIF Field Studio (WAX-compatible)

var store = [];
var idx;

fetch('${baseUrl}/search/index.json')
  .then(response => response.json())
  .then(data => {
    store = data.documents;
    idx = lunr(function() {
      this.ref('lunr_id');
${fieldConfig}

      data.documents.forEach(doc => {
        this.add(doc);
      });
    });
  });

function search(query) {
  if (!idx) return [];
  return idx.search(query).map(result => {
    return store.find(doc => doc.lunr_id === result.ref);
  });
}

function searchWithHighlight(query) {
  if (!idx) return [];
  return idx.search(query).map(result => {
    const doc = store.find(d => d.lunr_id === result.ref);
    return {
      ...doc,
      score: result.score,
      matchData: result.matchData
    };
  });
}
`;
  }
}

export const searchService = new SearchService();
