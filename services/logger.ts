/**
 * Centralized Logging Service
 *
 * ⚠️ RE-EXPORT SHIM - This file re-exports from the FSD location.
 * The canonical implementation is at: src/shared/services/logger.ts
 *
 * @deprecated Import from '@/src/shared/services' instead
 */

export {
  logger,
  appLog,
  vaultLog,
  storageLog,
  networkLog,
  uiLog,
  workerLog,
} from '@/src/shared/services/logger';
export type { LogLevel, LogGroup, LogEntry } from '@/src/shared/services/logger';
