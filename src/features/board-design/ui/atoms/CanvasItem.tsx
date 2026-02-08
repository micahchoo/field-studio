/**
 * CanvasItem Atom
 *
 * Draggable item wrapper for canvas elements.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (or minimal local UI state)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/board-design/ui/atoms/CanvasItem
 */

import React from 'react';

export interface CanvasItemProps {
  /** Unique identifier */
  id: string;
  /** Position on canvas */
  position: { x: number; y: number };
  /** Dimensions */
  size: { width: number; height: number };
  /** Whether item is selected */
  selected: boolean;
  /** Whether item is being dragged */
  dragging?: boolean;
  /** Callback when drag starts */
  onDragStart: (id: string, offset: { x: number; y: number }) => void;
  /** Callback when clicked */
  onClick: (id: string) => void;
  /** Field mode flag */
  fieldMode: boolean;
  /** Child content */
  children: React.ReactNode;
}

export const CanvasItem: React.FC<CanvasItemProps> = ({
  id,
  position,
  size,
  selected,
  dragging,
  onDragStart,
  onClick,
  fieldMode,
  children,
}) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(id);

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    onDragStart(id, { x: offsetX, y: offsetY });
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`
        absolute  shadow-brutal overflow-hidden cursor-move
        transition-shadow
        ${selected ? 'ring-2 ring-offset-2' : ''}
        ${dragging ? 'ring-4 ring-offset-1 opacity-90' : ''}
        ${fieldMode ? 'ring-nb-yellow ring-offset-nb-black' : 'ring-iiif-blue ring-offset-white'}
      `}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
    >
      {children}
    </div>
  );
};