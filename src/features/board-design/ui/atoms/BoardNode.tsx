/**
 * BoardNode Atom
 *
 * Single item on canvas with selection state, thumbnail, and connection anchors.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (or minimal local UI state)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/board-design/ui/atoms/BoardNode
 */

import React from 'react';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { BoardItem } from '../../model';
import { Icon } from '@/src/shared/ui/atoms';

export interface BoardNodeProps {
  /** Unique node ID */
  id: string;
  /** Node position */
  position: { x: number; y: number };
  /** Node dimensions */
  size: { width: number; height: number };
  /** Node content/resource */
  resource: BoardItem;
  /** Whether node is selected */
  selected: boolean;
  /** Whether node is being connected from */
  connectingFrom: boolean;
  /** Callback when node is clicked */
  onSelect: (id: string) => void;
  /** Callback when drag starts */
  onDragStart: (id: string, offset: { x: number; y: number }) => void;
  /** Callback when connection starts */
  onConnectStart: (id: string) => void;
  /** Callback when resize starts */
  onResizeStart?: (id: string, direction: string, startPos: { x: number; y: number }, startSize: { w: number; h: number }) => void;
  /** Callback when node is double-clicked */
  onDoubleClick?: (id: string) => void;
  /** Callback when node is right-clicked */
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
  /** Contextual styles */
  cx: ContextualClassNames;
  /** Field mode flag */
  fieldMode: boolean;
}

export const BoardNode: React.FC<BoardNodeProps> = ({
  id,
  position,
  size,
  resource,
  selected,
  connectingFrom,
  onSelect,
  onDragStart,
  onConnectStart,
  onResizeStart,
  onDoubleClick,
  onContextMenu,
  cx,
  fieldMode,
}) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Determine if this is a connect or drag action based on activeTool (not available here)
    // We'll rely on parent to pass appropriate callbacks
    // For now, treat as select/drag
    onSelect(id);

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    onDragStart(id, { x: offsetX, y: offsetY });
  };

  const handleAnchorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onConnectStart(id);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    e.preventDefault();
    onResizeStart?.(id, direction, { x: e.clientX, y: e.clientY }, { w: size.width, h: size.height });
  };

  const resizeHandleClass = `absolute w-2.5 h-2.5 ${
    fieldMode ? 'bg-nb-orange' : 'bg-iiif-blue'
  }`;

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(id); }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu?.(e, id); }}
      className={`
        absolute  shadow-brutal cursor-move
        transition-shadow
        ${selected ? 'ring-2 ring-offset-2' : ''}
        ${connectingFrom ? 'ring-2 ring-nb-yellow' : ''}
        ${fieldMode ? 'bg-nb-black ring-nb-yellow ring-offset-nb-black' : 'bg-nb-white ring-iiif-blue ring-offset-white'}
      `}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
    >
      {/* Thumbnail or placeholder */}
      <div className={`h-24 ${cx.placeholderBg} flex items-center justify-center overflow-hidden rounded-t-lg`}>
        {resource.blobUrl ? (
          <img src={resource.blobUrl} alt={resource.label} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <Icon name="image" className={`text-2xl ${cx.placeholderIcon}`} />
        )}
      </div>

      {/* Label */}
      <div className="p-2">
        <p className={`text-xs truncate ${fieldMode ? 'text-nb-black/20' : 'text-nb-black/80'}`}>
          {resource.label}
        </p>
        {resource.isNote && (
          <p className={`text-xs ${cx.placeholderIcon}`}>
            {resource.annotation?.substring(0, 50)}...
          </p>
        )}
      </div>

      {/* Connection anchor points — click to start a connection */}
      {selected && (
        <>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-nb-yellow cursor-crosshair" onMouseDown={handleAnchorClick} />
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-nb-yellow cursor-crosshair" onMouseDown={handleAnchorClick} />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-nb-yellow cursor-crosshair" onMouseDown={handleAnchorClick} />
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-nb-yellow cursor-crosshair" onMouseDown={handleAnchorClick} />
        </>
      )}

      {/* Resize handles (corners) */}
      {selected && onResizeStart && (
        <>
          <div
            className={`${resizeHandleClass} -bottom-1.5 -right-1.5 cursor-se-resize`}
            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
          />
          <div
            className={`${resizeHandleClass} -bottom-1.5 -left-1.5 cursor-sw-resize`}
            onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
          />
          <div
            className={`${resizeHandleClass} -top-1.5 -right-1.5 cursor-ne-resize`}
            onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
          />
          <div
            className={`${resizeHandleClass} -top-1.5 -left-1.5 cursor-nw-resize`}
            onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
          />
        </>
      )}
    </div>
  );
};