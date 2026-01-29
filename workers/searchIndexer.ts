/**
 * Search Indexer Web Worker
 *
 * Handles FlexSearch indexing off the main thread to prevent UI freezing
 * during large dataset indexing operations.
 *
 * Communication Protocol:
 * - Main -> Worker: { action: 'add' | 'search' | 'reset' | 'remove', data: {...} }
 * - Worker -> Main: { type: 'added' | 'search' | 'reset' | 'error', ... }
 */

// FlexSearch will be loaded dynamically
let FlexSearch: any = null;
let index: any = null;

// Store for item metadata (not indexed, just stored for retrieval)
const itemStore = new Map<string, { type: string; label: string; context: string; parent?: string }>();

/**
 * Initialize the FlexSearch index
 */
async function initializeIndex() {
  if (!FlexSearch) {
    // Dynamic import for FlexSearch within worker context
    try {
      // @ts-ignore - dynamic import in worker
      const module = await import('flexsearch');
      FlexSearch = module.default || module;
    } catch (e) {
      // Fallback: try loading from global scope
      FlexSearch = (self as any).FlexSearch;
    }
  }

  if (!FlexSearch) {
    throw new Error('FlexSearch not available in worker');
  }

  // Create index with optimized settings for IIIF content
  index = new FlexSearch.Index({
    tokenize: 'forward',
    charset: 'latin:extra',
    resolution: 9,
    optimize: true,
    minlength: 2
  });

  itemStore.clear();
}

/**
 * Add an item to the search index
 */
function addToIndex(data: { id: string; text: string; type: string; label: string; context: string; parent?: string }) {
  if (!index) {
    self.postMessage({ type: 'error', message: 'Index not initialized' });
    return;
  }

  try {
    // Index the searchable text
    index.add(data.id, data.text);
    
    // Store metadata for retrieval
    itemStore.set(data.id, {
      type: data.type,
      label: data.label,
      context: data.context,
      parent: data.parent
    });

    self.postMessage({ type: 'added', id: data.id });
  } catch (err) {
    self.postMessage({ type: 'error', action: 'add', error: err.message });
  }
}

/**
 * Search the index
 */
function searchIndex(data: { query: string; options?: any }) {
  if (!index) {
    self.postMessage({ type: 'error', message: 'Index not initialized' });
    return;
  }

  try {
    const results = index.search(data.query, {
      limit: 50,
      ...data.options
    });

    // Enrich results with stored metadata
    const enrichedResults = results.map((id: string) => ({
      id,
      ...itemStore.get(id)
    })).filter((item: any) => item.id); // Remove items without metadata

    self.postMessage({
      type: 'search',
      query: data.query,
      results: enrichedResults,
      count: enrichedResults.length
    });
  } catch (err) {
    self.postMessage({ type: 'error', action: 'search', error: err.message });
  }
}

/**
 * Remove an item from the index
 */
function removeFromIndex(data: { id: string }) {
  if (!index) {
    self.postMessage({ type: 'error', message: 'Index not initialized' });
    return;
  }

  try {
    index.remove(data.id);
    itemStore.delete(data.id);
    self.postMessage({ type: 'removed', id: data.id });
  } catch (err) {
    self.postMessage({ type: 'error', action: 'remove', error: err.message });
  }
}

/**
 * Reset the index
 */
function resetIndex() {
  initializeIndex().then(() => {
    self.postMessage({ type: 'reset' });
  }).catch((err) => {
    self.postMessage({ type: 'error', action: 'reset', error: err.message });
  });
}

/**
 * Get index statistics
 */
function getStats() {
  if (!index) {
    self.postMessage({ type: 'error', message: 'Index not initialized' });
    return;
  }

  self.postMessage({
    type: 'stats',
    indexedItems: itemStore.size,
    indexSize: index.length || itemStore.size
  });
}

// Initialize on load
initializeIndex().then(() => {
  self.postMessage({ type: 'ready' });
}).catch((err) => {
  self.postMessage({ type: 'error', action: 'init', error: err.message });
});

// Handle messages from main thread
self.onmessage = (e: MessageEvent) => {
  const { action, data } = e.data;

  switch (action) {
    case 'add':
      addToIndex(data);
      break;

    case 'search':
      searchIndex(data);
      break;

    case 'remove':
      removeFromIndex(data);
      break;

    case 'reset':
      resetIndex();
      break;

    case 'stats':
      getStats();
      break;

    default:
      self.postMessage({ type: 'error', message: `Unknown action: ${action}` });
  }
};

// Type augmentation for Worker self
export {};
