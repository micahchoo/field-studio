/**
 * useKeyboardDragDrop - Keyboard-accessible drag and drop
 *
 * Provides keyboard-based DnD as an alternative to mouse drag-and-drop.
 * Supports ArrowUp/ArrowDown for navigation, Space to select/deselect,
 * Enter to confirm drop, Escape to cancel.
 *
 * @example
 * const { handlers, state, announce } = useKeyboardDragDrop({
 *   items: manifests,
 *   onReorder: (items) => setManifests(items),
 *   onMove: (itemId, targetId) => handleMove(itemId, targetId),
 *   getItemId: (item) => item.id
 * });
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/** Options for keyboard drag and drop */
export interface KeyboardDragDropOptions<T> {
  /** Array of items that can be dragged/reordered */
  items: T[];
  /** Callback when items are reordered within the same list */
  onReorder: (items: T[]) => void;
  /** Callback when an item is moved to a different target */
  onMove: (itemId: string, targetId: string) => void;
  /** Function to extract unique ID from an item */
  getItemId: (item: T) => string;
  /** Optional: Get the parent ID for hierarchical structures */
  getParentId?: (item: T) => string | null;
  /** Optional: Check if an item can be dropped on another */
  canDropOn?: (draggedId: string, targetId: string) => boolean;
}

/** State of the keyboard drag-drop operation */
export interface KeyboardDragDropState {
  /** ID of the currently focused item */
  focusedId: string | null;
  /** ID of the selected (being dragged) item */
  selectedId: string | null;
  /** Whether a drag operation is in progress */
  isDragging: boolean;
  /** ID of the current drop target */
  dropTargetId: string | null;
  /** Instructions for screen reader users */
  instructions: string;
}

/** Return type from useKeyboardDragDrop hook */
export interface KeyboardDragDropReturn<T> {
  /** Keyboard event handlers to attach to items */
  handlers: {
    /** Handle key down events for keyboard navigation */
    onKeyDown: (e: React.KeyboardEvent, item: T) => void;
    /** Handle focus events */
    onFocus: (item: T) => void;
    /** Handle blur events */
    onBlur: () => void;
  };
  /** Current drag-drop state */
  state: KeyboardDragDropState;
  /** Announce a message to screen readers */
  announce: (message: string) => void;
  /** Reset the drag-drop state */
  reset: () => void;
  /** Set focused item programmatically */
  setFocusedId: (id: string | null) => void;
}

/**
 * Hook for keyboard-accessible drag and drop
 *
 * @param options - Configuration options
 * @returns Handlers, state, and utility functions
 */
export function useKeyboardDragDrop<T>(options: KeyboardDragDropOptions<T>): KeyboardDragDropReturn<T> {
  const { items, onReorder, onMove, getItemId, canDropOn } = options;

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');

  // Ref for the live region element
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  // Track if component is mounted
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Create live region for screen reader announcements
  useEffect(() => {
    // Check if live region already exists
    let liveRegion = document.getElementById('keyboard-dnd-announcer') as HTMLDivElement;
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'keyboard-dnd-announcer';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }
    liveRegionRef.current = liveRegion;

    return () => {
      // Don't remove the live region on unmount as other instances may use it
    };
  }, []);

  /** Announce a message to screen readers */
  const announce = useCallback((message: string) => {
    if (liveRegionRef.current && mountedRef.current) {
      liveRegionRef.current.textContent = message;
      // Clear after announcement to prevent re-announcement
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = '';
        }
      }, 1000);
    }
    setAnnouncement(message);
  }, []);

  /** Get index of an item by ID */
  const getIndex = useCallback((id: string): number => {
    return items.findIndex(item => getItemId(item) === id);
  }, [items, getItemId]);

  /** Check if drop is allowed between two items */
  const canDrop = useCallback((draggedId: string, targetId: string): boolean => {
    if (draggedId === targetId) return false;
    if (canDropOn) return canDropOn(draggedId, targetId);
    return true;
  }, [canDropOn]);

  /** Move item to a new position (reordering) */
  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    onReorder(newItems);
  }, [items, onReorder]);

  /** Handle keyboard navigation and drag-drop */
  const handleKeyDown = useCallback((e: React.KeyboardEvent, item: T) => {
    const itemId = getItemId(item);
    const currentIndex = getIndex(itemId);

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          const prevId = getItemId(items[currentIndex - 1]);
          setFocusedId(prevId);
          if (selectedId && dropTargetId) {
            setDropTargetId(prevId);
            const itemLabel = getItemLabel(items[currentIndex - 1]);
            announce(`Drop target: ${itemLabel}`);
          }
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < items.length - 1) {
          const nextId = getItemId(items[currentIndex + 1]);
          setFocusedId(nextId);
          if (selectedId && dropTargetId) {
            setDropTargetId(nextId);
            const itemLabel = getItemLabel(items[currentIndex + 1]);
            announce(`Drop target: ${itemLabel}`);
          }
        }
        break;

      case ' ':
      case 'Spacebar': // Legacy support
        e.preventDefault();
        if (!selectedId) {
          // Start drag operation
          setSelectedId(itemId);
          setDropTargetId(itemId);
          const itemLabel = getItemLabel(item);
          announce(`${itemLabel} selected. Use arrow keys to choose drop target, Enter to confirm, Escape to cancel.`);
        } else if (selectedId === itemId) {
          // Deselect
          setSelectedId(null);
          setDropTargetId(null);
          const itemLabel = getItemLabel(item);
          announce(`${itemLabel} deselected.`);
        } else {
          // Change drop target
          if (canDrop(selectedId, itemId)) {
            setDropTargetId(itemId);
            const itemLabel = getItemLabel(item);
            announce(`Drop target: ${itemLabel}`);
          } else {
            announce('Cannot drop here');
          }
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedId && dropTargetId && selectedId !== dropTargetId) {
          // Perform the drop
          const fromIndex = getIndex(selectedId);
          const toIndex = getIndex(dropTargetId);
          
          if (canDrop(selectedId, dropTargetId)) {
            // Check if items are in the same list (reorder) or different (move)
            const selectedItem = items[fromIndex];
            const targetItem = items[toIndex];
            
            if (selectedItem && targetItem) {
              // Use onMove for cross-container drops
              onMove(selectedId, dropTargetId);
              const itemLabel = getItemLabel(selectedItem);
              announce(`${itemLabel} moved.`);
            }
          }
          
          setSelectedId(null);
          setDropTargetId(null);
        }
        break;

      case 'Escape':
        e.preventDefault();
        if (selectedId) {
          setSelectedId(null);
          setDropTargetId(null);
          announce('Drag operation cancelled.');
        }
        break;

      case 'Home':
        e.preventDefault();
        if (items.length > 0) {
          const firstId = getItemId(items[0]);
          setFocusedId(firstId);
        }
        break;

      case 'End':
        e.preventDefault();
        if (items.length > 0) {
          const lastId = getItemId(items[items.length - 1]);
          setFocusedId(lastId);
        }
        break;
    }
  }, [items, selectedId, dropTargetId, getIndex, getItemId, canDrop, onMove, announce]);

  /** Handle focus event */
  const handleFocus = useCallback((item: T) => {
    const itemId = getItemId(item);
    setFocusedId(itemId);
  }, [getItemId]);

  /** Handle blur event */
  const handleBlur = useCallback(() => {
    // Keep focusedId for keyboard navigation continuity
    // Don't clear it on blur
  }, []);

  /** Reset the drag-drop state */
  const reset = useCallback(() => {
    setSelectedId(null);
    setDropTargetId(null);
    setFocusedId(null);
  }, []);

  /** Helper to get item label for announcements */
  const getItemLabel = (item: T): string => {
    // Try common label properties
    const anyItem = item as any;
    if (anyItem.label?.none?.[0]) return anyItem.label.none[0];
    if (anyItem.label?.en?.[0]) return anyItem.label.en[0];
    if (anyItem.name) return anyItem.name;
    if (anyItem.title) return anyItem.title;
    return getItemId(item);
  };

  const isDragging = selectedId !== null;

  const instructions = isDragging
    ? 'Use arrow keys to choose drop target, Space to select target, Enter to confirm, Escape to cancel'
    : 'Use arrow keys to navigate, Space to select item for moving';

  return {
    handlers: {
      onKeyDown: handleKeyDown,
      onFocus: handleFocus,
      onBlur: handleBlur
    },
    state: {
      focusedId,
      selectedId,
      isDragging,
      dropTargetId,
      instructions
    },
    announce,
    reset,
    setFocusedId
  };
}

