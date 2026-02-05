/**
 * Ingest Web Worker
 *
 * ⚠️ RE-EXPORT SHIM - This file re-exports from the FSD location.
 * The canonical worker code is at: src/shared/workers/ingest.worker.ts
 *
 * @deprecated Import from '@/src/shared/workers' instead
 */

// Re-export all types for backward compatibility
export type {
  InitIngestMessage,
  ProcessFileMessage,
  CancelIngestMessage,
  ProcessNodeMessage,
  IngestProgressMessage,
  IngestFileCompleteMessage,
  IngestNodeCompleteMessage,
  IngestCompleteMessage,
  IngestErrorMessage,
  IngestWorkerRequest,
  IngestWorkerResponse,
} from '@/src/shared/workers/ingest.worker';

// NOTE: If you need the actual worker code, import from:
// import IngestWorker from '@/src/shared/workers/ingest.worker?worker';
