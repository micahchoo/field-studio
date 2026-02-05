/**
 * ConnectionLine Atom
 *
 * SVG line between two nodes with optional label and styling.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (or minimal local UI state)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/board-design/ui/atoms/ConnectionLine
 */

import React from 'react';
import type { ConnectionType } from '../../model';

export interface ConnectionLineProps {
  /** Unique connection ID */
  id: string;
  /** Start point coordinates */
  from: { x: number; y: number };
  /** End point coordinates */
  to: { x: number; y: number };
  /** Connection type */
  type: ConnectionType;
  /** Optional label text */
  label?: string;
  /** Whether connection is selected */
  selected: boolean;
  /** Callback when connection is clicked */
  onSelect: (id: string) => void;
  /** Contextual styles */
  cx: {
    svgStroke: string;
    svgFill: string;
    accent: string;
  };
  /** Field mode flag */
  fieldMode: boolean;
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({
  id,
  from,
  to,
  type,
  label,
  selected,
  onSelect,
  cx,
  fieldMode,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(id);
  };

  // Determine stroke color based on selection and field mode
  const strokeColor = selected
    ? cx.accent
    : fieldMode
      ? '#facc15' // yellow for field mode
      : cx.svgStroke;

  const strokeWidth = selected ? 3 : 2;

  return (
    <g onClick={handleClick} style={{ cursor: 'pointer' }}>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={type === 'references' ? '5,5' : 'none'}
      />
      {label && (
        <text
          x={(from.x + to.x) / 2}
          y={(from.y + to.y) / 2 - 5}
          fill={cx.svgFill}
          fontSize={12}
          textAnchor="middle"
          pointerEvents="none"
        >
          {label}
        </text>
      )}
      {/* Connection type indicator dot */}
      <circle
        cx={(from.x + to.x) / 2}
        cy={(from.y + to.y) / 2}
        r={selected ? 6 : 4}
        fill={strokeColor}
        opacity={0.7}
      />
    </g>
  );
};