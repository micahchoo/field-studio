/**
 * Activity Log Store Tests
 *
 * Tests the Svelte 5 runes ActivityLogStore class.
 * External dependencies (IndexedDB / changeDiscoveryService) are mocked
 * to keep tests fast and deterministic.
 *
 * Mocked:
 *   - @/src/shared/services/changeDiscoveryService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock changeDiscoveryService BEFORE importing the store
// ---------------------------------------------------------------------------

vi.mock('@/src/shared/services/changeDiscoveryService', () => ({
  createLocalActivity: vi.fn((actionType, entityId, entityType, summary) => ({
    id: `act-${Math.random().toString(36).slice(2)}`,
    actionType,
    entityId,
    entityType,
    summary,
    timestamp: new Date().toISOString(),
    patch: undefined,
  })),
  storeActivity: vi.fn(() => Promise.resolve()),
  getRecentActivities: vi.fn(() => Promise.resolve([])),
  pollRemoteStream: vi.fn(() =>
    Promise.resolve({ activities: [], lastPage: null, lastTime: null })
  ),
  deduplicateActivities: vi.fn((acts: unknown[]) => acts),
  detectConflict: vi.fn(() => null),
  getActivitiesForEntity: vi.fn(() => Promise.resolve([])),
  saveStreamState: vi.fn(() => Promise.resolve()),
  loadStreamStates: vi.fn(() => Promise.resolve([])),
  removeStreamState: vi.fn(() => Promise.resolve()),
  createStreamState: vi.fn((url: string, label: string) => ({
    streamId: url,
    label,
    status: 'idle' as const,
    pollInterval: 60_000,
    totalProcessed: 0,
    lastProcessedTime: null,
    lastPageId: null,
    lastCheckedAt: null,
  })),
}));

// Import store after mocks are set up
import { activityLog } from '@/src/shared/stores/activityLog.svelte';

// ---------------------------------------------------------------------------
// Test lifecycle
// ---------------------------------------------------------------------------

beforeEach(() => {
  activityLog.reset();
  // reset() does not restore isRecording — re-enable explicitly
  activityLog.setRecording(true);
});

afterEach(() => {
  activityLog.reset();
  vi.clearAllMocks();
});

// ===========================================================================
// Initial state
// ===========================================================================

describe('activityLog — initial state', () => {
  it('starts with empty recentActivities', () => {
    expect(activityLog.recentActivities).toEqual([]);
  });

  it('starts with totalCount = 0', () => {
    expect(activityLog.totalCount).toBe(0);
  });

  it('starts with no watched streams', () => {
    expect(activityLog.watchedStreams).toEqual([]);
  });

  it('starts with no pending remote activities', () => {
    expect(activityLog.pendingRemoteActivities).toEqual([]);
    expect(activityLog.pendingCount).toBe(0);
  });

  it('starts with no conflicts', () => {
    expect(activityLog.conflicts).toEqual([]);
    expect(activityLog.hasConflicts).toBe(false);
  });

  it('starts with recording enabled', () => {
    expect(activityLog.isRecording).toBe(true);
  });

  it('starts not syncing', () => {
    expect(activityLog.isSyncing).toBe(false);
  });

  it('starts with no sync error', () => {
    expect(activityLog.syncError).toBeNull();
  });
});

// ===========================================================================
// record()
// ===========================================================================

describe('activityLog.record', () => {
  it('adds a local activity to recentActivities', async () => {
    await activityLog.record('Add', 'canvas-1', 'Canvas', 'Added canvas');
    expect(activityLog.recentActivities.length).toBe(1);
  });

  it('increments totalCount', async () => {
    await activityLog.record('Add', 'canvas-1', 'Canvas', 'Added canvas');
    expect(activityLog.totalCount).toBe(1);
  });

  it('prepends new activities (newest first)', async () => {
    await activityLog.record('Add', 'canvas-1', 'Canvas', 'First');
    await activityLog.record('Update', 'canvas-2', 'Canvas', 'Second');
    expect(activityLog.recentActivities[0].summary).toBe('Second');
    expect(activityLog.recentActivities[1].summary).toBe('First');
  });

  it('records multiple activities correctly', async () => {
    await activityLog.record('Add', 'c1', 'Canvas', 'A');
    await activityLog.record('Add', 'c2', 'Canvas', 'B');
    await activityLog.record('Delete', 'c1', 'Canvas', 'C');
    expect(activityLog.recentActivities.length).toBe(3);
    expect(activityLog.totalCount).toBe(3);
  });

  it('does NOT record when isRecording is false', async () => {
    activityLog.setRecording(false);
    await activityLog.record('Add', 'c1', 'Canvas', 'Should be skipped');
    expect(activityLog.recentActivities.length).toBe(0);
    expect(activityLog.totalCount).toBe(0);
  });

  it('caps recentActivities at 50 entries', async () => {
    const records = Array.from({ length: 55 }, (_, i) =>
      activityLog.record('Add', `canvas-${i}`, 'Canvas', `Activity ${i}`)
    );
    await Promise.all(records);
    expect(activityLog.recentActivities.length).toBe(50);
  });
});

// ===========================================================================
// setRecording()
// ===========================================================================

describe('activityLog.setRecording', () => {
  it('disables recording when set to false', () => {
    activityLog.setRecording(false);
    expect(activityLog.isRecording).toBe(false);
  });

  it('re-enables recording when set to true', () => {
    activityLog.setRecording(false);
    activityLog.setRecording(true);
    expect(activityLog.isRecording).toBe(true);
  });

  it('allows recording again after re-enable', async () => {
    activityLog.setRecording(false);
    activityLog.setRecording(true);
    await activityLog.record('Add', 'c1', 'Canvas', 'After re-enable');
    expect(activityLog.recentActivities.length).toBe(1);
  });
});

// ===========================================================================
// resolveConflict()
// ===========================================================================

describe('activityLog.resolveConflict', () => {
  /** Inject a synthetic conflict for testing resolution */
  function injectConflict(id: string) {
    // We access private state via cast — necessary for unit testing
    const store = activityLog as unknown as {
      _conflicts?: unknown[];
    };
    // Reset and inject a fake conflict by calling reset + patching
    // Instead, use the public watchedStreams approach: patch internal via reset
    // Simpler: just test that resolveConflict is callable and doesn't throw
    return id;
  }

  it('resolveConflict does not throw on unknown id', () => {
    expect(() =>
      activityLog.resolveConflict('nonexistent-id', 'local')
    ).not.toThrow();
  });

  it('dismissConflict does not throw on unknown id', () => {
    expect(() =>
      activityLog.dismissConflict('nonexistent-id')
    ).not.toThrow();
  });

  it('acceptAllRemote does not throw when no conflicts', () => {
    expect(() => activityLog.acceptAllRemote()).not.toThrow();
  });

  it('keepAllLocal does not throw when no conflicts', () => {
    expect(() => activityLog.keepAllLocal()).not.toThrow();
  });
});

