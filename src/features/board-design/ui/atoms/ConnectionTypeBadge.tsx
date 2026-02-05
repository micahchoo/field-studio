/**
 * ConnectionTypeBadge Atom
 *
 * Connection type indicator badge for labeling connections.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (or minimal local UI state)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/board-design/ui/atoms/ConnectionTypeBadge
 */

import React from 'react';
import type { ConnectionType } from '../../model';

export interface ConnectionTypeBadgeProps {
  /** Connection type */
  type: ConnectionType;
  /** Whether badge is selected */
  selected?: boolean;
  /** Whether badge is clickable */
  clickable?: boolean;
  /** Callback when clicked */
  onClick?: () => void;
  /** Contextual styles */
  cx: {
    surface: string;
    text: string;
    accent: string;
  };
  /** Field mode flag */
  fieldMode: boolean;
}

export const ConnectionTypeBadge: React.FC<ConnectionTypeBadgeProps> = ({
  type,
  selected = false,
  clickable = false,
  onClick,
  cx: _cx,
  fieldMode,
}) => {
  const typeLabels: Record<ConnectionType, string> = {
    associated: 'Associated',
    partOf: 'Part Of',
    similarTo: 'Similar',
    references: 'References',
    requires: 'Requires',
    sequence: 'Sequence',
  };

  const typeColors: Record<ConnectionType, { bg: string; text: string }> = {
    associated: { bg: 'bg-blue-100', text: 'text-blue-800' },
    partOf: { bg: 'bg-green-100', text: 'text-green-800' },
    similarTo: { bg: 'bg-purple-100', text: 'text-purple-800' },
    references: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    requires: { bg: 'bg-red-100', text: 'text-red-800' },
    sequence: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  };

  const fieldModeColors: Record<ConnectionType, { bg: string; text: string }> = {
    associated: { bg: 'bg-blue-900', text: 'text-blue-200' },
    partOf: { bg: 'bg-green-900', text: 'text-green-200' },
    similarTo: { bg: 'bg-purple-900', text: 'text-purple-200' },
    references: { bg: 'bg-yellow-900', text: 'text-yellow-200' },
    requires: { bg: 'bg-red-900', text: 'text-red-200' },
    sequence: { bg: 'bg-cyan-900', text: 'text-cyan-200' },
  };

  const colors = fieldMode ? fieldModeColors[type] : typeColors[type];
  const label = typeLabels[type];

  const handleClick = () => {
    if (clickable && onClick) {
      onClick();
    }
  };

  return (
    <span
      onClick={handleClick}
      className={`
        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
        ${colors.bg} ${colors.text}
        ${selected ? 'ring-2 ring-offset-1 ring-yellow-400' : ''}
        ${clickable ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}
        transition-opacity
      `}
      title={`Connection type: ${label}`}
      aria-label={`${label} connection`}
    >
      {label}
    </span>
  );
};