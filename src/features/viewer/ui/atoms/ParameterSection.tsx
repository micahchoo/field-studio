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
  /** Field mode flag */
  fieldMode?: boolean;
}

const colorClasses = {
  green: {
    label: 'text-nb-green',
    darkLabel: 'text-nb-green',
  },
  blue: {
    label: 'text-nb-blue',
    darkLabel: 'text-nb-blue',
  },
  orange: {
    label: 'text-nb-orange',
    darkLabel: 'text-orange-400',
  },
  purple: {
    label: 'text-nb-purple',
    darkLabel: 'text-nb-purple/60',
  },
  yellow: {
    label: 'text-nb-yellow',
    darkLabel: 'text-nb-yellow',
  },
};

export const ParameterSection: React.FC<ParameterSectionProps> = ({
  title,
  icon,
  color,
  description,
  control,
  children,
  fieldMode = false,
}) => {
  const colors = colorClasses[color];
  const labelClass = fieldMode ? colors.darkLabel : colors.label;
  const textClass = fieldMode ? 'text-white' : 'text-nb-black';
  const mutedTextClass = fieldMode ? 'text-nb-black/40' : 'text-nb-black/50';

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
