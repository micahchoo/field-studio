/**
 * Ingest Progress — State container (Category 2)
 *
 * Replaces useIngestProgress React hook.
 * Architecture doc §4 Cat 2: Reactive class in .svelte.ts.
 *
 * Tracks multiple concurrent ingest operations with
 * per-operation status, ETA calculation, and aggregate progress.
 *
 * Usage in Svelte:
 *   let ingest = new IngestProgressStore();
 *   ingest.startOperation('batch-1', 'Import folder', 42);
 *   ingest.updateProgress('batch-1', 10);
 */

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export type OperationStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface IngestOperation {
  id: string;
  label: string;
  status: OperationStatus;
  /** Progress 0-1 */
  progress: number;
  filesTotal: number;
  filesCompleted: number;
  filesFailed: number;
  /** Timestamp (ms since epoch) when the operation started */
  startedAt: number;
  /** Error message if status is 'failed' */
  error?: string;
}

export interface AggregateProgress {
  totalOperations: number;
  completedOperations: number;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  /** Overall progress 0-1 across all operations */
  overallProgress: number;
  /** Estimated time remaining in ms, or null if unknown */
  estimatedTimeRemaining: number | null;
  /** True if any operation is 'running' or 'pending' */
  isActive: boolean;
}

export interface LogEntry {
  timestamp: number;
  message: string;
  level: 'info' | 'warn' | 'error';
}

// --------------------------------------------------------------------------
// IngestProgressStore
// --------------------------------------------------------------------------

export class IngestProgressStore {
  #operations = $state<Map<string, IngestOperation>>(new Map());
  #log = $state<LogEntry[]>([]);

  // ---- Getters ----

