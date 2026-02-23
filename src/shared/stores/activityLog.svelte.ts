/**
 * Activity Log Store — Svelte 5 Runes Interface
 *
 * Reactive wrapper around changeDiscoveryService for Change Discovery API 1.0.
 * Manages the local activity feed, remote stream tracking, and sync conflicts.
 *
 * Usage:
 *   import { activityLog } from '@/src/shared/stores/activityLog.svelte';
 *
 *   activityLog.recentActivities     // reactive list of recent changes
 *   activityLog.watchedStreams        // reactive list of tracked remote streams
 *   activityLog.conflicts             // reactive list of unresolved sync conflicts
 *   activityLog.record(action, ...)   // log a vault mutation
 */

import type {
  LocalActivity,
  Activity,
  StreamProcessingState,
  SyncConflict,
} from '@/src/shared/types/change-discovery';
import {
  createLocalActivity,
  storeActivity,
  getRecentActivities,
  pollRemoteStream,
  deduplicateActivities,
  detectConflict,
  getActivitiesForEntity,
  saveStreamState,
  loadStreamStates,
  removeStreamState,
  createStreamState,
} from '@/src/shared/services/changeDiscoveryService';

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

class ActivityLogStore {
  // ── Local activity feed ──
  #recentActivities = $state<LocalActivity[]>([]);
  #totalCount = $state(0);

  // ── Remote stream tracking ──
  #watchedStreams = $state<StreamProcessingState[]>([]);
  #pendingRemoteActivities = $state<Activity[]>([]);

  // ── Sync conflicts ──
  #conflicts = $state<SyncConflict[]>([]);

  // ── Status ──
  #isRecording = $state(true);
  #isSyncing = $state(false);
  #syncError = $state<string | null>(null);

  // ── Internal ──
  #pollTimers = new Map<string, ReturnType<typeof setInterval>>();
  #initialized = false;

  // ──────────────────────────────────────────────
  // Getters — reactive reads
  // ──────────────────────────────────────────────

