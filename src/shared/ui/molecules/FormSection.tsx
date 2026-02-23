/**
 * FormSection Molecule - Collapsible Field Group
 *
 * Reusable collapsible section for grouping form fields.
 * Supports controlled (collapsed+onToggle) and uncontrolled (defaultCollapsed) modes.
 *
 * @module shared/ui/molecules/FormSection
 */

import React, { useState } from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';

export interface FormSectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  /** Controlled collapsed state */
  collapsed?: boolean;
  /** Controlled toggle handler */
  onToggle?: () => void;
  /** Initial collapsed state for uncontrolled mode */
  defaultCollapsed?: boolean;
  fieldMode?: boolean;
  /** Optional badge slot rendered in the header */
  badge?: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  icon,
  children,
  collapsed,
  onToggle,
  defaultCollapsed = false,
  fieldMode,
  badge,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isControlled = collapsed !== undefined && onToggle !== undefined;
  const isCollapsed = isControlled ? collapsed : internalCollapsed;
  const toggle = isControlled ? onToggle : () => setInternalCollapsed(c => !c);

  return (
    <div className={`border ${fieldMode ? 'bg-nb-black/50 border-nb-black' : 'bg-nb-white border-nb-black/10'} overflow-hidden`}>
      <Button variant="ghost" size="bare"
        onClick={toggle}
        className={`w-full px-4 py-3 flex items-center justify-between ${fieldMode ? 'hover:bg-nb-black' : 'hover:bg-nb-cream'} transition-nb`}
      >
        <div className="flex items-center gap-2">
          <span className={`w-8 h-8 flex items-center justify-center ${fieldMode ? 'bg-nb-black text-nb-black/40' : 'bg-nb-cream text-nb-black/60'}`}>
            <Icon name={icon} className="text-sm" />
          </span>
          <span className={`font-medium ${fieldMode ? 'text-nb-black/10' : 'text-nb-black'}`}>{title}</span>
          {badge}
        </div>
        <svg
          className={`w-5 h-5 ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'} transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>
      {!isCollapsed && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
};
