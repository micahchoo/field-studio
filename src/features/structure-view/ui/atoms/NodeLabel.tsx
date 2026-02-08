/**
 * Node Label Atom
 *
 * Displays a tree node label with appropriate styling.
 * Zero business logic - pure presentation.
 */

import React from 'react';

interface NodeLabelProps {
  label: string;
  type: string;
  isSelected: boolean;
  isDragging: boolean;
  className?: string;
}

export const NodeLabel: React.FC<NodeLabelProps> = ({
  label,
  type,
  isSelected,
  isDragging,
  className = '',
}) => {
  const baseClasses = 'truncate text-sm';
  const stateClasses = isSelected
    ? 'font-semibold text-nb-blue'
    : 'text-nb-black/70';
  const dragClasses = isDragging ? 'opacity-50' : '';

  return (
    <span
      className={`${baseClasses} ${stateClasses} ${dragClasses} ${className}`}
      title={label}
    >
      {label}
    </span>
  );
};

NodeLabel.displayName = 'NodeLabel';
