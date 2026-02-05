/**
 * ListItemBase Molecule
 *
 * Base list item with selection state, hover effects, and optional actions.
 * Provides consistent styling for list items across features.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (controlled by parent)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens via Tailwind
 *
 * @module shared/ui/molecules/ListItemBase
 */

import React, { ReactNode } from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { IconButton } from '@/src/shared/ui/molecules';

export interface ListItemBaseProps {
  /** Item content */
  children: ReactNode;
  /** Whether the item is selected */
  selected?: boolean;
  /** Called when item is clicked */
  onClick?: () => void;
  /** Whether to show delete button */
  showDelete?: boolean;
  /** Called when delete button is clicked */
  onDelete?: () => void;
  /** Custom delete icon name */
  deleteIcon?: string;
  /** Delete button aria label */
  deleteAriaLabel?: string;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Field mode for dark theme */
  fieldMode?: boolean;
  /** Custom accent color for selected state */
  accentColor?: string;
  /** Additional CSS class */
  className?: string;
}

export const ListItemBase: React.FC<ListItemBaseProps> = ({
  children,
  selected = false,
  onClick,
  showDelete = false,
  onDelete,
  deleteIcon = 'close',
  deleteAriaLabel = 'Delete item',
  disabled = false,
  fieldMode = false,
  accentColor = 'blue',
  className = '',
}) => {
  const containerClass = `p-3 rounded border transition-colors ${className} ${
    selected
      ? fieldMode
        ? `border-${accentColor}-500 bg-${accentColor}-900/20`
        : `border-${accentColor}-400 bg-${accentColor}-50`
      : fieldMode
        ? 'border-slate-800 hover:border-slate-600 bg-slate-900'
        : 'border-slate-200 hover:border-slate-300 bg-slate-50'
  } ${onClick && !disabled ? 'cursor-pointer' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

  const handleClick = (e: React.MouseEvent) => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && !disabled) {
      onDelete();
    }
  };

  return (
    <div className={containerClass} onClick={handleClick}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          {children}
        </div>
        {showDelete && onDelete && (
          <IconButton
            icon={deleteIcon}
            ariaLabel={deleteAriaLabel}
            onClick={handleDelete}
            disabled={disabled}
            variant="ghost"
            size="sm"
            className={fieldMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}
          />
        )}
      </div>
    </div>
  );
};

export default ListItemBase;
