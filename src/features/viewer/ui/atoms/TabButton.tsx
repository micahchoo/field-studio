/**
 * TabButton Atom
 *
 * Workbench tab button for switching between parameter panels.
 * Used in the IIIF Image API workbench for Params/Code tabs.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (controlled by parent)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/TabButton
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface TabButtonProps {
  /** Tab identifier */
  id: string;
  /** Display label */
  label: string;
  /** Material icon name */
  icon: string;
  /** Whether this tab is currently active */
  isActive: boolean;
  /** Callback when tab is clicked */
  onClick: () => void;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const TabButton: React.FC<TabButtonProps> = ({
  id,
  label,
  icon,
  isActive,
  onClick,
  cx: _cx,
  fieldMode = false,
}) => {
  const activeClass = fieldMode
    ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/20'
    : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50';

  const inactiveClass = fieldMode
    ? 'text-slate-500 hover:bg-slate-900'
    : 'text-slate-500 hover:bg-slate-50';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      id={id}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer ${
        isActive ? activeClass : inactiveClass
      }`}
      role="tab"
      tabIndex={0}
      aria-selected={isActive}
    >
      <Icon name={icon} className="text-xs" /> {label}
    </div>
  );
};

export default TabButton;
