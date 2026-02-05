/**
 * Expand Button Atom
 *
 * Simple toggle button for expanding/collapsing tree nodes.
 * Zero business logic - just visual state.
 */

import React from 'react';

interface ExpandButtonProps {
  isExpanded: boolean;
  onClick: (e: React.MouseEvent) => void;
  hasChildren: boolean;
  className?: string;
}

export const ExpandButton: React.FC<ExpandButtonProps> = ({
  isExpanded,
  onClick,
  hasChildren,
  className = '',
}) => {
  if (!hasChildren) {
    return <span className="w-5 h-5 inline-block" />;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-5 h-5 inline-flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${className}`}
      aria-label={isExpanded ? 'Collapse' : 'Expand'}
    >
      <svg
        className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
};

ExpandButton.displayName = 'ExpandButton';
