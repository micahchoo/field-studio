/**
 * ViewerEmptyState Molecule
 *
 * Composes: EmptyState + Icon atoms
 *
 * Displays when no canvas is selected in the viewer.
 * Customized for the viewer feature with appropriate messaging.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props (no hook calls)
 * - Composes molecules: EmptyState
 * - Local UI state only
 * - No domain logic
 *
 * IDEAL OUTCOME: Clear guidance when no canvas is selected
 * FAILURE PREVENTED: User confusion about empty viewer state
 *
 * @module features/viewer/ui/molecules/ViewerEmptyState
 */

import React from 'react';
import { EmptyState } from '@/src/shared/ui/molecules';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface ViewerEmptyStateProps {
  /** Terminology function for localized strings */
  t: (key: string) => string;
  /** Optional custom message */
  message?: string;
  /** Contextual styles from template */
  cx: ContextualClassNames;
  /** Current field mode */
  fieldMode: boolean;
}

/**
 * ViewerEmptyState Molecule
 *
 * @example
 * <ViewerEmptyState
 *   t={(key) => translations[key]}
 *   cx={cx}
 *   fieldMode={fieldMode}
 * />
 */
export const ViewerEmptyState: React.FC<ViewerEmptyStateProps> = ({
  t,
  message,
  cx,
  fieldMode,
}) => {
  return (
    <EmptyState
      icon="image"
      title={`Select a ${t('Canvas')}`}
      message={message || 'Choose a canvas from the archive to view it here.'}
      cx={cx}
      fieldMode={fieldMode}
    />
  );
};

export default ViewerEmptyState;
