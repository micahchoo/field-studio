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
import { IconButton } from '@/src/shared/ui/molecules/IconButton';
import type { ValidationIssue, ValidationSeverity } from '../../model/useInspectorValidation';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

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
    borderColor: 'border-nb-red/30',
    bgColor: 'bg-nb-red/10',
    iconColor: 'text-nb-red',
  },
  warning: {
    icon: 'warning',
    borderColor: 'border-nb-orange',
    bgColor: 'bg-nb-orange/30',
    iconColor: 'text-nb-orange',
  },
  info: {
    icon: 'info',
    borderColor: 'border-nb-blue/30',
    bgColor: 'bg-nb-blue/10',
    iconColor: 'text-nb-blue',
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
      className={`p-3 border ${config.borderColor} ${config.bgColor} flex items-start gap-3`}
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
                fieldMode ? 'text-nb-black/20' : 'text-nb-black'
              }`}
            >
              {issue.title}
            </h4>
            <p
              className={`text-xs mt-0.5 ${
                fieldMode ? 'text-nb-black/40' : 'text-nb-black/60'
              }`}
            >
              {issue.description}
            </p>
            {issue.field && (
              <code
                className={`text-[10px] mt-1 inline-block px-1.5 py-0.5 ${
                  fieldMode
                    ? 'bg-nb-black text-nb-black/40'
                    : 'bg-nb-cream text-nb-black/50'
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