/** Hook for hierarchical/tree keyboard drag and drop */
export function useTreeKeyboardDragDrop<T>(options: KeyboardDragDropOptions<T> & {
  getChildren: (item: T) => T[];
  getParentId: (item: T) => string | null;
  isExpanded: (id: string) => boolean;
  toggleExpanded: (id: string) => void;
}) {
  const {
    items,
    onReorder,
    onMove,
    getItemId,
    getChildren,
    getParentId,
    isExpanded,
    toggleExpanded,
    canDropOn
  } = options;

  const baseHook = useKeyboardDragDrop({ items, onReorder, onMove, getItemId, canDropOn });
  const { handlers: baseHandlers, state, announce, reset, setFocusedId } = baseHook;

  /** Handle tree-specific keyboard navigation */
  const handleKeyDown = useCallback((e: React.KeyboardEvent, item: T) => {
    const itemId = getItemId(item);
    const children = getChildren(item);
    const hasChildren = children.length > 0;
    const expanded = isExpanded(itemId);
    const currentIndex = items.findIndex(i => getItemId(i) === itemId);

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        if (hasChildren && !expanded) {
          toggleExpanded(itemId);
          announce('Expanded');
        } else if (hasChildren && expanded && children.length > 0) {
          // Move to first child
          const firstChildId = getItemId(children[0]);
          setFocusedId(firstChildId);
        }
        return;

      case 'ArrowLeft':
        e.preventDefault();
        if (hasChildren && expanded) {
          toggleExpanded(itemId);
          announce('Collapsed');
        } else {
          // Move to parent
          const parentId = getParentId(item);
          if (parentId) {
            setFocusedId(parentId);
          }
        }
        return;

      case '*':
        // Expand all siblings
        e.preventDefault();
        const parentId = getParentId(item);
        if (parentId) {
          const parent = items.find(i => getItemId(i) === parentId);
          if (parent) {
            const siblings = getChildren(parent);
            siblings.forEach(sibling => {
              const siblingId = getItemId(sibling);
              if (!isExpanded(siblingId)) {
                toggleExpanded(siblingId);
              }
            });
            announce('Expanded all siblings');
          }
        }
        return;
    }

    // Pass to base handler for other keys
    baseHandlers.onKeyDown(e, item);
  }, [baseHandlers, items, getItemId, getChildren, getParentId, isExpanded, toggleExpanded, setFocusedId, announce]);

  return {
    handlers: {
      onKeyDown: handleKeyDown,
      onFocus: baseHandlers.onFocus,
      onBlur: baseHandlers.onBlur
    },
    state,
    announce,
    reset,
    setFocusedId
  };
}

export default useKeyboardDragDrop;
