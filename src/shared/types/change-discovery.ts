/**
 * IIIF Change Discovery API 1.0 Types
 * @see https://iiif.io/api/discovery/1.0/
 *
 * Based on W3C Activity Streams 2.0.
 * Used for tracking and syncing changes to IIIF resources.
 */

// ---------------------------------------------------------------------------
// Activity Stream Structure
// ---------------------------------------------------------------------------

/** Top-level ordered collection of activities */
export interface OrderedCollection {
  '@context': [
    'http://iiif.io/api/discovery/1/context.json',
    'https://www.w3.org/ns/activitystreams',
  ];
  id: string;
  type: 'OrderedCollection';
  totalItems: number;
  rights?: string;
  /** Most recent (last) page — consumers start here and work backward */
  last: OrderedCollectionPageRef;
  /** Oldest (first) page */
  first?: OrderedCollectionPageRef;
  /** Provider/attribution for the stream */
  seeAlso?: ExternalResource[];
  partOf?: ExternalResource[];
}

export interface OrderedCollectionPageRef {
  id: string;
  type: 'OrderedCollectionPage';
}

/** A single page of activities, ordered oldest-first within the page */
export interface OrderedCollectionPage {
  '@context': string | string[];
  id: string;
  type: 'OrderedCollectionPage';
  partOf: { id: string; type: 'OrderedCollection' };
  /** Previous page (older activities). Absent on the first page. */
  prev?: OrderedCollectionPageRef;
  /** Next page (newer activities). Absent on the last page. */
  next?: OrderedCollectionPageRef;
  startIndex?: number;
  /** Activities on this page, ordered oldest-first */
  orderedItems: Activity[];
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

export type ActivityType =
  | 'Create'
  | 'Update'
  | 'Delete'
  | 'Move'
  | 'Add'
  | 'Remove'
  | 'Refresh';

export interface Activity {
  id?: string;
  type: ActivityType;
  /** The IIIF resource that was changed */
  object: ActivityObject;
  /** ISO 8601 timestamp of the change */
  endTime: string;
  /** Who/what made the change */
  actor?: ActivityActor;
  /** For Move: the original location */
  origin?: { id: string; type: string };
  /** For Move/Add: the new location */
  target?: { id: string; type: string };
  /** Human-readable summary */
  summary?: string;
}

export interface ActivityObject {
  id: string;
  type: 'Manifest' | 'Collection' | 'Canvas' | 'Range' | 'Annotation' | string;
  /** Canonical URI for deduplication */
  canonical?: string;
  seeAlso?: ExternalResource[];
  provider?: ActivityActor[];
}

export interface ActivityActor {
  id: string;
  type: 'Application' | 'Organization' | 'Person';
  name?: string;
}

// ---------------------------------------------------------------------------
// Processing State (for sync consumer)
// ---------------------------------------------------------------------------

/** State tracked per remote stream for incremental sync */
export interface StreamProcessingState {
  /** The OrderedCollection URL being tracked */
  streamId: string;
  /** Human-readable label for the stream */
  label: string;
  /** The last activity timestamp we successfully processed */
  lastProcessedTime: string;
  /** The page we were on when we last synced */
  lastPageId: string;
  /** Number of activities processed total */
  totalProcessed: number;
  /** Status of this stream */
  status: StreamStatus;
  /** When we last checked for updates */
  lastCheckedAt: string;
  /** Poll interval in milliseconds (default: 5 minutes) */
  pollInterval: number;
}

export type StreamStatus =
  | 'idle'        // Not actively syncing
  | 'polling'     // Checking for new activities
  | 'processing'  // Applying activities to local state
  | 'conflict'    // Conflicts detected, awaiting resolution
  | 'error';      // Network or protocol error

/** A detected conflict between local and remote state */
export interface SyncConflict {
  id: string;
  resourceId: string;
  resourceType: string;
  /** The field/property that conflicts */
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  localTimestamp: string;
  remoteTimestamp: string;
  resolution?: 'local' | 'remote' | 'merged';
  resolvedValue?: unknown;
}

// ---------------------------------------------------------------------------
// Local Activity Generation
// ---------------------------------------------------------------------------

/** Entry in the local activity log (stored in IndexedDB) */
export interface LocalActivity {
  id: string;
  type: ActivityType;
  /** The vault entity that was changed */
  entityId: string;
  entityType: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Human-readable description */
  summary: string;
  /** The vault action type that triggered this activity */
  actionType: string;
  /** Snapshot of changed fields for undo/diff */
  patch?: Record<string, { before: unknown; after: unknown }>;
}

// ---------------------------------------------------------------------------
// Utility types
// ---------------------------------------------------------------------------

export interface ExternalResource {
  id: string;
  type: string;
  format?: string;
  profile?: string;
  label?: Record<string, string[]>;
}
