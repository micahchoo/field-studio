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

  // onConnectStart is passed but not used directly in this atom; keep for API consistency
  // Prefix with underscore to satisfy ESLint unused var rule
  const _onConnectStart = onConnectStart;

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`
        absolute rounded-lg shadow-lg cursor-move
        transition-shadow
        ${selected ? 'ring-2 ring-offset-2' : ''}
        ${connectingFrom ? 'ring-2 ring-yellow-400' : ''}
        ${fieldMode ? 'bg-slate-800 ring-yellow-400 ring-offset-slate-900' : 'bg-white ring-iiif-blue ring-offset-white'}
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
          <img src={resource.blobUrl} alt={resource.label} className="w-full h-full object-cover" />
        ) : (
          <Icon name="image" className={`text-2xl ${cx.placeholderIcon}`} />
        )}
      </div>

      {/* Label */}
      <div className="p-2">
        <p className={`text-xs truncate ${fieldMode ? 'text-slate-200' : 'text-slate-700'}`}>
          {resource.label}
        </p>
        {resource.isNote && (
          <p className={`text-xs ${cx.placeholderIcon}`}>
            {resource.annotation?.substring(0, 50)}...
          </p>
        )}
      </div>

      {/* Connection anchor points */}
      {selected && (
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