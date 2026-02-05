/**
 * SelectionBox Atom
 *
 * Multi-select drag box overlay for selecting multiple items.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (or minimal local UI state)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/board-design/ui/atoms/SelectionBox
 */

import React from 'react';

export interface SelectionBoxProps {
  /** Starting point of selection (canvas coordinates) */
  start: { x: number; y: number };
  /** Current point of selection (canvas coordinates) */
  current: { x: number; y: number };
  /** Whether selection is active (visible) */
  active: boolean;
  /** Contextual styles */
  cx: {
    surface: string;
    accent: string;
  };
  /** Field mode flag */
  fieldMode: boolean;
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({
  start,
  current,
  active,
  cx,
  fieldMode,
}) => {
  if (!active) return null;

  const left = Math.min(start.x, current.x);
  const top = Math.min(start.y, current.y);
  const width = Math.abs(current.x - start.x);
  const height = Math.abs(current.y - start.y);

  const borderColor = fieldMode ? '#facc15' : cx.accent;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left,
        top,
        width,
        height,
        border: `2px dashed ${borderColor}`,
        backgroundColor: `${borderColor}20`, // 20 = 12% opacity in hex
        zIndex: 999,
      }}
      aria-label="Selection box"
    />
  );
};