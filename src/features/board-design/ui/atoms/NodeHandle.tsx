/**
 * NodeHandle Atom
 *
 * Connection handle on node edge for creating connections.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (or minimal local UI state)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/board-design/ui/atoms/NodeHandle
 */

import React from 'react';
import { Button } from '@/src/shared/ui/atoms';

export interface NodeHandleProps {
  /** Position relative to node: 'top', 'right', 'bottom', 'left' */
  position: 'top' | 'right' | 'bottom' | 'left';
  /** Whether handle is active (hovered or connecting) */
  active: boolean;
  /** Callback when handle is clicked */
  onClick: () => void;
  /** Contextual styles */
  cx: {
    accent: string;
    surface: string;
  };
  /** Field mode flag */
  fieldMode: boolean;
}

export const NodeHandle: React.FC<NodeHandleProps> = ({
  position,
  active,
  onClick,
  cx: _cx,
  fieldMode: _fieldMode,
}) => {
  const positionClasses = {
    top: '-top-1 left-1/2 -translate-x-1/2',
    right: '-right-1 top-1/2 -translate-y-1/2',
    bottom: '-bottom-1 left-1/2 -translate-x-1/2',
    left: '-left-1 top-1/2 -translate-y-1/2',
  };

  const size = active ? 12 : 8;
  const color = active
    ? _cx.accent
    : _fieldMode
      ? '#facc15' // yellow
      : '#3b82f6'; // iiif-blue

  return (
    <div className={`absolute ${positionClasses[position]}`}>
      <Button
        onClick={onClick}
        variant="ghost"
        size="sm"
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          padding: 0,
          borderRadius: '50%',
          backgroundColor: color,
          border: 'none',
          cursor: 'crosshair',
        }}
        aria-label={`Connect from ${position} side`}
        title="Click to start connection"
      />
    </div>
  );
};