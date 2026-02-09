/**
 * BoardNode Atom
 *
 * Single item on canvas with selection state, thumbnail, and connection anchors.
 * Renders type-specific card variants per IIIF resource type.
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
import { formatDuration } from '../../model';
import { Icon } from '@/src/shared/ui/atoms';
import { TypeBadge } from './TypeBadge';
import { ContentTypeIcon } from './ContentTypeIcon';
import { ItemBadge } from './ItemBadge';

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
  /** Callback when node is hovered */
  onHover?: (id: string | null) => void;
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
  onHover,
  cx,
  fieldMode,
}) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const isNote = resource.isNote;
  const isCollection = resource.resourceType === 'Collection';
  const isManifest = resource.resourceType === 'Manifest';
  const isRange = resource.resourceType === 'Range';
  const meta = resource.meta;
  const contentType = meta?.contentType || 'Unknown';

  // Type-specific border styles
  const typeClasses = isNote
    ? 'bg-nb-yellow/90 border-2 border-nb-yellow'
    : isCollection
      ? `border-2 border-dashed ${fieldMode ? 'border-nb-purple/50 bg-nb-black' : 'border-nb-purple/30 bg-nb-white'}`
      : isRange
        ? `border-l-4 border-l-cyan-600 ${fieldMode ? 'bg-nb-black border-t border-r border-b border-nb-black/60' : 'bg-nb-white border-t border-r border-b border-nb-black/10'}`
        : fieldMode ? 'bg-nb-black' : 'bg-nb-white';

  // Manifest gets a gradient header accent
  const headerAccent = isManifest
    ? (fieldMode ? 'bg-gradient-to-r from-nb-blue/20 to-transparent' : 'bg-gradient-to-r from-nb-blue/10 to-transparent')
    : '';

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(id); }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu?.(e, id); }}
      onMouseEnter={() => onHover?.(id)}
      onMouseLeave={() => onHover?.(null)}
      className={`
        absolute shadow-brutal cursor-move
        transition-shadow
        ${selected ? 'ring-2 ring-offset-2' : ''}
        ${connectingFrom ? 'ring-2 ring-nb-yellow' : ''}
        ${typeClasses}
        ${!isNote && !isCollection && !isRange ? (fieldMode ? 'ring-nb-yellow ring-offset-nb-black' : 'ring-iiif-blue ring-offset-white') : ''}
      `}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
    >
      {/* Note card — yellow sticky */}
      {isNote ? (
        <div className="p-3 h-full flex flex-col">
          <p className="text-xs text-nb-black/80 flex-1 overflow-hidden">
            {resource.annotation?.substring(0, 120) || resource.label}
          </p>
        </div>
      ) : (
        <>
          {/* Thumbnail area */}
          <div className={`relative h-24 ${cx.placeholderBg} flex items-center justify-center overflow-hidden ${headerAccent}`}>
            {resource.blobUrl ? (
              <img src={resource.blobUrl} alt={resource.label} loading="lazy" className="w-full h-full object-cover" />
            ) : isCollection ? (
              <div className="flex items-center justify-center gap-0.5">
                <Icon name="folder" className={`text-3xl ${fieldMode ? 'text-nb-purple/40' : 'text-nb-purple/30'}`} />
              </div>
            ) : isRange ? (
              <div className="flex items-center justify-center">
                <Icon name="folder_special" className={`text-3xl ${fieldMode ? 'text-cyan-400/40' : 'text-cyan-600/30'}`} />
              </div>
            ) : contentType === 'Audio' ? (
              <div className="flex items-center justify-center gap-1">
                <Icon name="audiotrack" className={`text-3xl ${fieldMode ? 'text-nb-orange/40' : 'text-nb-orange/30'}`} />
              </div>
            ) : (
              <Icon name="image" className={`text-2xl ${cx.placeholderIcon}`} />
            )}

            {/* Video/Audio play icon overlay */}
            {(contentType === 'Video' || contentType === 'Audio') && resource.blobUrl && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="w-8 h-8 bg-nb-black/50 rounded-full flex items-center justify-center">
                  <Icon name="play_arrow" className="text-nb-white text-lg" />
                </span>
              </div>
            )}

            {/* Type badge (top-left) */}
            <div className="absolute top-1 left-1">
              <TypeBadge resourceType={resource.resourceType} cx={cx} fieldMode={fieldMode} />
            </div>

            {/* Content type icon (top-right) */}
            {meta?.contentType && (
              <div className="absolute top-1 right-1">
                <ContentTypeIcon contentType={meta.contentType} cx={cx} fieldMode={fieldMode} />
              </div>
            )}

            {/* Item badge (bottom-right) — count or duration */}
            <div className="absolute bottom-1 right-1">
              {meta?.canvasCount != null && meta.canvasCount > 0 && (
                <ItemBadge value={`${meta.canvasCount} canvases`} icon="layers" cx={cx} fieldMode={fieldMode} />
              )}
              {meta?.itemCount != null && meta.itemCount > 0 && (
                <ItemBadge value={`${meta.itemCount} items`} icon="folder" cx={cx} fieldMode={fieldMode} />
              )}
              {meta?.duration != null && (
                <ItemBadge value={formatDuration(meta.duration)} icon="schedule" cx={cx} fieldMode={fieldMode} />
              )}
            </div>
          </div>

          {/* Label */}
          <div className="p-2">
            <p className={`text-xs truncate ${fieldMode ? 'text-nb-black/20' : 'text-nb-black/80'}`}>
              {resource.label}
            </p>
            {/* Range child count */}
            {isRange && meta?.rangeChildIds && meta.rangeChildIds.length > 0 && (
              <p className={`text-[10px] mt-0.5 ${fieldMode ? 'text-cyan-400/60' : 'text-cyan-600/60'}`}>
                {meta.rangeChildIds.length} canvases
              </p>
            )}
          </div>
        </>
      )}

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
