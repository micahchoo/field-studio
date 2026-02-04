/**
 * Toolbar Molecule
 *
 * Composes: Button atoms in a horizontal group
 *
 * Standardized action toolbar for any collection of buttons.
 * Groups related actions and applies consistent spacing/styling.
 *
 * IDEAL OUTCOME: Actions grouped visually with consistent spacing
 * FAILURE PREVENTED: Inconsistent button layout across views
 */

import React from 'react';
import { useContextualStyles } from '../../../hooks/useContextualStyles';
import { useAppSettings } from '../../../hooks/useAppSettings';

export interface ToolbarProps {
  /** Action buttons */
  children: React.ReactNode;
  /** Toolbar position (default: default spacing) */
  position?: 'left' | 'center' | 'right' | 'between';
  /** Additional CSS classes */
  className?: string;
  /** Optional aria-label for accessibility */
  ariaLabel?: string;
  /** Show separator between button groups */
  showDividers?: boolean;
}

/**
 * Toolbar Molecule
 *
 * @example
 * <Toolbar ariaLabel="Archive actions">
 *   <Button onClick={onCreate}>Create</Button>
 *   <Button onClick={onEdit}>Edit</Button>
 *   <Button variant="danger" onClick={onDelete}>Delete</Button>
 * </Toolbar>
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  children,
  position = 'left',
  className = '',
  ariaLabel,
  showDividers = false,
}) => {
  // Theme via context
  const { settings } = useAppSettings();
  const cx = useContextualStyles(settings.fieldMode);

  const positionClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={`
        flex items-center gap-2 p-2
        ${settings.fieldMode ? 'bg-slate-800' : 'bg-slate-100'}
        rounded-md
        ${positionClasses[position]}
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
