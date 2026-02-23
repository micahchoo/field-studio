import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DependencyDataStore } from '../stores/dependencyData.svelte';
import type { DependencyGraph, FileAnalysis } from '../types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeFile(overrides: Partial<FileAnalysis> & { filePath: string }): FileAnalysis {
  const parts = overrides.filePath.split('/');
  const fileName = parts[parts.length - 1];
  const directory = parts.slice(0, -1).join('/');
  const extension = fileName.split('.').pop() || '';
  return {
    filePath: overrides.filePath,
    fileName,
    directory,
    extension,
    imports: overrides.imports ?? [],
    exports: overrides.exports ?? [],
    dependencies: overrides.dependencies ?? [],
    dependents: overrides.dependents ?? [],
    size: overrides.size ?? 100,
    lines: overrides.lines ?? 10,
  };
}

function makeGraph(files: FileAnalysis[]): DependencyGraph {
  const filesMap: Record<string, FileAnalysis> = {};
  for (const f of files) filesMap[f.filePath] = f;
  return {
    generatedAt: '2026-02-10T00:00:00Z',
    totalFiles: files.length,
    files: filesMap,
    externalDependencies: ['svelte'],
    internalAliases: ['@/src'],
    circularDependencies: [],
    orphans: [],
    stats: {
      totalImports: files.reduce((sum, f) => sum + f.imports.length, 0),
      totalExports: files.reduce((sum, f) => sum + f.exports.length, 0),
      avgImportsPerFile: files.length > 0
        ? files.reduce((sum, f) => sum + f.imports.length, 0) / files.length
        : 0,
      mostImported: [],
    },
  };
}

const SAMPLE_FILES = [
  makeFile({
    filePath: 'src/shared/ui/Button.svelte',
    size: 500,
    imports: [
      { source: 'svelte', specifiers: ['onMount'], isTypeImport: false, isRelative: false, isAbsolute: false, isExternal: true, isInternalAlias: false },
    ],
    exports: [
      { name: 'default', type: 'default', isTypeExport: false },
    ],
    dependents: ['src/features/archive/ArchiveView.svelte', 'src/features/board/BoardView.svelte'],
  }),
  makeFile({
    filePath: 'src/shared/lib/utils.ts',
    size: 200,
    imports: [],
    exports: [
      { name: 'cn', type: 'named', isTypeExport: false },
      { name: 'formatDate', type: 'named', isTypeExport: false },
    ],
    dependents: ['src/shared/ui/Button.svelte'],
  }),
  makeFile({
    filePath: 'src/features/archive/useArchiveData.ts',
    size: 800,
    imports: [
      { source: '@/src/shared/types', specifiers: ['IIIFManifest'], isTypeImport: true, isRelative: false, isAbsolute: false, isExternal: false, isInternalAlias: true },
      { source: '../model/vault', specifiers: ['vault'], isTypeImport: false, isRelative: true, isAbsolute: false, isExternal: false, isInternalAlias: false },
    ],
    exports: [
      { name: 'useArchiveData', type: 'named', isTypeExport: false },
    ],
    dependents: [],
  }),
  makeFile({
    filePath: 'src/shared/types/iiif.d.ts',
    size: 1200,
    imports: [],
    exports: [
      { name: 'IIIFManifest', type: 'named', isTypeExport: true },
      { name: 'IIIFCanvas', type: 'named', isTypeExport: true },
      { name: 'NormalizedState', type: 'named', isTypeExport: true },
    ],
    dependents: ['src/features/archive/useArchiveData.ts', 'src/shared/ui/Button.svelte', 'src/entities/manifest/vault.ts'],
  }),
  makeFile({
    filePath: 'src/shared/services/StorageService.ts',
    size: 600,
    imports: [
      { source: 'idb', specifiers: ['openDB'], isTypeImport: false, isRelative: false, isAbsolute: false, isExternal: true, isInternalAlias: false },
    ],
    exports: [
      { name: 'StorageService', type: 'named', isTypeExport: false },
    ],
    dependents: ['src/app/App.tsx'],
  }),
  makeFile({
    filePath: 'src/shared/lib/helper.utils.ts',
    size: 300,
    imports: [],
    exports: [
      { name: 'debounce', type: 'named', isTypeExport: false },
    ],
    dependents: [],
  }),
  makeFile({
    filePath: 'src/shared/types/global.d.ts',
    size: 50,
    imports: [],
    exports: [
      { name: 'Window', type: 'named', isTypeExport: true },
    ],
    dependents: [],
  }),
];

