/**
 * Toolbar Molecule
 *
 * Composes: Button atoms + container layout
 *
 * A horizontal action bar for organizing related actions.
 * Fieldmode-aware styling with consistent spacing.
 *
 * IDEAL OUTCOME: Actions are clearly grouped and accessible
 * FAILURE PREVENTED: Scattered buttons without visual grouping
 */

import React from 'react';
import { Button } from '@/src/shared/ui/atoms';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface ToolbarProps {
  /** Button/action elements */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Alignment of items */
  align?: 'left' | 'center' | 'right' | 'spaceBetween';
  /** Show divider line above toolbar */
  showDivider?: boolean;
  /** Compact mode (smaller padding) */
  compact?: boolean;
  /** ARIA label for the toolbar */
  ariaLabel?: string;
  /** Contextual styles from template */
  cx?: ContextualClassNames;
  /** Current field mode */
  fieldMode?: boolean;
}

const alignClasses = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
  spaceBetween: 'justify-between',
};

/**
 * Toolbar Molecule
 *
 * @example
 * <Toolbar align="spaceBetween">
 *   <Button onClick={onCreate}>Create</Button>
 *   <Button onClick={onDelete} variant="danger">Delete</Button>
 * </Toolbar>
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  children,
  className = '',
  align = 'left',
  showDivider = false,
  compact = false,
  ariaLabel = 'Toolbar',
  cx,
  fieldMode: _fieldMode = false,
}) => {
  // Context is provided via props (no hook calls)

  const paddingClass = compact ? 'py-2 px-3' : 'py-3 px-4';
  const gapClass = compact ? 'gap-2' : 'gap-3';
  const safeCx = cx || {} as ContextualClassNames;

  return (
    <div
      className={`
        flex items-center ${alignClasses[align]}
        ${paddingClass} ${gapClass}
        ${showDivider ? `border-t ${safeCx.border || 'border-slate-200'}` : ''}
        ${safeCx.surface || ''}
        ${className}
      `}
      role="toolbar"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
};

export default Toolbar;
