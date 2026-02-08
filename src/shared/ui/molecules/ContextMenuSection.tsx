/**
 * ContextMenuSection Molecule
 *
 * Grouped section of context menu items with optional title and divider.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Props-driven, no internal state
 * - Composes ContextMenuItem
 * - Pure presentational
 *
 * IDEAL OUTCOME: Organized menu sections with clear visual hierarchy
 * FAILURE PREVENTED: Unorganized menus, missing section dividers
 *
 * @module shared/ui/molecules/ContextMenuSection
 */

import React from 'react';
import { ContextMenuItem, type ContextMenuItemProps } from './ContextMenuItem';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface ContextMenuSectionProps {
  /** Section title (optional) */
  title?: string;
  /** Items in this section */
  items: Omit<ContextMenuItemProps,'cx'>[];
  /** Whether to show divider before this section */
  showDivider?: boolean;
  /** Contextual styles */
  cx?: ContextualClassNames;
  /** Called when an item is clicked */
  onItemClick?: (itemId: string) => void;
}

/**
 * ContextMenuSection Component
 *
 * @example
 * <ContextMenuSection
 *   title="Actions"
 *   items={[
 *     { id:'edit', label:'Edit', icon:'edit', onClick: () => {} },
 *     { id:'delete', label:'Delete', icon:'delete', variant:'danger', onClick: () => {} },
 *   ]}
 *   showDivider={true}
 * />
 */
export const ContextMenuSection: React.FC<ContextMenuSectionProps> = ({
  title,
  items,
  showDivider = false,
  cx,
  onItemClick,
}) => {
  // Filter out items where all are disabled
  const validItems = items.filter((item) => !item.disabled);

  if (validItems.length === 0) return null;

  return (
    <>
      {/* Section divider */}
      {showDivider && <div className={`h-px my-1.5 mx-3 ${cx?.subtleBg ??'bg-nb-cream'}`} />}

      {/* Section title */}
      {title && (
        <div
          className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${cx?.label ??'text-nb-black/40'}`}
        >
          {title}
        </div>
      )}

      {/* Section items */}
      <div className="px-1">
        {validItems.map((item) => (
          <ContextMenuItem
            key={item.id}
            {...item}
            cx={cx}
            onClick={() => onItemClick?.(item.id) ?? item.onClick()}
          />
        ))}
      </div>
    </>
  );
};

export default ContextMenuSection;
