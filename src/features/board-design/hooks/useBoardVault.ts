/**
 * useBoardVault Hook
 *
 * Bridge between board UI state and IIIF vault persistence.
 * Maintains local BoardState with undo/redo, syncs to vault for persistence.
 *
 * Flow:
 * 1. On load: reads vault → manifestToBoardState → local state
 * 2. On mutation: updates local state (with undo) → debounced sync to vault
 * 3. On save: boardStateToManifest → vault dispatch → auto-save picks it up
 *
 * @module features/board-design/hooks/useBoardVault
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IIIFItem, IIIFManifest } from '@/src/shared/types';
import { useHistory } from '@/src/shared/lib/hooks/useHistory';
import type { BoardState, BoardItem, Connection, ConnectionType, BoardGroup } from '../model';
import {
  createBoardItem,
  createConnection,
  createInitialBoardState,
  calculateAnchorPoints,
  getConnectionLabel,
  snapToGrid,
} from '../model';
import {
  boardStateToManifest,
  manifestToBoardState,
  generateBoardId,
  isBoardManifest,
} from '../model/iiif-bridge';

export interface UseBoardVaultOptions {
  /** Root IIIF item to scan for existing boards */
  root: IIIFItem | null;
  /** Whether snap-to-grid is enabled */
  snapEnabled?: boolean;
  /** Whether user is in advanced terminology mode */
  isAdvanced?: boolean;
  /** Callback for saving the board manifest to persistence */
  onSave?: (manifest: IIIFManifest) => void;
}

export interface UseBoardVaultReturn {
  /** Current board state */
  boardState: BoardState;
  /** Current board ID (manifest ID) */
  boardId: string | null;
  /** List of available board IDs found in root */
  availableBoardIds: string[];
  /** Whether the board has unsaved changes */
  isDirty: boolean;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;

