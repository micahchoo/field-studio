/**
 * Migration: Add Trash Support (Phase 2)
 *
 * Initializes trashedEntities field in existing NormalizedState objects.
 * This is a non-destructive migration that only adds new fields.
 *
 * Run this migration on app startup to ensure backward compatibility
 * with state that was saved before the trash system was implemented.
 *
 * @see Phase 2: Trash/Restore System (P0 - Data Safety)
 */

import { NormalizedState } from '../services/vault';

// ============================================================================
// Migration Types
// ============================================================================

/**
 * Migration result
 */
export interface MigrationResult {
  /** Whether migration was successful */
  success: boolean;
  /** Whether migration was applied (state was modified) */
  applied: boolean;
  /** Migration version identifier */
  version: string;
  /** Optional error message */
  error?: string;
  /** Timestamp of migration */
  timestamp: number;
}

/**
 * Legacy state without trash support (for type checking)
 */
interface LegacyNormalizedState extends Omit<NormalizedState, 'trashedEntities'> {
  trashedEntities?: Record<string, unknown>;
}

// ============================================================================
// Migration Constants
// ============================================================================

/** Migration version identifier */
export const MIGRATION_VERSION = '2.0.0-trash-support';

/** Migration name */
export const MIGRATION_NAME = 'Add Trash Support';

/** Migration description */
export const MIGRATION_DESCRIPTION =
  'Initializes trashedEntities field in NormalizedState for soft deletion support';

// ============================================================================
// Migration Functions
// ============================================================================

/**
 * Check if state needs migration
 *
 * @param state - The normalized state to check
 * @returns True if migration is needed
 */
export function needsTrashMigration(state: unknown): state is LegacyNormalizedState {
  // Check if it's a valid state object
  if (!state || typeof state !== 'object') {
    return false;
  }

  const s = state as LegacyNormalizedState;

  // Check for required state properties
  const hasRequiredProps =
    'entities' in s &&
    'references' in s &&
    'reverseRefs' in s &&
    'typeIndex' in s;

  if (!hasRequiredProps) {
    return false;
  }

  // Check if trashedEntities is missing or undefined
  return !('trashedEntities' in s) || s.trashedEntities === undefined;
}

/**
 * Apply trash support migration to state
 *
 * @param state - The normalized state to migrate
 * @returns Migration result with migrated state
 */
