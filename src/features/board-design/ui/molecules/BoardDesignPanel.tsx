/**
 * BoardDesignPanel Molecule
 *
 * Board-specific inspector tab showing position, size, connections, and actions
 * for the selected board node.
 *
 * @module features/board-design/ui/molecules/BoardDesignPanel
 */

import React from 'react';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { BoardItem, Connection } from '../../model';
import { getConnectionLabel } from '../../model';
import { ConnectionTypeBadge } from '../atoms/ConnectionTypeBadge';
import { Button, Icon } from '@/src/shared/ui/atoms';

export interface BoardDesignPanelProps {
  boardItem: BoardItem | null;
  connections: Connection[];
  items: BoardItem[];
  onOpenViewer?: () => void;
  onRemove?: () => void;
  isAdvanced?: boolean;
  cx: ContextualClassNames;
  fieldMode: boolean;
}

export const BoardDesignPanel: React.FC<BoardDesignPanelProps> = ({
  boardItem,
  connections,
  items,
  onOpenViewer,
  onRemove,
  isAdvanced = false,
  cx,
  fieldMode,
}) => {
  if (!boardItem) {
    return (
      <div className={`p-4 text-sm ${cx.textMuted || 'text-nb-black/50'}`}>
        Select a board item to see design properties.
      </div>
    );
  }

  const itemConnections = connections.filter(
    c => c.fromId === boardItem.id || c.toId === boardItem.id
  );

  const getTargetLabel = (conn: Connection) => {
    const targetId = conn.fromId === boardItem.id ? conn.toId : conn.fromId;
    const target = items.find(i => i.id === targetId);
    return target?.label || 'Unknown';
  };

  const sectionClass = `mb-4 pb-4 border-b ${fieldMode ? 'border-nb-black/30' : 'border-nb-black/10'}`;
  const labelClass = `text-xs font-bold uppercase tracking-wider mb-2 ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}`;
  const valueClass = `text-sm font-mono ${cx.text}`;

  return (
    <div className="p-4 space-y-1">
      {/* Position */}
      <div className={sectionClass}>
        <p className={labelClass}>Position</p>
        <div className="flex gap-4">
          <span className={valueClass}>X: {Math.round(boardItem.x)}</span>
          <span className={valueClass}>Y: {Math.round(boardItem.y)}</span>
        </div>
      </div>

      {/* Size */}
      <div className={sectionClass}>
        <p className={labelClass}>Size</p>
        <div className="flex gap-4">
          <span className={valueClass}>{Math.round(boardItem.w)} × {Math.round(boardItem.h)}</span>
        </div>
      </div>

      {/* Connections */}
      <div className={sectionClass}>
        <p className={labelClass}>Connections ({itemConnections.length})</p>
        {itemConnections.length === 0 ? (
          <p className={`text-xs ${cx.textMuted || 'text-nb-black/50'}`}>No connections</p>
        ) : (
          <div className="space-y-2">
            {itemConnections.map(conn => {
              const isOutgoing = conn.fromId === boardItem.id;
              return (
                <div key={conn.id} className="flex items-center gap-2 text-xs">
                  <Icon
                    name={isOutgoing ? 'arrow_forward' : 'arrow_back'}
                    className={`text-sm ${cx.textMuted || 'text-nb-black/50'}`}
                  />
                  <ConnectionTypeBadge
                    type={conn.type}
                    cx={cx}
                    fieldMode={fieldMode}
                  />
                  <span className={cx.text}>{getTargetLabel(conn)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {onOpenViewer && (
          <Button
            variant="ghost"
            size="bare"
            onClick={onOpenViewer}
            className={`flex items-center gap-2 px-3 py-2 text-sm ${
              fieldMode ? 'text-nb-black/20 hover:bg-nb-black' : 'text-nb-black/70 hover:bg-nb-cream'
            }`}
          >
            <Icon name="visibility" className="text-lg" />
            Open in Viewer
          </Button>
        )}
        {onRemove && (
          <Button
            variant="ghost"
            size="bare"
            onClick={onRemove}
            className="flex items-center gap-2 px-3 py-2 text-sm text-nb-red hover:bg-nb-red/10"
          >
            <Icon name="delete" className="text-lg" />
            Remove from Board
          </Button>
        )}
      </div>
    </div>
  );
};
