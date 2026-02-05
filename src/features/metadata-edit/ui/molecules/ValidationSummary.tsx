/**
 * Validation Summary Molecule
 *
 * Prominent validation feedback displayed at the top of the inspector panel.
 * Shows error/warning counts and batch fix actions.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Composes ValidationBadge atom, ActionButton molecule
 * - No domain logic
 * - Props-only API
 *
 * @module features/metadata-edit/ui/molecules/ValidationSummary
 */

import React, { useMemo } from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { ActionButton } from '@/src/shared/ui/molecules';
import type { ValidationIssue } from '../../model/useInspectorValidation';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface ValidationSummaryProps {
  /** Validation issues */
  issues: ValidationIssue[];
  /** Error count */
  errorCount: number;
  /** Warning count */
  warningCount: number;
  /** Info count */
  infoCount: number;
  /** Auto-fixable issue count */
  autoFixableCount: number;
  /** Called when user clicks "Fix All" */
  onFixAll: () => void;
  /** Called when user clicks "View Details" */
  onViewDetails: () => void;
  /** Contextual styles from template */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

/**
 * Validation Summary Molecule
 *
 * @example
 * <ValidationSummary
 *   issues={issues}
 *   errorCount={2}
 *   warningCount={3}
 *   onFixAll={handleFixAll}
 *   onViewDetails={handleViewDetails}
 * />
 */
export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  issues,
  errorCount,
  warningCount,
  infoCount,
  autoFixableCount,
  onFixAll,
  onViewDetails,
  cx = {},
  fieldMode = false,
}) => {
  // Determine overall status
  const status = useMemo(() => {
    if (errorCount > 0) return 'error';
    if (warningCount > 0) return 'warning';
    if (infoCount > 0) return 'info';
    return 'success';
  }, [errorCount, warningCount, infoCount]);

  // Status styles
  const statusStyles = {
    error: {
      bg: fieldMode ? 'bg-red-950/50' : 'bg-red-50',
      border: fieldMode ? 'border-red-900' : 'border-red-200',
      icon: 'error',
      iconColor: 'text-red-500',
      text: fieldMode ? 'text-red-200' : 'text-red-800',
    },
    warning: {
      bg: fieldMode ? 'bg-amber-950/50' : 'bg-amber-50',
      border: fieldMode ? 'border-amber-900' : 'border-amber-200',
      icon: 'warning',
      iconColor: 'text-amber-500',
      text: fieldMode ? 'text-amber-200' : 'text-amber-800',
    },
    info: {
      bg: fieldMode ? 'bg-blue-950/50' : 'bg-blue-50',
      border: fieldMode ? 'border-blue-900' : 'border-blue-200',
      icon: 'info',
      iconColor: 'text-blue-500',
      text: fieldMode ? 'text-blue-200' : 'text-blue-800',
    },
    success: {
      bg: fieldMode ? 'bg-green-950/50' : 'bg-green-50',
      border: fieldMode ? 'border-green-900' : 'border-green-200',
      icon: 'check_circle',
      iconColor: 'text-green-500',
      text: fieldMode ? 'text-green-200' : 'text-green-800',
    },
  };

  const styles = statusStyles[status];

  if (issues.length === 0) {
    return (
      <div
        className={`p-3 rounded-lg border ${styles.bg} ${styles.border} flex items-center gap-3`}
      >
        <Icon name={styles.icon} className={`text-xl ${styles.iconColor}`} />
        <span className={`text-sm font-medium ${styles.text}`}>
          All validations passed
        </span>
      </div>
    );
  }

  return (
    <div
      className={`p-3 rounded-lg border ${styles.bg} ${styles.border}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Icon name={styles.icon} className={`text-xl flex-shrink-0 ${styles.iconColor}`} />
          <div>
            <div className={`text-sm font-medium ${styles.text}`}>
              {errorCount > 0 ? (
                <>
                  {errorCount} error{errorCount !== 1 ? 's' : ''},{' '}
                  {warningCount} warning{warningCount !== 1 ? 's' : ''}
                </>
              ) : warningCount > 0 ? (
                <>
                  {warningCount} warning{warningCount !== 1 ? 's' : ''}
                </>
              ) : (
                <>
                  {infoCount} suggestion{infoCount !== 1 ? 's' : ''}
                </>
              )}
            </div>
            {autoFixableCount > 0 && (
              <div className={`text-xs mt-0.5 opacity-75 ${styles.text}`}>
                {autoFixableCount} can be auto-fixed
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {autoFixableCount > 0 && (
            <ActionButton
              onClick={onFixAll}
              label={`Fix All (${autoFixableCount})`}
              icon="auto_fix"
              size="sm"
              variant={fieldMode ? 'secondary' : 'primary'}
            />
          )}
          <ActionButton
            onClick={onViewDetails}
            label="Details"
            icon="visibility"
            size="sm"
            variant="ghost"
          />
        </div>
      </div>
    </div>
  );
};

ValidationSummary.displayName = 'ValidationSummary';

export default ValidationSummary;
