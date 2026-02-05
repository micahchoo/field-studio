/**
 * CanvasGrid Atom
 *
 * Background grid pattern for canvas workspace.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (or minimal local UI state)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/board-design/ui/atoms/CanvasGrid
 */

import React from 'react';

export interface CanvasGridProps {
  /** Grid cell size in pixels */
  cellSize?: number;
  /** Grid line thickness */
  lineWidth?: number;
  /** Whether grid is visible */
  visible?: boolean;
  /** Contextual styles */
  cx: {
    gridBg: string;
    gridLine: string;
  };
  /** Field mode flag */
  fieldMode: boolean;
}

export const CanvasGrid: React.FC<CanvasGridProps> = ({
  cellSize = 20,
  lineWidth = 1,
  visible = true,
  cx,
  fieldMode: _fieldMode,
}) => {
  if (!visible) return null;

  const gridStyle = {
    backgroundImage: `
      linear-gradient(${cx.gridLine} ${lineWidth}px, transparent ${lineWidth}px),
      linear-gradient(90deg, ${cx.gridLine} ${lineWidth}px, transparent ${lineWidth}px)
    `,
    backgroundSize: `${cellSize}px ${cellSize}px`,
  };

  return (
    <div
      className={`absolute inset-0 opacity-20 ${cx.gridBg}`}
      style={gridStyle}
      aria-hidden="true"
    />
  );
};