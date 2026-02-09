/**
 * BoardCanvas Organism
 *
 * Main canvas for the board-design feature.
 * Composes atoms and molecules to render items, connections, and handle interactions.
 *
 * IDEAL OUTCOME: Smooth pan/zoom, intuitive item dragging, clear connection lines
 * FAILURE PREVENTED: Lost items off-canvas, unclear drop targets, janky animations
 *
 * @module features/board-design/ui/organisms/BoardCanvas
 */

import React, { forwardRef, useCallback, useMemo, useRef, useState } from 'react';
import type { IIIFItem } from '@/src/shared/types';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import {
  type BoardItem,
  type Connection,
  type ConnectionType,
} from '../../model';
import { CanvasGrid } from '../atoms/CanvasGrid';
import { MiniMap } from '../atoms/MiniMap';
import { AlignmentGuideLine } from '../atoms/AlignmentGuideLine';
import { BoardNodeLayer } from '../molecules/BoardNodeLayer';
import { ConnectionLayer } from '../molecules/ConnectionLayer';
import { BoardControls } from '../molecules/BoardControls';
import { useCanvasDrag } from '../../hooks/useCanvasDrag';
import { useRubberBandSelect } from '../../hooks/useRubberBandSelect';
import { useAlignmentGuides } from '../../hooks/useAlignmentGuides';

export interface BoardCanvasProps {
  items: BoardItem[];
  connections: Connection[];
  selectedItemId: string | null;
  selectedIds?: Set<string>;
  connectingFrom: string | null;
  activeTool: 'select' | 'connect' | 'note' | 'text';
  viewport: { x: number; y: number; zoom: number };
  onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void;
  onSelectItem: (id: string | null) => void;
  onToggleSelectItem?: (id: string, shiftKey: boolean) => void;
  onSelectItems?: (ids: string[]) => void;
  onMoveItem: (id: string, position: { x: number; y: number }) => void;
  onMoveSelected?: (dx: number, dy: number) => void;
  onResizeItem?: (id: string, size: { w: number; h: number }) => void;
  onStartConnection: (fromId: string) => void;
  onCompleteConnection: (toId: string, type?: ConnectionType) => void;
  onAddItem: (resource: IIIFItem, position: { x: number; y: number }) => void;
  onAddNote?: (position: { x: number; y: number }) => void;
  onDoubleClickItem?: (id: string) => void;
  onDoubleClickConnection?: (id: string) => void;
  onContextMenuItem?: (e: React.MouseEvent, id: string) => void;
  root: IIIFItem | null;
  bgMode?: 'grid' | 'dark' | 'light';
  cx: ContextualClassNames;
  fieldMode: boolean;
}

