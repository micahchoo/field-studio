/**
 * useMultiSelect Hook
 *
 * Manages multi-item selection state for the board canvas.
 *
 * @module features/board-design/hooks/useMultiSelect
 */

import { useCallback, useState } from 'react';
import type { BoardItem } from '../model';

export interface UseMultiSelectReturn {
  selectedIds: Set<string>;
  toggleItem: (id: string, shiftKey: boolean) => void;
  selectItems: (ids: string[]) => void;
  clearSelection: () => void;
  selectAll: (items: BoardItem[]) => void;
  deleteSelected: (removeItem: (id: string) => void) => void;
  moveSelected: (dx: number, dy: number, moveItem: (id: string, pos: { x: number; y: number }) => void, items: BoardItem[]) => void;
}

export function useMultiSelect(): UseMultiSelectReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleItem = useCallback((id: string, shiftKey: boolean) => {
    setSelectedIds(prev => {
      if (shiftKey) {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }
      return new Set([id]);
    });
  }, []);

  const selectItems = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectAll = useCallback((items: BoardItem[]) => {
    setSelectedIds(new Set(items.map(i => i.id)));
  }, []);

  const deleteSelected = useCallback((removeItem: (id: string) => void) => {
    selectedIds.forEach(id => removeItem(id));
    setSelectedIds(new Set());
  }, [selectedIds]);

  const moveSelected = useCallback((
    dx: number,
    dy: number,
    moveItem: (id: string, pos: { x: number; y: number }) => void,
    items: BoardItem[],
  ) => {
    selectedIds.forEach(id => {
      const item = items.find(i => i.id === id);
      if (item) moveItem(id, { x: item.x + dx, y: item.y + dy });
    });
  }, [selectedIds]);

  return { selectedIds, toggleItem, selectItems, clearSelection, selectAll, deleteSelected, moveSelected };
}
