/**
 * BoardView Organism
 *
 * Main organism for the board-design feature.
 * IIIF-first board design: board state is backed by IIIF Manifest structures
 * via useBoardVault, with full persistence and export support.
 *
 * IDEAL OUTCOME: Users can drag items, create connections, and export as IIIF Manifest
 * FAILURE PREVENTED: Lost work via history/undo, invalid state via validation
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppSettings, IIIFItem, IIIFManifest } from '@/src/shared/types';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import { usePipeline } from '@/src/shared/lib/hooks';
import { useToast } from '@/src/shared/ui/molecules/Toast';
import { PipelineBanner } from '@/src/shared/ui/molecules/PipelineBanner';
import { ContextMenu } from '@/src/shared/ui/molecules/ContextMenu';
import { contentStateService } from '@/src/shared/services/contentState';
import { PaneLayout } from '@/src/shared/ui/layout';
import { uiLog } from '@/src/shared/services/logger';
import {
  autoArrangeItems,
  type BoardItem,
  type BoardGroup,
  type BoardState,
  type Connection,
  type ConnectionType,
  type LayoutArrangement,
  selectIsEmpty,
} from '../../model';
import {
  exportBoardAsPNG,
  exportBoardAsSVG,
  generateContentStateURL,
} from '../../model/exporters';
import { generateBoardId } from '../../model/iiif-bridge';
import { useBoardVault } from '../../hooks/useBoardVault';
import { useMultiSelect } from '../../hooks/useMultiSelect';
import { usePresentationMode } from '../../hooks/usePresentationMode';
import { BoardHeader } from './BoardHeader';
import { BoardCanvas } from './BoardCanvas';
import { BoardOnboarding, type BoardTemplate } from './BoardOnboarding';
import { PresentationOverlay } from './PresentationOverlay';
import { ConnectionEditPanel } from '../molecules/ConnectionEditPanel';

export interface BoardViewProps {
  root: IIIFItem | null;
  cx: ContextualClassNames;
  fieldMode: boolean;
  t: (key: string) => string;
  isAdvanced: boolean;
  onExport?: (manifest: IIIFManifest) => void;
  /** Called when user clicks Save — persist board as a separate manifest */
  onSaveBoard?: (manifest: IIIFManifest) => void;
  initialState?: BoardState;
  onSwitchView?: (mode: string) => void;
  onSelectId?: (id: string | null) => void;
  onSelect?: (item: IIIFItem) => void;
  settings?: AppSettings;
  /** Ref callback to expose board state helpers to parent */
  boardStateRef?: React.MutableRefObject<{
    getBoardItemForResource: (resourceId: string) => BoardItem | null;
    boardState: BoardState;
  } | null>;
}

const findInTree = (node: IIIFItem, targetId: string): IIIFItem | null => {
  if (node.id === targetId) return node;
  const children = (node as IIIFItem & { items?: IIIFItem[] }).items;
  if (children) {
    for (const child of children) {
      const found = findInTree(child, targetId);
      if (found) return found;
    }
  }
  return null;
};

