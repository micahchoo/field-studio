/** Workers -- Stub */
export function getCompressionWorker(): Worker | null { return null; }

/** Worker message types for ingest pipeline */
export interface IngestProgressMessage {
  type: 'progress';
  fileId: string;
  progress: number;
  stage: string;
}

export interface IngestFileCompleteMessage {
  type: 'file-complete';
  fileId: string;
  entityId: string;
}

export interface IngestCompleteMessage {
  type: 'complete';
  totalFiles: number;
  duration: number;
}

export interface IngestErrorMessage {
  type: 'error';
  fileId?: string;
  error: string;
}

export type IngestWorkerResponse =
  | IngestProgressMessage
  | IngestFileCompleteMessage
  | IngestCompleteMessage
  | IngestErrorMessage;
