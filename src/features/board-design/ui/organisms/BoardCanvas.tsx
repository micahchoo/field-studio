/**
 * BoardCanvas Organism
 *
 * Main canvas for the board-design feature.
 * Renders items, connections, and handles interactions.
 *
 * IDEAL OUTCOME: Smooth pan/zoom, intuitive item dragging, clear connection lines
 * FAILURE PREVENTED: Lost items off-canvas, unclear drop targets, janky animations
 */

import React, { forwardRef, useCallback, useRef, useState } from 'react';
import type { IIIFItem } from '@/types';
import { Icon } from '@/src/shared/ui/atoms';
import {
  type BoardItem,
  calculateAnchorPoints,
  type Connection,
  type ConnectionType,
} from '../../model';

export interface BoardCanvasProps {
  /** Items to render on the canvas */
  items: BoardItem[];
  /** Connections between items */
  connections: Connection[];
  /** Currently selected item ID */
  selectedItemId: string | null;
  /** ID of item being connected from */
  connectingFrom: string | null;
  /** Active tool mode */
  activeTool: 'select' | 'connect' | 'note';
  /** Viewport state (pan/zoom) */
  viewport: { x: number; y: number; zoom: number };
  /** Viewport change callback */
  onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void;
  /** Item selection callback */
  onSelectItem: (id: string | null) => void;
  /** Item move callback */
  onMoveItem: (id: string, position: { x: number; y: number }) => void;
  /** Connection start callback */
  onStartConnection: (fromId: string) => void;
  /** Connection complete callback */
  onCompleteConnection: (toId: string, type?: ConnectionType) => void;
  /** Add item callback */
  onAddItem: (resource: IIIFItem, position: { x: number; y: number }) => void;
  /** Root item for drag-drop resources */
  root: IIIFItem | null;
  /** Contextual styles from template */
  cx: {
    surface: string;
    text: string;
    accent: string;
  };
  /** Current field mode */
  fieldMode: boolean;
}

