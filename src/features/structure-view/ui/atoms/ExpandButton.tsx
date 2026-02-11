/**
 * Expand Button Atom
 *
 * Simple toggle button for expanding/collapsing tree nodes.
 * Zero business logic - just visual state.
 */

import React from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { cn } from '@/src/shared/lib/cn';

interface ExpandButtonProps {
  isExpanded: boolean;
  onClick: (e: React.MouseEvent) => void;
  hasChildren: boolean;
  className?: string;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const ExpandButton: React.FC<ExpandButtonProps> = ({
  isExpanded,
  onClick,
  hasChildren,
  className = '',
  fieldMode,
}) => {
  if (!hasChildren) {
    return <span className="w-5 h-5 inline-block" />;
  }

  return (
    <Button variant="ghost" size="bare"
      type="button"
      onClick={onClick}
      className={cn('w-5 h-5 inline-flex items-center justify-center transition-nb', fieldMode ? 'hover:bg-nb-yellow/20' : 'hover:bg-nb-black/10', className)}
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
    </Button>
  );
};

ExpandButton.displayName = 'ExpandButton';
