/**
 * BoardView Organism
 *
 * Main organism for the board-design feature.
 * Provides a canvas for arranging IIIF resources and creating connections between them.
 *
 * IDEAL OUTCOME: Users can drag items, create connections, and export as IIIF Manifest
 * FAILURE PREVENTED: Lost work via history/undo, invalid state via validation
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { IIIFItem } from '@/types';
import { EmptyState } from '@/src/shared/ui/molecules/EmptyState';
import { useHistory } from '@/hooks/useHistory';
import { useToast } from '@/components/Toast';
import {
  type BoardState,
  calculateAnchorPoints,
  type ConnectionType,
  createBoardItem,
  createConnection,
  createInitialBoardState,
  getConnectionLabel,
  selectIsEmpty,
} from '../../model';
import { BoardHeader } from './BoardHeader';
import { BoardCanvas } from './BoardCanvas';
import { BoardToolbar } from './BoardToolbar';

export interface BoardViewProps {
  /** Root IIIF item (source for drag-drop resources) */
  root: IIIFItem | null;
  /** Contextual styles from template */
  cx: {
    surface: string;
    text: string;
    accent: string;
    border: string;
  };
  /** Current field mode */
  fieldMode: boolean;
  /** Terminology function from template */
  t: (key: string) => string;
  /** Whether user is in advanced mode */
  isAdvanced: boolean;
  /** Called when board is exported */
  onExport?: (state: BoardState) => void;
  /** Initial board state (for loading saved boards) */
  initialState?: BoardState;
}

/**
 * BoardView Organism
 *
 * @example
 * <FieldModeTemplate>
 *   {({ cx, fieldMode, t, isAdvanced }) => (
 *     <BoardView
 *       root={root}
 *       cx={cx}
 *       fieldMode={fieldMode}
 *       t={t}
 *       isAdvanced={isAdvanced}
 *       onExport={handleExport}
 *     />
 *   )}
 * </FieldModeTemplate>
 */
export const BoardView: React.FC<BoardViewProps> = ({
  root,
  cx,
  fieldMode,
  t,
  isAdvanced,
  onExport,
  initialState,
}) => {
  const { showToast } = useToast();

  // History-managed board state
  const { state: board, update: updateBoard, undo, redo, canUndo, canRedo } =
    useHistory<BoardState>(initialState || createInitialBoardState());

  const { items, connections } = board;

  // Tool state
  const [activeTool, setActiveTool] = useState<'select' | 'connect' | 'note'>('select');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  // Viewport state
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);

  // Check if board is empty
  const isEmpty = selectIsEmpty(board);

  // Handle adding an item from root
  const handleAddItem = useCallback(
    (resource: IIIFItem, position: { x: number; y: number }) => {
      const newItem = createBoardItem(resource, position);
      updateBoard({
        ...board,
        items: [...items, newItem],
      });
      showToast(`Added ${t(resource.type) || resource.type}`, 'success');
    },
    [board, items, updateBoard, showToast, t]
  );

  // Handle item selection
  const handleSelectItem = useCallback(
    (id: string | null) => {
      setSelectedItemId(id);
      setConnectingFrom(null);
    },
    []
  );

  // Handle starting a connection
  const handleStartConnection = useCallback(
    (fromId: string) => {
      if (activeTool === 'connect') {
        setConnectingFrom(fromId);
      }
    },
    [activeTool]
  );

  // Handle completing a connection
  const handleCompleteConnection = useCallback(
    (toId: string, type: ConnectionType = 'associated') => {
      if (connectingFrom && connectingFrom !== toId) {
        // Find items for anchor calculation
        const fromItem = items.find((i) => i.id === connectingFrom);
        const toItem = items.find((i) => i.id === toId);

        if (fromItem && toItem) {
          const anchors = calculateAnchorPoints(fromItem, toItem);
          const newConnection = createConnection(
            connectingFrom,
            toId,
            type,
            {
              fromAnchor: anchors.from,
              toAnchor: anchors.to,
              label: getConnectionLabel(type, isAdvanced),
            }
          );

          updateBoard({
            ...board,
            connections: [...connections, newConnection],
          });

          showToast('Connection created', 'success');
        }

        setConnectingFrom(null);
      }
    },
    [connectingFrom, items, connections, board, updateBoard, showToast, isAdvanced]
  );

  // Handle item move
  const handleMoveItem = useCallback(
    (id: string, newPosition: { x: number; y: number }) => {
      updateBoard({
        ...board,
        items: items.map((item) =>
          item.id === id ? { ...item, x: newPosition.x, y: newPosition.y } : item
        ),
      });
    },
    [board, items, updateBoard]
  );

  // Handle delete selected item
  const handleDeleteSelected = useCallback(() => {
    if (selectedItemId) {
      updateBoard({
        ...board,
        items: items.filter((item) => item.id !== selectedItemId),
        connections: connections.filter(
          (conn) => conn.fromId !== selectedItemId && conn.toId !== selectedItemId
        ),
      });
      setSelectedItemId(null);
      showToast('Item removed', 'info');
    }
  }, [board, items, connections, selectedItemId, updateBoard, showToast]);

  // Handle export
  const handleExport = useCallback(() => {
    onExport?.(board);
    showToast('Board exported', 'success');
  }, [board, onExport, showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected item
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItemId) {
        e.preventDefault();
        handleDeleteSelected();
      }
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, handleDeleteSelected, undo, redo]);

  // Empty state
  if (isEmpty) {
    return (
      <div className={`flex flex-col h-full ${cx.surface}`}>
        <BoardHeader
          title="Board Design"
          activeTool={activeTool}
          onToolChange={setActiveTool}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onExport={handleExport}
          cx={cx}
          fieldMode={fieldMode}
        />
        <EmptyState
          icon="dashboard"
          title="Start Designing Your Board"
          message="Drag items from the archive or sidebar to arrange them on the canvas. Create connections between items to build relationships."
          action={{
            label: 'Browse Archive',
            icon: 'inventory_2',
            onClick: () => {
              // Could navigate to archive view
              console.info('Navigate to archive');
            },
          }}
          cx={cx}
          fieldMode={fieldMode}
        />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${cx.surface}`}>
      <BoardHeader
        title="Board Design"
        activeTool={activeTool}
        onToolChange={setActiveTool}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onExport={handleExport}
        itemCount={items.length}
        connectionCount={connections.length}
        cx={cx}
        fieldMode={fieldMode}
      />

      <div className="flex-1 flex overflow-hidden">
        <BoardToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          selectedItemId={selectedItemId}
          onDelete={handleDeleteSelected}
          cx={cx}
          fieldMode={fieldMode}
        />

        <BoardCanvas
          ref={canvasRef}
          items={items}
          connections={connections}
          selectedItemId={selectedItemId}
          connectingFrom={connectingFrom}
          activeTool={activeTool}
          viewport={viewport}
          onViewportChange={setViewport}
          onSelectItem={handleSelectItem}
          onMoveItem={handleMoveItem}
          onStartConnection={handleStartConnection}
          onCompleteConnection={handleCompleteConnection}
          onAddItem={handleAddItem}
          root={root}
          cx={cx}
          fieldMode={fieldMode}
        />
      </div>
    </div>
  );
};

export default BoardView;
