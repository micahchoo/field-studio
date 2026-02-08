/**
 * ToolDivider Atom
 *
 * Visual separator in toolbar between tool groups.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (or minimal local UI state)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/board-design/ui/atoms/ToolDivider
 */

import React from 'react';

export interface ToolDividerProps {
  /** Contextual styles */
  cx: {
    surface: string;
    text: string;
  };
  /** Field mode flag */
  fieldMode: boolean;
}

export const ToolDivider: React.FC<ToolDividerProps> = ({ cx: _cx, fieldMode }) => {
  return (
    <div
      className={`w-8 h-px my-2 ${fieldMode ? 'bg-nb-black/80' : 'bg-nb-cream'}`}
      aria-hidden="true"
    />
  );
};