export const BoardCanvas = forwardRef<HTMLDivElement, BoardCanvasProps>(
  (
    {
      items,
      connections,
      selectedItemId,
      selectedIds,
      connectingFrom,
      activeTool,
      viewport,
      onViewportChange,
      onSelectItem,
      onToggleSelectItem,
      onSelectItems,
      onMoveItem,
      onResizeItem,
      onStartConnection,
      onCompleteConnection,
      onAddNote,
      onDoubleClickItem,
      onDoubleClickConnection,
      onContextMenuItem,
      bgMode = 'grid',
      cx,
      fieldMode,
    },
    ref
  ) => {
    // Resize tracking state
    const resizeRef = useRef<{
      itemId: string;
      direction: string;
      startX: number;
      startY: number;
      startW: number;
      startH: number;
      startItemX: number;
      startItemY: number;
    } | null>(null);
    const [isResizing, setIsResizing] = useState(false);

    // Rubber-band selection
    const rubberBand = useRubberBandSelect();

    // Alignment guides
    const { guides, computeGuides, clearGuides } = useAlignmentGuides();

    const {
      setRefs,
      isDragging,
      draggingItemId,
      selectedConnectionId,
      screenToCanvas,
      handleCanvasClick: basCanvasClick,
      handleMouseMove: basMouseMove,
      handleMouseUp: basMouseUp,
      handleDragStart,
      handleSelectConnection,
    } = useCanvasDrag({
      viewport,
      onSelectItem,
      onMoveItem,
    });

    // Combine forwarded ref with hook's setRefs
    const combinedSetRefs = (el: HTMLDivElement | null) => {
      setRefs(el);
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }
    };

    // Handle canvas click — also handles note tool clicks and rubber-band start
    const handleCanvasClick = useCallback((e: React.MouseEvent) => {
      if (activeTool === 'note' && onAddNote) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        onAddNote(pos);
        return;
      }
      basCanvasClick(e);
    }, [activeTool, onAddNote, screenToCanvas, basCanvasClick]);

    // Handle mouse down — start rubber-band if clicking empty canvas area
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      if (activeTool !== 'select') return;
      // Only start rubber-band if clicking directly on the canvas container
      const target = e.target as HTMLElement;
      const isCanvasBackground = target.classList.contains('board-canvas-content') || target === e.currentTarget;
      if (isCanvasBackground && !e.shiftKey) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        rubberBand.startSelection(pos.x, pos.y);
      }
    }, [activeTool, screenToCanvas, rubberBand]);

    // Handle resize start from BoardNode
    const handleResizeStart = useCallback((
      itemId: string,
      direction: string,
      startPos: { x: number; y: number },
      startSize: { w: number; h: number }
    ) => {
      const item = items.find(i => i.id === itemId);
      resizeRef.current = {
        itemId,
        direction,
        startX: startPos.x,
        startY: startPos.y,
        startW: startSize.w,
        startH: startSize.h,
        startItemX: item?.x || 0,
        startItemY: item?.y || 0,
      };
      setIsResizing(true);
    }, [items]);

    // Handle mouse move — resize, rubber-band, alignment guides, or drag
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
      if (isResizing && resizeRef.current && onResizeItem) {
        const r = resizeRef.current;
        const dx = (e.clientX - r.startX) / viewport.zoom;
        const dy = (e.clientY - r.startY) / viewport.zoom;

        let newW = r.startW;
        let newH = r.startH;

        // Calculate new size based on resize direction
        if (r.direction.includes('e')) newW = r.startW + dx;
        if (r.direction.includes('w')) newW = r.startW - dx;
        if (r.direction.includes('s')) newH = r.startH + dy;
        if (r.direction.includes('n')) newH = r.startH - dy;

        onResizeItem(r.itemId, { w: Math.max(80, newW), h: Math.max(60, newH) });

        // For nw/ne/sw corners, also move position
        if (r.direction.includes('w') || r.direction.includes('n')) {
          const newX = r.direction.includes('w') ? r.startItemX + dx : r.startItemX;
          const newY = r.direction.includes('n') ? r.startItemY + dy : r.startItemY;
          onMoveItem(r.itemId, { x: newX, y: newY });
        }
        return;
      }

      // Rubber-band selection update
      if (rubberBand.isSelecting) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        rubberBand.updateSelection(pos.x, pos.y);
        return;
      }

      // Alignment guides during drag
      if (isDragging && draggingItemId) {
        const item = items.find(i => i.id === draggingItemId);
        if (item) {
          const pos = screenToCanvas(e.clientX, e.clientY);
          computeGuides(draggingItemId, pos, { w: item.w, h: item.h }, items);
        }
      }

      basMouseMove(e);
    }, [isResizing, viewport.zoom, onResizeItem, onMoveItem, rubberBand, isDragging, draggingItemId, items, screenToCanvas, computeGuides, basMouseMove]);

    // Handle mouse up — end resize, rubber-band, or drag
    const handleMouseUp = useCallback(() => {
      if (isResizing) {
        resizeRef.current = null;
        setIsResizing(false);
        return;
      }

      // End rubber-band selection
      if (rubberBand.isSelecting) {
        const selectedItemIds = rubberBand.endSelection(items);
        if (selectedItemIds.length > 0 && onSelectItems) {
          onSelectItems(selectedItemIds);
        }
        return;
      }

      // Clear alignment guides on drag end
      clearGuides();

      basMouseUp();
    }, [isResizing, rubberBand, items, onSelectItems, clearGuides, basMouseUp]);

    // Handle node click in connect mode — complete connection
    const handleNodeSelect = useCallback((id: string) => {
      if (activeTool === 'connect' && connectingFrom && connectingFrom !== id) {
        onCompleteConnection(id);
        return;
      }
      onSelectItem(id);
    }, [activeTool, connectingFrom, onCompleteConnection, onSelectItem]);

    // Handle node click with shift for multi-select
    const handleNodeClick = useCallback((id: string, e?: React.MouseEvent) => {
      if (e?.shiftKey && onToggleSelectItem) {
        onToggleSelectItem(id, true);
        return;
      }
      handleNodeSelect(id);
    }, [handleNodeSelect, onToggleSelectItem]);

    // Handle node connect start (anchor click)
    const handleConnectStart = useCallback((id: string) => {
      if (activeTool === 'connect') {
        onStartConnection(id);
      }
    }, [activeTool, onStartConnection]);

    // Compute viewport rect for minimap
    const viewportRect = useMemo(() => {
      const width = 800;
      const height = 600;
      return {
        x: -viewport.x / viewport.zoom,
        y: -viewport.y / viewport.zoom,
        width: width / viewport.zoom,
        height: height / viewport.zoom,
      };
    }, [viewport]);

    // MiniMap click-to-pan
    const handleMiniMapPan = useCallback((x: number, y: number) => {
      onViewportChange({
        x: -x * viewport.zoom + 400,
        y: -y * viewport.zoom + 300,
        zoom: viewport.zoom,
      });
    }, [viewport.zoom, onViewportChange]);

    const bgModeClasses = {
      grid: cx.canvasBg,
      dark: 'bg-nb-black',
      light: 'bg-nb-cream',
    };

    return (
      <div
        ref={combinedSetRefs}
        className={`
          flex-1 relative overflow-hidden
          ${bgModeClasses[bgMode]}
        `}
        style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Canvas content with transforms */}
        <div
          className="absolute inset-0 board-canvas-content"
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {bgMode === 'grid' && <CanvasGrid cx={cx} />}

          <ConnectionLayer
            connections={connections}
            items={items}
            selectedConnectionId={selectedConnectionId}
            onSelectConnection={handleSelectConnection}
            onDoubleClickConnection={onDoubleClickConnection}
            cx={cx}
            fieldMode={fieldMode}
          />

          <BoardNodeLayer
            items={items}
            selectedItemId={selectedItemId}
            selectedIds={selectedIds}
            connectingFrom={connectingFrom}
            onSelectItem={handleNodeClick}
            onDragStart={handleDragStart}
            onConnectStart={handleConnectStart}
            onResizeStart={onResizeItem ? handleResizeStart : undefined}
            onDoubleClickItem={onDoubleClickItem}
            onContextMenuItem={onContextMenuItem}
            cx={cx}
            fieldMode={fieldMode}
          />

          {/* Alignment guides */}
          <AlignmentGuideLine
            guides={guides}
            canvasSize={{ width: 10000, height: 10000 }}
          />

          {/* Rubber-band selection box */}
          {rubberBand.isSelecting && rubberBand.selectionRect && (
            <div
              className="absolute border-2 border-dashed pointer-events-none"
              style={{
                left: rubberBand.selectionRect.x,
                top: rubberBand.selectionRect.y,
                width: rubberBand.selectionRect.width,
                height: rubberBand.selectionRect.height,
                borderColor: fieldMode ? '#facc15' : '#3b82f6',
                backgroundColor: fieldMode ? 'rgba(250, 204, 21, 0.1)' : 'rgba(59, 130, 246, 0.1)',
              }}
            />
          )}
        </div>

        <MiniMap
          items={items}
          viewportRect={viewportRect}
          onViewportChange={handleMiniMapPan}
          cx={cx}
          fieldMode={fieldMode}
        />

        <BoardControls
          viewport={viewport}
          onViewportChange={onViewportChange}
          cx={cx}
          fieldMode={fieldMode}
        />
      </div>
    );
  }
);

BoardCanvas.displayName = 'BoardCanvas';

export default BoardCanvas;
