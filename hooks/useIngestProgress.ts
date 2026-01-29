/**
 * useIngestProgress - Enhanced progress tracking for ingest operations
 *
 * Tracks multiple concurrent ingest operations with:
 * - Aggregate progress across batches
 * - Pause/resume/cancel controls
 * - ETA calculation based on processing speed
 * - Activity log management
 * - Per-file status tracking
 *
 * @example
 * const { progress, controls, startIngest } = useIngestProgress();
 *
 * // Start an ingest with progress tracking
 * const result = await startIngest(async (options) => {
 *   return await ingestTree(tree, null, options);
 * });
 *
 * // Control the operation
 * controls.pause();
 * controls.resume();
 * controls.cancel();
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  IngestProgress,
  IngestStage,
  IngestFileInfo,
  IngestActivityLogEntry,
  IngestProgressSummary,
  IngestProgressOptions,
  IngestResult
} from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Ingest operation state
 */
interface IngestOperation {
  /** Unique operation ID */
  id: string;
  /** Current progress state */
  progress: IngestProgress;
  /** AbortController for cancellation */
  abortController: AbortController;
  /** Whether the operation is currently paused */
  isPaused: boolean;
  /** Promise resolver for pause/resume */
  resumeResolver?: () => void;
}

/**
 * Controls for managing an ingest operation
 */
export interface IngestControls {
  /** Pause the operation */
  pause: (operationId?: string) => void;
  /** Resume a paused operation */
  resume: (operationId?: string) => void;
  /** Cancel the operation */
  cancel: (operationId?: string) => void;
  /** Cancel all operations */
  cancelAll: () => void;
  /** Retry a failed file */
  retryFile: (fileId: string, operationId?: string) => void;
}

/**
 * Aggregate progress across all operations
 */
export interface AggregateProgress {
  /** Overall percentage (0-100) */
  overallProgress: number;
  /** Total files across all operations */
  totalFiles: number;
  /** Total completed files */
  completedFiles: number;
  /** Total files with errors */
  errorFiles: number;
  /** Current processing stage */
  currentStage: IngestStage;
  /** Processing speed (files per second) */
  speed: number;
  /** Estimated time remaining in seconds */
  etaSeconds: number;
  /** Whether any operation is paused */
  isPaused: boolean;
  /** Whether any operation is active */
  isActive: boolean;
  /** Number of active operations */
  activeOperations: number;
}

/**
 * Return type for useIngestProgress hook
 */
