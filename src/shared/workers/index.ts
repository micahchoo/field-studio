/**
 * Shared Workers
 *
 * FSD Location: src/shared/workers/
 *
 * Web workers for background processing.
 */

// Note: Workers are typically imported directly by their path, not via barrel exports.
// This index provides documentation of available workers.

/**
 * Ingest Worker - Background file processing
 * Import: new Worker(new URL('./ingest.worker.ts', import.meta.url))
 */
export type {
  IngestWorkerRequest,
  IngestWorkerResponse,
  InitIngestMessage,
  ProcessFileMessage,
  CancelIngestMessage,
  ProcessNodeMessage,
  IngestProgressMessage,
  IngestFileCompleteMessage,
  IngestNodeCompleteMessage,
  IngestCompleteMessage,
  IngestErrorMessage,
  IngestInitializedMessage,
} from './ingest.worker';

/**
 * Search Indexer - Background search index building
 * Import: new Worker(new URL('./searchIndexer.ts', import.meta.url))
 *
 * Note: Uses internal message protocol, no exported types.
 */

/**
 * Validation Worker - Background IIIF validation
 * Import: new Worker(new URL('./validation.worker.ts', import.meta.url))
 *
 * Note: Uses internal message protocol, no exported types.
 */
