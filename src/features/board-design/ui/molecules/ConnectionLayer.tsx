/**
 * ConnectionLayer Molecule
 *
 * Renders all connections between nodes as an SVG layer.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Composes ConnectionLine atoms
 * - No native HTML elements
 * - No domain logic
 * - Props-only API
 *
 * @module features/board-design/ui/molecules/ConnectionLayer
 */

import React from 'react';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { AnchorSide, BoardItem, Connection } from '../../model';
import { ConnectionLine } from '../atoms/ConnectionLine';

export interface ConnectionLayerProps {
  /** Array of connections to render */
  connections: Connection[];
  /** Array of board items for anchor calculations */
  items: BoardItem[];
  /** Currently selected connection ID */
  selectedConnectionId: string | null;
  /** Callback when connection is selected */
  onSelectConnection: (id: string) => void;
  /** Contextual styles */
  cx: ContextualClassNames;
  /** Field mode flag */
  fieldMode: boolean;
}

// Helper to get anchor point coordinates for a connection
const getAnchorPoint = (item: BoardItem, anchor: AnchorSide | undefined) => {
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

export const ConnectionLayer: React.FC<ConnectionLayerProps> = ({
  connections,
  items,
  selectedConnectionId,
  onSelectConnection,
  cx,
  fieldMode,
}) => {
  const validConnections = connections.filter((conn) => {
    const fromItem = items.find((i) => i.id === conn.fromId);
    const toItem = items.find((i) => i.id === conn.toId);
    return fromItem && toItem;
  });

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
      {validConnections
        .map((conn) => {
          const fromItem = items.find((i) => i.id === conn.fromId);
          const toItem = items.find((i) => i.id === conn.toId);

          // Should never happen because validConnections already filtered, but guard
          if (!fromItem || !toItem) return null;

          const from = getAnchorPoint(fromItem, conn.fromAnchor);
          const to = getAnchorPoint(toItem, conn.toAnchor);

          return (
            <ConnectionLine
              key={conn.id}
              id={conn.id}
              from={from}
              to={to}
              type={conn.type}
              label={conn.label}
              selected={selectedConnectionId === conn.id}
              onSelect={onSelectConnection}
              cx={cx}
              fieldMode={fieldMode}
            />
          );
        })
        .filter(Boolean)}
    </svg>
  );
};