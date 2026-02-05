/**
 * Shared Services
 *
 * FSD Location: src/shared/services/
 *
 * Domain-agnostic services used across the application.
 * These should contain zero domain-specific logic.
 */

// ============================================================================
// Logging Service
// ============================================================================
export {
  logger,
  appLog,
  vaultLog,
  storageLog,
  networkLog,
  uiLog,
  workerLog,
} from './logger';
export type { LogLevel, LogGroup, LogEntry } from './logger';