export interface UseIngestProgressReturn {
  /** Current aggregate progress */
  aggregate: AggregateProgress;
  /** Individual operation progress (if tracking single operation) */
  progress: IngestProgress | null;
  /** All active operations */
  operations: IngestOperation[];
  /** Control functions */
  controls: IngestControls;
  /** Start a new ingest operation */
  startIngest: <T extends IngestResult>(
    ingestFn: (options: IngestProgressOptions) => Promise<T>,
    operationId?: string
  ) => Promise<T>;
  /** Get progress for a specific operation */
  getOperationProgress: (operationId: string) => IngestProgress | null;
  /** Clear completed operations from tracking */
  clearCompleted: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate aggregate progress from multiple operations
 */
function calculateAggregateProgress(operations: IngestOperation[]): AggregateProgress {
  if (operations.length === 0) {
    return {
      overallProgress: 0,
      totalFiles: 0,
      completedFiles: 0,
      errorFiles: 0,
      currentStage: 'complete',
      speed: 0,
      etaSeconds: 0,
      isPaused: false,
      isActive: false,
      activeOperations: 0
    };
  }

  const activeOps = operations.filter(op =>
    op.progress.stage !== 'complete' &&
    op.progress.stage !== 'cancelled' &&
    op.progress.stage !== 'error'
  );

  const totalFiles = operations.reduce((sum, op) => sum + op.progress.filesTotal, 0);
  const completedFiles = operations.reduce((sum, op) => sum + op.progress.filesCompleted, 0);
  const errorFiles = operations.reduce((sum, op) => sum + op.progress.filesError, 0);

  // Calculate weighted average progress
  const overallProgress = totalFiles > 0
    ? Math.round(operations.reduce((sum, op) =>
        sum + (op.progress.overallProgress * op.progress.filesTotal), 0) / totalFiles)
    : 0;

  // Calculate average speed
  const totalSpeed = operations.reduce((sum, op) => sum + op.progress.speed, 0);
  const speed = operations.length > 0 ? totalSpeed / operations.length : 0;

  // Calculate ETA based on remaining files
  const remainingFiles = totalFiles - completedFiles;
  const etaSeconds = speed > 0 ? Math.round(remainingFiles / speed) : 0;

  // Determine current stage (prioritize processing stages)
  const stagePriority: IngestStage[] = ['error', 'processing', 'scanning', 'saving', 'derivatives', 'complete', 'cancelled'];
  const currentStage = operations.length > 0
    ? stagePriority.find(stage => operations.some(op => op.progress.stage === stage)) || 'complete'
    : 'complete';

  return {
    overallProgress,
    totalFiles,
    completedFiles,
    errorFiles,
    currentStage,
    speed,
    etaSeconds,
    isPaused: operations.some(op => op.isPaused),
    isActive: activeOps.length > 0,
    activeOperations: activeOps.length
  };
}

/**
 * Format seconds into human-readable time
 */
export function formatETA(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.ceil((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

/**
 * Format speed as files per second
 */
export function formatSpeed(filesPerSecond: number): string {
  if (filesPerSecond < 1) {
    return `${(filesPerSecond * 60).toFixed(1)} files/min`;
  }
  return `${filesPerSecond.toFixed(1)} files/sec`;
}

// ============================================================================
// Hook
// ============================================================================

export function useIngestProgress(): UseIngestProgressReturn {
  const [operations, setOperations] = useState<IngestOperation[]>([]);
  const operationRefs = useRef<Map<string, IngestOperation>>(new Map());

  // Calculate aggregate progress
  const aggregate = useMemo(() => calculateAggregateProgress(operations), [operations]);

  // Get the most recent operation's progress (for single-operation tracking)
  const progress = useMemo(() => {
    if (operations.length === 0) return null;
    return operations[operations.length - 1].progress;
  }, [operations]);

  /**
   * Update progress for an operation
   */
  const updateProgress = useCallback((operationId: string, updates: Partial<IngestProgress>) => {
    setOperations(prev => prev.map(op => {
      if (op.id !== operationId) return op;
      const updatedProgress = { ...op.progress, ...updates, updatedAt: Date.now() };
      const updatedOp = { ...op, progress: updatedProgress };
      operationRefs.current.set(operationId, updatedOp);
      return updatedOp;
    }));
  }, []);

  /**
   * Pause an operation
   */
  const pause = useCallback((operationId?: string) => {
    const targetId = operationId || operations[operations.length - 1]?.id;
    if (!targetId) return;

    setOperations(prev => prev.map(op => {
      if (op.id !== targetId) return op;
      const updatedOp = { ...op, isPaused: true };
      operationRefs.current.set(targetId, updatedOp);
      return updatedOp;
    }));

    // Update the progress state
    updateProgress(targetId, { isPaused: true });
  }, [operations, updateProgress]);

  /**
   * Resume a paused operation
   */
  const resume = useCallback((operationId?: string) => {
    const targetId = operationId || operations[operations.length - 1]?.id;
    if (!targetId) return;

    const operation = operationRefs.current.get(targetId);
    if (operation?.resumeResolver) {
      operation.resumeResolver();
    }

    setOperations(prev => prev.map(op => {
      if (op.id !== targetId) return op;
      const updatedOp = { ...op, isPaused: false, resumeResolver: undefined };
      operationRefs.current.set(targetId, updatedOp);
      return updatedOp;
    }));

    updateProgress(targetId, { isPaused: false });
  }, [operations, updateProgress]);

  /**
   * Cancel an operation
   */
  const cancel = useCallback((operationId?: string) => {
    const targetId = operationId || operations[operations.length - 1]?.id;
    if (!targetId) return;

    const operation = operationRefs.current.get(targetId);
    if (operation) {
      operation.abortController.abort();
    }

    updateProgress(targetId, { isCancelled: true, stage: 'cancelled' });
  }, [operations, updateProgress]);

  /**
   * Cancel all operations
   */
  const cancelAll = useCallback(() => {
    operations.forEach(op => {
      op.abortController.abort();
      updateProgress(op.id, { isCancelled: true, stage: 'cancelled' });
    });
  }, [operations, updateProgress]);

  /**
   * Retry a failed file
   */
  const retryFile = useCallback((fileId: string, operationId?: string) => {
    const targetId = operationId || operations[operations.length - 1]?.id;
    if (!targetId) return;

    setOperations(prev => prev.map(op => {
      if (op.id !== targetId) return op;
      const updatedFiles = op.progress.files.map(f =>
        f.id === fileId ? { ...f, status: 'pending' as const, error: undefined, progress: 0 } : f
      );
      const updatedProgress = { ...op.progress, files: updatedFiles };
      const updatedOp = { ...op, progress: updatedProgress };
      operationRefs.current.set(targetId, updatedOp);
      return updatedOp;
    }));
  }, [operations]);

  /**
   * Start a new ingest operation
   */
  const startIngest = useCallback(async <T extends IngestResult>(
    ingestFn: (options: IngestProgressOptions) => Promise<T>,
    operationId?: string
  ): Promise<T> => {
    const id = operationId || `ingest-${Date.now()}`;
    const abortController = new AbortController();

    // Create initial operation state
    const operation: IngestOperation = {
      id,
      abortController,
      isPaused: false,
      progress: {
        operationId: id,
        stage: 'scanning',
        stageProgress: 0,
        filesTotal: 0,
        filesCompleted: 0,
        filesProcessing: 0,
        filesError: 0,
        files: [],
        speed: 0,
        etaSeconds: 0,
        startedAt: Date.now(),
        updatedAt: Date.now(),
        isPaused: false,
        isCancelled: false,
        activityLog: [{
          timestamp: Date.now(),
          level: 'info',
          message: 'Ingest operation started'
        }],
        overallProgress: 0
      }
    };

    operationRefs.current.set(id, operation);
    setOperations(prev => [...prev, operation]);

    try {
      // Create progress options with pause support
      const progressOptions: IngestProgressOptions = {
        signal: abortController.signal,
        paused: false,
        onProgress: (p: IngestProgress) => {
          updateProgress(id, p);

          // Check if we should pause
          const currentOp = operationRefs.current.get(id);
          if (currentOp?.isPaused) {
            // Wait for resume
            return new Promise<void>(resolve => {
              const checkInterval = setInterval(() => {
                const op = operationRefs.current.get(id);
                if (!op?.isPaused) {
                  clearInterval(checkInterval);
                  resolve();
                }
              }, 100);
            });
          }
        }
      };

      const result = await ingestFn(progressOptions);

      // Mark as complete
      updateProgress(id, {
        stage: 'complete',
        stageProgress: 100,
        overallProgress: 100
      });

      return result;
    } catch (error) {
      // Mark as error
      updateProgress(id, {
        stage: 'error',
        isCancelled: abortController.signal.aborted
      });
      throw error;
    }
  }, [updateProgress]);

  /**
   * Get progress for a specific operation
   */
  const getOperationProgress = useCallback((operationId: string): IngestProgress | null => {
    return operationRefs.current.get(operationId)?.progress || null;
  }, []);

  /**
   * Clear completed operations from tracking
   */
  const clearCompleted = useCallback(() => {
    setOperations(prev => {
      const active = prev.filter(op =>
        op.progress.stage !== 'complete' &&
        op.progress.stage !== 'cancelled' &&
        op.progress.stage !== 'error'
      );
      // Clean up refs for removed operations
      prev.forEach(op => {
        if (!active.find(a => a.id === op.id)) {
          operationRefs.current.delete(op.id);
        }
      });
      return active;
    });
  }, []);

  const controls: IngestControls = {
    pause,
    resume,
    cancel,
    cancelAll,
    retryFile
  };

  return {
    aggregate,
    progress,
    operations,
    controls,
    startIngest,
    getOperationProgress,
    clearCompleted
  };
}

export default useIngestProgress;
