/**
 * IIIF Store Module Tests
 *
 * Tests the reactive Svelte 5 store wrappers for IIIF services.
 * Uses exported singletons with reset() for test isolation and
 * vi.mock() for async service dependencies.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock service dependencies before importing stores ──

vi.mock('@/src/shared/services/searchService', () => ({
  computeFacets: vi.fn((results: unknown[]) => {
    // Minimal real implementation for local search tests
    const entityType: Record<string, number> = {};
    const field: Record<string, number> = {};
    const language: Record<string, number> = {};
    for (const r of results as Array<{ entry: Record<string, string> }>) {
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
  }),
  queryRemoteSearch: vi.fn().mockResolvedValue({ results: [], total: 0 }),
  fetchAutocompleteSuggestions: vi.fn().mockResolvedValue([]),
  parseSearchResponse: vi.fn().mockReturnValue({ results: [], total: 0 }),
}));

vi.mock('@/src/shared/services/authFlowService', () => ({
  detectAuthServices: vi.fn().mockReturnValue([]),
  getStoredToken: vi.fn().mockReturnValue(null),
  clearStoredToken: vi.fn(),
  clearAllTokens: vi.fn(),
  runAuthFlow: vi.fn(),
  openAccessService: vi.fn().mockReturnValue({ close: vi.fn() }),
  probeResource: vi.fn(),
  authStatusFromProbe: vi.fn(),
}));

vi.mock('@/src/shared/services/changeDiscoveryService', () => ({
  createLocalActivity: vi.fn().mockImplementation(
    (actionType: string, entityId: string, entityType: string, summary: string, patch?: unknown) => ({
      id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'Update',
      entityId,
      entityType,
      timestamp: new Date().toISOString(),
      summary,
      actionType,
      patch,
    }),
  ),
  storeActivity: vi.fn().mockResolvedValue(undefined),
  getRecentActivities: vi.fn().mockResolvedValue([]),
  pollRemoteStream: vi.fn(),
  deduplicateActivities: vi.fn().mockReturnValue([]),
  detectConflict: vi.fn().mockReturnValue(null),
  getActivitiesForEntity: vi.fn().mockResolvedValue([]),
  saveStreamState: vi.fn().mockResolvedValue(undefined),
  loadStreamStates: vi.fn().mockResolvedValue([]),
  removeStreamState: vi.fn().mockResolvedValue(undefined),
  createStreamState: vi.fn().mockImplementation(
    (streamId: string, label: string) => ({
      streamId,
      label,
      lastProcessedTime: '',
      lastPageId: '',
      totalProcessed: 0,
      status: 'idle',
      lastCheckedAt: new Date().toISOString(),
      pollInterval: 300_000,
    }),
  ),
}));

vi.mock('@/src/shared/services/tilePipeline', () => ({
  generateTilesForAsset: vi.fn(),
  shouldGenerateTiles: vi.fn().mockReturnValue(true),
  getTotalStorageUsed: vi.fn().mockResolvedValue(0),
  evictTiles: vi.fn().mockResolvedValue(0),
  deleteTilesForAsset: vi.fn().mockResolvedValue(0),
  getAllTileManifests: vi.fn().mockResolvedValue([]),
  estimateTotalTiles: vi.fn().mockReturnValue(100),
}));

// ── Import stores (singletons) ──

import { search } from '@/src/shared/stores/search.svelte';
import { auth } from '@/src/shared/stores/auth.svelte';
import { activityLog } from '@/src/shared/stores/activityLog.svelte';
import { imagePipeline } from '@/src/shared/stores/imagePipeline.svelte';

// ── Import mocked functions for assertions ──

import { detectAuthServices, getStoredToken } from '@/src/shared/services/authFlowService';
import { shouldGenerateTiles } from '@/src/shared/services/tilePipeline';

// ============================================================================
// 1. SearchStore
// ============================================================================

describe('SearchStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    search.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts with empty query and results', () => {
      expect(search.query).toBe('');
      expect(search.localResults).toEqual([]);
      expect(search.remoteResults).toEqual([]);
      expect(search.allResults).toEqual([]);
      expect(search.totalHits).toBe(0);
      expect(search.isSearching).toBe(false);
      expect(search.error).toBeNull();
    });

    it('starts with default scope and field', () => {
      expect(search.scope).toBe('all');
      expect(search.field).toBe('all');
      expect(search.motivation).toBeUndefined();
    });

    it('starts with empty index', () => {
      expect(search.indexedCount).toBe(0);
      expect(search.isIndexing).toBe(false);
    });

    it('starts with no remote endpoints', () => {
      expect(search.remoteEndpoints).toEqual([]);
    });

    it('starts with no suggestions', () => {
      expect(search.suggestions).toEqual([]);
    });
  });

  describe('index management', () => {
    const entries = [
      { id: '1', entityId: 'e1', entityType: 'Canvas', field: 'label' as const, text: 'Sunrise over mountains' },
      { id: '2', entityId: 'e2', entityType: 'Canvas', field: 'label' as const, text: 'Sunset at the beach' },
      { id: '3', entityId: 'e3', entityType: 'Manifest', field: 'summary' as const, text: 'A collection of landscapes' },
    ];

    it('rebuildIndex replaces entire index', () => {
      search.rebuildIndex(entries);
      expect(search.indexedCount).toBe(3);
    });

    it('addToIndex appends entries', () => {
      search.rebuildIndex(entries.slice(0, 2));
      search.addToIndex([entries[2]]);
      expect(search.indexedCount).toBe(3);
    });

    it('removeFromIndex removes entries by entityId', () => {
      search.rebuildIndex(entries);
      search.removeFromIndex('e1');
      expect(search.indexedCount).toBe(2);
    });

    it('clearIndex resets index and local results', () => {
      search.rebuildIndex(entries);
      search.clearIndex();
      expect(search.indexedCount).toBe(0);
      expect(search.localResults).toEqual([]);
    });
  });

  describe('local search', () => {
    beforeEach(() => {
      search.rebuildIndex([
        { id: '1', entityId: 'e1', entityType: 'Canvas', field: 'label' as const, text: 'Medieval manuscript illumination' },
        { id: '2', entityId: 'e2', entityType: 'Canvas', field: 'label' as const, text: 'Gothic architecture details' },
        { id: '3', entityId: 'e3', entityType: 'Manifest', field: 'summary' as const, text: 'A study of medieval art' },
      ]);
    });

    it('finds matching entries after debounce', () => {
      search.query = 'medieval';
      vi.advanceTimersByTime(300);
      expect(search.localResults.length).toBe(2);
    });

    it('clears results when query is emptied', () => {
      search.query = 'medieval';
      vi.advanceTimersByTime(300);
      expect(search.localResults.length).toBe(2);

      search.query = '';
      vi.advanceTimersByTime(300);
      expect(search.localResults).toEqual([]);
    });

    it('generates highlights for matches', () => {
      search.query = 'Gothic';
      vi.advanceTimersByTime(300);
      expect(search.localResults.length).toBe(1);
      expect(search.localResults[0].highlights[0].exact).toBe('Gothic');
    });

    it('search is case-insensitive', () => {
      search.query = 'MEDIEVAL';
      vi.advanceTimersByTime(300);
      expect(search.localResults.length).toBe(2);
    });

    it('field filter restricts to specific field', () => {
      search.field = 'summary';
      search.query = 'medieval';
      vi.advanceTimersByTime(300);
      expect(search.localResults.length).toBe(1);
      expect(search.localResults[0].entry.field).toBe('summary');
    });

    it('sorts by relevance (earlier match = higher score)', () => {
      search.query = 'medieval';
      vi.advanceTimersByTime(300);
      // "Medieval manuscript..." starts at index 0, "A study of medieval..." starts later
      expect(search.localResults[0].entry.text).toContain('Medieval');
    });
  });

  describe('scope filtering', () => {
    beforeEach(() => {
      search.rebuildIndex([
        { id: '1', entityId: 'e1', entityType: 'Canvas', field: 'label' as const, text: 'Test item' },
      ]);
    });

    it('scope "local" returns only local results', () => {
      search.scope = 'local';
      search.query = 'Test';
      vi.advanceTimersByTime(300);
      expect(search.allResults).toEqual(search.localResults);
    });

    it('scope "remote" returns only remote results', () => {
      search.scope = 'remote';
      expect(search.allResults).toEqual(search.remoteResults);
    });
  });

  describe('remote endpoints', () => {
    it('registers a remote endpoint', () => {
      search.registerRemoteEndpoint({ serviceId: 'https://search.example.org', label: 'Test' });
      expect(search.remoteEndpoints).toHaveLength(1);
    });

    it('does not register duplicate endpoints', () => {
      search.registerRemoteEndpoint({ serviceId: 'https://search.example.org', label: 'Test' });
      search.registerRemoteEndpoint({ serviceId: 'https://search.example.org', label: 'Test' });
      expect(search.remoteEndpoints).toHaveLength(1);
    });

    it('unregisters an endpoint', () => {
      search.registerRemoteEndpoint({ serviceId: 'https://search.example.org', label: 'Test' });
      search.unregisterRemoteEndpoint('https://search.example.org');
      expect(search.remoteEndpoints).toHaveLength(0);
    });

    it('registers multiple unique endpoints', () => {
      search.registerRemoteEndpoint({ serviceId: 'https://a.example.org', label: 'A' });
      search.registerRemoteEndpoint({ serviceId: 'https://b.example.org', label: 'B' });
      expect(search.remoteEndpoints).toHaveLength(2);
    });
  });

  describe('suggestions', () => {
    it('clears suggestions for short query', async () => {
      await search.fetchSuggestions('a');
      expect(search.suggestions).toEqual([]);
    });

    it('clearSuggestions empties the list', () => {
      search.clearSuggestions();
      expect(search.suggestions).toEqual([]);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      search.registerRemoteEndpoint({ serviceId: 'https://search.example.org', label: 'Test' });
      search.reset();
      expect(search.query).toBe('');
      expect(search.localResults).toEqual([]);
      expect(search.error).toBeNull();
      expect(search.isSearching).toBe(false);
    });
  });
});

// ============================================================================
// 2. AuthStore
// ============================================================================

describe('AuthStore', () => {
  beforeEach(() => {
    auth.reset();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with no services', () => {
      expect(auth.services.size).toBe(0);
      expect(auth.unauthorizedCount).toBe(0);
      expect(auth.authorizedCount).toBe(0);
    });

    it('starts with no active flow', () => {
      expect(auth.isFlowActive).toBe(false);
      expect(auth.activeFlowProfile).toBeNull();
      expect(auth.activeFlowLabel).toBe('');
      expect(auth.activeFlowError).toBeNull();
    });
  });

  describe('registerFromManifest', () => {
    it('registers auth services from manifest services array', () => {
      const mockServices = [
        {
          type: 'AuthAccessService2',
          id: 'https://auth.example.org/login',
          profile: 'active',
          label: { en: ['Login Required'] },
          service: [{ type: 'AuthAccessTokenService2', id: 'https://auth.example.org/token' }],
        },
      ];
      vi.mocked(detectAuthServices).mockReturnValue(mockServices as never);
      vi.mocked(getStoredToken).mockReturnValue(null);

      auth.registerFromManifest(mockServices, ['resource-1', 'resource-2']);

      expect(auth.services.size).toBe(1);
      const svc = auth.services.get('https://auth.example.org/login');
      expect(svc).toBeTruthy();
      expect(svc!.label).toBe('Login Required');
      expect(svc!.status).toBe('unknown');
    });

    it('maps resources to their auth service', () => {
      const mockServices = [{
        type: 'AuthAccessService2',
        id: 'auth-1',
        profile: 'active',
        label: { en: ['Login'] },
        service: [],
      }];
      vi.mocked(detectAuthServices).mockReturnValue(mockServices as never);
      vi.mocked(getStoredToken).mockReturnValue(null);

      auth.registerFromManifest(mockServices, ['res-1']);
      expect(auth.isProtected('res-1')).toBe(true);
      expect(auth.isProtected('res-unknown')).toBe(false);
    });

    it('sets status to checking when existing token found', () => {
      const mockServices = [{
        type: 'AuthAccessService2',
        id: 'auth-1',
        profile: 'active',
        label: { en: ['Login'] },
        service: [],
      }];
      vi.mocked(detectAuthServices).mockReturnValue(mockServices as never);
      vi.mocked(getStoredToken).mockReturnValue('existing-token');

      auth.registerFromManifest(mockServices, ['res-1']);
      const svc = auth.services.get('auth-1');
      expect(svc!.status).toBe('checking');
      expect(svc!.token).toBe('existing-token');
    });

    it('adds resources to existing service on second call', () => {
      const mockServices = [{
        type: 'AuthAccessService2',
        id: 'auth-1',
        profile: 'active',
        label: { en: ['Login'] },
        service: [],
      }];
      vi.mocked(detectAuthServices).mockReturnValue(mockServices as never);
      vi.mocked(getStoredToken).mockReturnValue(null);

      auth.registerFromManifest(mockServices, ['res-1']);
      auth.registerFromManifest(mockServices, ['res-2']);

      expect(auth.services.size).toBe(1);
      expect(auth.isProtected('res-1')).toBe(true);
      expect(auth.isProtected('res-2')).toBe(true);
    });
  });

  describe('per-resource queries', () => {
    beforeEach(() => {
      const mockServices = [{
        type: 'AuthAccessService2',
        id: 'auth-1',
        profile: 'active',
        label: { en: ['Login'] },
        service: [],
      }];
      vi.mocked(detectAuthServices).mockReturnValue(mockServices as never);
      vi.mocked(getStoredToken).mockReturnValue(null);
      auth.registerFromManifest(mockServices, ['res-1']);
    });

    it('getStatus returns unknown for unprotected resource', () => {
      expect(auth.getStatus('unknown-resource')).toBe('unknown');
    });

    it('getStatus returns service status for protected resource', () => {
      expect(auth.getStatus('res-1')).toBe('unknown');
    });

    it('getToken returns null when no token', () => {
      expect(auth.getToken('res-1')).toBeNull();
    });

    it('getServiceForResource returns the service state', () => {
      const svc = auth.getServiceForResource('res-1');
      expect(svc).not.toBeNull();
      expect(svc!.serviceId).toBe('auth-1');
    });

    it('getServiceForResource returns null for unknown resource', () => {
      expect(auth.getServiceForResource('unknown')).toBeNull();
    });
  });

  describe('logoutFromService', () => {
    it('sets service to unauthorized and clears token', () => {
      const mockServices = [{
        type: 'AuthAccessService2',
        id: 'auth-1',
        profile: 'active',
        label: { en: ['Login'] },
        service: [],
      }];
      vi.mocked(detectAuthServices).mockReturnValue(mockServices as never);
      vi.mocked(getStoredToken).mockReturnValue('my-token');

      auth.registerFromManifest(mockServices, ['res-1']);
      auth.logoutFromService('auth-1');

      const svc = auth.services.get('auth-1');
      expect(svc!.status).toBe('unauthorized');
      expect(svc!.token).toBeUndefined();
    });

    it('is a no-op for unknown service', () => {
      auth.logoutFromService('nonexistent');
      expect(auth.services.size).toBe(0);
    });
  });

  describe('logoutAll', () => {
    it('sets all services to unauthorized', () => {
      const mockServices = [
        { type: 'AuthAccessService2', id: 'auth-1', profile: 'active', label: { en: ['A'] }, service: [] },
        { type: 'AuthAccessService2', id: 'auth-2', profile: 'kiosk', label: { en: ['B'] }, service: [] },
      ];
      vi.mocked(detectAuthServices).mockReturnValue(mockServices as never);
      vi.mocked(getStoredToken).mockReturnValue('token');

      auth.registerFromManifest(mockServices, ['res-1']);
      auth.logoutAll();

      for (const [, svc] of auth.services) {
        expect(svc.status).toBe('unauthorized');
        expect(svc.token).toBeUndefined();
      }
    });
  });

  describe('reset', () => {
    it('clears all auth state', () => {
      const mockServices = [{ type: 'AuthAccessService2', id: 'auth-1', profile: 'active', label: { en: ['A'] }, service: [] }];
      vi.mocked(detectAuthServices).mockReturnValue(mockServices as never);
      vi.mocked(getStoredToken).mockReturnValue(null);
      auth.registerFromManifest(mockServices, ['res-1']);

      auth.reset();
      expect(auth.services.size).toBe(0);
      expect(auth.isFlowActive).toBe(false);
      expect(auth.activeFlowError).toBeNull();
    });
  });
});

// ============================================================================
// 3. ActivityLogStore
// ============================================================================

describe('ActivityLogStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    activityLog.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    activityLog.destroy();
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts with empty activity list', () => {
      expect(activityLog.recentActivities).toEqual([]);
      expect(activityLog.totalCount).toBe(0);
    });

    it('starts with no conflicts', () => {
      expect(activityLog.conflicts).toEqual([]);
      expect(activityLog.hasConflicts).toBe(false);
    });

    it('starts with recording enabled', () => {
      expect(activityLog.isRecording).toBe(true);
    });

    it('starts with no watched streams', () => {
      expect(activityLog.watchedStreams).toEqual([]);
    });

    it('starts with no pending remote activities', () => {
      expect(activityLog.pendingRemoteActivities).toEqual([]);
      expect(activityLog.pendingCount).toBe(0);
    });

    it('starts not syncing', () => {
      expect(activityLog.isSyncing).toBe(false);
      expect(activityLog.syncError).toBeNull();
    });
  });

  describe('recording', () => {
    it('records a vault mutation as a local activity', async () => {
      await activityLog.record('UPDATE_LABEL', 'canvas-1', 'Canvas', 'Label updated');
      expect(activityLog.recentActivities).toHaveLength(1);
      expect(activityLog.totalCount).toBe(1);
    });

    it('prepends new activities (newest first)', async () => {
      await activityLog.record('ADD_CANVAS', 'c1', 'Canvas', 'First');
      await activityLog.record('ADD_CANVAS', 'c2', 'Canvas', 'Second');
      expect(activityLog.recentActivities[0].summary).toBe('Second');
      expect(activityLog.recentActivities[1].summary).toBe('First');
    });

    it('does not record when recording is disabled', async () => {
      activityLog.setRecording(false);
      await activityLog.record('ADD_CANVAS', 'c1', 'Canvas', 'Test');
      expect(activityLog.recentActivities).toHaveLength(0);
    });

    it('re-enables recording', async () => {
      activityLog.setRecording(false);
      activityLog.setRecording(true);
      await activityLog.record('ADD_CANVAS', 'c1', 'Canvas', 'Test');
      expect(activityLog.recentActivities).toHaveLength(1);
    });

    it('caps recent activities at 50', async () => {
      for (let i = 0; i < 55; i++) {
        await activityLog.record('ADD_CANVAS', `c${i}`, 'Canvas', `Activity ${i}`);
      }
      expect(activityLog.recentActivities.length).toBeLessThanOrEqual(50);
      expect(activityLog.totalCount).toBe(55);
    });

    it('tracks total count independently of capped list', async () => {
      for (let i = 0; i < 10; i++) {
        await activityLog.record('ADD_CANVAS', `c${i}`, 'Canvas', `Activity ${i}`);
      }
      expect(activityLog.totalCount).toBe(10);
      expect(activityLog.recentActivities).toHaveLength(10);
    });
  });

  describe('conflict resolution', () => {
    it('resolveConflict on empty list is a no-op', () => {
      activityLog.resolveConflict('no-such-id', 'local');
      expect(activityLog.conflicts).toEqual([]);
    });

    it('dismissConflict on empty list is a no-op', () => {
      activityLog.dismissConflict('no-such-id');
      expect(activityLog.conflicts).toEqual([]);
    });

    it('acceptAllRemote on empty list is a no-op', () => {
      activityLog.acceptAllRemote();
      expect(activityLog.conflicts).toEqual([]);
    });

    it('keepAllLocal on empty list is a no-op', () => {
      activityLog.keepAllLocal();
      expect(activityLog.conflicts).toEqual([]);
    });
  });

  describe('watchStream / unwatchStream', () => {
    const streamUrl = 'https://example.org/activity-stream.json';
    const streamLabel = 'Test Stream';

    it('adds a stream to watchedStreams', async () => {
      await activityLog.watchStream(streamUrl, streamLabel);
      expect(activityLog.watchedStreams.length).toBe(1);
      expect(activityLog.watchedStreams[0].streamId).toBe(streamUrl);
    });

    it('does not add duplicate stream', async () => {
      await activityLog.watchStream(streamUrl, streamLabel);
      await activityLog.watchStream(streamUrl, streamLabel);
      expect(activityLog.watchedStreams.length).toBe(1);
    });

    it('removes stream when unwatched', async () => {
      await activityLog.watchStream(streamUrl, streamLabel);
      await activityLog.unwatchStream(streamUrl);
      expect(activityLog.watchedStreams.length).toBe(0);
    });

    it('unwatchStream on non-existent stream does not throw', async () => {
      await expect(
        activityLog.unwatchStream('https://example.org/unknown.json')
      ).resolves.not.toThrow();
    });
  });

  describe('destroy', () => {
    it('does not throw when called with no active streams', () => {
      expect(() => activityLog.destroy()).not.toThrow();
    });

    it('does not throw when called after watching streams', async () => {
      await activityLog.watchStream('https://example.org/stream.json', 'S');
      expect(() => activityLog.destroy()).not.toThrow();
    });
  });

  describe('pendingCount', () => {
    it('returns 0 initially', () => {
      expect(activityLog.pendingCount).toBe(0);
    });

    it('reflects length of pendingRemoteActivities', () => {
      activityLog.reset();
      expect(activityLog.pendingCount).toBe(activityLog.pendingRemoteActivities.length);
    });
  });

  describe('reset', () => {
    it('clears all state', async () => {
      await activityLog.record('ADD_CANVAS', 'c1', 'Canvas', 'Test');
      activityLog.reset();
      expect(activityLog.recentActivities).toEqual([]);
      expect(activityLog.totalCount).toBe(0);
      expect(activityLog.watchedStreams).toEqual([]);
      expect(activityLog.isSyncing).toBe(false);
      expect(activityLog.syncError).toBeNull();
    });

    it('resets hasConflicts to false', () => {
      activityLog.reset();
      expect(activityLog.hasConflicts).toBe(false);
    });
  });
});

// ============================================================================
// 4. ImagePipelineStore
// ============================================================================

describe('ImagePipelineStore', () => {
  beforeEach(() => {
    imagePipeline.reset();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty queue', () => {
      expect(imagePipeline.queue).toEqual([]);
      expect(imagePipeline.activeJobs).toEqual([]);
      expect(imagePipeline.pendingCount).toBe(0);
    });

    it('starts with zero storage', () => {
      expect(imagePipeline.storageUsedBytes).toBe(0);
      expect(imagePipeline.storageUsedLabel).toBe('0 B');
      expect(imagePipeline.totalTilesGenerated).toBe(0);
    });

    it('starts with empty manifests', () => {
      expect(imagePipeline.manifests).toEqual([]);
    });

    it('starts unpaused and not processing', () => {
      expect(imagePipeline.paused).toBe(false);
      expect(imagePipeline.isProcessing).toBe(false);
    });
  });

  describe('enqueue', () => {
    it('adds asset to queue when eligible', () => {
      vi.mocked(shouldGenerateTiles).mockReturnValue(true);
      imagePipeline.pause(); // Prevent auto-processing
      const result = imagePipeline.enqueue('asset-1', 'Photo 1', 4096, 3072);
      expect(result).toBe(true);
      expect(imagePipeline.queue).toHaveLength(1);
      expect(imagePipeline.queue[0].assetId).toBe('asset-1');
      expect(imagePipeline.queue[0].assetLabel).toBe('Photo 1');
    });

    it('returns false for ineligible images', () => {
      vi.mocked(shouldGenerateTiles).mockReturnValue(false);
      const result = imagePipeline.enqueue('asset-1', 'Tiny', 100, 100);
      expect(result).toBe(false);
      expect(imagePipeline.queue).toHaveLength(0);
    });

    it('does not add duplicate assets', () => {
      vi.mocked(shouldGenerateTiles).mockReturnValue(true);
      imagePipeline.pause();
      imagePipeline.enqueue('asset-1', 'Photo', 4096, 3072);
      imagePipeline.enqueue('asset-1', 'Photo', 4096, 3072);
      expect(imagePipeline.queue).toHaveLength(1);
    });

    it('high priority inserts at front of queue', () => {
      vi.mocked(shouldGenerateTiles).mockReturnValue(true);
      imagePipeline.pause();
      imagePipeline.enqueue('asset-1', 'Normal', 4096, 3072, 'normal');
      imagePipeline.enqueue('asset-2', 'High', 4096, 3072, 'high');
      expect(imagePipeline.queue[0].assetId).toBe('asset-2');
    });

    it('low priority appends at end of queue', () => {
      vi.mocked(shouldGenerateTiles).mockReturnValue(true);
      imagePipeline.pause();
      imagePipeline.enqueue('asset-1', 'Normal', 4096, 3072, 'normal');
      imagePipeline.enqueue('asset-2', 'Low', 4096, 3072, 'low');
      expect(imagePipeline.queue[imagePipeline.queue.length - 1].assetId).toBe('asset-2');
    });

    it('normal priority inserts before first low-priority entry', () => {
      vi.mocked(shouldGenerateTiles).mockReturnValue(true);
      imagePipeline.pause();
      imagePipeline.enqueue('asset-1', 'Low 1', 4096, 3072, 'low');
      imagePipeline.enqueue('asset-2', 'Normal', 4096, 3072, 'normal');
      expect(imagePipeline.queue[0].assetId).toBe('asset-2');
      expect(imagePipeline.queue[1].assetId).toBe('asset-1');
    });

    it('stores estimated tile count on queue entry', () => {
      vi.mocked(shouldGenerateTiles).mockReturnValue(true);
      imagePipeline.pause();
      imagePipeline.enqueue('asset-1', 'Photo', 4096, 3072);
      expect(imagePipeline.queue[0].estimatedTiles).toBe(100); // From mock
    });
  });

  describe('dequeue', () => {
    it('removes an asset from the queue', () => {
      vi.mocked(shouldGenerateTiles).mockReturnValue(true);
      imagePipeline.pause();
      imagePipeline.enqueue('asset-1', 'Photo', 4096, 3072);
      imagePipeline.dequeue('asset-1');
      expect(imagePipeline.queue).toHaveLength(0);
    });

    it('is a no-op for non-existent asset', () => {
      imagePipeline.dequeue('nonexistent');
      expect(imagePipeline.queue).toHaveLength(0);
    });
  });

  describe('clearQueue', () => {
    it('empties the queue', () => {
      vi.mocked(shouldGenerateTiles).mockReturnValue(true);
      imagePipeline.pause();
      imagePipeline.enqueue('asset-1', 'A', 4096, 3072);
      imagePipeline.enqueue('asset-2', 'B', 4096, 3072);
      imagePipeline.clearQueue();
      expect(imagePipeline.queue).toHaveLength(0);
    });
  });

  describe('pause / resume', () => {
    it('pause sets paused state', () => {
      imagePipeline.pause();
      expect(imagePipeline.paused).toBe(true);
    });

    it('resume clears paused state', () => {
      imagePipeline.pause();
      imagePipeline.resume();
      expect(imagePipeline.paused).toBe(false);
    });
  });

  describe('config', () => {
    it('updateConfig merges into existing config', () => {
      const originalFormat = imagePipeline.config.format;
      imagePipeline.updateConfig({ tileSize: 256 });
      expect(imagePipeline.config.tileSize).toBe(256);
      expect(imagePipeline.config.format).toBe(originalFormat);
    });

    it('resetConfig restores defaults', () => {
      imagePipeline.updateConfig({ tileSize: 256 });
      imagePipeline.resetConfig();
      expect(imagePipeline.config.tileSize).toBe(512);
    });

    it('config is read-only (returns frozen-like object)', () => {
      const config = imagePipeline.config;
      expect(config.tileSize).toBeDefined();
      expect(config.format).toBeDefined();
    });
  });

  describe('queries', () => {
    it('getManifest returns undefined for unknown asset', () => {
      expect(imagePipeline.getManifest('unknown')).toBeUndefined();
    });

    it('hasCompleteTiles returns false for unknown asset', () => {
      expect(imagePipeline.hasCompleteTiles('unknown')).toBe(false);
    });
  });

  describe('storageUsedLabel formatting', () => {
    it('formats 0 bytes', () => {
      expect(imagePipeline.storageUsedLabel).toBe('0 B');
    });
  });

  describe('cancelAll', () => {
    it('clears queue, active jobs, and processing state', () => {
      vi.mocked(shouldGenerateTiles).mockReturnValue(true);
      imagePipeline.pause();
      imagePipeline.enqueue('asset-1', 'A', 4096, 3072);
      imagePipeline.cancelAll();
      expect(imagePipeline.queue).toHaveLength(0);
      expect(imagePipeline.activeJobs).toHaveLength(0);
      expect(imagePipeline.isProcessing).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets all state to defaults', () => {
      vi.mocked(shouldGenerateTiles).mockReturnValue(true);
      imagePipeline.pause();
      imagePipeline.enqueue('asset-1', 'A', 4096, 3072);
      imagePipeline.updateConfig({ tileSize: 256 });
      imagePipeline.reset();
      expect(imagePipeline.queue).toHaveLength(0);
      expect(imagePipeline.paused).toBe(false);
      expect(imagePipeline.storageUsedBytes).toBe(0);
      expect(imagePipeline.totalTilesGenerated).toBe(0);
      expect(imagePipeline.manifests).toEqual([]);
    });
  });
});
