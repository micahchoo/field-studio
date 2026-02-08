/**
 * BreadcrumbSiblingMenu Molecule
 *
 * Dropdown menu showing sibling items for breadcrumb navigation.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - No local state (controlled by parent)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module shared/ui/molecules/BreadcrumbSiblingMenu
 */

import React from 'react';
import { Button, Icon } from '../atoms';
import type { BreadcrumbItem } from './breadcrumbTypes';

export interface BreadcrumbSiblingMenuProps {
  /** Current item ID (for highlighting) */
  currentItemId: string;
  /** Sibling items to display */
  siblings: BreadcrumbItem[];
  /** Called when a sibling is selected */
  onSelect: (sibling: BreadcrumbItem) => void;
  /** Field mode flag for dark theme */
  fieldMode?: boolean;
  /** Function to get icon for item type */
  getIconForType: (type?: string) => string;
}

export const BreadcrumbSiblingMenu: React.FC<BreadcrumbSiblingMenuProps> = ({
  currentItemId,
  siblings,
  onSelect,
  fieldMode = false,
  getIconForType,
}) => {
  return (
    <div
      className={`
        absolute top-full left-0 mt-1 min-w-[200px] max-h-[300px]
         shadow-brutal border overflow-y-auto
        ${fieldMode ?'bg-nb-black border-nb-black/80' :'bg-nb-white border-nb-black/20'}
        animate-in fade-in slide-in-from-top-2 z-50
`}
      role="menu"
    >
      <div className={`px-3 py-2 text-xs font-medium ${fieldMode ?'text-nb-black/50' :'text-nb-black/50'}`}>
        Siblings
      </div>
      {siblings.map(sibling => (
        <Button variant="ghost" size="bare"
          key={sibling.id}
          onClick={() => onSelect(sibling)}
          className={`
            w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm
            transition-nb
            ${sibling.id === currentItemId
              ? (fieldMode ?'bg-nb-black/80 text-white' :'bg-nb-blue/10 text-nb-blue')
              : (fieldMode ?'text-nb-black/30 hover:bg-nb-black/80' :'text-nb-black/80 hover:bg-nb-white')
            }
`}
          role="menuitem"
          aria-current={sibling.id === currentItemId ?'true' : undefined}
        >
          <Icon
            name={sibling.icon || getIconForType(sibling.type)}
            className="text-sm opacity-60"
          />
          <span className="flex-1 truncate">{sibling.label}</span>
          {sibling.childCount !== undefined && sibling.childCount > 0 && (
            <span
              className={`
                px-1.5 py-0.5 text-xs 
                ${fieldMode ?'bg-nb-black/80 text-nb-black/40' :'bg-nb-cream text-nb-black/50'}
`}
            >
              {sibling.childCount}
            </span>
          )}
        </Button>
      ))}
    </div>
  );
};

export default BreadcrumbSiblingMenu;
