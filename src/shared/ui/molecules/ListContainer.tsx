/**
 * ListContainer Molecule
 *
 * Universal list container with header, count, empty state, and consistent spacing.
 * Wraps children items with optional header and handles empty state display.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (controlled by parent)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens via Tailwind
 *
 * @module shared/ui/molecules/ListContainer
 */

import React, { ReactNode } from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { Button } from '@/ui/primitives/Button';

export interface ListContainerProps {
  /** List items to display */
  children?: ReactNode;
  /** List title/label */
  title?: string;
  /** Number of items (shown in header) */
  count?: number;
  /** Empty state icon name */
  emptyIcon?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state action button label */
  emptyActionLabel?: string;
  /** Called when empty state action is clicked */
  onEmptyAction?: () => void;
  /** Header action button label */
  headerActionLabel?: string;
  /** Called when header action is clicked */
  onHeaderAction?: () => void;
  /** Optional header action icon */
  headerActionIcon?: string;
  /** Field mode for dark theme */
  fieldMode?: boolean;
  /** Spacing between items (Tailwind space-y-* value) */
  itemSpacing?:'space-y-1' |'space-y-2' |'space-y-3' |'space-y-4';
  /** Additional CSS class */
  className?: string;
}

export const ListContainer: React.FC<ListContainerProps> = ({
  children,
  title,
  count,
  emptyIcon ='inbox',
  emptyMessage ='No items yet',
  emptyActionLabel,
  onEmptyAction,
  headerActionLabel,
  onHeaderAction,
  headerActionIcon ='add',
  fieldMode = false,
  itemSpacing ='space-y-2',
  className ='',
}) => {
  const hasItems = React.Children.count(children) > 0;

  // Empty state
  if (!hasItems) {
    return (
      <div className={`text-center py-10 ${className}`}>
        <Icon
          name={emptyIcon}
          className={`text-4xl mb-2 ${fieldMode ?'text-nb-black/60' :'text-nb-black/30'}`}
        />
        <p className={`text-xs ${fieldMode ?'text-nb-black/50' :'text-nb-black/50'}`}>
          {emptyMessage}
        </p>
        {onEmptyAction && emptyActionLabel && (
          <Button
            onClick={onEmptyAction}
            variant={fieldMode ?'secondary' :'primary'}
            size="sm"
            className="mt-4"
          >
            {emptyActionLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      {(title || count !== undefined || onHeaderAction) && (
        <div className="flex justify-between items-center mb-3">
          {title && (
            <span className={`text-[10px] font-bold uppercase ${fieldMode ?'text-nb-black/50' :'text-nb-black/40'}`}>
              {title}
              {count !== undefined &&` (${count})`}
            </span>
          )}
          {onHeaderAction && headerActionLabel && (
            <Button
              onClick={onHeaderAction}
              variant="ghost"
              size="sm"
              icon={<Icon name={headerActionIcon} className="text-xs" />}
            >
              {headerActionLabel}
            </Button>
          )}
        </div>
      )}

      {/* Items */}
      <div className={itemSpacing}>
        {children}
      </div>
    </div>
  );
};

export default ListContainer;
