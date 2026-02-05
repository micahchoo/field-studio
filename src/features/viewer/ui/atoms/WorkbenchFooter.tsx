/**
 * WorkbenchFooter Atom
 *
 * Action buttons footer for the IIIF Image API workbench.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/WorkbenchFooter
 */

import React from 'react';
import { ActionButton } from '@/src/shared/ui/molecules';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface WorkbenchFooterProps {
  /** Primary action label */
  applyLabel?: string;
  /** Reset action label */
  resetLabel?: string;
  /** Called when apply is clicked */
  onApply: () => void;
  /** Called when reset is clicked */
  onReset: () => void;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const WorkbenchFooter: React.FC<WorkbenchFooterProps> = ({
  applyLabel = 'Apply to Canvas',
  resetLabel = 'Reset to Defaults',
  onApply,
  onReset,
  cx: _cx,
  fieldMode = false,
}) => {
  const panelBgClass = fieldMode ? 'bg-slate-900' : 'bg-slate-50';

  return (
    <div className={`p-4 ${panelBgClass} border-t space-y-2`}>
      <ActionButton label={applyLabel} onClick={onApply} variant="primary" fullWidth />
      <ActionButton label={resetLabel} onClick={onReset} variant="secondary" fullWidth />
    </div>
  );
};

export default WorkbenchFooter;
