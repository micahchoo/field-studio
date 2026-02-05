/**
 * Validation Fix Action Atom
 *
 * Individual fix button for a validation issue.
 * Shows issue details and provides fix action.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Pure presentational component
 * - No state or logic
 * - Props-only API
 *
 * @module features/metadata-edit/ui/atoms/ValidationFixAction
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { IconButton } from '@/src/shared/ui/molecules';
import type { ValidationIssue, ValidationSeverity } from '../../model/useInspectorValidation';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface ValidationFixActionProps {
  /** Validation issue to display */
  issue: ValidationIssue;
  /** Called when user clicks fix */
  onFix: (issueId: string) => void;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

const severityConfig: Record<
  ValidationSeverity,
  { icon: string; borderColor: string; bgColor: string; iconColor: string }
> = {
  error: {
    icon: 'error',
    borderColor: 'border-red-200 dark:border-red-900',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    iconColor: 'text-red-500',
  },
  warning: {
    icon: 'warning',
    borderColor: 'border-amber-200 dark:border-amber-900',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    iconColor: 'text-amber-500',
  },
  info: {
    icon: 'info',
    borderColor: 'border-blue-200 dark:border-blue-900',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    iconColor: 'text-blue-500',
  },
};

/**
 * Validation Fix Action Atom
 *
 * @example
 * <ValidationFixAction issue={issue} onFix={handleFix} />
 */
export const ValidationFixAction: React.FC<ValidationFixActionProps> = ({
  issue,
  onFix,
  cx = {},
  fieldMode = false,
}) => {
  const config = severityConfig[issue.severity];

  return (
    <div
      className={`p-3 rounded-lg border ${config.borderColor} ${config.bgColor} flex items-start gap-3`}
    >
      <Icon
        name={config.icon}
        className={`text-lg flex-shrink-0 mt-0.5 ${config.iconColor}`}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4
              className={`text-sm font-medium ${
                fieldMode ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              {issue.title}
            </h4>
            <p
              className={`text-xs mt-0.5 ${
                fieldMode ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              {issue.description}
            </p>
            {issue.field && (
              <code
                className={`text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded ${
                  fieldMode
                    ? 'bg-slate-800 text-slate-400'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {issue.field}
              </code>
            )}
          </div>

          {issue.autoFixable && (
            <IconButton
              icon="auto_fix"
              ariaLabel={`Fix ${issue.title}`}
              onClick={() => onFix(issue.id)}
              size="sm"
              variant="secondary"
              title={issue.fixSuggestion || 'Auto-fix this issue'}
              cx={cx}
            />
          )}
        </div>
      </div>
    </div>
  );
};

ValidationFixAction.displayName = 'ValidationFixAction';

export default ValidationFixAction;
