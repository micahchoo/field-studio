/**
 * EmptyProperties Atom
 *
 * Empty state displayed when no resource is selected.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/metadata-edit/ui/atoms/EmptyProperties
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface EmptyPropertiesProps {
  /** Icon name (default: "info") */
  icon?: string;
  /** Message text (default: "Select an item to view properties") */
  message?: string;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const EmptyProperties: React.FC<EmptyPropertiesProps> = ({
  icon = 'info',
  message = 'Select an item to view properties',
  cx,
  fieldMode = false,
}) => {
  const containerClasses = `w-80 border-l flex flex-col items-center justify-center ${
    fieldMode
      ? 'bg-nb-black border-nb-black text-nb-black/50'
      : 'bg-nb-white border-nb-black/20 text-nb-black/40'
  }`;

  return (
    <div className={containerClasses}>
      <Icon name={icon} className="text-4xl mb-2" />
      <p className="text-sm text-center">{message}</p>
    </div>
  );
};

export default EmptyProperties;