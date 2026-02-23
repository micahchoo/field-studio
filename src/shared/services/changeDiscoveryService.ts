/**
 * Change Discovery API 1.0 Service — Framework-agnostic
 *
 * Two responsibilities:
 * 1. **Generator**: Convert vault mutations into W3C Activity Stream entries
 *    stored in IndexedDB for federation export.
 * 2. **Consumer**: Poll remote OrderedCollection endpoints, detect changes,
 *    and surface sync conflicts.
 *
 * @see https://iiif.io/api/discovery/1.0/
 */

import type {
  Activity,
  ActivityType,
  OrderedCollection,
  OrderedCollectionPage,
  StreamProcessingState,
  SyncConflict,
  LocalActivity,
} from '@/src/shared/types/change-discovery';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTIVITIES_STORE = 'activities';
const STREAMS_STORE = 'sync-streams';
const DB_NAME = 'field-studio-discovery';
const DB_VERSION = 1;
const DEFAULT_POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
const PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Activity Generation (from vault mutations)
// ---------------------------------------------------------------------------

/**
 * Create a LocalActivity entry from a vault mutation.
 *
 * Call this from the vault subscription whenever an action is dispatched.
 * The activity will be stored in IndexedDB for the activity feed and
 * export as a W3C Activity Stream.
 */
