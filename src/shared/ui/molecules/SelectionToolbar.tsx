/**
 * SelectionToolbar Molecule
 *
 * Composes: Toolbar with selection count + actions
 *
 * Appears when items are selected (multi-select).
 * Shows count of selected items and bulk actions.
 * Can be dismissed.
 *
 * IDEAL OUTCOME: Shows selection count and bulk actions clearly
 * FAILURE PREVENTED: User confusion about what's selected and what actions apply
 */

import React from 'react';
import { Icon } from '../atoms';
import { Toolbar } from './Toolbar';
import { useContextualStyles } from '../../../hooks/useContextualStyles';
import { useAppSettings } from '../../../hooks/useAppSettings';

export interface SelectionToolbarProps {
  /** Number of selected items */
  count: number;
  /** Action buttons (bulk actions) */
  children: React.ReactNode;
  /** Called when toolbar is dismissed */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * SelectionToolbar Molecule
 *
 * @example
 * {selectedIds.length > 0 && (
 *   <SelectionToolbar count={selectedIds.length} onDismiss={clearSelection}>
 *     <Button onClick={onBulkDelete} variant="danger">
 *       Delete {selectedIds.length}
 *     </Button>
 *     <Button onClick={onBulkTag}>Tag</Button>
 *   </SelectionToolbar>
 * )}
 */
export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  count,
  children,
  onDismiss,
  className = '',
}) => {
  // Theme via context
  const { settings } = useAppSettings();
  const cx = useContextualStyles(settings.fieldMode);

  return (
    <div
      className={`
        sticky bottom-0 left-0 right-0
        border-t
        ${
          settings.fieldMode
            ? 'bg-slate-900 border-slate-700'
            : 'bg-slate-50 border-slate-200'
        }
        ${className}
      `}
      role="region"
      aria-label="Selection toolbar"
    >
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: Selection Count */}
        <div className="flex items-center gap-2">
          <Icon
            name="check_circle"
            className={`
              text-xl
              ${settings.fieldMode ? 'text-yellow-400' : 'text-iiif-blue'}
            `}
            aria-hidden="true"
          />
          <span
            className={`
              font-semibold
              ${settings.fieldMode ? 'text-white' : 'text-slate-900'}
            `}
          >
            {count} selected
          </span>
        </div>

        {/* Middle: Actions */}
        <Toolbar position="between">{children}</Toolbar>

        {/* Right: Dismiss Button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`
              p-2 rounded-full transition-colors
              focus:outline-none focus:ring-2 focus:ring-offset-1
              ${
                settings.fieldMode
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 focus:ring-yellow-400 focus:ring-offset-slate-900'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 focus:ring-blue-600 focus:ring-offset-white'
              }
            `}
            title="Clear selection"
            aria-label="Clear selection"
            type="button"
          >
            <Icon name="close" className="text-lg" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SelectionToolbar;
