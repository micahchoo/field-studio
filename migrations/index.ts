/**
 * Migrations Index
 *
 * Central export point for all database/state migrations.
 * Migrations are run on app startup to ensure backward compatibility.
 *
 * @example
 * // In app initialization
 * import { initializeMigrations } from './migrations';
 * const migratedState = initializeMigrations(storedState);
 */

// ============================================================================
// Phase 2: Trash/Restore System (P0 - Data Safety)
// ============================================================================
export {
  // Migration functions
  migrateAddTrashSupport,
  migrateStateSafely,
  runMigrations,
  initializeMigrations,
  needsTrashMigration,
  isMigrationApplied,
  recordMigration,
  // Migration metadata
  MIGRATION_VERSION as TRASH_MIGRATION_VERSION,
  MIGRATION_NAME as TRASH_MIGRATION_NAME,
  MIGRATION_DESCRIPTION as TRASH_MIGRATION_DESCRIPTION,
} from './addTrashSupport';

export type {
  MigrationResult,
  MigrationMetadata,
} from './addTrashSupport';

// ============================================================================
// Current migration version
// Increment when adding new migrations
// ============================================================================

export const CURRENT_MIGRATION_VERSION = '2.0.0';

/**
 * Migration history for reference
 */
export const MIGRATION_HISTORY = [
  {
    version: '2.0.0',
    name: 'Add Trash Support',
    date: '2026-01-29',
    description: 'Phase 2: Trash/Restore System (P0 - Data Safety)'
  }
] as const;
