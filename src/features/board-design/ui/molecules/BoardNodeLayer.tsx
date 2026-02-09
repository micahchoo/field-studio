/**
 * BoardNodeLayer Molecule
 *
 * Renders all board nodes as a layer with hover tooltip.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Composes BoardNode atoms + MetadataTooltip
 * - Local hover state only
 * - Props-only API
 *
 * @module features/board-design/ui/molecules/BoardNodeLayer
 */

import React, { useCallback, useState } from 'react';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { BoardItem } from '../../model';
import { BoardNode } from '../atoms/BoardNode';
import { MetadataTooltip } from '../atoms/MetadataTooltip';

export interface BoardNodeLayerProps {
  /** Array of board items to render */
  items: BoardItem[];
  /** Currently selected item ID */
  selectedItemId: string | null;
  /** Multi-select IDs */
  selectedIds?: Set<string>;
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
  selectedIds,
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
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const handleHover = useCallback((id: string | null) => {
    setHoveredItemId(id);
  }, []);

  const hoveredItem = hoveredItemId ? items.find(i => i.id === hoveredItemId) : null;

  return (
    <>
      {items.map((item) => (
        <BoardNode
          key={item.id}
          id={item.id}
          position={{ x: item.x, y: item.y }}
          size={{ width: item.w, height: item.h }}
          resource={item}
          selected={selectedItemId === item.id || (selectedIds?.has(item.id) ?? false)}
          connectingFrom={connectingFrom === item.id}
          onSelect={onSelectItem}
          onDragStart={onDragStart}
          onConnectStart={onConnectStart}
          onResizeStart={onResizeStart}
          onDoubleClick={onDoubleClickItem}
          onContextMenu={onContextMenuItem}
          onHover={handleHover}
          cx={cx}
          fieldMode={fieldMode}
        />
      ))}

      {/* Single tooltip for hovered item */}
      {hoveredItem && (
        <MetadataTooltip
          meta={hoveredItem.meta}
          visible={!!hoveredItemId && hoveredItemId !== selectedItemId}
          position={{ x: hoveredItem.x + hoveredItem.w, y: hoveredItem.y }}
          cx={cx}
          fieldMode={fieldMode}
        />
      )}
    </>
  );
};
