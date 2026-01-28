/**
 * useSharedSelection - Lifted selection state for cross-view persistence
 * 
 * Addresses Issue 2.3: Multi-select lost on view switch
 * Provides global selection state that persists across view navigation
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { IIIFItem } from '../types';

interface SelectionState {
  selectedIds: Set<string>;
  lastClickedId: string | null;
  selectionAnchor: string | null;
}

interface UseSharedSelectionReturn extends SelectionState {
  // Basic selection
  select: (id: string) => void;
  deselect: (id: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
  
  // Range selection
  selectRange: (fromId: string, toId: string, allIds: string[]) => void;
  
  // Multi-selection with modifier
  handleSelectWithModifier: (
    id: string,
    event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean },
    allItems: IIIFItem[]
  ) => void;
  
  // Batch operations
  selectAll: (ids: string[]) => void;
  setSelection: (ids: string[]) => void;
  
  // Derived
  isSelected: (id: string) => boolean;
  selectedCount: number;
}

const STORAGE_KEY = 'field-studio-selection';

export function useSharedSelection(
  persist: boolean = true
): UseSharedSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);
  
  // Load persisted selection on mount
  useEffect(() => {
    if (!persist) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedIds) {
          setSelectedIds(new Set(parsed.selectedIds));
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [persist]);
  
  // Persist selection changes
  useEffect(() => {
    if (!persist) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        selectedIds: Array.from(selectedIds),
        timestamp: Date.now()
      }));
    } catch {
      // Ignore storage errors
    }
  }, [selectedIds, persist]);
  
  const select = useCallback((id: string) => {
    setSelectedIds(prev => new Set([...prev, id]));
    setLastClickedId(id);
    if (!selectionAnchor) setSelectionAnchor(id);
  }, [selectionAnchor]);
  
  const deselect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);
  
  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setLastClickedId(id);
  }, []);
  
  const clear = useCallback(() => {
    setSelectedIds(new Set());
    setLastClickedId(null);
    setSelectionAnchor(null);
  }, []);
  
  const selectRange = useCallback((fromId: string, toId: string, allIds: string[]) => {
    const fromIndex = allIds.indexOf(fromId);
    const toIndex = allIds.indexOf(toId);
    
    if (fromIndex === -1 || toIndex === -1) return;
    
    const [start, end] = fromIndex <= toIndex 
      ? [fromIndex, toIndex] 
      : [toIndex, fromIndex];
    
    const rangeIds = allIds.slice(start, end + 1);
    
    setSelectedIds(prev => {
      const next = new Set(prev);
      rangeIds.forEach(id => next.add(id));
      return next;
    });
  }, []);
  
  const handleSelectWithModifier = useCallback((
    id: string,
    event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean },
    allItems: IIIFItem[]
  ) => {
    const allIds = allItems.map(item => item.id);
    
    if (event.shiftKey && lastClickedId) {
      // Range selection
      selectRange(lastClickedId, id, allIds);
    } else if (event.metaKey || event.ctrlKey) {
      // Toggle selection
      toggle(id);
    } else {
      // Single select
      setSelectedIds(new Set([id]));
      setSelectionAnchor(id);
    }
    
    setLastClickedId(id);
  }, [lastClickedId, selectRange, toggle]);
  
  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);
  
  const setSelection = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
    setSelectionAnchor(ids[0] || null);
    setLastClickedId(ids[ids.length - 1] || null);
  }, []);
  
  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);
  
  return {
    selectedIds,
    lastClickedId,
    selectionAnchor,
    select,
    deselect,
    toggle,
    clear,
    selectRange,
    handleSelectWithModifier,
    selectAll,
    setSelection,
    isSelected,
    selectedCount: selectedIds.size
  };
}

export default useSharedSelection;