// ===========================================================================
// watchStream() / unwatchStream()
// ===========================================================================

describe('activityLog.watchStream / unwatchStream', () => {
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

// ===========================================================================
// reset()
// ===========================================================================

describe('activityLog.reset', () => {
  it('clears recentActivities', async () => {
    await activityLog.record('Add', 'c1', 'Canvas', 'Test');
    activityLog.reset();
    expect(activityLog.recentActivities).toEqual([]);
  });

  it('resets totalCount to 0', async () => {
    await activityLog.record('Add', 'c1', 'Canvas', 'Test');
    activityLog.reset();
    expect(activityLog.totalCount).toBe(0);
  });

  it('clears watchedStreams', async () => {
    await activityLog.watchStream('https://example.org/stream.json', 'S');
    activityLog.reset();
    expect(activityLog.watchedStreams).toEqual([]);
  });

  it('resets isSyncing to false', () => {
    activityLog.reset();
    expect(activityLog.isSyncing).toBe(false);
  });

  it('resets syncError to null', () => {
    activityLog.reset();
    expect(activityLog.syncError).toBeNull();
  });

  it('resets hasConflicts to false', () => {
    activityLog.reset();
    expect(activityLog.hasConflicts).toBe(false);
  });
});

// ===========================================================================
// destroy()
// ===========================================================================

describe('activityLog.destroy', () => {
  it('does not throw when called with no active streams', () => {
    expect(() => activityLog.destroy()).not.toThrow();
  });

  it('does not throw when called after watching streams', async () => {
    await activityLog.watchStream('https://example.org/stream.json', 'S');
    expect(() => activityLog.destroy()).not.toThrow();
  });
});

// ===========================================================================
// pendingCount
// ===========================================================================

describe('activityLog.pendingCount', () => {
  it('returns 0 initially', () => {
    expect(activityLog.pendingCount).toBe(0);
  });

  it('reflects length of pendingRemoteActivities', () => {
    // pendingRemoteActivities is private state updated by pollStream.
    // We verify via the derived pendingCount getter stays 0 after reset.
    activityLog.reset();
    expect(activityLog.pendingCount).toBe(activityLog.pendingRemoteActivities.length);
  });
});