export function createLocalActivity(
  actionType: string,
  entityId: string,
  entityType: string,
  summary: string,
  patch?: Record<string, { before: unknown; after: unknown }>,
): LocalActivity {
  return {
    id: `urn:field-studio:activity:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: actionTypeToActivityType(actionType),
    entityId,
    entityType,
    timestamp: new Date().toISOString(),
    summary,
    actionType,
    patch,
  };
}

/** Map vault action types to W3C Activity Stream types */
function actionTypeToActivityType(actionType: string): ActivityType {
  const map: Record<string, ActivityType> = {
    ADD_ENTITY: 'Create',
    ADD_CANVAS: 'Create',
    ADD_RANGE: 'Create',
    ADD_ANNOTATION: 'Create',
    ADD_COLLECTION: 'Create',

    UPDATE_LABEL: 'Update',
    UPDATE_METADATA: 'Update',
    UPDATE_SUMMARY: 'Update',
    UPDATE_RIGHTS: 'Update',
    UPDATE_BEHAVIOR: 'Update',
    UPDATE_NAV_DATE: 'Update',
    UPDATE_THUMBNAIL: 'Update',
    UPDATE_HOMEPAGE: 'Update',
    UPDATE_SEE_ALSO: 'Update',
    UPDATE_PROVIDER: 'Update',
    UPDATE_REQUIRED_STATEMENT: 'Update',
    UPDATE_START: 'Update',
    UPDATE_VIEWING_DIRECTION: 'Update',
    UPDATE_ANNOTATION_BODY: 'Update',
    UPDATE_ANNOTATION_TARGET: 'Update',

    MOVE_ENTITY: 'Move',
    REORDER_CHILDREN: 'Move',

    REMOVE_ENTITY: 'Delete',
    TRASH_ENTITY: 'Remove',
    EMPTY_TRASH: 'Delete',

    RESTORE_FROM_TRASH: 'Add',
  };
  return map[actionType] ?? 'Update';
}

// ---------------------------------------------------------------------------
// IndexedDB — Activity Storage
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ACTIVITIES_STORE)) {
        const store = db.createObjectStore(ACTIVITIES_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('entityId', 'entityId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STREAMS_STORE)) {
        db.createObjectStore(STREAMS_STORE, { keyPath: 'streamId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

/** Store a local activity in IndexedDB */
export async function storeActivity(activity: LocalActivity): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ACTIVITIES_STORE, 'readwrite');
    tx.objectStore(ACTIVITIES_STORE).put(activity);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Retrieve recent activities, newest first */
export async function getRecentActivities(
  limit = 50,
  beforeTimestamp?: string,
): Promise<LocalActivity[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ACTIVITIES_STORE, 'readonly');
    const index = tx.objectStore(ACTIVITIES_STORE).index('timestamp');
    const results: LocalActivity[] = [];

    // Walk backward from the end (newest first)
    const range = beforeTimestamp
      ? IDBKeyRange.upperBound(beforeTimestamp, true)
      : undefined;
    const cursor = index.openCursor(range, 'prev');

    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c && results.length < limit) {
        results.push(c.value);
        c.continue();
      } else {
        resolve(results);
      }
    };
    cursor.onerror = () => reject(cursor.error);
  });
}

/** Get activities for a specific entity */
export async function getActivitiesForEntity(
  entityId: string,
): Promise<LocalActivity[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ACTIVITIES_STORE, 'readonly');
    const index = tx.objectStore(ACTIVITIES_STORE).index('entityId');
    const req = index.getAll(entityId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Get total activity count */
export async function getActivityCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ACTIVITIES_STORE, 'readonly');
    const req = tx.objectStore(ACTIVITIES_STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Export as W3C Activity Stream
// ---------------------------------------------------------------------------

/**
 * Export local activities as a W3C Activity Stream OrderedCollection.
 * Pages are generated on the fly from IndexedDB (oldest first within pages).
 */
export async function exportActivityStream(
  baseUrl: string,
): Promise<OrderedCollection> {
  const total = await getActivityCount();
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return {
    '@context': [
      'http://iiif.io/api/discovery/1/context.json',
      'https://www.w3.org/ns/activitystreams',
    ],
    id: `${baseUrl}/activity/collection`,
    type: 'OrderedCollection',
    totalItems: total,
    last: {
      id: `${baseUrl}/activity/page/${totalPages - 1}`,
      type: 'OrderedCollectionPage',
    },
    first: {
      id: `${baseUrl}/activity/page/0`,
      type: 'OrderedCollectionPage',
    },
  };
}

/** Export a single page of the activity stream */
export async function exportActivityPage(
  baseUrl: string,
  pageIndex: number,
): Promise<OrderedCollectionPage> {
  const db = await openDB();
  const activities = await new Promise<LocalActivity[]>((resolve, reject) => {
    const tx = db.transaction(ACTIVITIES_STORE, 'readonly');
    const index = tx.objectStore(ACTIVITIES_STORE).index('timestamp');
    const results: LocalActivity[] = [];
    let skipped = 0;
    const skipCount = pageIndex * PAGE_SIZE;

    const cursor = index.openCursor(null, 'next');
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (!c) { resolve(results); return; }
      if (skipped < skipCount) { skipped++; c.continue(); return; }
      if (results.length < PAGE_SIZE) { results.push(c.value); c.continue(); }
      else resolve(results);
    };
    cursor.onerror = () => reject(cursor.error);
  });

  const totalPages = Math.ceil((await getActivityCount()) / PAGE_SIZE);
  const page: OrderedCollectionPage = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${baseUrl}/activity/page/${pageIndex}`,
    type: 'OrderedCollectionPage',
    partOf: { id: `${baseUrl}/activity/collection`, type: 'OrderedCollection' },
    orderedItems: activities.map(localToW3CActivity),
  };

  if (pageIndex > 0) {
    page.prev = { id: `${baseUrl}/activity/page/${pageIndex - 1}`, type: 'OrderedCollectionPage' };
  }
  if (pageIndex < totalPages - 1) {
    page.next = { id: `${baseUrl}/activity/page/${pageIndex + 1}`, type: 'OrderedCollectionPage' };
  }

  return page;
}

/** Convert a LocalActivity to a W3C Activity */
function localToW3CActivity(local: LocalActivity): Activity {
  return {
    type: local.type,
    object: {
      id: local.entityId,
      type: local.entityType,
    },
    endTime: local.timestamp,
    summary: local.summary,
    actor: {
      id: 'urn:field-studio:user',
      type: 'Application',
      name: 'Field Studio',
    },
  };
}

// ---------------------------------------------------------------------------
// Remote Stream Consumer
// ---------------------------------------------------------------------------

/**
 * Fetch and process a remote OrderedCollection.
 * Follows the "last page first, walk backward" algorithm from the spec.
 *
 * Returns new activities since `lastProcessedTime`.
 */