export const BoardView: React.FC<BoardViewProps> = ({
  root,
  cx,
  fieldMode,
  t,
  isAdvanced,
  onExport,
  onSaveBoard,
  onSwitchView,
  onSelectId,
  onSelect,
  settings,
  boardStateRef,
}) => {
  const { showToast } = useToast();
  const pipeline = usePipeline();

  // Tool state
  const [activeTool, setActiveTool] = useState<'select' | 'connect' | 'note' | 'text'>('select');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [bgMode, setBgMode] = useState<'grid' | 'dark' | 'light'>('grid');
  const [snapEnabled, setSnapEnabled] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemId: string } | null>(null);

  // Connection editing state
  const [editingConnection, setEditingConnection] = useState<{ conn: Connection; position: { x: number; y: number } } | null>(null);

  // Vault-backed board state
  const board = useBoardVault({
    root,
    snapEnabled,
    isAdvanced,
    onSave: (manifest) => {
      onExport?.(manifest);
    },
  });

  const { boardState, canUndo, canRedo, undo, redo } = board;
  const { items, connections } = boardState;
  const isEmpty = selectIsEmpty(boardState);

  // Multi-select
  const multiSelect = useMultiSelect();
  const hasMultiSelection = multiSelect.selectedIds.size > 1;
  const hasAnySelection = !!selectedItemId || multiSelect.selectedIds.size > 0;

  // Presentation mode
  const presentation = usePresentationMode(boardState);

  // Expose board state to parent (ViewRouter) for design tab
  useEffect(() => {
    if (boardStateRef) {
      boardStateRef.current = {
        getBoardItemForResource: (resourceId: string) =>
          items.find(i => i.resourceId === resourceId) || null,
        boardState,
      };
    }
    return () => { if (boardStateRef) boardStateRef.current = null; };
  }, [boardStateRef, items, boardState]);

  // Handle adding an item
  const handleAddItem = useCallback(
    (resource: IIIFItem, position: { x: number; y: number }) => {
      board.addItem(resource, position);
      showToast(`Added ${t(resource.type) || resource.type}`, 'success');
    },
    [board, showToast, t]
  );

  // Handle item selection — bridge to Inspector via onSelectId
  const handleSelectItem = useCallback((id: string | null) => {
    setSelectedItemId(id);
    setConnectingFrom(null);
    setContextMenu(null);
    setEditingConnection(null);

    // Sync multi-select: single-click clears multi and selects one
    if (id) {
      multiSelect.selectItems([id]);
    } else {
      multiSelect.clearSelection();
    }

    if (id && root) {
      const boardItem = items.find(i => i.id === id);
      const resourceId = boardItem?.resourceId;
      if (resourceId) {
        onSelectId?.(resourceId);
        const iiifItem = findInTree(root, resourceId);
        if (iiifItem) onSelect?.(iiifItem);
      }
    } else {
      onSelectId?.(null);
    }
  }, [root, items, onSelectId, onSelect, multiSelect]);

  // Handle shift-click multi-select toggle
  const handleToggleSelectItem = useCallback((id: string, shiftKey: boolean) => {
    multiSelect.toggleItem(id, shiftKey);
    // Set selectedItemId to the last toggled item for Inspector
    setSelectedItemId(id);
  }, [multiSelect]);

  // Handle rubber-band selection complete
  const handleSelectItems = useCallback((ids: string[]) => {
    if (ids.length > 0) {
      multiSelect.selectItems(ids);
      setSelectedItemId(ids[0]);
    }
  }, [multiSelect]);

  // Handle starting a connection
  const handleStartConnection = useCallback((fromId: string) => {
    setConnectingFrom(fromId);
  }, []);

  // Handle completing a connection
  const handleCompleteConnection = useCallback(
    (toId: string, type: ConnectionType = 'associated') => {
      if (connectingFrom && connectingFrom !== toId) {
        board.addConnection(connectingFrom, toId, type);
        showToast('Connection created', 'success');
        setConnectingFrom(null);
      }
    },
    [connectingFrom, board, showToast]
  );

  // Handle item move
  const handleMoveItem = useCallback(
    (id: string, newPosition: { x: number; y: number }) => {
      board.moveItem(id, newPosition);
    },
    [board]
  );

  // Handle item resize
  const handleResizeItem = useCallback(
    (id: string, newSize: { w: number; h: number }) => {
      board.resizeItem(id, newSize);
    },
    [board]
  );

  // Handle auto-arrange
  const handleAutoArrange = useCallback(
    (arrangement: LayoutArrangement) => {
      const canvasWidth = canvasRef.current?.clientWidth || 800;
      const canvasHeight = canvasRef.current?.clientHeight || 600;
      const arranged = autoArrangeItems(items, arrangement, { width: canvasWidth, height: canvasHeight });
      arranged.forEach(item => {
        board.moveItem(item.id, { x: item.x, y: item.y });
        board.resizeItem(item.id, { w: item.w, h: item.h });
      });
      showToast(`Arranged items: ${arrangement}`, 'info');
    },
    [items, board, showToast]
  );

  // Handle delete selected (single or multi)
  const handleDeleteSelected = useCallback(() => {
    if (hasMultiSelection) {
      multiSelect.deleteSelected(board.removeItem);
      setSelectedItemId(null);
      showToast(`Removed ${multiSelect.selectedIds.size} items`, 'info');
    } else if (selectedItemId) {
      board.removeItem(selectedItemId);
      setSelectedItemId(null);
      multiSelect.clearSelection();
      showToast('Item removed', 'info');
    }
  }, [selectedItemId, hasMultiSelection, multiSelect, board, showToast]);

  // Handle double-click — navigate to viewer
  const handleDoubleClickItem = useCallback((id: string) => {
    const boardItem = items.find(i => i.id === id);
    if (boardItem?.resourceId) {
      onSelectId?.(boardItem.resourceId);
      onSwitchView?.('viewer');
    }
  }, [items, onSelectId, onSwitchView]);

  // Handle double-click on connection — open edit panel
  const handleDoubleClickConnection = useCallback((connId: string) => {
    const conn = connections.find(c => c.id === connId);
    if (!conn) return;
    // Position panel at midpoint of connection
    const fromItem = items.find(i => i.id === conn.fromId);
    const toItem = items.find(i => i.id === conn.toId);
    if (!fromItem || !toItem) return;
    const midX = (fromItem.x + fromItem.w / 2 + toItem.x + toItem.w / 2) / 2;
    const midY = (fromItem.y + fromItem.h / 2 + toItem.y + toItem.h / 2) / 2;
    setEditingConnection({ conn, position: { x: midX, y: midY + 20 } });
  }, [connections, items]);

  // Handle connection update from edit panel
  const handleUpdateConnection = useCallback((connId: string, updates: Partial<Connection>) => {
    board.updateConnection(connId, updates);
    // Keep panel open with updated connection
    const updated = { ...editingConnection?.conn, ...updates, id: connId } as Connection;
    if (editingConnection) {
      setEditingConnection({ ...editingConnection, conn: updated });
    }
  }, [board, editingConnection]);

  // Handle connection delete from edit panel
  const handleDeleteConnection = useCallback((connId: string) => {
    board.removeConnection(connId);
    setEditingConnection(null);
    showToast('Connection removed', 'info');
  }, [board, showToast]);

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    setSelectedItemId(id);
    setContextMenu({ x: e.clientX, y: e.clientY, itemId: id });
  }, []);

  // Handle Content State drop onto board
  const handleBoardDragOver = useCallback((e: React.DragEvent) => {
    // Accept Content State drops and iiif-manifest-ids
    const types = Array.from(e.dataTransfer.types);
    if (types.some(t => ['application/ld+json', 'application/json', 'text/uri-list', 'application/iiif-manifest-ids'].includes(t))) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleBoardDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();

    // Try Content State first
    const viewport = contentStateService.handleDrop(e.dataTransfer);
    if (viewport?.canvasId && root) {
      const iiifItem = findInTree(root, viewport.canvasId);
      if (iiifItem) {
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        const x = canvasRect ? e.clientX - canvasRect.left : 200;
        const y = canvasRect ? e.clientY - canvasRect.top : 200;
        board.addItem(iiifItem, { x, y });
        showToast('Added item from Content State', 'success');
        return;
      }
    }

    // Fallback: try iiif-manifest-ids
    const idsData = e.dataTransfer.getData('application/iiif-manifest-ids');
    if (idsData && root) {
      try {
        const ids = JSON.parse(idsData) as string[];
        ids.forEach((id, i) => {
          const item = findInTree(root, id);
          if (item) {
            board.addItem(item, { x: 200 + i * 250, y: 200 });
          }
        });
        if (ids.length > 0) showToast(`Added ${ids.length} item(s) to board`, 'success');
      } catch { /* ignore parse errors */ }
    }
  }, [root, board, showToast]);

  // Group management
  const handleCreateGroup = useCallback(() => {
    const groupItemIds = hasMultiSelection
      ? Array.from(multiSelect.selectedIds)
      : selectedItemId ? [selectedItemId] : [];
    if (groupItemIds.length === 0) return;
    const label = prompt('Group name:');
    if (!label) return;
    board.createGroup(label, groupItemIds);
    showToast(`Created group "${label}" with ${groupItemIds.length} items`, 'success');
  }, [selectedItemId, hasMultiSelection, multiSelect.selectedIds, board, showToast]);

  // Get groups containing a specific item
  const getGroupsForItem = useCallback((itemId: string): BoardGroup[] => {
    return boardState.groups?.filter(g => g.itemIds.includes(itemId)) || [];
  }, [boardState.groups]);

  // Group visual data: compute bounding boxes for each group
  const groupOverlays = useMemo(() => {
    if (!boardState.groups || boardState.groups.length === 0) return [];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    return boardState.groups.map((group, gi) => {
      const groupItems = group.itemIds
        .map(id => items.find(i => i.id === id))
        .filter((i): i is BoardItem => !!i);
      if (groupItems.length === 0) return null;
      const padding = 16;
      const minX = Math.min(...groupItems.map(i => i.x)) - padding;
      const minY = Math.min(...groupItems.map(i => i.y)) - padding;
      const maxX = Math.max(...groupItems.map(i => i.x + i.w)) + padding;
      const maxY = Math.max(...groupItems.map(i => i.y + i.h)) + padding;
      return {
        id: group.id,
        label: group.label,
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
        color: group.color || colors[gi % colors.length],
      };
    }).filter(Boolean) as Array<{ id: string; label: string; x: number; y: number; w: number; h: number; color: string }>;
  }, [boardState.groups, items]);

  // Handle duplicate item
  const handleDuplicateItem = useCallback((id: string) => {
    const boardItem = items.find(i => i.id === id);
    if (!boardItem || !root) return;
    const iiifItem = findInTree(root, boardItem.resourceId);
    if (iiifItem) {
      board.addItem(iiifItem, { x: boardItem.x + 30, y: boardItem.y + 30 });
      showToast('Item duplicated', 'success');
    }
  }, [items, root, board, showToast]);

  // Handle export — serialize to IIIF Manifest and trigger download
  const handleExport = useCallback(() => {
    const manifest = board.exportManifest();
    if (manifest) {
      const json = JSON.stringify(manifest, null, 2);
      const blob = new Blob([json], { type: 'application/ld+json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${manifest.label?.en?.[0] || 'board'}.json`;
      a.click();
      URL.revokeObjectURL(url);

      onExport?.(manifest);
      showToast('Board exported as IIIF Manifest', 'success');
    }
  }, [board, onExport, showToast]);

  // Handle export as PNG
  const handleExportPNG = useCallback(async () => {
    try {
      const blob = await exportBoardAsPNG(boardState, 'Board Design');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'board.png';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Board exported as PNG', 'success');
    } catch {
      showToast('Failed to export PNG', 'error');
    }
  }, [boardState, showToast]);

  // Handle export as SVG
  const handleExportSVG = useCallback(() => {
    const svgString = exportBoardAsSVG(boardState, 'Board Design');
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'board.svg';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Board exported as SVG', 'success');
  }, [boardState, showToast]);

  // Handle copy Content State link
  const handleCopyContentState = useCallback(() => {
    const id = board.boardId || generateBoardId();
    const baseUrl = window.location.origin + window.location.pathname;
    const url = generateContentStateURL(id, baseUrl);
    navigator.clipboard.writeText(url);
    showToast('Content State link copied', 'success');
  }, [board.boardId, showToast]);

  // Handle save — persist board as a separate manifest in the vault
  const handleSave = useCallback(() => {
    const manifest = board.save();
    if (manifest && onSaveBoard) {
      onSaveBoard(manifest);
      showToast('Board saved', 'success');
    }
  }, [board, onSaveBoard, showToast]);

  // Handle navigate to archive
  const handleBrowseArchive = useCallback(() => {
    onSwitchView?.('archive');
  }, [onSwitchView]);

  // Handle adding a note via canvas click
  const handleAddNote = useCallback((position: { x: number; y: number }) => {
    const noteItem = board.addNote('Double-click to edit...', position);
    setSelectedItemId(noteItem.id);
    showToast('Note added', 'success');
    setActiveTool('select');
  }, [board, showToast]);

  // Handle adding a text layer (via text tool)
  const handleAddTextLayer = useCallback(() => {
    const canvasWidth = canvasRef.current?.clientWidth || 800;
    const canvasHeight = canvasRef.current?.clientHeight || 600;
    const noteItem = board.addNote('Double-click to edit...', {
      x: canvasWidth / 2 - 100,
      y: canvasHeight / 2 - 25,
    });
    setSelectedItemId(noteItem.id);
    showToast('Text layer added', 'success');
  }, [board, showToast]);

  // Handle alignment
  const handleAlign = useCallback((type: 'center' | 'left' | 'top' | 'right' | 'bottom') => {
    if (!selectedItemId) return;
    const canvasWidth = canvasRef.current?.clientWidth || 800;
    const canvasHeight = canvasRef.current?.clientHeight || 600;
    const item = items.find(i => i.id === selectedItemId);
    if (!item) return;

    let newPos = { x: item.x, y: item.y };
    switch (type) {
      case 'center': newPos = { x: (canvasWidth - item.w) / 2, y: (canvasHeight - item.h) / 2 }; break;
      case 'left': newPos = { x: 20, y: item.y }; break;
      case 'right': newPos = { x: canvasWidth - item.w - 20, y: item.y }; break;
      case 'top': newPos = { x: item.x, y: 20 }; break;
      case 'bottom': newPos = { x: item.x, y: canvasHeight - item.h - 20 }; break;
    }
    board.moveItem(selectedItemId, newPos);
    showToast(`Aligned ${type}`, 'info');
  }, [items, selectedItemId, board, showToast]);

  // Handle tool change
  const handleToolChange = useCallback((tool: 'select' | 'connect' | 'note' | 'text') => {
    setActiveTool(tool);
    if (tool === 'text') {
      handleAddTextLayer();
      setActiveTool('select');
    }
  }, [handleAddTextLayer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      // Don't handle shortcuts during presentation mode (it has its own)
      if (presentation.isActive) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && hasAnySelection) {
        e.preventDefault();
        handleDeleteSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) { redo(); } else { undo(); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        multiSelect.selectAll(items);
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'v': setActiveTool('select'); break;
          case 'c': setActiveTool('connect'); break;
          case 't': handleToolChange('text'); break;
          case 'n': setActiveTool('note'); break;
          case 'l': handleAutoArrange('grid'); break;
          case 'g': setSnapEnabled(s => !s); break;
          case 'p': presentation.enter(); break;
          case 'i':
            if (selectedItemId) {
              const boardItem = items.find(i => i.id === selectedItemId);
              if (boardItem?.resourceId) onSelectId?.(boardItem.resourceId);
            }
            break;
          case 'escape':
            setEditingConnection(null);
            multiSelect.clearSelection();
            setSelectedItemId(null);
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, hasAnySelection, handleDeleteSelected, undo, redo, handleToolChange, handleAutoArrange, items, onSelectId, multiSelect, presentation]);

  // Pipeline: Load selected items from Archive on mount
  const pipelineLoadedRef = useRef(false);
  useEffect(() => {
    if (!pipelineLoadedRef.current && root && pipeline.intent === 'compose' && pipeline.selectedIds.length > 0) {
      pipelineLoadedRef.current = true;
      const { selectedIds } = pipeline;
      const itemsToAdd: IIIFItem[] = [];
      const findItems = (node: IIIFItem) => {
        if (selectedIds.includes(node.id)) itemsToAdd.push(node);
        const children = (node as IIIFItem & { items?: IIIFItem[] }).items || [];
        children.forEach(findItems);
      };
      const rootItems = (root as IIIFItem & { items?: IIIFItem[] }).items;
      if (rootItems) rootItems.forEach(findItems);

      itemsToAdd.forEach((item, index) => {
        board.addItem(item, { x: 100 + (index % 3) * 250, y: 100 + Math.floor(index / 3) * 200 });
      });
      if (itemsToAdd.length > 0) showToast(`Added ${itemsToAdd.length} items from Archive`, 'success');
    }

    // sessionStorage backwards compatibility
    const pendingSelection = sessionStorage.getItem('board-selected-items');
    if (!pipelineLoadedRef.current && pendingSelection && root) {
      pipelineLoadedRef.current = true;
      try {
        const selectedIds = JSON.parse(pendingSelection) as string[];
        sessionStorage.removeItem('board-selected-items');
        const itemsToAdd: IIIFItem[] = [];
        const findItems = (node: IIIFItem) => {
          if (selectedIds.includes(node.id)) itemsToAdd.push(node);
          const children = (node as IIIFItem & { items?: IIIFItem[] }).items || [];
          children.forEach(findItems);
        };
        const rootItems = (root as IIIFItem & { items?: IIIFItem[] }).items;
        if (rootItems) rootItems.forEach(findItems);

        itemsToAdd.forEach((item, index) => {
          board.addItem(item, { x: 100 + (index % 3) * 250, y: 100 + Math.floor(index / 3) * 200 });
        });
        if (itemsToAdd.length > 0) showToast(`Added ${itemsToAdd.length} items from Archive`, 'success');
      } catch (e) {
        uiLog.error('Failed to load pending selection:', e instanceof Error ? e : undefined);
      }
    }
  }, [root, board, showToast, pipeline.intent, pipeline.selectedIds]);

  // Extract all items from root for template usage
  const getAvailableItems = useCallback((): IIIFItem[] => {
    const result: IIIFItem[] = [];
    const traverse = (node: IIIFItem) => {
      if (!node) return;
      if (node.type === 'Canvas' || node.type === 'Manifest') result.push(node);
      const children = (node as IIIFItem & { items?: IIIFItem[] }).items || [];
      children.forEach(traverse);
    };
    if (root) traverse(root);
    return result;
  }, [root]);

  // Shared helper: position items on board and create connections for a template
  const populateBoardFromTemplate = useCallback((template: BoardTemplate, itemsToAdd: IIIFItem[]) => {
    board.createBoard(
      template.name,
      template.defaultBehavior,
      template.defaultViewingDirection as 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top' | undefined,
    );

    const canvasWidth = canvasRef.current?.clientWidth || 800;
    const canvasHeight = canvasRef.current?.clientHeight || 600;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    const addedItems: Array<{ id: string }> = [];

    itemsToAdd.forEach((item, index) => {
      let position = { x: centerX, y: centerY };
      switch (template.previewLayout) {
        case 'narrative': position = { x: centerX - 375 + index * 250, y: centerY + (index % 2) * 40 - 20 }; break;
        case 'comparison': position = { x: centerX - 150 + index * 300, y: centerY - 100 }; break;
        case 'timeline': position = { x: centerX - 400 + index * 200, y: centerY }; break;
        case 'map': {
          const angle = (index / 3) * Math.PI * 2;
          position = { x: centerX + Math.cos(angle) * 180, y: centerY + Math.sin(angle) * 180 };
          break;
        }
        case 'storyboard': position = { x: 60 + index * 220, y: centerY - 75 }; break;
        case 'choice-comparison': position = { x: centerX - 330 + index * 220, y: centerY - 75 }; break;
        case 'annotation-review':
          if (index === 0) { position = { x: centerX - 100, y: centerY - 75 }; }
          else {
            const reviewAngle = ((index - 1) / (itemsToAdd.length - 1)) * Math.PI * 2 - Math.PI / 2;
            position = { x: centerX + Math.cos(reviewAngle) * 250 - 100, y: centerY + Math.sin(reviewAngle) * 250 - 75 };
          }
          break;
        case 'book-spread': {
          const pairIndex = Math.floor(index / 2);
          const isRight = index % 2 === 1;
          position = { x: centerX + (isRight ? 10 : -210), y: 80 + pairIndex * 190 };
          break;
        }
        case 'provenance-map':
          if (index === 0) { position = { x: centerX - 100, y: centerY - 75 }; }
          else {
            const provPositions = [
              { x: centerX - 100, y: centerY - 250 },
              { x: centerX + 200, y: centerY - 75 },
              { x: centerX - 100, y: centerY + 100 },
              { x: centerX - 400, y: centerY - 75 },
            ];
            position = provPositions[(index - 1) % provPositions.length];
          }
          break;
        case 'scroll-layout': position = { x: centerX - 100, y: 60 + index * 170 }; break;
      }

      const addedItem = board.addItem(item, position);
      addedItems.push(addedItem);
    });

    // Create template connections using template.connectionType and layout topology
    const connType = (template.connectionType || 'associated') as ConnectionType;
    setTimeout(() => {
      switch (template.previewLayout) {
        // Sequential layouts: chain items in order
        case 'narrative':
        case 'timeline':
        case 'storyboard':
        case 'scroll-layout':
        case 'book-spread':
        case 'comparison':
        case 'choice-comparison':
          for (let i = 0; i < addedItems.length - 1; i++) {
            board.addConnection(addedItems[i].id, addedItems[i + 1].id, connType);
          }
          break;
        // Hub-and-spoke layouts: first item connects to all others
        case 'annotation-review':
        case 'provenance-map':
          for (let i = 1; i < addedItems.length; i++) {
            board.addConnection(addedItems[0].id, addedItems[i].id, connType);
          }
          break;
        // Map: mesh — connect all items to each other
        case 'map':
          for (let i = 0; i < addedItems.length; i++) {
            for (let j = i + 1; j < addedItems.length; j++) {
              board.addConnection(addedItems[i].id, addedItems[j].id, connType);
            }
          }
          break;
      }
    }, 50);

    showToast(`Created ${template.name}`, 'success');
  }, [board, showToast]);

  // Handle template selection (demo flow — random items)
  const handleSelectTemplate = useCallback((template: BoardTemplate) => {
    const availableItems = getAvailableItems();
    const targetCount = template.itemCount;

    const itemsToAdd: IIIFItem[] = [];
    const shuffled = [...availableItems].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(shuffled.length, targetCount); i++) {
      itemsToAdd.push(shuffled[i]);
    }
    for (let i = itemsToAdd.length; i < targetCount; i++) {
      itemsToAdd.push({
        id: `template-${template.id}-${i}-${Date.now()}`,
        type: 'Canvas',
        label: { en: [`${template.name} ${i + 1}`] },
        thumbnail: [{ id: `https://picsum.photos/200/200?random=${i}-${Date.now()}`, type: 'Image', format: 'image/jpeg' }],
      });
    }

    populateBoardFromTemplate(template, itemsToAdd);
  }, [getAvailableItems, populateBoardFromTemplate]);

  // Handle template selection with user-picked items
  const handleSelectTemplateWithItems = useCallback((template: BoardTemplate, selectedItems: IIIFItem[]) => {
    populateBoardFromTemplate(template, selectedItems);
  }, [populateBoardFromTemplate]);

  // Empty state
  if (isEmpty) {
    return (
      <BoardOnboarding
        onSelectTemplate={handleSelectTemplate}
        onSelectTemplateWithItems={handleSelectTemplateWithItems}
        onStartBlank={() => {
          board.createBoard('Blank Board');
          showToast('Started with blank canvas', 'info');
        }}
        onBrowseArchive={handleBrowseArchive}
        root={root}
        availableItems={getAvailableItems()}
        cx={{
          surface: cx.surface,
          text: cx.text,
          textMuted: cx.textMuted || (fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'),
          accent: cx.accent,
          border: cx.border,
          headerBg: cx.subtleBg || (fieldMode ? 'bg-nb-black' : 'bg-nb-cream'),
        }}
        fieldMode={fieldMode}
      />
    );
  }

  const hasPipelineItems = pipeline.intent === 'compose' && pipeline.selectedIds.length > 0;

  return (
    <PaneLayout variant="canvas" className={cx.surface}>
      {hasPipelineItems && (
        <PipelineBanner
          onBack={(mode) => onSwitchView?.(mode)}
          onClear={() => pipeline.clearPipeline()}
          cx={cx}
          fieldMode={fieldMode}
        />
      )}

      <PaneLayout.Header>
        <BoardHeader
          title="Board Design"
        activeTool={activeTool}
        onToolChange={handleToolChange}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onSave={onSaveBoard ? handleSave : undefined}
        isDirty={board.isDirty}
        onExport={handleExport}
        onExportPNG={handleExportPNG}
        onExportSVG={handleExportSVG}
        onCopyContentState={handleCopyContentState}
        onPresent={items.length > 0 ? () => presentation.enter() : undefined}
        onDelete={handleDeleteSelected}
        hasSelection={hasAnySelection}
        selectionCount={multiSelect.selectedIds.size}
        itemCount={items.length}
        connectionCount={connections.length}
        bgMode={bgMode}
        onBgModeChange={setBgMode}
        onAlign={handleAlign}
        snapEnabled={snapEnabled}
        onSnapToggle={() => setSnapEnabled(s => !s)}
        onAutoArrange={handleAutoArrange}
        onToggleInspector={selectedItemId ? () => {
          const boardItem = items.find(i => i.id === selectedItemId);
          if (boardItem?.resourceId) onSelectId?.(boardItem.resourceId);
        } : undefined}
        selectedResource={selectedItemId && root
          ? (() => { const bi = items.find(i => i.id === selectedItemId); return bi ? findInTree(root, bi.resourceId) : null; })()
          : null}
        cx={cx}
        fieldMode={fieldMode}
      />
      </PaneLayout.Header>

      <PaneLayout.Body>
        <div
          className="h-full flex overflow-hidden relative"
        onDragOver={handleBoardDragOver}
        onDrop={handleBoardDrop}
      >
        <BoardCanvas
          ref={canvasRef}
          items={items}
          connections={connections}
          selectedItemId={selectedItemId}
          selectedIds={multiSelect.selectedIds}
          connectingFrom={connectingFrom}
          activeTool={activeTool}
          viewport={viewport}
          onViewportChange={setViewport}
          onSelectItem={handleSelectItem}
          onToggleSelectItem={handleToggleSelectItem}
          onSelectItems={handleSelectItems}
          onMoveItem={handleMoveItem}
          onResizeItem={handleResizeItem}
          onStartConnection={handleStartConnection}
          onCompleteConnection={handleCompleteConnection}
          onAddItem={handleAddItem}
          onAddNote={handleAddNote}
          onDoubleClickItem={handleDoubleClickItem}
          onDoubleClickConnection={handleDoubleClickConnection}
          onContextMenuItem={handleContextMenu}
          root={root}
          bgMode={bgMode}
          cx={cx}
          fieldMode={fieldMode}
        />

        {/* Group visual overlays */}
        {groupOverlays.length > 0 && (
          <div className="absolute inset-0 pointer-events-none" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: '0 0' }}>
            {groupOverlays.map(g => (
              <div
                key={g.id}
                className="absolute border-2 border-dashed rounded-lg"
                style={{
                  left: g.x,
                  top: g.y,
                  width: g.w,
                  height: g.h,
                  borderColor: g.color,
                  backgroundColor: `${g.color}08`,
                }}
              >
                <span
                  className="absolute -top-5 left-1 text-[10px] font-bold px-1 rounded"
                  style={{ backgroundColor: g.color, color: '#fff' }}
                >
                  {g.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Connection edit panel */}
        {editingConnection && (
          <div className="absolute inset-0 pointer-events-none" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: '0 0' }}>
            <div className="pointer-events-auto">
              <ConnectionEditPanel
                connection={editingConnection.conn}
                position={editingConnection.position}
                onUpdate={handleUpdateConnection}
                onDelete={handleDeleteConnection}
                onClose={() => setEditingConnection(null)}
                cx={cx}
                fieldMode={fieldMode}
              />
            </div>
          </div>
        )}
      </div>
      </PaneLayout.Body>

      {/* Context menu for board nodes */}
      <ContextMenu
        x={contextMenu?.x || 0}
        y={contextMenu?.y || 0}
        isOpen={!!contextMenu}
        onClose={() => setContextMenu(null)}
        cx={cx}
        fieldMode={fieldMode}
        sections={[
          {
            items: [
              {
                id: 'open-viewer',
                label: 'Open in Viewer',
                icon: 'visibility',
                onClick: () => {
                  if (contextMenu) {
                    const bi = items.find(i => i.id === contextMenu.itemId);
                    if (bi?.resourceId) {
                      onSelectId?.(bi.resourceId);
                      onSwitchView?.('viewer');
                    }
                  }
                  setContextMenu(null);
                },
              },
              {
                id: 'duplicate',
                label: 'Duplicate',
                icon: 'content_copy',
                onClick: () => {
                  if (contextMenu) handleDuplicateItem(contextMenu.itemId);
                  setContextMenu(null);
                },
              },
              {
                id: 'copy-share-link',
                label: 'Copy Share Link',
                icon: 'link',
                onClick: () => {
                  if (contextMenu) {
                    const bi = items.find(i => i.id === contextMenu.itemId);
                    if (bi?.resourceId) {
                      try {
                        const baseUrl = window.location.origin + window.location.pathname;
                        const link = contentStateService.generateCanvasLink(baseUrl, '', bi.resourceId);
                        navigator.clipboard.writeText(link);
                        showToast('Share link copied', 'success');
                      } catch {
                        showToast('Failed to generate link', 'error');
                      }
                    }
                  }
                  setContextMenu(null);
                },
              },
            ],
          },
          // Group actions
          ...(boardState.groups && boardState.groups.length > 0 && contextMenu ? [{
            title: 'Groups',
            items: [
              ...boardState.groups
                .filter(g => !g.itemIds.includes(contextMenu.itemId))
                .map(g => ({
                  id: `add-to-${g.id}`,
                  label: `Add to "${g.label}"`,
                  icon: 'group_add',
                  onClick: () => {
                    if (contextMenu) {
                      board.addItemToGroup(g.id, contextMenu.itemId);
                      showToast(`Added to group "${g.label}"`, 'success');
                    }
                    setContextMenu(null);
                  },
                })),
              ...boardState.groups
                .filter(g => g.itemIds.includes(contextMenu!.itemId))
                .map(g => ({
                  id: `remove-from-${g.id}`,
                  label: `Remove from "${g.label}"`,
                  icon: 'group_remove',
                  onClick: () => {
                    if (contextMenu) {
                      board.removeItemFromGroup(g.id, contextMenu.itemId);
                      showToast(`Removed from group "${g.label}"`, 'success');
                    }
                    setContextMenu(null);
                  },
                })),
              {
                id: 'new-group',
                label: 'New Group\u2026',
                icon: 'group_work',
                onClick: () => {
                  if (contextMenu) {
                    const label = prompt('Group name:');
                    if (label) {
                      board.createGroup(label, [contextMenu.itemId]);
                      showToast(`Created group "${label}"`, 'success');
                    }
                  }
                  setContextMenu(null);
                },
              },
            ],
          }] : [{
            title: 'Groups',
            items: [{
              id: 'new-group',
              label: 'New Group\u2026',
              icon: 'group_work',
              onClick: () => {
                if (contextMenu) {
                  const label = prompt('Group name:');
                  if (label) {
                    board.createGroup(label, [contextMenu.itemId]);
                    showToast(`Created group "${label}"`, 'success');
                  }
                }
                setContextMenu(null);
              },
            }],
          }]),
          {
            items: [
              {
                id: 'delete',
                label: 'Delete',
                icon: 'delete',
                variant: 'danger' as const,
                onClick: () => {
                  if (contextMenu) {
                    board.removeItem(contextMenu.itemId);
                    setSelectedItemId(null);
                    onSelectId?.(null);
                    showToast('Item removed', 'info');
                  }
                  setContextMenu(null);
                },
              },
            ],
          },
        ]}
      />

      {/* Presentation mode overlay */}
      {presentation.isActive && (
        <PresentationOverlay
          currentItem={presentation.currentItem}
          currentIndex={presentation.currentIndex}
          totalSlides={presentation.totalSlides}
          isAutoAdvancing={presentation.isAutoAdvancing}
          onNext={presentation.next}
          onPrev={presentation.prev}
          onExit={presentation.exit}
          onToggleAutoAdvance={presentation.toggleAutoAdvance}
          onGoTo={presentation.goTo}
        />
      )}
    </PaneLayout>
  );
};

export default BoardView;
