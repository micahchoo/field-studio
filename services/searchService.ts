
import FlexSearch from 'flexsearch';
import { IIIFItem, IIIFAnnotation, IIIFCanvas } from '../types';

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

const RECENT_SEARCHES_KEY = 'iiif-field-recent-searches';
const MAX_RECENT_SEARCHES = 10;

class SearchService {
  private index: any;
  private itemMap: Map<string, { item: IIIFItem | IIIFAnnotation; parent?: string }> = new Map();
  private labelIndex: Map<string, Set<string>> = new Map(); // word → item IDs for autocomplete
  private typeCount: Map<string, number> = new Map(); // type → count
  private recentSearches: string[] = [];

  constructor() {
    this.reset();
    this.loadRecentSearches();
  }

  reset() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const FS = (FlexSearch as any);
    // FlexSearch 0.7.31 often exports 'Document' on the default object, or the default object IS the library.
    // In Vite, FS might be the module namespace, or the default export itself.
    const Document = FS.Document || FS.default?.Document || FS.default;

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
    } catch (e) {
      console.error("Failed to initialize FlexSearch index", e);
    }
    this.itemMap.clear();
    this.labelIndex.clear();
    this.typeCount.clear();
  }

  buildIndex(root: IIIFItem | null) {
    this.reset();
    if (!root) return;
    this.traverse(root, []);
    console.log(`Indexed ${this.itemMap.size} items.`);
  }

  private traverse(item: IIIFItem, path: string[]) {
    const label = item.label?.['none']?.[0] || item.label?.['en']?.[0] || 'Untitled';
    const summary = item.summary?.['none']?.[0] || item.summary?.['en']?.[0] || '';

    // Index current item
    this.index.add({
      id: item.id,
      label: label,
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
    if (item.type === 'Canvas' && (item as IIIFCanvas).annotations) {
      (item as IIIFCanvas).annotations?.forEach(page => {
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
                text: text,
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

  search(query: string, filterType?: string): SearchResult[] {
    if (!query) return [];

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
    const partialLower = partial.toLowerCase().trim();

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
   * Get word suggestions based on prefix matching
   */
  private getWordSuggestions(prefix: string, limit: number): string[] {
    const suggestions: { word: string; count: number }[] = [];

    for (const [word, ids] of this.labelIndex) {
      if (word.startsWith(prefix) && word !== prefix) {
        suggestions.push({ word, count: ids.size });
      }
    }

    // Sort by frequency (most common first)
    suggestions.sort((a, b) => b.count - a.count);

    return suggestions.slice(0, limit).map(s => s.word);
  }

  /**
   * Get fuzzy suggestions using Levenshtein distance
   */
  private getFuzzySuggestions(query: string, limit: number): string[] {
    const suggestions: { word: string; distance: number; count: number }[] = [];
    const maxDistance = Math.min(2, Math.floor(query.length / 3));

    for (const [word, ids] of this.labelIndex) {
      if (Math.abs(word.length - query.length) > maxDistance) continue;

      const distance = this.levenshteinDistance(query, word);
      if (distance > 0 && distance <= maxDistance) {
        suggestions.push({ word, distance, count: ids.size });
      }
    }

    // Sort by distance first, then by frequency
    suggestions.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return b.count - a.count;
    });

    return suggestions.slice(0, limit).map(s => s.word);
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
}

export const searchService = new SearchService();
