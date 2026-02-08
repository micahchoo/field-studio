/**
 * Activity Stream Service - IIIF Change Discovery API 1.0
 *
 * Tracks create/update/delete events for IIIF resources using the
 * Activity Streams 2.0 format as specified by IIIF Change Discovery API.
 *
 * Features:
 * - Append-only activity log for sync support
 * - Create, Update, Delete, Move activity types
 * - Multi-device/researcher synchronization
 * - Export as IIIF Change Discovery collection
 *
 * @see https://iiif.io/api/discovery/1.0/
 * @see ARCHITECTURE_INSPIRATION.md - "Change Discovery API" pattern
 */

import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { IIIF_SPEC } from '../constants';

// ============================================================================
// Types (Activity Streams 2.0 / IIIF Change Discovery 1.0)
// ============================================================================

export type ActivityType = 'Create' | 'Update' | 'Delete' | 'Move' | 'Add' | 'Remove';

export interface Activity {
  /** Activity Streams context */
  '@context': 'https://www.w3.org/ns/activitystreams';
  /** Unique activity ID */
  id: string;
  /** Activity type */
  type: ActivityType;
  /** ISO 8601 timestamp */
  endTime: string;
  /** The IIIF resource that was affected */
  object: ActivityObject;
  /** Actor who performed the activity (optional) */
  actor?: ActivityActor;
  /** Summary of the change */
  summary?: string;
  /** For Move activities - the origin */
  origin?: { id: string; type: string };
  /** For Move activities - the target */
  target?: { id: string; type: string };
}

export interface ActivityObject {
  /** Resource ID */
  id: string;
  /** Resource type (Manifest, Canvas, Collection, etc.) */
  type: string;
  /** Canonical URL where resource can be found */
  canonical?: string;
  /** When the resource itself was modified */
  modified?: string;
  /** For deleted resources, when they were deleted */
  deleted?: string;
}

export interface ActivityActor {
  /** Actor ID (user ID, device ID, etc.) */
  id: string;
  /** Actor type */
  type: 'Person' | 'Application' | 'Service';
  /** Human-readable name */
  name?: string;
}

export interface OrderedCollection {
  '@context': [
    'https://www.w3.org/ns/activitystreams',
    'http://iiif.io/api/discovery/1/context.json'
  ];
  id: string;
  type: 'OrderedCollection';
  totalItems: number;
  first?: { id: string; type: 'OrderedCollectionPage' };
  last?: { id: string; type: 'OrderedCollectionPage' };
  partOf?: { id: string; type: 'OrderedCollection' };
}

export interface OrderedCollectionPage {
  '@context': [
    'https://www.w3.org/ns/activitystreams',
    'http://iiif.io/api/discovery/1/context.json'
  ];
  id: string;
  type: 'OrderedCollectionPage';
  partOf: { id: string; type: 'OrderedCollection' };
  orderedItems: Activity[];
  next?: { id: string; type: 'OrderedCollectionPage' };
  prev?: { id: string; type: 'OrderedCollectionPage' };
  startIndex?: number;
}

// ============================================================================
// Database Schema
// ============================================================================

const DB_NAME = 'biiif-activity-db';
const DB_VERSION = 2; // Bumped for archive store
const PAGE_SIZE = 100;

/**
 * Maximum number of activities to keep in the main activity log
 * When exceeded, oldest activities are rotated to the archive
 */
export const MAX_ACTIVITY_ENTRIES = 10000;

/**
 * Number of entries to keep in main log after rotation
 */
const MAIN_LOG_RETENTION_COUNT = 5000;

interface ActivityDB extends DBSchema {
  activities: {
    key: string; // activity ID
    value: Activity;
    indexes: {
      'by-time': string;       // endTime index for ordering
      'by-object': string;     // object.id index for filtering
      'by-type': ActivityType; // type index for filtering
    };
  };
  /**
   * Archived activities - moved here when main log exceeds MAX_ACTIVITY_ENTRIES
   * These are still accessible for historical queries but don't impact main log performance
   */
  archived: {
    key: string; // activity ID
    value: Activity;
    indexes: {
      'by-time': string;       // endTime index for ordering
      'by-object': string;     // object.id index for filtering
    };
  };
  metadata: {
    key: string;
    value: unknown;
  };
}

// ============================================================================
// Activity Stream Service
// ============================================================================

class ActivityStreamService {
  private dbPromise: Promise<IDBPDatabase<ActivityDB>>;
  private actor: ActivityActor | null = null;