const SAMPLE_GRAPH = makeGraph(SAMPLE_FILES);

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a store and load it with SAMPLE_GRAPH data */
async function loadedStore(): Promise<DependencyDataStore> {
  const store = new DependencyDataStore();
  vi.mocked(globalThis.fetch).mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(SAMPLE_GRAPH),
  } as Response);
  await store.loadData();
  return store;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DependencyDataStore', () => {
  // ---- 1. Initial state ----
  describe('initial state', () => {
    it('starts with loading true and no data', () => {
      const store = new DependencyDataStore();
      expect(store.isLoading).toBe(true);
      expect(store.data).toBe(null);
      expect(store.error).toBe(null);
      expect(store.searchQuery).toBe('');
      expect(store.filterType).toBe('all');
      expect(store.sortBy).toBe('name');
      expect(store.sortOrder).toBe('asc');
    });

    it('returns empty filteredFiles when no data loaded', () => {
      const store = new DependencyDataStore();
      expect(store.filteredFiles).toEqual([]);
    });
  });

  // ---- 2. Mutations: setSearch / setFilter / setSortBy ----
  describe('mutations', () => {
    it('setSearch updates searchQuery', () => {
      const store = new DependencyDataStore();
      store.setSearch('Button');
      expect(store.searchQuery).toBe('Button');
    });

    it('setFilter updates filterType', () => {
      const store = new DependencyDataStore();
      store.setFilter('components');
      expect(store.filterType).toBe('components');
    });

    it('setSortBy updates sortBy and defaults to asc', () => {
      const store = new DependencyDataStore();
      store.setSortBy('size');
      expect(store.sortBy).toBe('size');
      expect(store.sortOrder).toBe('asc');
    });

    // ---- 8. setSortBy toggles order when same column clicked ----
    it('setSortBy toggles order when same column', () => {
      const store = new DependencyDataStore();
      store.setSortBy('size');
      expect(store.sortOrder).toBe('asc');
      store.setSortBy('size');
      expect(store.sortOrder).toBe('desc');
      store.setSortBy('size');
      expect(store.sortOrder).toBe('asc');
    });

    it('setSortBy resets to asc when switching columns', () => {
      const store = new DependencyDataStore();
      store.setSortBy('size');
      store.setSortBy('size'); // now desc
      expect(store.sortOrder).toBe('desc');
      store.setSortBy('imports'); // switch column -> asc
      expect(store.sortBy).toBe('imports');
      expect(store.sortOrder).toBe('asc');
    });
  });

  // ---- 9-11. loadData ----
  describe('loadData', () => {
    // ---- 9. loadData — successful fetch ----
    it('fetches and stores data on success', async () => {
      const store = new DependencyDataStore();
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(SAMPLE_GRAPH),
      } as Response);

      await store.loadData();

      expect(store.isLoading).toBe(false);
      expect(store.error).toBe(null);
      expect(store.data).toEqual(SAMPLE_GRAPH);
      expect(store.data!.totalFiles).toBe(7);
    });

    // ---- 10. loadData — fetch error ----
    it('sets error on non-ok HTTP response', async () => {
      const store = new DependencyDataStore();
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await store.loadData();

      expect(store.isLoading).toBe(false);
      expect(store.error).toBeInstanceOf(Error);
      expect(store.error!.message).toContain('404');
      expect(store.data).toBe(null);
    });

    it('sets error on network exception', async () => {
      const store = new DependencyDataStore();
      vi.mocked(globalThis.fetch).mockRejectedValueOnce(new TypeError('Network error'));

      await store.loadData();

      expect(store.isLoading).toBe(false);
      expect(store.error).toBeInstanceOf(Error);
      expect(store.error!.message).toBe('Network error');
    });

    // ---- 11. loadData — abort signal ----
    it('ignores abort errors silently', async () => {
      const store = new DependencyDataStore();
      const abortError = new DOMException('Aborted', 'AbortError');
      vi.mocked(globalThis.fetch).mockRejectedValueOnce(abortError);

      await store.loadData();

      // AbortError is caught and returned early — error is not set
      expect(store.error).toBe(null);
    });

    it('does not update state after abort signal', async () => {
      const store = new DependencyDataStore();
      const controller = new AbortController();
      controller.abort();

      vi.mocked(globalThis.fetch).mockRejectedValueOnce(
        new DOMException('Aborted', 'AbortError'),
      );

      await store.loadData(controller.signal);

      // Store should remain at initial state (no data, loading stays true because
      // signal.aborted is true so finally block skips setting isLoading)
      expect(store.data).toBe(null);
      expect(store.isLoading).toBe(true);
    });

    it('includes refreshKey in URL as cache-buster', async () => {
      const store = new DependencyDataStore();
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(SAMPLE_GRAPH),
      } as Response);

      await store.loadData();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('?_='),
        expect.any(Object),
      );
    });
  });

  // ---- 12. refresh increments key ----
  describe('refresh', () => {
    it('increments refreshKey causing new URL on next loadData', async () => {
      const store = new DependencyDataStore();
      const fetchMock = vi.mocked(globalThis.fetch);

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(SAMPLE_GRAPH),
      } as Response);

      await store.loadData();
      const firstUrl = fetchMock.mock.calls[0][0] as string;

      store.refresh();
      await store.loadData();
      const secondUrl = fetchMock.mock.calls[1][0] as string;

      // The cache-buster param should differ
      expect(firstUrl).not.toBe(secondUrl);
    });
  });

  // ---- 3-7. filteredFiles ----
  describe('filteredFiles', () => {
    // ---- 3. All files when no filter ----
    it('returns all files when filter is "all"', async () => {
      const store = await loadedStore();
      expect(store.filteredFiles.length).toBe(7);
    });

    // ---- 4. Component filter ----
    it('filters components (only .svelte/.tsx/.jsx)', async () => {
      const store = await loadedStore();
      store.setFilter('components');
      const result = store.filteredFiles;
      expect(result.length).toBe(1);
      expect(result[0].fileName).toBe('Button.svelte');
    });

    // ---- 5. Hooks filter ----
    it('filters hooks (useXxx.ts/tsx or .svelte.ts)', async () => {
      const store = await loadedStore();
      store.setFilter('hooks');
      const result = store.filteredFiles;
      expect(result.length).toBe(1);
      expect(result[0].fileName).toBe('useArchiveData.ts');
    });

    it('filters services (XxxService.ts)', async () => {
      const store = await loadedStore();
      store.setFilter('services');
      const result = store.filteredFiles;
      expect(result.length).toBe(1);
      expect(result[0].fileName).toBe('StorageService.ts');
    });

    it('filters types (fileName ending with .d.ts)', async () => {
      const store = await loadedStore();
      store.setFilter('types');
      const result = store.filteredFiles;
      // The regex /(types|\.(d\.ts))$/i tests against f.fileName:
      //   iiif.d.ts  — ends with ".d.ts" -> matches
      //   global.d.ts — ends with ".d.ts" -> matches
      // Note: the "types" alternative matches fileNames ending in literal "types"
      // (e.g. "sharedTypes"), not filenames like "types.ts" which end in ".ts"
      expect(result.length).toBe(2);
      const names = result.map(f => f.fileName).sort();
      expect(names).toEqual(['global.d.ts', 'iiif.d.ts']);
    });

    it('filters utils (util/helper/lib in fileName followed by dot)', async () => {
      const store = await loadedStore();
      store.setFilter('utils');
      const result = store.filteredFiles;
      // The regex /(util|helper|lib)\./i tests against f.fileName:
      //   utils.ts — "util" is at 0-3 but followed by "s" not "." -> no match
      //   helper.utils.ts — "helper." at start -> matches
      expect(result.length).toBe(1);
      expect(result[0].fileName).toBe('helper.utils.ts');
    });

    // ---- 6. Search across filePath, exports, imports ----
    it('filters by search query on filePath', async () => {
      const store = await loadedStore();
      store.setSearch('Button');
      expect(store.filteredFiles.length).toBe(1);
      expect(store.filteredFiles[0].fileName).toBe('Button.svelte');
    });

    it('filters by search query on export names', async () => {
      const store = await loadedStore();
      store.setSearch('debounce');
      expect(store.filteredFiles.length).toBe(1);
      expect(store.filteredFiles[0].fileName).toBe('helper.utils.ts');
    });

    it('filters by search query on import specifiers', async () => {
      const store = await loadedStore();
      store.setSearch('IIIFManifest');
      const result = store.filteredFiles;
      // useArchiveData.ts imports specifier "IIIFManifest"
      // iiif.d.ts exports "IIIFManifest" (matched via export names in searchable text)
      expect(result.some(f => f.fileName === 'useArchiveData.ts')).toBe(true);
      expect(result.some(f => f.fileName === 'iiif.d.ts')).toBe(true);
    });

    it('search is case-insensitive', async () => {
      const store = await loadedStore();
      store.setSearch('button');
      expect(store.filteredFiles.length).toBe(1);
      expect(store.filteredFiles[0].fileName).toBe('Button.svelte');
    });

    // ---- 7. Sorting ----
    it('sorts by name ascending by default', async () => {
      const store = await loadedStore();
      const paths = store.filteredFiles.map(f => f.filePath);
      const sorted = [...paths].sort((a, b) => a.localeCompare(b));
      expect(paths).toEqual(sorted);
    });

    it('sorts by size ascending', async () => {
      const store = await loadedStore();
      store.setSortBy('size');
      const sizes = store.filteredFiles.map(f => f.size);
      for (let i = 1; i < sizes.length; i++) {
        expect(sizes[i]).toBeGreaterThanOrEqual(sizes[i - 1]);
      }
    });

    it('sorts by size descending', async () => {
      const store = await loadedStore();
      store.setSortBy('size');
      store.setSortBy('size'); // toggle to desc
      const sizes = store.filteredFiles.map(f => f.size);
      for (let i = 1; i < sizes.length; i++) {
        expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1]);
      }
    });

    it('sorts by imports count', async () => {
      const store = await loadedStore();
      store.setSortBy('imports');
      const counts = store.filteredFiles.map(f => f.imports.length);
      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
      }
    });

    it('sorts by exports count', async () => {
      const store = await loadedStore();
      store.setSortBy('exports');
      const counts = store.filteredFiles.map(f => f.exports.length);
      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
      }
    });

    it('sorts by dependents count', async () => {
      const store = await loadedStore();
      store.setSortBy('dependents');
      const counts = store.filteredFiles.map(f => f.dependents.length);
      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
      }
    });

    it('combines filter and search', async () => {
      const store = await loadedStore();
      store.setFilter('utils');
      store.setSearch('helper');
      expect(store.filteredFiles.length).toBe(1);
      expect(store.filteredFiles[0].fileName).toBe('helper.utils.ts');
    });
  });
});