export async function pollRemoteStream(
  collectionUrl: string,
  lastProcessedTime?: string,
): Promise<{ activities: Activity[]; lastPage: string; lastTime: string }> {
  // Step 1: Fetch the OrderedCollection
  const collResp = await fetch(collectionUrl, {
    headers: { Accept: 'application/json' },
  });
  if (!collResp.ok) throw new Error(`Failed to fetch stream: ${collResp.status}`);
  const collection: OrderedCollection = await collResp.json();

  // Step 2: Start from the last page and work backward
  const newActivities: Activity[] = [];
  let currentPageUrl: string | undefined = collection.last.id;
  let latestTime = lastProcessedTime ?? '';

  while (currentPageUrl) {
    const pageResp = await fetch(currentPageUrl, {
      headers: { Accept: 'application/json' },
    });
    if (!pageResp.ok) break;
    const page: OrderedCollectionPage = await pageResp.json();

    // Process activities in reverse (newest first on the page)
    let foundOldActivity = false;
    for (let i = page.orderedItems.length - 1; i >= 0; i--) {
      const activity = page.orderedItems[i];
      if (lastProcessedTime && activity.endTime <= lastProcessedTime) {
        foundOldActivity = true;
        break;
      }
      newActivities.push(activity);
      if (activity.endTime > latestTime) latestTime = activity.endTime;
    }

    if (foundOldActivity) break;
    currentPageUrl = page.prev?.id;
  }

  // Reverse to chronological order (oldest first)
  newActivities.reverse();

  return {
    activities: newActivities,
    lastPage: currentPageUrl ?? collection.last.id,
    lastTime: latestTime,
  };
}

/**
 * Deduplicate activities per the spec's processing algorithm:
 * For each resource, only keep the most recent activity.
 */
export function deduplicateActivities(activities: Activity[]): Activity[] {
  const latest = new Map<string, Activity>();
  for (const activity of activities) {
    const key = activity.object.canonical ?? activity.object.id;
    const existing = latest.get(key);
    if (!existing || activity.endTime > existing.endTime) {
      latest.set(key, activity);
    }
  }
  return [...latest.values()].sort((a, b) => a.endTime.localeCompare(b.endTime));
}

// ---------------------------------------------------------------------------
// Stream Processing State Persistence
// ---------------------------------------------------------------------------

/** Save stream processing state to IndexedDB */
export async function saveStreamState(state: StreamProcessingState): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STREAMS_STORE, 'readwrite');
    tx.objectStore(STREAMS_STORE).put(state);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Load all tracked stream states */
export async function loadStreamStates(): Promise<StreamProcessingState[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STREAMS_STORE, 'readonly');
    const req = tx.objectStore(STREAMS_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Remove a tracked stream */
export async function removeStreamState(streamId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STREAMS_STORE, 'readwrite');
    tx.objectStore(STREAMS_STORE).delete(streamId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------------------------------------------------------------------------
// Conflict Detection
// ---------------------------------------------------------------------------

/**
 * Compare a remote activity against local state to detect conflicts.
 * Returns a SyncConflict if the same field was modified both locally and remotely.
 */
export function detectConflict(
  remoteActivity: Activity,
  localActivities: LocalActivity[],
): SyncConflict | null {
  // Find local activities on the same entity since the remote change
  const localChanges = localActivities.filter(
    (la) =>
      la.entityId === remoteActivity.object.id &&
      la.timestamp > (remoteActivity.endTime ?? '') &&
      la.type === 'Update',
  );

  if (localChanges.length === 0) return null;

  // If we have patches, compare fields
  for (const localChange of localChanges) {
    if (localChange.patch) {
      for (const field of Object.keys(localChange.patch)) {
        return {
          id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          resourceId: remoteActivity.object.id,
          resourceType: remoteActivity.object.type,
          field,
          localValue: localChange.patch[field].after,
          remoteValue: undefined, // Caller fills from the fetched remote resource
          localTimestamp: localChange.timestamp,
          remoteTimestamp: remoteActivity.endTime,
        };
      }
    }
  }

  // Generic conflict — we know both sides modified this entity
  return {
    id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    resourceId: remoteActivity.object.id,
    resourceType: remoteActivity.object.type,
    field: '*',
    localValue: undefined,
    remoteValue: undefined,
    localTimestamp: localChanges[0].timestamp,
    remoteTimestamp: remoteActivity.endTime,
  };
}

// ---------------------------------------------------------------------------
// Stream Management Helper
// ---------------------------------------------------------------------------

/** Create initial processing state for a new remote stream */
export function createStreamState(
  streamId: string,
  label: string,
): StreamProcessingState {
  return {
    streamId,
    label,
    lastProcessedTime: '',
    lastPageId: '',
    totalProcessed: 0,
    status: 'idle',
    lastCheckedAt: new Date().toISOString(),
    pollInterval: DEFAULT_POLL_INTERVAL,
  };
}