  /** All operations as an array, ordered by startedAt ascending */
  get operations(): IngestOperation[] {
    return [...this.#operations.values()].sort((a, b) => a.startedAt - b.startedAt);
  }

  /** Activity log entries */
  get log(): LogEntry[] {
    return this.#log;
  }

  /** Whether any operation is running or pending */
  get isActive(): boolean {
    for (const op of this.#operations.values()) {
      if (op.status === 'running' || op.status === 'pending') return true;
    }
    return false;
  }

  /**
   * Aggregate progress across all operations.
   *
   * Pseudocode:
   *   1. Sum filesTotal, filesCompleted, filesFailed across all ops
   *   2. Count completed operations
   *   3. Calculate overallProgress = completedFiles / totalFiles (or 0)
   *   4. Estimate remaining time using #calculateETA()
   *   5. isActive = any op is running/pending
   */
  get aggregate(): AggregateProgress {
    let totalOperations = 0;
    let completedOperations = 0;
    let totalFiles = 0;
    let completedFiles = 0;
    let failedFiles = 0;
    let active = false;

    for (const op of this.#operations.values()) {
      totalOperations++;
      totalFiles += op.filesTotal;
      completedFiles += op.filesCompleted;
      failedFiles += op.filesFailed;

      if (op.status === 'completed') {
        completedOperations++;
      }
      if (op.status === 'running' || op.status === 'pending') {
        active = true;
      }
    }

    const overallProgress = totalFiles > 0 ? completedFiles / totalFiles : 0;

    return {
      totalOperations,
      completedOperations,
      totalFiles,
      completedFiles,
      failedFiles,
      overallProgress,
      estimatedTimeRemaining: this.#calculateETA(),
      isActive: active,
    };
  }

  // --------------------------------------------------------------------------
  // startOperation — begin tracking a new ingest operation
  // --------------------------------------------------------------------------

  /**
   * Pseudocode:
   *   1. Create an IngestOperation with status 'running', progress 0
   *   2. Add to the operations map (clone map for reactivity)
   *   3. Log the start event
   */
  startOperation(id: string, label: string, filesTotal: number): void {
    const op: IngestOperation = {
      id,
      label,
      status: 'running',
      progress: 0,
      filesTotal,
      filesCompleted: 0,
      filesFailed: 0,
      startedAt: Date.now(),
    };

    const next = new Map(this.#operations);
    next.set(id, op);
    this.#operations = next;

    this.#addLog(`Started "${label}" (${filesTotal} files)`, 'info');
  }

  // --------------------------------------------------------------------------
  // updateProgress — update file counts for an operation
  // --------------------------------------------------------------------------

  /**
   * Pseudocode:
   *   1. Look up the operation by id
   *   2. Update filesCompleted and filesFailed
   *   3. Recalculate progress = (completed + failed) / total
   *   4. If all files processed, auto-complete
   */
  updateProgress(id: string, filesCompleted: number, filesFailed?: number): void {
    const op = this.#operations.get(id);
    if (!op || op.status !== 'running') return;

    const failed = filesFailed ?? op.filesFailed;
    const processed = filesCompleted + failed;
    const progress = op.filesTotal > 0 ? Math.min(processed / op.filesTotal, 1) : 0;

    const updated: IngestOperation = {
      ...op,
      filesCompleted,
      filesFailed: failed,
      progress,
    };

    // Auto-complete when all files are processed
    if (processed >= op.filesTotal) {
      updated.status = 'completed';
      updated.progress = 1;
      this.#addLog(
        `Completed "${op.label}" (${filesCompleted} ok, ${failed} failed)`,
        failed > 0 ? 'warn' : 'info'
      );
    }

    const next = new Map(this.#operations);
    next.set(id, updated);
    this.#operations = next;
  }

  // --------------------------------------------------------------------------
  // completeOperation — explicitly mark an operation as completed
  // --------------------------------------------------------------------------

  /**
   * Pseudocode:
   *   1. Set status to 'completed', progress to 1
   *   2. Log completion
   */
  completeOperation(id: string): void {
    const op = this.#operations.get(id);
    if (!op) return;

    const next = new Map(this.#operations);
    next.set(id, { ...op, status: 'completed', progress: 1 });
    this.#operations = next;

    this.#addLog(`Completed "${op.label}"`, 'info');
  }

  // --------------------------------------------------------------------------
  // failOperation — mark an operation as failed with an error message
  // --------------------------------------------------------------------------

  /**
   * Pseudocode:
   *   1. Set status to 'failed', attach error message
   *   2. Log the failure
   */
  failOperation(id: string, error: string): void {
    const op = this.#operations.get(id);
    if (!op) return;

    const next = new Map(this.#operations);
    next.set(id, { ...op, status: 'failed', error });
    this.#operations = next;

    this.#addLog(`Failed "${op.label}": ${error}`, 'error');
  }

  // --------------------------------------------------------------------------
  // pauseOperation — pause a running operation
  // --------------------------------------------------------------------------

  /**
   * Pseudocode:
   *   1. Only pause if currently 'running'
   *   2. Set status to 'paused'
   *   3. Log the pause
   */
  pauseOperation(id: string): void {
    const op = this.#operations.get(id);
    if (!op || op.status !== 'running') return;

    const next = new Map(this.#operations);
    next.set(id, { ...op, status: 'paused' });
    this.#operations = next;

    this.#addLog(`Paused "${op.label}"`, 'info');
  }

  // --------------------------------------------------------------------------
  // resumeOperation — resume a paused operation
  // --------------------------------------------------------------------------

  /**
   * Pseudocode:
   *   1. Only resume if currently 'paused'
   *   2. Set status to 'running'
   *   3. Log the resume
   */
  resumeOperation(id: string): void {
    const op = this.#operations.get(id);
    if (!op || op.status !== 'paused') return;

    const next = new Map(this.#operations);
    next.set(id, { ...op, status: 'running' });
    this.#operations = next;

    this.#addLog(`Resumed "${op.label}"`, 'info');
  }

  // --------------------------------------------------------------------------
  // cancelOperation — cancel a pending or running operation
  // --------------------------------------------------------------------------

  /**
   * Pseudocode:
   *   1. Only cancel if 'running', 'pending', or 'paused'
   *   2. Set status to 'cancelled'
   *   3. Log the cancellation
   */
  cancelOperation(id: string): void {
    const op = this.#operations.get(id);
    if (!op) return;
    if (op.status !== 'running' && op.status !== 'pending' && op.status !== 'paused') return;

    const next = new Map(this.#operations);
    next.set(id, { ...op, status: 'cancelled' });
    this.#operations = next;

    this.#addLog(`Cancelled "${op.label}"`, 'warn');
  }

  // --------------------------------------------------------------------------
  // cancelAll — cancel all active operations
  // --------------------------------------------------------------------------

  /**
   * Pseudocode:
   *   1. Iterate all operations
   *   2. Cancel any that are running, pending, or paused
   */
  cancelAll(): void {
    const next = new Map(this.#operations);
    let cancelled = 0;

    for (const [id, op] of next) {
      if (op.status === 'running' || op.status === 'pending' || op.status === 'paused') {
        next.set(id, { ...op, status: 'cancelled' });
        cancelled++;
      }
    }

    if (cancelled > 0) {
      this.#operations = next;
      this.#addLog(`Cancelled ${cancelled} operation(s)`, 'warn');
    }
  }

  // --------------------------------------------------------------------------
  // clearCompleted — remove completed/failed/cancelled operations
  // --------------------------------------------------------------------------

  /**
   * Pseudocode:
   *   1. Filter out operations with terminal status
   *   2. Replace operations map
   */
  clearCompleted(): void {
    const next = new Map<string, IngestOperation>();
    for (const [id, op] of this.#operations) {
      if (op.status !== 'completed' && op.status !== 'failed' && op.status !== 'cancelled') {
        next.set(id, op);
      }
    }
    this.#operations = next;
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  /**
   * Append a log entry.
   *
   * Pseudocode:
   *   1. Create entry with current timestamp
   *   2. Append to log array (keep last 500 entries)
   */
  #addLog(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const entry: LogEntry = { timestamp: Date.now(), message, level };
    // Keep last 500 log entries to avoid unbounded growth
    const maxLog = 500;
    if (this.#log.length >= maxLog) {
      this.#log = [...this.#log.slice(-(maxLog - 1)), entry];
    } else {
      this.#log = [...this.#log, entry];
    }
  }

  /**
   * Calculate estimated time remaining across all running operations.
   *
   * Pseudocode:
   *   1. Collect all running operations
   *   2. For each, calculate elapsed time and files per second rate
   *   3. Estimate remaining files / rate = remaining time
   *   4. Return the maximum remaining time (bottleneck), or null if no data
   */
  #calculateETA(): number | null {
    const now = Date.now();
    let maxRemaining: number | null = null;

    for (const op of this.#operations.values()) {
      if (op.status !== 'running') continue;

      const elapsed = now - op.startedAt;
      const processed = op.filesCompleted + op.filesFailed;

      // Need at least one file processed and some elapsed time for a rate estimate
      if (processed <= 0 || elapsed <= 0) continue;

      const rate = processed / elapsed; // files per ms
      const remaining = op.filesTotal - processed;
      const eta = remaining / rate; // ms remaining

      if (maxRemaining === null || eta > maxRemaining) {
        maxRemaining = eta;
      }
    }

    return maxRemaining !== null ? Math.round(maxRemaining) : null;
  }
}
