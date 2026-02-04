import { useCallback, useState } from 'react';

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useHistory<T>(initialPresent: T, maxHistory = 50) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialPresent,
    future: []
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      const newPast = [...prev.past];
      const newPresent = newPast.pop()!;
      return {
        past: newPast,
        present: newPresent,
        future: [prev.present, ...prev.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      const newFuture = [...prev.future];
      const newPresent = newFuture.shift()!;
      return {
        past: [...prev.past, prev.present],
        present: newPresent,
        future: newFuture
      };
    });
  }, []);

  const update = useCallback((newPresent: T | ((curr: T) => T)) => {
    setHistory(prev => {
      const resolved = typeof newPresent === 'function' ? (newPresent as any)(prev.present) : newPresent;
      
      // Basic equality check to avoid duplicate history entries
      if (JSON.stringify(resolved) === JSON.stringify(prev.present)) return prev;

      return {
        past: [...prev.past.slice(-maxHistory + 1), prev.present],
        present: resolved,
        future: []
      };
    });
  }, [maxHistory]);

  const set = useCallback((newPresent: T) => {
      setHistory({ past: [], present: newPresent, future: [] });
  }, []);

  return { 
      state: history.present, 
      update, 
      set, 
      undo, 
      redo, 
      canUndo, 
      canRedo,
      historyState: history 
  };
}
