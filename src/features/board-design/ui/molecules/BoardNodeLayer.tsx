/**
 * BoardNodeLayer Molecule
 *
 * Renders all board nodes as a layer.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Composes BoardNode atoms
 * - No native HTML elements
 * - No domain logic
 * - Props-only API
 *
 * @module features/board-design/ui/molecules/BoardNodeLayer
 */

import React from 'react';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { BoardItem } from '../../model';
import { BoardNode } from '../atoms/BoardNode';

export interface BoardNodeLayerProps {
  /** Array of board items to render */
  items: BoardItem[];
  /** Currently selected item ID */
  selectedItemId: string | null;
  /** ID of item being connected from */
  connectingFrom: string | null;
  /** Callback when item is selected */
  onSelectItem: (id: string) => void;
  /** Callback when drag starts */
  onDragStart: (id: string, offset: { x: number; y: number }) => void;
  /** Callback when connection starts */
  onConnectStart: (id: string) => void;
  /** Callback when resize starts */
  onResizeStart?: (id: string, direction: string, startPos: { x: number; y: number }, startSize: { w: number; h: number }) => void;
  /** Callback when item is double-clicked */
  onDoubleClickItem?: (id: string) => void;
  /** Callback when item is right-clicked */
  onContextMenuItem?: (e: React.MouseEvent, id: string) => void;
  /** Contextual styles */
  cx: ContextualClassNames;
  /** Field mode flag */
  fieldMode: boolean;
}

export const BoardNodeLayer: React.FC<BoardNodeLayerProps> = ({
  items,
  selectedItemId,
  connectingFrom,
  onSelectItem,
  onDragStart,
  onConnectStart,
  onResizeStart,
  onDoubleClickItem,
  onContextMenuItem,
  cx,
  fieldMode,
}) => {
  return (
    <>
      {items.map((item) => (
        <BoardNode
          key={item.id}
          id={item.id}
          position={{ x: item.x, y: item.y }}
          size={{ width: item.w, height: item.h }}
          resource={item}
          selected={selectedItemId === item.id}
          connectingFrom={connectingFrom === item.id}
          onSelect={onSelectItem}
          onDragStart={onDragStart}
          onConnectStart={onConnectStart}
          onResizeStart={onResizeStart}
          onDoubleClick={onDoubleClickItem}
          onContextMenu={onContextMenuItem}
          cx={cx}
          fieldMode={fieldMode}
        />
      ))}
    </>
  );
};