export function migrateAddTrashSupport(state: NormalizedState): MigrationResult {
  const startTime = performance.now();

  try {
    // Check if migration is needed
    if (!needsTrashMigration(state)) {
      return {
        success: true,
        applied: false,
        version: MIGRATION_VERSION,
        timestamp: Date.now()
      };
    }

    // Apply migration: add trashedEntities field
    const migratedState: NormalizedState = {
      ...state,
      trashedEntities: {}
    };

    const duration = Math.round(performance.now() - startTime);

    console.info(`[Migration] ${MIGRATION_NAME} applied successfully (${duration}ms)`);

    return {
      success: true,
      applied: true,
      version: MIGRATION_VERSION,
      timestamp: Date.now()
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[Migration] ${MIGRATION_NAME} failed:`, error);

    return {
      success: false,
      applied: false,
      version: MIGRATION_VERSION,
      error,
      timestamp: Date.now()
    };
  }
}

/**
 * Safely migrate state, returning the migrated state
 *
 * @param state - The normalized state to migrate
 * @returns The migrated state (or original if migration failed)
 */
export function migrateStateSafely(state: NormalizedState): NormalizedState {
  if (!needsTrashMigration(state)) {
    return state;
  }

  try {
    return {
      ...state,
      trashedEntities: {}
    };
  } catch (e) {
    console.error('[Migration] Failed to apply migration, returning original state:', e);
    return state;
  }
}

// ============================================================================
// Migration Runner
// ============================================================================

/**
 * Migration runner - applies all pending migrations
 *
 * @param state - The normalized state to migrate
 * @returns Object with migrated state and results
 */
export function runMigrations(state: NormalizedState): {
  state: NormalizedState;
  results: MigrationResult[];
  allSuccessful: boolean;
} {
  const results: MigrationResult[] = [];
  let currentState = state;

  // Apply trash support migration
  const trashMigration = migrateAddTrashSupport(currentState);
  results.push(trashMigration);

  if (trashMigration.success && trashMigration.applied) {
    currentState = migrateStateSafely(currentState);
  }

  // Future migrations will be added here

  const allSuccessful = results.every(r => r.success);

  if (allSuccessful && results.some(r => r.applied)) {
    console.info('[Migration] All migrations applied successfully');
  }

  return {
    state: currentState,
    results,
    allSuccessful
  };
}

// ============================================================================
// Storage Migration Helpers
// ============================================================================

/**
 * Key for storing migration metadata in localStorage
 */
const MIGRATION_STORAGE_KEY = 'iiif-field-studio-migrations';

/**
 * Migration metadata stored in localStorage
 */
export interface MigrationMetadata {
  /** Applied migration versions */
  appliedVersions: string[];
  /** Last migration timestamp */
  lastMigration: number;
  /** Migration history */
  history: Array<{
    version: string;
    timestamp: number;
    applied: boolean;
  }>;
}

/**
 * Get migration metadata from storage
 */
function getMigrationMetadata(): MigrationMetadata {
  try {
    const stored = localStorage.getItem(MIGRATION_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[Migration] Failed to read migration metadata:', e);
  }

  return {
    appliedVersions: [],
    lastMigration: 0,
    history: []
  };
}

/**
 * Save migration metadata to storage
 */
function saveMigrationMetadata(metadata: MigrationMetadata): void {
  try {
    localStorage.setItem(MIGRATION_STORAGE_KEY, JSON.stringify(metadata));
  } catch (e) {
    console.warn('[Migration] Failed to save migration metadata:', e);
  }
}

/**
 * Check if migration has been applied
 */
export function isMigrationApplied(version: string): boolean {
  const metadata = getMigrationMetadata();
  return metadata.appliedVersions.includes(version);
}

/**
 * Record migration in metadata
 */
export function recordMigration(version: string, applied: boolean): void {
  const metadata = getMigrationMetadata();

  if (!metadata.appliedVersions.includes(version)) {
    metadata.appliedVersions.push(version);
  }

  metadata.lastMigration = Date.now();
  metadata.history.push({
    version,
    timestamp: Date.now(),
    applied
  });

  // Keep only last 50 entries
  if (metadata.history.length > 50) {
    metadata.history = metadata.history.slice(-50);
  }

  saveMigrationMetadata(metadata);
}

// ============================================================================
// Auto-Migration on App Startup
// ============================================================================

/**
 * Initialize migrations on app startup
 *
 * This function should be called during app initialization to ensure
 * all migrations are applied before the app uses the state.
 *
 * @param state - The normalized state from storage
 * @returns Migrated state ready for use
 *
 * @example
 * // In app initialization
 * const storedState = await storage.loadState();
 * const migratedState = initializeMigrations(storedState);
 * vault.load(migratedState);
 */
export function initializeMigrations(state: NormalizedState | null): NormalizedState | null {
  if (!state) {
    return null;
  }

  // Check if already migrated
  if (isMigrationApplied(MIGRATION_VERSION)) {
    // Still run migration to be safe (idempotent)
    const { state: migratedState } = runMigrations(state);
    return migratedState;
  }

  // Run migrations
  const { state: migratedState, results, allSuccessful } = runMigrations(state);

  // Record migration
  const trashResult = results.find(r => r.version === MIGRATION_VERSION);
  if (trashResult) {
    recordMigration(MIGRATION_VERSION, trashResult.applied);
  }

  if (!allSuccessful) {
    console.error('[Migration] Some migrations failed, app may have issues');
  }

  return migratedState;
}

// ============================================================================
// Export default for dynamic imports
// ============================================================================

export default {
  version: MIGRATION_VERSION,
  name: MIGRATION_NAME,
  description: MIGRATION_DESCRIPTION,
  needsMigration: needsTrashMigration,
  migrate: migrateAddTrashSupport,
  migrateSafely: migrateStateSafely,
  runAll: runMigrations,
  initialize: initializeMigrations
};