  /** Recent local activities (newest first, max 50) */
  get recentActivities(): readonly LocalActivity[] { return this.#recentActivities; }

  /** Total number of activities ever recorded */
  get totalCount(): number { return this.#totalCount; }

  /** Remote streams being watched for sync */
  get watchedStreams(): readonly StreamProcessingState[] { return this.#watchedStreams; }

  /** Remote activities that haven't been applied yet */
  get pendingRemoteActivities(): readonly Activity[] { return this.#pendingRemoteActivities; }

  /** Number of pending remote changes */
  get pendingCount(): number { return this.#pendingRemoteActivities.length; }

  /** Unresolved sync conflicts */
  get conflicts(): readonly SyncConflict[] { return this.#conflicts; }

  /** Whether recording is enabled */
  get isRecording(): boolean { return this.#isRecording; }

  /** Whether a remote sync is in progress */
  get isSyncing(): boolean { return this.#isSyncing; }

  /** Last sync error */
  get syncError(): string | null { return this.#syncError; }

  /** Whether any streams have unresolved conflicts */
  get hasConflicts(): boolean { return this.#conflicts.length > 0; }

  // ──────────────────────────────────────────────
  // Initialization
  // ──────────────────────────────────────────────

  /** Load persisted state from IndexedDB */
  async initialize(): Promise<void> {
    if (this.#initialized) return;
    this.#initialized = true;

    try {
      const [activities, streams] = await Promise.all([
        getRecentActivities(50),
        loadStreamStates(),
      ]);
      this.#recentActivities = activities;
      this.#watchedStreams = streams;

      // Resume polling for active streams
      for (const stream of streams) {
        if (stream.status !== 'error') {
          this.#startPolling(stream);
        }
      }
    } catch {
      // IndexedDB unavailable — operate in memory only
    }
  }

  // ──────────────────────────────────────────────
  // Local Activity Recording
  // ──────────────────────────────────────────────

  /**
   * Record a vault mutation as a local activity.
   * Call this from the vault subscription.
   */
  async record(
    actionType: string,
    entityId: string,
    entityType: string,
    summary: string,
    patch?: Record<string, { before: unknown; after: unknown }>,
  ): Promise<void> {
    if (!this.#isRecording) return;

    const activity = createLocalActivity(actionType, entityId, entityType, summary, patch);

    // Update in-memory feed (prepend, cap at 50)
    this.#recentActivities = [activity, ...this.#recentActivities.slice(0, 49)];
    this.#totalCount++;

    // Persist to IndexedDB (fire-and-forget)
    storeActivity(activity).catch(() => {});
  }

  /** Toggle recording on/off */
  setRecording(enabled: boolean): void {
    this.#isRecording = enabled;
  }

  // ──────────────────────────────────────────────
  // Remote Stream Management
  // ──────────────────────────────────────────────

  /** Start watching a remote OrderedCollection for changes */
  async watchStream(streamUrl: string, label: string): Promise<void> {
    // Check if already watched
    if (this.#watchedStreams.some((s) => s.streamId === streamUrl)) return;

    const state = createStreamState(streamUrl, label);
    this.#watchedStreams = [...this.#watchedStreams, state];

    await saveStreamState(state);
    this.#startPolling(state);
  }

  /** Stop watching a remote stream */
  async unwatchStream(streamId: string): Promise<void> {
    this.#stopPolling(streamId);
    this.#watchedStreams = this.#watchedStreams.filter((s) => s.streamId !== streamId);
    await removeStreamState(streamId);
  }

  /** Manually trigger a sync for a specific stream */
  async syncStream(streamId: string): Promise<void> {
    const stream = this.#watchedStreams.find((s) => s.streamId === streamId);
    if (!stream) return;
    await this.#pollStream(stream);
  }

  /** Sync all watched streams */
  async syncAll(): Promise<void> {
    await Promise.allSettled(
      this.#watchedStreams.map((s) => this.#pollStream(s)),
    );
  }

  // ──────────────────────────────────────────────
  // Conflict Resolution
  // ──────────────────────────────────────────────

  /** Resolve a conflict by choosing local, remote, or merged value */
  resolveConflict(
    conflictId: string,
    resolution: 'local' | 'remote' | 'merged',
    mergedValue?: unknown,
  ): void {
    this.#conflicts = this.#conflicts.map((c) =>
      c.id === conflictId
        ? {
            ...c,
            resolution,
            resolvedValue: resolution === 'merged' ? mergedValue : undefined,
          }
        : c,
    );
  }

  /** Remove a resolved conflict */
  dismissConflict(conflictId: string): void {
    this.#conflicts = this.#conflicts.filter((c) => c.id !== conflictId);
  }

  /** Accept all remote changes (resolve all conflicts as 'remote') */
  acceptAllRemote(): void {
    this.#conflicts = this.#conflicts.map((c) => ({
      ...c,
      resolution: 'remote' as const,
    }));
  }

  /** Keep all local changes (resolve all conflicts as 'local') */
  keepAllLocal(): void {
    this.#conflicts = this.#conflicts.map((c) => ({
      ...c,
      resolution: 'local' as const,
    }));
  }

  // ──────────────────────────────────────────────
  // Internal — Polling
  // ──────────────────────────────────────────────

  #startPolling(stream: StreamProcessingState): void {
    if (this.#pollTimers.has(stream.streamId)) return;

    const timer = setInterval(
      () => this.#pollStream(stream),
      stream.pollInterval,
    );
    this.#pollTimers.set(stream.streamId, timer);
  }

  #stopPolling(streamId: string): void {
    const timer = this.#pollTimers.get(streamId);
    if (timer) {
      clearInterval(timer);
      this.#pollTimers.delete(streamId);
    }
  }

  async #pollStream(stream: StreamProcessingState): Promise<void> {
    this.#isSyncing = true;
    this.#syncError = null;

    this.#updateStreamStatus(stream.streamId, 'polling');

    try {
      const { activities, lastPage, lastTime } = await pollRemoteStream(
        stream.streamId,
        stream.lastProcessedTime || undefined,
      );

      if (activities.length === 0) {
        this.#updateStreamStatus(stream.streamId, 'idle');
        return;
      }

      // Deduplicate
      const deduped = deduplicateActivities(activities);

      // Check for conflicts against local activities
      this.#updateStreamStatus(stream.streamId, 'processing');
      const newConflicts: SyncConflict[] = [];

      for (const activity of deduped) {
        if (activity.type === 'Update') {
          const localActivities = await getActivitiesForEntity(activity.object.id);
          const conflict = detectConflict(activity, localActivities);
          if (conflict) newConflicts.push(conflict);
        }
      }

      // Update pending activities
      this.#pendingRemoteActivities = [
        ...this.#pendingRemoteActivities,
        ...deduped,
      ];

      // Surface conflicts
      if (newConflicts.length > 0) {
        this.#conflicts = [...this.#conflicts, ...newConflicts];
        this.#updateStreamStatus(stream.streamId, 'conflict');
      } else {
        this.#updateStreamStatus(stream.streamId, 'idle');
      }

      // Update stream processing state
      const updatedStream: StreamProcessingState = {
        ...stream,
        lastProcessedTime: lastTime,
        lastPageId: lastPage,
        totalProcessed: stream.totalProcessed + deduped.length,
        lastCheckedAt: new Date().toISOString(),
      };

      this.#watchedStreams = this.#watchedStreams.map((s) =>
        s.streamId === stream.streamId ? updatedStream : s,
      );
      await saveStreamState(updatedStream);
    } catch (err) {
      this.#syncError = err instanceof Error ? err.message : 'Sync failed';
      this.#updateStreamStatus(stream.streamId, 'error');
    } finally {
      this.#isSyncing = false;
    }
  }

  #updateStreamStatus(streamId: string, status: StreamProcessingState['status']): void {
    this.#watchedStreams = this.#watchedStreams.map((s) =>
      s.streamId === streamId ? { ...s, status } : s,
    );
  }

  // ──────────────────────────────────────────────
  // Cleanup
  // ──────────────────────────────────────────────

  /** Stop all polling and clear in-memory state */
  destroy(): void {
    for (const timer of this.#pollTimers.values()) {
      clearInterval(timer);
    }
    this.#pollTimers.clear();
  }

  /** Reset all state */
  reset(): void {
    this.destroy();
    this.#recentActivities = [];
    this.#totalCount = 0;
    this.#watchedStreams = [];
    this.#pendingRemoteActivities = [];
    this.#conflicts = [];
    this.#isSyncing = false;
    this.#syncError = null;
    this.#initialized = false;
  }
}

/** Global singleton */
export const activityLog = new ActivityLogStore();
