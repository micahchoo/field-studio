/**
 * Ingest State — Stub
 * Checkpoint CRUD for resumable ingestion.
 */
export interface IngestCheckpoint {
  id: string;
  startedAt: string;
  lastUpdatedAt: string;
  filesProcessed: number;
  totalFiles: number;
  status: 'running' | 'paused' | 'completed' | 'failed';
}

export function createCheckpoint(_totalFiles: number): IngestCheckpoint {
  return {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    filesProcessed: 0,
    totalFiles: _totalFiles,
    status: 'running',
  };
}

export function updateCheckpoint(checkpoint: IngestCheckpoint, filesProcessed: number): IngestCheckpoint {
  return { ...checkpoint, filesProcessed, lastUpdatedAt: new Date().toISOString() };
}
