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
import { IconButton } from '@/src/shared/ui/molecules/IconButton';

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
  deleteIcon ='close',
  deleteAriaLabel ='Delete item',
  disabled = false,
  fieldMode = false,
  accentColor ='blue',
  className ='',
}) => {
  // Static Tailwind class mappings (dynamic interpolation breaks JIT)
  const accentStyles: Record<string, { selected: string; selectedField: string }> = {
    blue: { selected:'border-nb-blue bg-nb-blue/10', selectedField:'border-nb-blue bg-nb-blue/20' },
    green: { selected:'border-nb-green bg-nb-green/10', selectedField:'border-nb-green bg-nb-green/20' },
    red: { selected:'border-nb-red bg-nb-red/10', selectedField:'border-nb-red bg-nb-red/20' },
    purple: { selected:'border-nb-purple/60 bg-nb-purple/5', selectedField:'border-nb-purple bg-nb-purple/20' },
    amber: { selected:'border-nb-orange bg-nb-orange/10', selectedField:'border-nb-orange bg-nb-orange/10' },
  };
  const accent = accentStyles[accentColor] || accentStyles.blue;

  const containerClass =`p-3 border transition-nb ${className} ${
    selected
      ? fieldMode
        ? accent.selectedField
        : accent.selected
      : fieldMode
        ?'border-nb-black hover:border-nb-black/60 bg-nb-black'
        :'border-nb-black/20 hover:border-nb-black/20 bg-nb-white'
  } ${onClick && !disabled ?'cursor-pointer' :''} ${disabled ?'opacity-50 cursor-not-allowed' :''}`;

  const handleClick = (e: React.MouseEvent) => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const handleDelete = () => {
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
            className={fieldMode ?'text-nb-black/50 hover:text-nb-black/30' :'text-nb-black/40 hover:text-nb-black/60'}
          />
        )}
      </div>
    </div>
  );
};

export default ListItemBase;
