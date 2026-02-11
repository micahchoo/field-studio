/**
 * ConnectionLine Atom
 *
 * SVG line between two nodes with optional label, arrowheads,
 * and multiple line styles (straight/curved/elbow).
 *
 * @module features/board-design/ui/atoms/ConnectionLine
 */

import React from 'react';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
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
  /** Line style */
  style?: 'straight' | 'elbow' | 'curved';
  /** Custom color */
  color?: string;
  /** Show directional arrowhead */
  showArrow?: boolean;
  /** Callback when connection is clicked */
  onSelect: (id: string) => void;
  /** Callback when connection is double-clicked */
  onDoubleClick?: (id: string) => void;
  /** Contextual styles */
  cx: ContextualClassNames;
  /** Field mode flag */
  fieldMode: boolean;
}

/** Build SVG path data for the connection line */
function buildPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  style: 'straight' | 'elbow' | 'curved',
): string {
  if (style === 'curved') {
    // Quadratic bezier with control point perpendicular to midpoint
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const offset = Math.min(50, len * 0.3);
    // Perpendicular offset
    const cx = midX - (dy / len) * offset;
    const cy = midY + (dx / len) * offset;
    return `M ${from.x},${from.y} Q ${cx},${cy} ${to.x},${to.y}`;
  }

  if (style === 'elbow') {
    // Orthogonal routing: horizontal then vertical
    const midX = (from.x + to.x) / 2;
    return `M ${from.x},${from.y} H ${midX} V ${to.y} H ${to.x}`;
  }

  // Straight line as path for consistency
  return `M ${from.x},${from.y} L ${to.x},${to.y}`;
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({
  id,
  from,
  to,
  type,
  label,
  selected,
  style = 'straight',
  color,
  showArrow = false,
  onSelect,
  onDoubleClick,
  cx,
  fieldMode,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick?.(id);
  };

  // Determine stroke color
  const strokeColor = color
    || (selected
      ? cx.accent
      : fieldMode
        ? '#FFE500'
        : cx.svgStroke);

  const strokeWidth = selected ? 3 : 2;
  const pathData = buildPath(from, to, style);
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const markerId = `arrowhead-${id}`;

  return (
    <g onClick={handleClick} onDoubleClick={handleDoubleClick} style={{ cursor: 'pointer' }}>
      {/* Arrowhead marker definition */}
      {showArrow && (
        <defs>
          <marker
            id={markerId}
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={strokeColor} />
          </marker>
        </defs>
      )}

      {/* Invisible wider hit area for easier clicking */}
      <path
        d={pathData}
        stroke="transparent"
        strokeWidth={12}
        fill="none"
      />

      {/* Visible path */}
      <path
        d={pathData}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={type === 'references' ? '5,5' : 'none'}
        markerEnd={showArrow ? `url(#${markerId})` : undefined}
      />

      {/* Label with background */}
      {label && (
        <>
          <rect
            x={midX - label.length * 3.5 - 4}
            y={midY - 16}
            width={label.length * 7 + 8}
            height={16}
            fill={fieldMode ? '#1a1a1a' : '#ffffff'}
            opacity={0.85}
            rx={2}
          />
          <text
            x={midX}
            y={midY - 5}
            fill={cx.svgFill}
            fontSize={11}
            textAnchor="middle"
            pointerEvents="none"
            fontWeight={selected ? 600 : 400}
          >
            {label}
          </text>
        </>
      )}

      {/* Connection type indicator dot */}
      <circle
        cx={midX}
        cy={midY}
        r={selected ? 6 : 4}
        fill={strokeColor}
        opacity={0.7}
      />
    </g>
  );
};
