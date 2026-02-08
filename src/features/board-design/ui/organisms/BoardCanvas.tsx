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
import { BoardNodeLayer } from '../molecules/BoardNodeLayer';
import { ConnectionLayer } from '../molecules/ConnectionLayer';
import { BoardControls } from '../molecules/BoardControls';
import { useCanvasDrag } from '../../hooks/useCanvasDrag';

export interface BoardCanvasProps {
  items: BoardItem[];
  connections: Connection[];
  selectedItemId: string | null;
  connectingFrom: string | null;
  activeTool: 'select' | 'connect' | 'note' | 'text';
  viewport: { x: number; y: number; zoom: number };
  onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void;
  onSelectItem: (id: string | null) => void;
  onMoveItem: (id: string, position: { x: number; y: number }) => void;
  onResizeItem?: (id: string, size: { w: number; h: number }) => void;
  onStartConnection: (fromId: string) => void;
  onCompleteConnection: (toId: string, type?: ConnectionType) => void;
  onAddItem: (resource: IIIFItem, position: { x: number; y: number }) => void;
  onAddNote?: (position: { x: number; y: number }) => void;
  root: IIIFItem | null;
  onDoubleClickItem?: (id: string) => void;
  onContextMenuItem?: (e: React.MouseEvent, id: string) => void;
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
      connectingFrom,
      activeTool,
      viewport,
      onViewportChange,
      onSelectItem,
      onMoveItem,
      onResizeItem,
      onStartConnection,
      onCompleteConnection,
      onAddNote,
      onDoubleClickItem,
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

    const {
      setRefs,
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

    // Handle canvas click — also handles note tool clicks
    const handleCanvasClick = useCallback((e: React.MouseEvent) => {
      if (activeTool === 'note' && onAddNote) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        onAddNote(pos);
        return;
      }
      basCanvasClick(e);
    }, [activeTool, onAddNote, screenToCanvas, basCanvasClick]);

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

    // Handle mouse move — resize or drag
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
      basMouseMove(e);
    }, [isResizing, viewport.zoom, onResizeItem, onMoveItem, basMouseMove]);

    // Handle mouse up — end resize or drag
    const handleMouseUp = useCallback(() => {
      if (isResizing) {
        resizeRef.current = null;
        setIsResizing(false);
        return;
      }
      basMouseUp();
    }, [isResizing, basMouseUp]);

    // Handle node click in connect mode — complete connection
    const handleNodeSelect = useCallback((id: string) => {
      if (activeTool === 'connect' && connectingFrom && connectingFrom !== id) {
        onCompleteConnection(id);
        return;
      }
      onSelectItem(id);
    }, [activeTool, connectingFrom, onCompleteConnection, onSelectItem]);

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
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Canvas content with transforms */}
        <div
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: '0 0',
          }}
          className="absolute inset-0"
        >
          {bgMode === 'grid' && <CanvasGrid cx={cx} />}

          <ConnectionLayer
            connections={connections}
            items={items}
            selectedConnectionId={selectedConnectionId}
            onSelectConnection={handleSelectConnection}
            cx={cx}
            fieldMode={fieldMode}
          />

          <BoardNodeLayer
            items={items}
            selectedItemId={selectedItemId}
            connectingFrom={connectingFrom}
            onSelectItem={handleNodeSelect}
            onDragStart={handleDragStart}
            onConnectStart={handleConnectStart}
            onResizeStart={onResizeItem ? handleResizeStart : undefined}
            onDoubleClickItem={onDoubleClickItem}
            onContextMenuItem={onContextMenuItem}
            cx={cx}
            fieldMode={fieldMode}
          />
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