  // CRUD operations
  createBoard: (title: string, behavior?: string[], viewingDirection?: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top') => string;
  loadBoard: (boardId: string) => void;
  addItem: (resource: IIIFItem, position: { x: number; y: number }) => BoardItem;
  moveItem: (itemId: string, position: { x: number; y: number }) => void;
  resizeItem: (itemId: string, size: { w: number; h: number }) => void;
  removeItem: (itemId: string) => void;
  addConnection: (fromId: string, toId: string, type: ConnectionType) => Connection | null;
  removeConnection: (connId: string) => void;
  addNote: (text: string, position: { x: number; y: number }) => BoardItem;
  updateNote: (noteId: string, text: string) => void;
  updateTitle: (title: string) => void;

  // Groups
  createGroup: (label: string, itemIds: string[], color?: string) => BoardGroup;
  removeGroup: (groupId: string) => void;
  addItemToGroup: (groupId: string, itemId: string) => void;
  removeItemFromGroup: (groupId: string, itemId: string) => void;

  // History
  undo: () => void;
  redo: () => void;

  // Persistence
  save: () => IIIFManifest | null;
  exportManifest: () => IIIFManifest | null;
}

/**
 * Hook for vault-backed board state management
 */
export function useBoardVault({
  root,
  snapEnabled = false,
  isAdvanced = false,
  onSave,
}: UseBoardVaultOptions): UseBoardVaultReturn {
  const [boardId, setBoardId] = useState<string | null>(null);
  const [boardTitle, setBoardTitle] = useState('Board Design');
  const [boardBehavior, setBoardBehavior] = useState<string[]>(['individuals']);
  const [boardViewingDirection, setBoardViewingDirection] = useState<'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top' | undefined>(undefined);
  const [isDirty, setIsDirty] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local board state with undo/redo
  const {
    state: boardState,
    update: updateBoard,
    set: setBoard,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<BoardState>(createInitialBoardState());

  // Scan root for existing board manifests
  const availableBoardIds = useMemo(() => {
    if (!root) return [];
    const ids: string[] = [];
    const scan = (node: IIIFItem) => {
      if (node.type === 'Manifest' && isBoardManifest(node as IIIFManifest)) {
        ids.push(node.id);
      }
      const items = (node as { items?: IIIFItem[] }).items;
      if (items) items.forEach(scan);
    };
    scan(root);
    return ids;
  }, [root]);

  // Debounced auto-save
  const scheduleSave = useCallback(() => {
    setIsDirty(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setIsDirty(false);
    }, 2000);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Create a new board
  const createBoard = useCallback((title: string, behavior?: string[], viewingDirection?: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top'): string => {
    const id = generateBoardId();
    setBoardId(id);
    setBoardTitle(title);
    setBoardBehavior(behavior || ['individuals']);
    setBoardViewingDirection(viewingDirection);
    setBoard(createInitialBoardState());
    scheduleSave();
    return id;
  }, [setBoard, scheduleSave]);

  // Load an existing board from root
  const loadBoard = useCallback((id: string) => {
    if (!root) return;
    // Find the manifest in the tree
    let found: IIIFManifest | null = null;
    const scan = (node: IIIFItem) => {
      if (node.id === id && node.type === 'Manifest') {
        found = node as IIIFManifest;
        return;
      }
      const items = (node as { items?: IIIFItem[] }).items;
      if (items) items.forEach(scan);
    };
    scan(root);

    if (found) {
      const state = manifestToBoardState(found);
      setBoardId(id);
      const label = (found as IIIFManifest).label;
      setBoardTitle(label?.en?.[0] || 'Board Design');
      setBoardBehavior((found as IIIFManifest & { behavior?: string[] }).behavior || ['individuals']);
      setBoardViewingDirection((found as IIIFManifest).viewingDirection);
      setBoard(state);
    }
  }, [root, setBoard]);

  // Add a board item
  const addItem = useCallback((resource: IIIFItem, position: { x: number; y: number }): BoardItem => {
    const pos = snapEnabled ? snapToGrid(position) : position;
    const newItem = createBoardItem(resource, pos);
    updateBoard((current) => ({
      ...current,
      items: [...current.items, newItem],
    }));
    scheduleSave();
    return newItem;
  }, [snapEnabled, updateBoard, scheduleSave]);

  // Move an item
  const moveItem = useCallback((itemId: string, position: { x: number; y: number }) => {
    const pos = snapEnabled ? snapToGrid(position) : position;
    updateBoard((current) => ({
      ...current,
      items: current.items.map(item =>
        item.id === itemId ? { ...item, x: pos.x, y: pos.y } : item
      ),
    }));
    scheduleSave();
  }, [snapEnabled, updateBoard, scheduleSave]);

  // Resize an item
  const resizeItem = useCallback((itemId: string, size: { w: number; h: number }) => {
    updateBoard((current) => ({
      ...current,
      items: current.items.map(item =>
        item.id === itemId ? { ...item, w: Math.max(80, size.w), h: Math.max(60, size.h) } : item
      ),
    }));
    scheduleSave();
  }, [updateBoard, scheduleSave]);

  // Remove an item and cascading connections + group membership
  const removeItem = useCallback((itemId: string) => {
    updateBoard((current) => ({
      ...current,
      items: current.items.filter(item => item.id !== itemId),
      connections: current.connections.filter(
        conn => conn.fromId !== itemId && conn.toId !== itemId
      ),
      groups: current.groups.map(g => ({
        ...g,
        itemIds: g.itemIds.filter(id => id !== itemId),
      })).filter(g => g.itemIds.length > 0),
    }));
    scheduleSave();
  }, [updateBoard, scheduleSave]);

  // Add a connection
  const addConnection = useCallback((fromId: string, toId: string, type: ConnectionType): Connection | null => {
    let newConn: Connection | null = null;
    updateBoard((current) => {
      const fromItem = current.items.find(i => i.id === fromId);
      const toItem = current.items.find(i => i.id === toId);
      if (!fromItem || !toItem) return current;

      const anchors = calculateAnchorPoints(fromItem, toItem);
      newConn = createConnection(fromId, toId, type, {
        fromAnchor: anchors.from,
        toAnchor: anchors.to,
        label: getConnectionLabel(type, isAdvanced),
      });
      return {
        ...current,
        connections: [...current.connections, newConn],
      };
    });
    scheduleSave();
    return newConn;
  }, [isAdvanced, updateBoard, scheduleSave]);

  // Remove a connection
  const removeConnection = useCallback((connId: string) => {
    updateBoard((current) => ({
      ...current,
      connections: current.connections.filter(conn => conn.id !== connId),
    }));
    scheduleSave();
  }, [updateBoard, scheduleSave]);

  // Add a note
  const addNote = useCallback((text: string, position: { x: number; y: number }): BoardItem => {
    const pos = snapEnabled ? snapToGrid(position) : position;
    const noteItem: BoardItem = {
      id: `note-${Date.now()}-${crypto.randomUUID().slice(0, 9)}`,
      resourceId: `note-${Date.now()}`,
      x: pos.x,
      y: pos.y,
      w: 200,
      h: 100,
      resourceType: 'Text',
      label: text.substring(0, 50),
      annotation: text,
      isNote: true,
    };
    updateBoard((current) => ({
      ...current,
      items: [...current.items, noteItem],
    }));
    scheduleSave();
    return noteItem;
  }, [snapEnabled, updateBoard, scheduleSave]);

  // Update a note's text
  const updateNote = useCallback((noteId: string, text: string) => {
    updateBoard((current) => ({
      ...current,
      items: current.items.map(item =>
        item.id === noteId
          ? { ...item, label: text.substring(0, 50), annotation: text }
          : item
      ),
    }));
    scheduleSave();
  }, [updateBoard, scheduleSave]);

  // Update the board title
  const updateTitle = useCallback((title: string) => {
    setBoardTitle(title);
    scheduleSave();
  }, [scheduleSave]);

  // Create a group
  const createGroup = useCallback((label: string, itemIds: string[], color?: string): BoardGroup => {
    const group: BoardGroup = {
      id: `group-${Date.now()}-${crypto.randomUUID().slice(0, 9)}`,
      label,
      itemIds,
      color,
    };
    updateBoard((current) => ({
      ...current,
      groups: [...current.groups, group],
    }));
    scheduleSave();
    return group;
  }, [updateBoard, scheduleSave]);

  // Remove a group
  const removeGroup = useCallback((groupId: string) => {
    updateBoard((current) => ({
      ...current,
      groups: current.groups.filter(g => g.id !== groupId),
    }));
    scheduleSave();
  }, [updateBoard, scheduleSave]);

  // Add an item to a group
  const addItemToGroup = useCallback((groupId: string, itemId: string) => {
    updateBoard((current) => ({
      ...current,
      groups: current.groups.map(g =>
        g.id === groupId && !g.itemIds.includes(itemId)
          ? { ...g, itemIds: [...g.itemIds, itemId] }
          : g
      ),
    }));
    scheduleSave();
  }, [updateBoard, scheduleSave]);

  // Remove an item from a group
  const removeItemFromGroup = useCallback((groupId: string, itemId: string) => {
    updateBoard((current) => ({
      ...current,
      groups: current.groups.map(g =>
        g.id === groupId
          ? { ...g, itemIds: g.itemIds.filter(id => id !== itemId) }
          : g
      ),
    }));
    scheduleSave();
  }, [updateBoard, scheduleSave]);

  // Serialize current state to IIIF Manifest
  const exportManifest = useCallback((): IIIFManifest | null => {
    const id = boardId || generateBoardId();
    return boardStateToManifest(boardState, id, boardTitle, {
      behavior: boardBehavior,
      viewingDirection: boardViewingDirection,
    });
  }, [boardState, boardId, boardTitle, boardBehavior, boardViewingDirection]);

  // Save: serialize and call onSave callback
  const save = useCallback((): IIIFManifest | null => {
    const manifest = exportManifest();
    if (manifest && onSave) {
      onSave(manifest);
    }
    setIsDirty(false);
    return manifest;
  }, [exportManifest, onSave]);

  return {
    boardState,
    boardId,
    availableBoardIds,
    isDirty,
    canUndo,
    canRedo,
    createBoard,
    loadBoard,
    addItem,
    moveItem,
    resizeItem,
    removeItem,
    addConnection,
    removeConnection,
    addNote,
    updateNote,
    updateTitle,
    createGroup,
    removeGroup,
    addItemToGroup,
    removeItemFromGroup,
    undo,
    redo,
    save,
    exportManifest,
  };
}