  constructor() {
    this.dbPromise = openDB<ActivityDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('activities')) {
          const store = db.createObjectStore('activities');
          store.createIndex('by-time', 'endTime');
          store.createIndex('by-object', 'object.id');
          store.createIndex('by-type', 'type');
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata');
        }
        // Create archive store in version 2
        if (!db.objectStoreNames.contains('archived')) {
          const archiveStore = db.createObjectStore('archived');
          archiveStore.createIndex('by-time', 'endTime');
          archiveStore.createIndex('by-object', 'object.id');
        }
      }
    });

    // Initialize actor from stored device ID or generate new one
    this.initializeActor();
  }

  private async initializeActor(): Promise<void> {
    const db = await this.dbPromise;
    let deviceId = await db.get('metadata', 'deviceId') as string | undefined;

    if (!deviceId) {
      deviceId = `device-${Date.now()}-${crypto.randomUUID().slice(0, 9)}`;
      await db.put('metadata', deviceId, 'deviceId');
    }

    this.actor = {
      id: deviceId,
      type: 'Application',
      name: 'IIIF Field Archive Studio'
    };
  }

  /**
   * Set the current actor (user/device)
   */
  setActor(actor: ActivityActor): void {
    this.actor = actor;
  }

  /**
   * Generate a unique activity ID
   */
  private generateActivityId(): string {
    return `urn:uuid:${crypto.randomUUID()}`;
  }

  /**
   * Record a Create activity
   */
  async recordCreate(
    objectId: string,
    objectType: string,
    summary?: string
  ): Promise<Activity> {
    const activity: Activity = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: this.generateActivityId(),
      type: 'Create',
      endTime: new Date().toISOString(),
      object: {
        id: objectId,
        type: objectType,
        modified: new Date().toISOString()
      },
      actor: this.actor || undefined,
      summary: summary || `Created ${objectType}`
    };

    await this.saveActivity(activity);
    return activity;
  }

  /**
   * Record an Update activity
   */
  async recordUpdate(
    objectId: string,
    objectType: string,
    summary?: string
  ): Promise<Activity> {
    const activity: Activity = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: this.generateActivityId(),
      type: 'Update',
      endTime: new Date().toISOString(),
      object: {
        id: objectId,
        type: objectType,
        modified: new Date().toISOString()
      },
      actor: this.actor || undefined,
      summary: summary || `Updated ${objectType}`
    };

    await this.saveActivity(activity);
    return activity;
  }

  /**
   * Record a Delete activity
   */
  async recordDelete(
    objectId: string,
    objectType: string,
    summary?: string
  ): Promise<Activity> {
    const activity: Activity = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: this.generateActivityId(),
      type: 'Delete',
      endTime: new Date().toISOString(),
      object: {
        id: objectId,
        type: objectType,
        deleted: new Date().toISOString()
      },
      actor: this.actor || undefined,
      summary: summary || `Deleted ${objectType}`
    };

    await this.saveActivity(activity);
    return activity;
  }

  /**
   * Record a Move activity (e.g., reordering canvases)
   */
  async recordMove(
    objectId: string,
    objectType: string,
    originId: string,
    originType: string,
    targetId: string,
    targetType: string,
    summary?: string
  ): Promise<Activity> {
    const activity: Activity = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: this.generateActivityId(),
      type: 'Move',
      endTime: new Date().toISOString(),
      object: {
        id: objectId,
        type: objectType,
        modified: new Date().toISOString()
      },
      origin: { id: originId, type: originType },
      target: { id: targetId, type: targetType },
      actor: this.actor || undefined,
      summary: summary || `Moved ${objectType}`
    };

    await this.saveActivity(activity);
    return activity;
  }

  /**
   * Record an Add activity (e.g., adding annotation to canvas)
   */
  async recordAdd(
    objectId: string,
    objectType: string,
    targetId: string,
    targetType: string,
    summary?: string
  ): Promise<Activity> {
    const activity: Activity = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: this.generateActivityId(),
      type: 'Add',
      endTime: new Date().toISOString(),
      object: {
        id: objectId,
        type: objectType,
        modified: new Date().toISOString()
      },
      target: { id: targetId, type: targetType },
      actor: this.actor || undefined,
      summary: summary || `Added ${objectType} to ${targetType}`
    };

    await this.saveActivity(activity);
    return activity;
  }

  /**
   * Record a Remove activity
   */
  async recordRemove(
    objectId: string,
    objectType: string,
    originId: string,
    originType: string,
    summary?: string
  ): Promise<Activity> {
    const activity: Activity = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: this.generateActivityId(),
      type: 'Remove',
      endTime: new Date().toISOString(),
      object: {
        id: objectId,
        type: objectType,
        modified: new Date().toISOString()
      },
      origin: { id: originId, type: originType },
      actor: this.actor || undefined,
      summary: summary || `Removed ${objectType} from ${originType}`
    };

    await this.saveActivity(activity);
    return activity;
  }

  /**
   * Save an activity to the database
   * Triggers log rotation if MAX_ACTIVITY_ENTRIES is exceeded
   */
  private async saveActivity(activity: Activity): Promise<void> {
    const db = await this.dbPromise;
    await db.put('activities', activity, activity.id);
    
    // Check if rotation is needed (non-blocking)
    this.checkAndRotateIfNeeded().catch(err => {
      console.warn('[ActivityStream] Log rotation check failed:', err);
    });
  }

  /**
   * Check if log rotation is needed and perform it
   * Moves oldest activities to archive when main log exceeds threshold
   */
  private async checkAndRotateIfNeeded(): Promise<void> {
    const db = await this.dbPromise;
    const count = await db.count('activities');
    
    if (count <= MAX_ACTIVITY_ENTRIES) return;
    
    console.log(`[ActivityStream] Rotating activities: ${count} entries exceeds limit of ${MAX_ACTIVITY_ENTRIES}`);
    
    // Get all activities sorted by time
    const allActivities = await db.getAllFromIndex('activities', 'by-time');
    
    // Calculate how many to archive
    const toArchive = count - MAIN_LOG_RETENTION_COUNT;
    const activitiesToArchive = allActivities.slice(0, toArchive);
    
    // Move to archive in a transaction
    const tx = db.transaction(['activities', 'archived'], 'readwrite');
    const activitiesStore = tx.objectStore('activities');
    const archivedStore = tx.objectStore('archived');
    
    for (const activity of activitiesToArchive) {
      // Copy to archive
      await archivedStore.put(activity, activity.id);
      // Remove from main
      await activitiesStore.delete(activity.id);
    }
    
    await tx.done;
    console.log(`[ActivityStream] Archived ${activitiesToArchive.length} activities`);
  }

  /**
   * Get archived activities for a specific object
   */
  async getArchivedActivitiesForObject(objectId: string): Promise<Activity[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex('archived', 'by-object', objectId);
  }

  /**
   * Get all activities (main + archived) for an object
   */
  async getAllActivitiesForObject(objectId: string): Promise<Activity[]> {
    const [main, archived] = await Promise.all([
      this.getActivitiesForObject(objectId),
      this.getArchivedActivitiesForObject(objectId)
    ]);
    // Merge and sort by time
    return [...main, ...archived].sort((a, b) =>
      new Date(a.endTime).getTime() - new Date(b.endTime).getTime()
    );
  }

  /**
   * Load archived activities into memory for historical queries
   */
  async getArchivedActivities(
    options: {
      since?: string;
      until?: string;
      limit?: number;
      objectId?: string;
    } = {}
  ): Promise<Activity[]> {
    const db = await this.dbPromise;
    let activities: Activity[];
    
    if (options.objectId) {
      activities = await db.getAllFromIndex('archived', 'by-object', options.objectId);
    } else {
      activities = await db.getAllFromIndex('archived', 'by-time');
    }
    
    // Apply filters
    if (options.since) {
      activities = activities.filter(a => a.endTime >= options.since!);
    }
    if (options.until) {
      activities = activities.filter(a => a.endTime <= options.until!);
    }
    
    // Sort by time (newest first)
    activities.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());
    
    // Apply limit
    if (options.limit && options.limit > 0) {
      activities = activities.slice(0, options.limit);
    }
    
    return activities;
  }

  /**
   * Get archive statistics
   */
  async getArchiveStats(): Promise<{
    mainCount: number;
    archivedCount: number;
    totalCount: number;
    rotationThreshold: number;
  }> {
    const db = await this.dbPromise;
    const [mainCount, archivedCount] = await Promise.all([
      db.count('activities'),
      db.count('archived')
    ]);
    
    return {
      mainCount,
      archivedCount,
      totalCount: mainCount + archivedCount,
      rotationThreshold: MAX_ACTIVITY_ENTRIES
    };
  }

  /**
   * Get activities for a specific object
   */
  async getActivitiesForObject(objectId: string): Promise<Activity[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex('activities', 'by-object', objectId);
  }

  /**
   * Get activities by type
   */
  async getActivitiesByType(type: ActivityType): Promise<Activity[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex('activities', 'by-type', type);
  }

  /**
   * Get recent activities (ordered by time, newest first)
   */
  async getRecentActivities(limit: number = 50): Promise<Activity[]> {
    const db = await this.dbPromise;
    const all = await db.getAllFromIndex('activities', 'by-time');
    // Reverse to get newest first, then limit
    return all.reverse().slice(0, limit);
  }

  /**
   * Get activities since a given timestamp (for sync)
   */
  async getActivitiesSince(since: string): Promise<Activity[]> {
    const db = await this.dbPromise;
    const all = await db.getAllFromIndex('activities', 'by-time');
    return all.filter(a => a.endTime > since);
  }

  /**
   * Get total activity count
   */
  async getCount(): Promise<number> {
    const db = await this.dbPromise;
    return db.count('activities');
  }

  /**
   * Export as IIIF Change Discovery OrderedCollection
   */
  async exportAsChangeDiscovery(baseUrl: string): Promise<OrderedCollection> {
    const totalItems = await this.getCount();
    const collectionId = `${baseUrl}/activity/collection`;

    const collection: OrderedCollection = {
      '@context': [
        'https://www.w3.org/ns/activitystreams',
        IIIF_SPEC.DISCOVERY_1.CONTEXT as 'http://iiif.io/api/discovery/1/context.json'
      ],
      id: collectionId,
      type: 'OrderedCollection',
      totalItems,
      first: totalItems > 0 ? {
        id: `${collectionId}/page/0`,
        type: 'OrderedCollectionPage'
      } : undefined,
      last: totalItems > 0 ? {
        id: `${collectionId}/page/${Math.floor((totalItems - 1) / PAGE_SIZE)}`,
        type: 'OrderedCollectionPage'
      } : undefined
    };

    return collection;
  }

  /**
   * Export a page of activities as OrderedCollectionPage
   */
  async exportPage(baseUrl: string, pageIndex: number): Promise<OrderedCollectionPage> {
    const db = await this.dbPromise;
    const all = await db.getAllFromIndex('activities', 'by-time');
    const totalItems = all.length;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);

    const collectionId = `${baseUrl}/activity/collection`;
    const pageId = `${collectionId}/page/${pageIndex}`;

    const startIndex = pageIndex * PAGE_SIZE;
    const orderedItems = all.slice(startIndex, startIndex + PAGE_SIZE);

    const page: OrderedCollectionPage = {
      '@context': [
        'https://www.w3.org/ns/activitystreams',
        IIIF_SPEC.DISCOVERY_1.CONTEXT as 'http://iiif.io/api/discovery/1/context.json'
      ],
      id: pageId,
      type: 'OrderedCollectionPage',
      partOf: { id: collectionId, type: 'OrderedCollection' },
      orderedItems,
      startIndex
    };

    if (pageIndex > 0) {
      page.prev = { id: `${collectionId}/page/${pageIndex - 1}`, type: 'OrderedCollectionPage' };
    }
    if (pageIndex < totalPages - 1) {
      page.next = { id: `${collectionId}/page/${pageIndex + 1}`, type: 'OrderedCollectionPage' };
    }

    return page;
  }

  /**
   * Export all activities as a single JSON file (for backup/sync)
   */
  async exportAll(): Promise<Activity[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex('activities', 'by-time');
  }

  /**
   * Import activities from another source (for sync)
   * Only imports activities that don't already exist
   */
  async importActivities(activities: Activity[]): Promise<{ imported: number; skipped: number }> {
    const db = await this.dbPromise;
    let imported = 0;
    let skipped = 0;

    for (const activity of activities) {
      const existing = await db.get('activities', activity.id);
      if (!existing) {
        await db.put('activities', activity, activity.id);
        imported++;
      } else {
        skipped++;
      }
    }

    return { imported, skipped };
  }

  /**
   * Clear all activities (use with caution)
   */
  async clear(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear('activities');
  }

  /**
   * Get statistics about the activity stream
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<ActivityType, number>;
    oldest: string | null;
    newest: string | null;
  }> {
    const db = await this.dbPromise;
    const all = await db.getAllFromIndex('activities', 'by-time');

    const byType: Record<ActivityType, number> = {
      Create: 0,
      Update: 0,
      Delete: 0,
      Move: 0,
      Add: 0,
      Remove: 0
    };

    for (const activity of all) {
      byType[activity.type]++;
    }

    return {
      total: all.length,
      byType,
      oldest: all.length > 0 ? all[0].endTime : null,
      newest: all.length > 0 ? all[all.length - 1].endTime : null
    };
  }
}

export const activityStream = new ActivityStreamService();
