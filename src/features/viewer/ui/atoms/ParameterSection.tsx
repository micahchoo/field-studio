/**
 * ParameterSection Atom
 *
 * Collapsible parameter group for IIIF Image API workbench.
 * Groups related controls with an icon, title, and description.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (controlled by parent)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/ParameterSection
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface ParameterSectionProps {
  /** Section title */
  title: string;
  /** Material icon name */
  icon: string;
  /** Color theme for the section (token name) */
  color: 'green' | 'blue' | 'orange' | 'purple' | 'yellow';
  /** Description text */
  description?: string;
  /** Control element (e.g., dropdown) to show in header */
  control?: React.ReactNode;
  /** Section content */
  children: React.ReactNode;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

const colorClasses = {
  green: {
    label: 'text-green-600',
    darkLabel: 'text-green-400',
  },
  blue: {
    label: 'text-blue-600',
    darkLabel: 'text-blue-400',
  },
  orange: {
    label: 'text-orange-600',
    darkLabel: 'text-orange-400',
  },
  purple: {
    label: 'text-purple-600',
    darkLabel: 'text-purple-400',
  },
  yellow: {
    label: 'text-yellow-600',
    darkLabel: 'text-yellow-400',
  },
};

export const ParameterSection: React.FC<ParameterSectionProps> = ({
  title,
  icon,
  color,
  description,
  control,
  children,
  cx: _cx,
  fieldMode = false,
}) => {
  const colors = colorClasses[color];
  const labelClass = fieldMode ? colors.darkLabel : colors.label;
  const textClass = fieldMode ? 'text-white' : 'text-slate-900';
  const mutedTextClass = fieldMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <label className={`text-[10px] font-bold ${labelClass} uppercase tracking-wider flex items-center gap-1.5 ${textClass}`}>
          <Icon name={icon} className="text-xs" /> {title}
        </label>
        {control}
      </div>
      {description && (
        <p className={`text-[10px] ${mutedTextClass}`}>{description}</p>
      )}
      {children}
    </section>
  );
};

export default ParameterSection;
