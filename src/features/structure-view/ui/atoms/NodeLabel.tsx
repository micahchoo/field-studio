/**
 * Node Label Atom
 *
 * Displays a tree node label with appropriate styling.
 * Zero business logic - pure presentation.
 */

import React from 'react';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import { cn } from '@/src/shared/lib/cn';

interface NodeLabelProps {
  label: string;
  type: string;
  isSelected: boolean;
  isDragging: boolean;
  className?: string;
  /** Contextual class names from parent */
  cx?: Partial<ContextualClassNames>;
}

export const NodeLabel: React.FC<NodeLabelProps> = ({
  label,
  type,
  isSelected,
  isDragging,
  className = '',
  cx,
}) => {
  const baseClasses = 'truncate text-sm';
  const stateClasses = isSelected
    ? cn('font-semibold', cx?.accent ?? 'text-nb-blue')
    : cn(cx?.textMuted ?? 'text-nb-black/70');
  const dragClasses = isDragging ? 'opacity-50' : '';

  return (
    <span
      className={cn(baseClasses, stateClasses, dragClasses, className)}
      title={label}
    >
      {label}
    </span>
  );
};

NodeLabel.displayName = 'NodeLabel';
