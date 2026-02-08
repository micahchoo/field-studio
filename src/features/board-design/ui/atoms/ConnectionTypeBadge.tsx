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
    associated: { bg: 'bg-nb-blue/20', text: 'text-nb-blue' },
    partOf: { bg: 'bg-nb-green/20', text: 'text-nb-green' },
    similarTo: { bg: 'bg-nb-purple/10', text: 'text-nb-purple' },
    references: { bg: 'bg-nb-yellow/20', text: 'text-nb-yellow' },
    requires: { bg: 'bg-nb-red/20', text: 'text-nb-red' },
    sequence: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  };

  const fieldModeColors: Record<ConnectionType, { bg: string; text: string }> = {
    associated: { bg: 'bg-nb-blue', text: 'text-nb-blue/40' },
    partOf: { bg: 'bg-nb-green', text: 'text-nb-green/40' },
    similarTo: { bg: 'bg-nb-purple', text: 'text-nb-purple/20' },
    references: { bg: 'bg-nb-yellow/20', text: 'text-nb-yellow/60' },
    requires: { bg: 'bg-nb-red', text: 'text-nb-red/40' },
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
        inline-flex items-center px-2 py-1  text-xs font-medium
        ${colors.bg} ${colors.text}
        ${selected ? 'ring-2 ring-offset-1 ring-nb-yellow' : ''}
        ${clickable ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}
        transition-nb
      `}
      title={`Connection type: ${label}`}
      aria-label={`${label} connection`}
    >
      {label}
    </span>
  );
};