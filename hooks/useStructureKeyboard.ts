
import { useCallback, useEffect, useRef } from 'react';

export interface UseStructureKeyboardOptions {
  /** Array of item IDs in display order */
  items: string[];
  /** Currently selected item ID */
  selectedId: string | null;
  /** Set of currently selected IDs for multi-select */
  selectedIds: Set<string>;
  /** Callback when selection changes */
  onSelect: (id: string) => void;
  /** Callback for multi-select operations */
  onMultiSelect?: (ids: string[], additive: boolean) => void;
  /** Callback when items should be reordered */
  onReorder?: (direction: 'up' | 'down' | 'start' | 'end') => void;
  /** Callback when items should be deleted */
  onDelete?: (ids: string[]) => void;
  /** Callback when items should be duplicated */
  onDuplicate?: (ids: string[]) => void;
  /** Callback to select all items */
  onSelectAll?: () => void;
  /** Callback to open/activate the selected item */
  onOpen?: (id: string) => void;
  /** Whether keyboard navigation is enabled */
  enabled?: boolean;
}

export interface UseStructureKeyboardResult {
  /** Ref to attach to the container element */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Index of the focused item (for visual focus indicator) */
  focusedIndex: number;
}

/**
 * Hook for keyboard navigation in the Structure view.
 *
 * Supports:
 * - Arrow keys: Navigate items
 * - Enter: Open/activate selected item
 * - Space: Toggle selection
 * - Shift+Arrow: Extend selection
 * - Cmd/Ctrl+A: Select all
 * - Delete/Backspace: Remove selected items
 * - Cmd/Ctrl+D: Duplicate selected items
 * - [ / ]: Reorder backward/forward
 * - Shift+[ / Shift+]: Reorder to start/end
 */
export function useStructureKeyboard(
  options: UseStructureKeyboardOptions
): UseStructureKeyboardResult {
  const {
    items,
    selectedId,
    selectedIds,
    onSelect,
    onMultiSelect,
    onReorder,
    onDelete,
    onDuplicate,
    onSelectAll,
    onOpen,
    enabled = true,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const focusedIndexRef = useRef<number>(-1);

  // Find current index
  const currentIndex = selectedId ? items.indexOf(selectedId) : -1;
  focusedIndexRef.current = currentIndex;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Don't handle if typing in an input
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowLeft': {
        e.preventDefault();
        const prevIndex = Math.max(0, currentIndex - 1);
        if (prevIndex !== currentIndex && items[prevIndex]) {
          if (e.shiftKey && onMultiSelect) {
            // Extend selection
            const rangeIds = items.slice(prevIndex, currentIndex + 1);
            onMultiSelect(rangeIds, true);
          } else {
            onSelect(items[prevIndex]);
          }
        }
        break;
      }

      case 'ArrowDown':
      case 'ArrowRight': {
        e.preventDefault();
        const nextIndex = Math.min(items.length - 1, currentIndex + 1);
        if (nextIndex !== currentIndex && items[nextIndex]) {
          if (e.shiftKey && onMultiSelect) {
            // Extend selection
            const rangeIds = items.slice(currentIndex, nextIndex + 1);
            onMultiSelect(rangeIds, true);
          } else {
            onSelect(items[nextIndex]);
          }
        }
        break;
      }

      case 'Home': {
        e.preventDefault();
        if (items.length > 0) {
          if (e.shiftKey && onMultiSelect) {
            const rangeIds = items.slice(0, currentIndex + 1);
            onMultiSelect(rangeIds, true);
          } else {
            onSelect(items[0]);
          }
        }
        break;
      }

      case 'End': {
        e.preventDefault();
        if (items.length > 0) {
          if (e.shiftKey && onMultiSelect) {
            const rangeIds = items.slice(currentIndex);
            onMultiSelect(rangeIds, true);
          } else {
            onSelect(items[items.length - 1]);
          }
        }
        break;
      }

      case 'Enter': {
        e.preventDefault();
        if (selectedId && onOpen) {
          onOpen(selectedId);
        }
        break;
      }

      case ' ': {
        e.preventDefault();
        if (selectedId && onMultiSelect) {
          onMultiSelect([selectedId], true);
        }
        break;
      }

      case 'a':
      case 'A': {
        if (cmdOrCtrl && onSelectAll) {
          e.preventDefault();
          onSelectAll();
        }
        break;
      }

      case 'd':
      case 'D': {
        if (cmdOrCtrl && onDuplicate && selectedIds.size > 0) {
          e.preventDefault();
          onDuplicate(Array.from(selectedIds));
        }
        break;
      }

      case 'Delete':
      case 'Backspace': {
        if (onDelete && selectedIds.size > 0) {
          e.preventDefault();
          onDelete(Array.from(selectedIds));
        }
        break;
      }

      case '[': {
        if (onReorder && selectedIds.size > 0) {
          e.preventDefault();
          onReorder(e.shiftKey ? 'start' : 'up');
        }
        break;
      }

      case ']': {
        if (onReorder && selectedIds.size > 0) {
          e.preventDefault();
          onReorder(e.shiftKey ? 'end' : 'down');
        }
        break;
      }

      case 'Escape': {
        // Clear selection
        if (onMultiSelect) {
          e.preventDefault();
          onMultiSelect([], false);
        }
        break;
      }

      default:
        break;
    }
  }, [
    enabled,
    items,
    currentIndex,
    selectedId,
    selectedIds,
    onSelect,
    onMultiSelect,
    onReorder,
    onDelete,
    onDuplicate,
    onSelectAll,
    onOpen,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    // Focus the container to receive keyboard events
    if (!container.hasAttribute('tabindex')) {
      container.setAttribute('tabindex', '0');
    }

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  return {
    containerRef,
    focusedIndex: focusedIndexRef.current,
  };
}

/**
 * Keyboard shortcut reference for the Structure view
 */
export const STRUCTURE_KEYBOARD_SHORTCUTS = [
  { key: 'Arrow Keys', action: 'Navigate items' },
  { key: 'Enter', action: 'Open/activate item' },
  { key: 'Space', action: 'Toggle selection' },
  { key: 'Shift+Arrow', action: 'Extend selection' },
  { key: 'Cmd/Ctrl+A', action: 'Select all' },
  { key: 'Delete', action: 'Remove selected' },
  { key: 'Cmd/Ctrl+D', action: 'Duplicate selected' },
  { key: '[', action: 'Move up' },
  { key: ']', action: 'Move down' },
  { key: 'Shift+[', action: 'Move to start' },
  { key: 'Shift+]', action: 'Move to end' },
  { key: 'Escape', action: 'Clear selection' },
] as const;