/**
 * BoardCanvas Organism
 */
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
      onStartConnection,
      onCompleteConnection,
      onAddItem,
      cx,
      fieldMode,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [draggingItemId, setDraggingItemId] = useState<string | null>(null);

    // Combine refs
    const setRefs = (el: HTMLDivElement | null) => {
      (canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }
    };

    // Convert screen coordinates to canvas coordinates
    const screenToCanvas = useCallback(
      (screenX: number, screenY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        return {
          x: (screenX - rect.left - viewport.x) / viewport.zoom,
          y: (screenY - rect.top - viewport.y) / viewport.zoom,
        };
      },
      [viewport]
    );

    // Handle canvas click (deselect)
    const handleCanvasClick = useCallback(
      (e: React.MouseEvent) => {
        if (e.target === canvasRef.current) {
          onSelectItem(null);
        }
      },
      [onSelectItem]
    );

    // Handle item mouse down (start drag or connection)
    const handleItemMouseDown = useCallback(
      (e: React.MouseEvent, item: BoardItem) => {
        e.stopPropagation();

        if (activeTool === 'connect') {
          if (connectingFrom === null) {
            onStartConnection(item.id);
          } else if (connectingFrom !== item.id) {
            onCompleteConnection(item.id);
          }
          return;
        }

        // Select tool: start dragging
        onSelectItem(item.id);
        setDraggingItemId(item.id);
        setIsDragging(true);

        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        setDragOffset({
          x: canvasPos.x - item.x,
          y: canvasPos.y - item.y,
        });
      },
      [activeTool, connectingFrom, onStartConnection, onCompleteConnection, onSelectItem, screenToCanvas]
    );

    // Handle mouse move (dragging)
    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        if (!isDragging || !draggingItemId) return;

        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        onMoveItem(draggingItemId, {
          x: canvasPos.x - dragOffset.x,
          y: canvasPos.y - dragOffset.y,
        });
      },
      [isDragging, draggingItemId, dragOffset, screenToCanvas, onMoveItem]
    );

    // Handle mouse up (end drag)
    const handleMouseUp = useCallback(() => {
      setIsDragging(false);
      setDraggingItemId(null);
    }, []);

    // Get anchor point coordinates for a connection
    const getAnchorPoint = (item: BoardItem, anchor: string) => {
      const centerX = item.x + item.w / 2;
      const centerY = item.y + item.h / 2;

      switch (anchor) {
        case 'T':
          return { x: centerX, y: item.y };
        case 'R':
          return { x: item.x + item.w, y: centerY };
        case 'B':
          return { x: centerX, y: item.y + item.h };
        case 'L':
          return { x: item.x, y: centerY };
        default:
          return { x: centerX, y: centerY };
      }
    };

    // Render connection path
    const renderConnection = (conn: Connection) => {
      const fromItem = items.find((i) => i.id === conn.fromId);
      const toItem = items.find((i) => i.id === conn.toId);
      if (!fromItem || !toItem) return null;

      const from = getAnchorPoint(fromItem, conn.fromAnchor || 'R');
      const to = getAnchorPoint(toItem, conn.toAnchor || 'L');

      return (
        <g key={conn.id}>
          <line
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={cx.svgStroke}
            strokeWidth={2}
          />
          {conn.label && (
            <text
              x={(from.x + to.x) / 2}
              y={(from.y + to.y) / 2 - 5}
              fill={cx.svgFill}
              fontSize={12}
              textAnchor="middle"
            >
              {conn.label}
            </text>
          )}
        </g>
      );
    };

    return (
      <div
        ref={setRefs}
        className={`
          flex-1 relative overflow-hidden cursor-${activeTool === 'select' ? 'default' : 'crosshair'}
          ${cx.canvasBg}
        `}
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
          {/* Grid background */}
          <div
            className={`absolute inset-0 opacity-20 ${cx.gridBg}`}
            style={{
              backgroundImage: `
                linear-gradient(${cx.gridLine} 1px, transparent 1px),
                linear-gradient(90deg, ${cx.gridLine} 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          />

          {/* Connections SVG layer */}
          <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
            {connections.map(renderConnection)}

            {/* Active connection line */}
            {connectingFrom && (
              <ActiveConnectionLine
                fromItem={items.find((i) => i.id === connectingFrom)}
                mousePos={dragOffset}
                fieldMode={fieldMode}
              />
            )}
          </svg>

          {/* Items */}
          {items.map((item) => (
            <BoardItemCard
              key={item.id}
              item={item}
              isSelected={selectedItemId === item.id}
              isConnecting={connectingFrom === item.id}
              onMouseDown={(e) => handleItemMouseDown(e, item)}
              cx={cx}
              fieldMode={fieldMode}
            />
          ))}
        </div>

        {/* Viewport controls */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            onClick={() => onViewportChange({ ...viewport, zoom: Math.min(viewport.zoom * 1.2, 3) })}
            className={`
              p-2 rounded shadow-lg
              ${cx.buttonSurface}
            `}
          >
            <Icon name="add" />
          </button>
          <button
            onClick={() => onViewportChange({ ...viewport, zoom: Math.max(viewport.zoom / 1.2, 0.3) })}
            className={`
              p-2 rounded shadow-lg
              ${cx.buttonSurface}
            `}
          >
            <Icon name="remove" />
          </button>
          <button
            onClick={() => onViewportChange({ x: 0, y: 0, zoom: 1 })}
            className={`
              px-3 py-2 rounded shadow-lg text-sm font-medium
              ${cx.buttonSurface}
            `}
          >
            Fit
          </button>
        </div>
      </div>
    );
  }
);

BoardCanvas.displayName = 'BoardCanvas';

// =============================================================================
// Sub-components
// =============================================================================

interface BoardItemCardProps {
  item: BoardItem;
  isSelected: boolean;
  isConnecting: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  cx: BoardCanvasProps['cx'];
  fieldMode: boolean;
}

const BoardItemCard: React.FC<BoardItemCardProps> = ({
  item,
  isSelected,
  isConnecting,
  onMouseDown,
  cx,
  fieldMode,
}) => {
  return (
    <div
      onMouseDown={onMouseDown}
      className={`
        absolute rounded-lg shadow-lg overflow-hidden cursor-move
        transition-shadow
        ${isSelected ? 'ring-2 ring-offset-2' : ''}
        ${isConnecting ? 'ring-2 ring-yellow-400' : ''}
        ${fieldMode ? 'bg-slate-800 ring-yellow-400 ring-offset-slate-900' : 'bg-white ring-iiif-blue ring-offset-white'}
      `}
      style={{
        left: item.x,
        top: item.y,
        width: item.w,
        height: item.h,
      }}
    >
      {/* Thumbnail or placeholder */}
      <div className={`h-24 ${cx.placeholderBg} flex items-center justify-center`}>
        {item.blobUrl ? (
          <img src={item.blobUrl} alt={item.label} className="w-full h-full object-cover" />
        ) : (
          <Icon name="image" className={`text-2xl ${cx.placeholderIcon}`} />
        )}
      </div>

      {/* Label */}
      <div className="p-2">
        <p className={`text-xs truncate ${fieldMode ? 'text-slate-200' : 'text-slate-700'}`}>
          {item.label}
        </p>
        {item.isNote && (
          <p className={`text-xs ${cx.placeholderIcon}`}>
            {item.annotation?.substring(0, 50)}...
          </p>
        )}
      </div>

      {/* Connection anchor points */}
      {isSelected && (
        <>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-yellow-400" />
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-yellow-400" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-yellow-400" />
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-yellow-400" />
        </>
      )}
    </div>
  );
};

interface ActiveConnectionLineProps {
  fromItem: BoardItem | undefined;
  mousePos: { x: number; y: number };
  fieldMode: boolean;
}

const ActiveConnectionLine: React.FC<ActiveConnectionLineProps> = ({
  fromItem,
  fieldMode,
}) => {
  if (!fromItem) return null;

  const centerX = fromItem.x + fromItem.w / 2;
  const centerY = fromItem.y + fromItem.h / 2;

  // We can't easily get mouse position here without more state,
  // so just render a placeholder for now
  return (
    <circle
      cx={centerX + 100}
      cy={centerY}
      r={4}
      fill={fieldMode ? '#facc15' : '#3b82f6'}
    />
  );
};

export default BoardCanvas;
