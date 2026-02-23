import { useCallback, useEffect, useRef } from 'react';
import type { IIIFItem } from '@/src/shared/types';
import { storage } from '@/src/shared/services/storage';
import { appLog } from '@/src/shared/services/logger';

interface UseAutoSaveParams {
  rootId: string | null;
  saveStatus: 'saved' | 'saving' | 'error';
  autoSaveInterval: number;
  getRootRef: () => IIIFItem | null;
}

/** Debounce delay (ms) after a dirty flag is set before saving */
const DIRTY_DEBOUNCE_MS = 2000;

export function useAutoSave({
  rootId,
  saveStatus,
  autoSaveInterval,
  getRootRef,
}: UseAutoSaveParams): {
  /** Mark the project as having unsaved changes */
  markDirty: () => void;
} {
  const isDirtyRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveFailuresRef = useRef(0);
  const maxFailures = 3;

  const doSave = useCallback(async () => {
    if (!rootId || saveStatus === 'saving') return;
    if (consecutiveFailuresRef.current >= maxFailures) return;

    try {
      const quotaCheck = await storage.isStorageCriticallyFull();
      if (quotaCheck.full) {
        appLog.warn('[AutoSave] Skipped: Storage critically full', quotaCheck.usagePercent);
        return;
      }

      const currentRoot = getRootRef();
      if (currentRoot) {
        await storage.saveProject(currentRoot);
        isDirtyRef.current = false;
        consecutiveFailuresRef.current = 0;
      }
    } catch (error) {
      consecutiveFailuresRef.current++;
      appLog.warn(`[AutoSave] Failed (${consecutiveFailuresRef.current}/${maxFailures}):`, error);

      if (consecutiveFailuresRef.current >= maxFailures) {
        appLog.error('[AutoSave] Disabled after repeated failures');
      }
    }
  }, [rootId, saveStatus, getRootRef]);

  // Debounced save — triggered by markDirty()
  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (isDirtyRef.current) doSave();
    }, DIRTY_DEBOUNCE_MS);
  }, [doSave]);

  // Interval-based save (safety net) — runs every autoSaveInterval seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirtyRef.current && rootId && saveStatus === 'saved') {
        doSave();
      }
    }, autoSaveInterval * 1000);

    return () => clearInterval(interval);
  }, [rootId, autoSaveInterval, saveStatus, doSave]);

  // beforeunload warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return { markDirty };
}
