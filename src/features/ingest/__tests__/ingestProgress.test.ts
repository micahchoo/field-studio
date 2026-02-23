import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { IngestProgressStore } from '@/src/shared/lib/hooks/ingestProgress.svelte';

describe('IngestProgressStore', () => {
  let store: IngestProgressStore;

  beforeEach(() => {
    store = new IngestProgressStore();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // 1. Initial state
  // --------------------------------------------------------------------------

  describe('initial state', () => {
    it('operations starts as an empty array', () => {
      expect(store.operations).toEqual([]);
      expect(store.operations).toHaveLength(0);
    });

    it('isActive is false', () => {
      expect(store.isActive).toBe(false);
    });

    it('aggregate shows all zeros and inactive', () => {
      const agg = store.aggregate;
      expect(agg.totalOperations).toBe(0);
      expect(agg.completedOperations).toBe(0);
      expect(agg.totalFiles).toBe(0);
      expect(agg.completedFiles).toBe(0);
      expect(agg.failedFiles).toBe(0);
      expect(agg.overallProgress).toBe(0);
      expect(agg.estimatedTimeRemaining).toBeNull();
      expect(agg.isActive).toBe(false);
    });

    it('log starts empty', () => {
      expect(store.log).toEqual([]);
      expect(store.log).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // 2. startOperation
  // --------------------------------------------------------------------------

  describe('startOperation', () => {
    it('creates operation with correct id and label', () => {
      store.startOperation('op-1', 'Import photos', 10);
      const ops = store.operations;
      expect(ops).toHaveLength(1);
      expect(ops[0].id).toBe('op-1');
      expect(ops[0].label).toBe('Import photos');
    });

    it('sets status to running', () => {
      store.startOperation('op-1', 'Import', 5);
      expect(store.operations[0].status).toBe('running');
    });

    it('sets progress to 0 with correct file counts', () => {
      store.startOperation('op-1', 'Import', 42);
      const op = store.operations[0];
      expect(op.progress).toBe(0);
      expect(op.filesTotal).toBe(42);
      expect(op.filesCompleted).toBe(0);
      expect(op.filesFailed).toBe(0);
    });

    it('adds operation to the operations list', () => {
      store.startOperation('op-1', 'First batch', 10);
      store.startOperation('op-2', 'Second batch', 20);
      expect(store.operations).toHaveLength(2);
      const ids = store.operations.map((o) => o.id);
      expect(ids).toContain('op-1');
      expect(ids).toContain('op-2');
    });

    it('logs start event with label and file count', () => {
      store.startOperation('op-1', 'My Upload', 15);
      expect(store.log).toHaveLength(1);
      const entry = store.log[0];
      expect(entry.message).toContain('Started');
      expect(entry.message).toContain('My Upload');
      expect(entry.message).toContain('15');
      expect(entry.level).toBe('info');
      expect(entry.timestamp).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // 3. updateProgress
  // --------------------------------------------------------------------------

  describe('updateProgress', () => {
    beforeEach(() => {
      store.startOperation('op-1', 'Import', 10);
    });

    it('updates filesCompleted count', () => {
      store.updateProgress('op-1', 5);
      expect(store.operations[0].filesCompleted).toBe(5);
    });

    it('recalculates progress fraction', () => {
      store.updateProgress('op-1', 3);
      // progress = (3 + 0) / 10 = 0.3
      expect(store.operations[0].progress).toBeCloseTo(0.3);
    });

    it('auto-completes when all files processed (no failures)', () => {
      store.updateProgress('op-1', 10);
      const op = store.operations[0];
      expect(op.status).toBe('completed');
      expect(op.progress).toBe(1);
    });

    it('sets status to completed on auto-complete', () => {
      store.updateProgress('op-1', 10);
      expect(store.operations[0].status).toBe('completed');
    });

    it('sets progress to 1 on auto-complete', () => {
      store.updateProgress('op-1', 10);
      expect(store.operations[0].progress).toBe(1);
    });

    it('handles filesFailed in progress calculation', () => {
      store.updateProgress('op-1', 5, 3);
      const op = store.operations[0];
      // progress = (5 + 3) / 10 = 0.8
      expect(op.progress).toBeCloseTo(0.8);
      expect(op.filesFailed).toBe(3);
      expect(op.filesCompleted).toBe(5);
    });

    it('auto-completes when completed + failed equals total', () => {
      store.updateProgress('op-1', 7, 3);
      // 7 + 3 = 10 = filesTotal, so auto-complete
      const op = store.operations[0];
      expect(op.status).toBe('completed');
      expect(op.progress).toBe(1);
    });

    it('logs completion on auto-complete with warn level when failures exist', () => {
      store.updateProgress('op-1', 8, 2);
      // Find the completion log entry (not the start entry)
      const completionLog = store.log.find((e) => e.message.includes('Completed'));
      expect(completionLog).toBeDefined();
      expect(completionLog!.level).toBe('warn');
      expect(completionLog!.message).toContain('8 ok');
      expect(completionLog!.message).toContain('2 failed');
    });

    it('logs completion with info level when no failures', () => {
      store.updateProgress('op-1', 10, 0);
      const completionLog = store.log.find((e) => e.message.includes('Completed'));
      expect(completionLog).toBeDefined();
      expect(completionLog!.level).toBe('info');
    });

    it('ignores update for non-running operation (completed)', () => {
      store.completeOperation('op-1');
      const progressBefore = store.operations[0].progress;
      store.updateProgress('op-1', 5);
      // Should remain unchanged since op is completed
      expect(store.operations[0].progress).toBe(progressBefore);
    });

    it('ignores update for non-existent operation', () => {
      // Should not throw
      store.updateProgress('nonexistent', 5);
      expect(store.operations).toHaveLength(1); // only the original op-1
    });
  });

  // --------------------------------------------------------------------------
  // 4. completeOperation
  // --------------------------------------------------------------------------

  describe('completeOperation', () => {
    beforeEach(() => {
      store.startOperation('op-1', 'Import', 10);
    });

    it('sets status to completed', () => {
      store.completeOperation('op-1');
      expect(store.operations[0].status).toBe('completed');
    });

    it('sets progress to 1', () => {
      store.updateProgress('op-1', 3);
      store.completeOperation('op-1');
      expect(store.operations[0].progress).toBe(1);
    });

    it('logs completion', () => {
      store.completeOperation('op-1');
      const completionLog = store.log.find((e) => e.message.includes('Completed'));
      expect(completionLog).toBeDefined();
      expect(completionLog!.level).toBe('info');
      expect(completionLog!.message).toContain('Import');
    });
  });

  // --------------------------------------------------------------------------
  // 5. failOperation
  // --------------------------------------------------------------------------

  describe('failOperation', () => {
    beforeEach(() => {
      store.startOperation('op-1', 'Import', 10);
    });

    it('sets status to failed', () => {
      store.failOperation('op-1', 'Disk full');
      expect(store.operations[0].status).toBe('failed');
    });

    it('attaches error message', () => {
      store.failOperation('op-1', 'Network timeout');
      expect(store.operations[0].error).toBe('Network timeout');
    });

    it('logs failure with error text', () => {
      store.failOperation('op-1', 'Out of memory');
      const failLog = store.log.find((e) => e.message.includes('Failed'));
      expect(failLog).toBeDefined();
      expect(failLog!.level).toBe('error');
      expect(failLog!.message).toContain('Out of memory');
      expect(failLog!.message).toContain('Import');
    });
  });

  // --------------------------------------------------------------------------
  // 6. pauseOperation
  // --------------------------------------------------------------------------

  describe('pauseOperation', () => {
    beforeEach(() => {
      store.startOperation('op-1', 'Import', 10);
    });

    it('pauses a running operation', () => {
      store.pauseOperation('op-1');
      expect(store.operations[0].status).toBe('paused');
    });

    it('ignores if not running (e.g., completed)', () => {
      store.completeOperation('op-1');
      store.pauseOperation('op-1');
      expect(store.operations[0].status).toBe('completed');
    });

    it('logs pause event', () => {
      store.pauseOperation('op-1');
      const pauseLog = store.log.find((e) => e.message.includes('Paused'));
      expect(pauseLog).toBeDefined();
      expect(pauseLog!.level).toBe('info');
      expect(pauseLog!.message).toContain('Import');
    });
  });

  // --------------------------------------------------------------------------
  // 7. resumeOperation
  // --------------------------------------------------------------------------

  describe('resumeOperation', () => {
    beforeEach(() => {
      store.startOperation('op-1', 'Import', 10);
    });

    it('resumes a paused operation', () => {
      store.pauseOperation('op-1');
      expect(store.operations[0].status).toBe('paused');
      store.resumeOperation('op-1');
      expect(store.operations[0].status).toBe('running');
    });

    it('ignores if not paused (e.g., running)', () => {
      // op is running, not paused
      store.resumeOperation('op-1');
      expect(store.operations[0].status).toBe('running');
      // Should not add a resume log entry (only start log exists)
      const resumeLogs = store.log.filter((e) => e.message.includes('Resumed'));
      expect(resumeLogs).toHaveLength(0);
    });

    it('logs resume event', () => {
      store.pauseOperation('op-1');
      store.resumeOperation('op-1');
      const resumeLog = store.log.find((e) => e.message.includes('Resumed'));
      expect(resumeLog).toBeDefined();
      expect(resumeLog!.level).toBe('info');
      expect(resumeLog!.message).toContain('Import');
    });
  });

  // --------------------------------------------------------------------------
  // 8. cancelOperation
  // --------------------------------------------------------------------------

  describe('cancelOperation', () => {
    it('cancels a running operation', () => {
      store.startOperation('op-1', 'Import', 10);
      store.cancelOperation('op-1');
      expect(store.operations[0].status).toBe('cancelled');
    });

    it('cancels a paused operation', () => {
      store.startOperation('op-1', 'Import', 10);
      store.pauseOperation('op-1');
      store.cancelOperation('op-1');
      expect(store.operations[0].status).toBe('cancelled');
    });

    it('logs cancellation', () => {
      store.startOperation('op-1', 'Import', 10);
      store.cancelOperation('op-1');
      const cancelLog = store.log.find((e) => e.message.includes('Cancelled'));
      expect(cancelLog).toBeDefined();
      expect(cancelLog!.level).toBe('warn');
      expect(cancelLog!.message).toContain('Import');
    });

    it('ignores a completed operation', () => {
      store.startOperation('op-1', 'Import', 10);
      store.completeOperation('op-1');
      store.cancelOperation('op-1');
      // Status should remain completed
      expect(store.operations[0].status).toBe('completed');
    });
  });

  // --------------------------------------------------------------------------
  // 9. cancelAll
  // --------------------------------------------------------------------------

  describe('cancelAll', () => {
    it('cancels all active operations', () => {
      store.startOperation('op-1', 'Batch 1', 10);
      store.startOperation('op-2', 'Batch 2', 20);
      store.startOperation('op-3', 'Batch 3', 5);
      store.pauseOperation('op-3');

      store.cancelAll();

      expect(store.operations[0].status).toBe('cancelled');
      expect(store.operations[1].status).toBe('cancelled');
      expect(store.operations[2].status).toBe('cancelled');
    });

    it('leaves completed operations unchanged', () => {
      store.startOperation('op-1', 'Done one', 10);
      store.startOperation('op-2', 'Still running', 20);
      store.completeOperation('op-1');

      store.cancelAll();

      const opById = (id: string) => store.operations.find((o) => o.id === id)!;
      expect(opById('op-1').status).toBe('completed');
      expect(opById('op-2').status).toBe('cancelled');
    });

    it('logs cancellation count', () => {
      store.startOperation('op-1', 'A', 5);
      store.startOperation('op-2', 'B', 5);
      store.completeOperation('op-1');

      store.cancelAll();

      const cancelAllLog = store.log.find(
        (e) => e.message.includes('Cancelled') && e.message.includes('operation(s)')
      );
      expect(cancelAllLog).toBeDefined();
      expect(cancelAllLog!.message).toContain('1 operation(s)');
      expect(cancelAllLog!.level).toBe('warn');
    });
  });

  // --------------------------------------------------------------------------
  // 10. clearCompleted
  // --------------------------------------------------------------------------

  describe('clearCompleted', () => {
    it('removes completed operations', () => {
      store.startOperation('op-1', 'Done', 10);
      store.completeOperation('op-1');
      store.startOperation('op-2', 'Running', 20);

      store.clearCompleted();

      expect(store.operations).toHaveLength(1);
      expect(store.operations[0].id).toBe('op-2');
    });

    it('removes failed operations', () => {
      store.startOperation('op-1', 'Failed one', 10);
      store.failOperation('op-1', 'Error');
      store.startOperation('op-2', 'Running', 20);

      store.clearCompleted();

      expect(store.operations).toHaveLength(1);
      expect(store.operations[0].id).toBe('op-2');
    });

    it('removes cancelled operations', () => {
      store.startOperation('op-1', 'Cancelled one', 10);
      store.cancelOperation('op-1');
      store.startOperation('op-2', 'Running', 20);

      store.clearCompleted();

      expect(store.operations).toHaveLength(1);
      expect(store.operations[0].id).toBe('op-2');
    });

    it('keeps running and paused operations', () => {
      store.startOperation('op-running', 'Running', 10);
      store.startOperation('op-paused', 'Paused', 10);
      store.startOperation('op-done', 'Done', 10);
      store.startOperation('op-failed', 'Failed', 10);
      store.startOperation('op-cancelled', 'Cancelled', 10);

      store.pauseOperation('op-paused');
      store.completeOperation('op-done');
      store.failOperation('op-failed', 'err');
      store.cancelOperation('op-cancelled');

      store.clearCompleted();

      const ids = store.operations.map((o) => o.id);
      expect(ids).toContain('op-running');
      expect(ids).toContain('op-paused');
      expect(ids).not.toContain('op-done');
      expect(ids).not.toContain('op-failed');
      expect(ids).not.toContain('op-cancelled');
      expect(store.operations).toHaveLength(2);
    });
  });

  // --------------------------------------------------------------------------
  // 11. aggregate
  // --------------------------------------------------------------------------

  describe('aggregate', () => {
    it('sums totalFiles across operations', () => {
      store.startOperation('op-1', 'A', 10);
      store.startOperation('op-2', 'B', 25);
      store.startOperation('op-3', 'C', 15);

      expect(store.aggregate.totalFiles).toBe(50);
    });

    it('counts completedOperations', () => {
      store.startOperation('op-1', 'A', 10);
      store.startOperation('op-2', 'B', 5);
      store.startOperation('op-3', 'C', 5);
      store.completeOperation('op-1');
      store.completeOperation('op-3');

      expect(store.aggregate.completedOperations).toBe(2);
      expect(store.aggregate.totalOperations).toBe(3);
    });

    it('calculates overallProgress as completedFiles / totalFiles', () => {
      store.startOperation('op-1', 'A', 10);
      store.startOperation('op-2', 'B', 10);
      store.updateProgress('op-1', 5);
      store.updateProgress('op-2', 3);

      // completedFiles = 5 + 3 = 8, totalFiles = 20
      expect(store.aggregate.overallProgress).toBeCloseTo(0.4);
    });

    it('isActive is true when any operation is running', () => {
      store.startOperation('op-1', 'A', 10);
      store.startOperation('op-2', 'B', 5);
      store.completeOperation('op-2');

      // op-1 is still running
      expect(store.aggregate.isActive).toBe(true);
      expect(store.isActive).toBe(true);
    });

    it('isActive is false when all operations are completed', () => {
      store.startOperation('op-1', 'A', 10);
      store.startOperation('op-2', 'B', 5);
      store.completeOperation('op-1');
      store.completeOperation('op-2');

      expect(store.aggregate.isActive).toBe(false);
      expect(store.isActive).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 12. log
  // --------------------------------------------------------------------------

  describe('log', () => {
    it('accumulates log entries across operations', () => {
      store.startOperation('op-1', 'A', 10); // +1 log
      store.startOperation('op-2', 'B', 5);  // +1 log
      store.pauseOperation('op-1');            // +1 log

      expect(store.log).toHaveLength(3);
    });

    it('each entry has timestamp, message, and level', () => {
      store.startOperation('op-1', 'Test', 5);
      const entry = store.log[0];
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('message');
      expect(entry).toHaveProperty('level');
      expect(typeof entry.timestamp).toBe('number');
      expect(typeof entry.message).toBe('string');
      expect(['info', 'warn', 'error']).toContain(entry.level);
    });

    it('caps at 500 entries, dropping oldest', () => {
      // Add 499 entries via start operations (each startOperation adds 1 log)
      for (let i = 0; i < 499; i++) {
        store.startOperation(`fill-${i}`, `Fill ${i}`, 1);
      }
      expect(store.log).toHaveLength(499);

      // The oldest entry should reference "Fill 0"
      expect(store.log[0].message).toContain('Fill 0');

      // Add entry 500: length is 499 < 500, so it appends normally
      store.completeOperation('fill-0');
      expect(store.log).toHaveLength(500);
      // "Fill 0" start is still at index 0
      expect(store.log[0].message).toContain('Fill 0');

      // Add entry 501: length is now 500 >= 500, triggers cap
      // slice(-(499)) drops index 0, keeps indices 1..499 + new entry = 500 total
      store.completeOperation('fill-1');
      expect(store.log).toHaveLength(500);

      // The oldest entry ("Fill 0" start) has been dropped; now starts at "Fill 1"
      expect(store.log[0].message).toContain('Fill 1');
      // The last two entries are the completion logs
      expect(store.log[499].message).toContain('Completed');
    });
  });

  // --------------------------------------------------------------------------
  // 13. ETA calculation (aggregate.estimatedTimeRemaining)
  // --------------------------------------------------------------------------

  describe('ETA calculation', () => {
    it('returns null when no running operations', () => {
      expect(store.aggregate.estimatedTimeRemaining).toBeNull();

      store.startOperation('op-1', 'Done', 10);
      store.completeOperation('op-1');
      expect(store.aggregate.estimatedTimeRemaining).toBeNull();
    });

    it('returns null when no files processed yet', () => {
      store.startOperation('op-1', 'Just started', 10);
      // No updateProgress called, so filesCompleted = 0
      expect(store.aggregate.estimatedTimeRemaining).toBeNull();
    });

    it('returns a reasonable positive number when files are being processed', () => {
      // Use fake timers to control Date.now()
      vi.useFakeTimers();
      const startTime = 1000000;
      vi.setSystemTime(startTime);

      store.startOperation('op-1', 'Processing', 100);

      // Advance time by 10 seconds
      vi.setSystemTime(startTime + 10_000);

      // 50 files done in 10 seconds => rate = 5 files/sec
      // Remaining = 50 files => ETA = 50 / 5 = 10 seconds = 10000ms
      store.updateProgress('op-1', 50);

      const eta = store.aggregate.estimatedTimeRemaining;
      expect(eta).not.toBeNull();
      expect(eta).toBeGreaterThan(0);
      // Expect ~10000ms (50 remaining / (50 processed / 10000ms elapsed))
      expect(eta).toBe(10_000);
    });

    it('returns the maximum ETA across multiple running operations', () => {
      vi.useFakeTimers();
      const startTime = 1000000;
      vi.setSystemTime(startTime);

      store.startOperation('fast', 'Fast op', 100);
      store.startOperation('slow', 'Slow op', 100);

      // Advance 10 seconds
      vi.setSystemTime(startTime + 10_000);

      // Fast: 80 done in 10s => rate = 8/s, remaining = 20 => ETA = 2500ms
      store.updateProgress('fast', 80);
      // Slow: 20 done in 10s => rate = 2/s, remaining = 80 => ETA = 40000ms
      store.updateProgress('slow', 20);

      const eta = store.aggregate.estimatedTimeRemaining;
      expect(eta).not.toBeNull();
      // Bottleneck is slow op at 40000ms
      expect(eta).toBe(40_000);
    });
  });

  // --------------------------------------------------------------------------
  // 14. Edge cases and integration
  // --------------------------------------------------------------------------

  describe('edge cases', () => {
    it('operations are sorted by startedAt ascending', () => {
      vi.useFakeTimers();
      vi.setSystemTime(3000);
      store.startOperation('op-3', 'Third', 5);
      vi.setSystemTime(1000);
      store.startOperation('op-1', 'First', 5);
      vi.setSystemTime(2000);
      store.startOperation('op-2', 'Second', 5);

      const ops = store.operations;
      expect(ops[0].id).toBe('op-1');
      expect(ops[1].id).toBe('op-2');
      expect(ops[2].id).toBe('op-3');
    });

    it('completeOperation on non-existent id does nothing', () => {
      store.completeOperation('nonexistent');
      expect(store.operations).toHaveLength(0);
    });

    it('failOperation on non-existent id does nothing', () => {
      store.failOperation('nonexistent', 'Error');
      expect(store.operations).toHaveLength(0);
    });

    it('pauseOperation on non-existent id does nothing', () => {
      store.pauseOperation('nonexistent');
      expect(store.operations).toHaveLength(0);
    });

    it('resumeOperation on non-existent id does nothing', () => {
      store.resumeOperation('nonexistent');
      expect(store.operations).toHaveLength(0);
    });

    it('cancelOperation on non-existent id does nothing', () => {
      store.cancelOperation('nonexistent');
      expect(store.operations).toHaveLength(0);
    });

    it('cancelAll with no operations does not log', () => {
      store.cancelAll();
      expect(store.log).toHaveLength(0);
    });

    it('clearCompleted with no operations does nothing', () => {
      store.clearCompleted();
      expect(store.operations).toHaveLength(0);
    });

    it('progress clamped to 1 even if filesCompleted exceeds filesTotal', () => {
      store.startOperation('op-1', 'Over-report', 5);
      store.updateProgress('op-1', 10);
      // progress = min((10 + 0) / 5, 1) = 1, auto-completes
      expect(store.operations[0].progress).toBe(1);
      expect(store.operations[0].status).toBe('completed');
    });

    it('overallProgress is 0 when totalFiles is 0', () => {
      store.startOperation('op-1', 'Empty op', 0);
      expect(store.aggregate.overallProgress).toBe(0);
    });

    it('cancelAll does not affect failed operations', () => {
      store.startOperation('op-1', 'Running', 10);
      store.startOperation('op-2', 'Will fail', 10);
      store.failOperation('op-2', 'err');

      store.cancelAll();

      const opById = (id: string) => store.operations.find((o) => o.id === id)!;
      expect(opById('op-1').status).toBe('cancelled');
      expect(opById('op-2').status).toBe('failed');
    });
  });
});
