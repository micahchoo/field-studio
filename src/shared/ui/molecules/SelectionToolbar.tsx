/**
 * SelectionToolbar Molecule
 *
 * Composes: Toolbar + count badge + actions
 *
 * Appears when items are selected, showing selection count
 * and providing bulk action buttons.
 *
 * IDEAL OUTCOME: Clear bulk actions available when items selected
 * FAILURE PREVENTED: Users lose track of selected items or bulk actions
 */

import React from 'react';
import { Button, Icon } from '../atoms';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface SelectionToolbarProps {
  /** Number of selected items */
  count: number;
  /** Action buttons (typically bulk operations) */
  children: React.ReactNode;
  /** Optional clear selection handler */
  onClear?: () => void;
  /** Item type label (for count display) */
  itemLabel?: string;
  /** Additional CSS classes */
  className?: string;
  /** Contextual styles from template (required for theming) */
  cx: ContextualClassNames;
  /** Terminology function for"selected" label */
  t: (key: string) => string;
  fieldMode?: boolean;
}

/**
 * SelectionToolbar Molecule
 *
 * @example
 * {selectedIds.length > 0 && (
 *   <SelectionToolbar
 *     count={selectedIds.length}
 *     onClear={() => setSelectedIds([])}
 *     itemLabel="items"
 *   >
 *     <Button onClick={onBulkDelete} variant="danger">Delete</Button>
 *     <Button onClick={onBulkExport}>Export</Button>
 *   </SelectionToolbar>
 * )}
 */
export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  count,
  children,
  onClear,
  itemLabel ='items',
  className ='',
  cx,
  t,
}) => {

  // Don't render if nothing selected
  if (count === 0) {
    return null;
  }

  return (
    <div
      className={`
        flex items-center justify-between
        py-2 px-4
        ${cx.accentBadge}
        
        animate-in fade-in slide-in-from-top-1
        ${className}
`}
      role="region"
      aria-label="Selection toolbar"
      aria-live="polite"
    >
      {/* Selection count */}
      <div className="flex items-center gap-2">
        <Icon name="check_circle" className="text-sm" aria-hidden="true" />
        <span className="font-medium">
          {count} {itemLabel} {t('selected')}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {children}

        {/* Clear selection button */}
        {onClear && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            aria-label={`Clear selection of ${count} ${itemLabel}`}
          >
            <Icon name="close" className="text-sm mr-1" aria-hidden="true" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};

export default SelectionToolbar;
