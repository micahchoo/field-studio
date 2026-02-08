/**
 * TabButtonBase Atom
 *
 * Universal tab button for switching between panels/tabs.
 * Supports optional icon, keyboard navigation, and contextual styling.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (controlled by parent)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module shared/ui/atoms/TabButtonBase
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms/Icon';

export interface TabButtonBaseProps {
  /** Display label */
  label: string;
  /** Whether this tab is currently active */
  isActive: boolean;
  /** Callback when tab is clicked */
  onClick: () => void;
  /** Optional tab identifier */
  id?: string;
  /** Optional material icon name */
  icon?: string;
  /** Field mode flag for dark theme */
  fieldMode?: boolean;
  /** Additional CSS class */
  className?: string;
}

export const TabButtonBase: React.FC<TabButtonBaseProps> = ({
  label,
  isActive,
  onClick,
  id,
  icon,
  fieldMode = false,
  className ='',
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key ==='Enter' || e.key ==='') {
      e.preventDefault();
      onClick();
    }
  };

  const activeClass = fieldMode
    ?'text-nb-blue border-b-2 border-nb-blue bg-nb-blue/20'
    :'text-nb-blue border-b-2 border-nb-blue bg-nb-blue/10';

  const inactiveClass = fieldMode
    ?'text-nb-black/50 hover:bg-nb-black'
    :'text-nb-black/50 hover:bg-nb-white';

  return (
    <div
      id={id}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer ${
        isActive ? activeClass : inactiveClass
      } ${className}`}
      role="tab"
      tabIndex={0}
      aria-selected={isActive}
    >
      {icon && <Icon name={icon} className="text-xs" />}
      {label}
    </div>
  );
};

export default TabButtonBase;
