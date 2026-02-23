/**
 * Ingest Worker Pool -- Stub
 * Web Worker pool management for parallel file processing.
 * Full implementation deferred to ingest pipeline migration.
 */
import type { FileTree, IngestProgressOptions, IngestResult } from '@/src/shared/types';

export interface WorkerPoolConfig {
  maxWorkers: number;
  chunkSize: number;
}

export interface PoolStats {
  activeWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  errors: number;
}

export class IngestWorkerPool {
  constructor(_config?: Partial<WorkerPoolConfig>) {}
  async processFiles(_files: File[]): Promise<void> {
    throw new Error('Worker pool not yet implemented in Svelte migration');
  }
  getStats(): PoolStats {
    return { activeWorkers: 0, queuedTasks: 0, completedTasks: 0, errors: 0 };
  }
  terminate(): void {}
}

/** Get or create the ingest worker pool singleton -- stub */
export function getIngestWorkerPool(_config?: Partial<WorkerPoolConfig>): IngestWorkerPool {
  return new IngestWorkerPool(_config);
}

/** Ingest a file tree using the worker pool -- stub */
export async function ingestTreeWithWorkers(
  _tree: FileTree,
  _options?: IngestProgressOptions
): Promise<IngestResult> {
  throw new Error('Worker-based ingest not yet implemented in Svelte migration');
}
