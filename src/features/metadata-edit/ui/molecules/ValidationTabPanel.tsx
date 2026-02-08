/**
 * Validation Tab Panel Molecule
 *
 * Tab panel showing detailed validation issues with fix actions.
 * Used in the MetadataEditorPanel as the 4th tab option.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Composes ValidationFixAction atoms
 * - No domain logic
 * - Props-only API
 *
 * @module features/metadata-edit/ui/molecules/ValidationTabPanel
 */

import React, { useMemo } from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { EmptyState } from '@/src/shared/ui/molecules/EmptyState';
import { ValidationFixAction } from '../atoms';
import type { ValidationIssue } from '../../model/useInspectorValidation';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface ValidationTabPanelProps {
  /** Validation issues to display */
  issues: ValidationIssue[];
  /** Called when user fixes an issue */
  onFixIssue: (issueId: string) => void;
  /** Called when user fixes all issues */
  onFixAll: () => void;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

/**
 * Validation Tab Panel Molecule
 *
 * @example
 * <ValidationTabPanel
 *   issues={validationIssues}
 *   onFixIssue={handleFixIssue}
 *   onFixAll={handleFixAll}
 * />
 */
const defaultCx: ContextualClassNames = {
  surface: 'bg-nb-white',
  text: 'text-nb-black/10',
  accent: 'text-nb-blue',
};

export const ValidationTabPanel: React.FC<ValidationTabPanelProps> = ({
  issues,
  onFixIssue,
  onFixAll,
  cx = defaultCx,
  fieldMode = false,
}) => {
  // Sort issues by severity: error > warning > info
  const sortedIssues = useMemo(() => {
    const severityOrder = { error: 0, warning: 1, info: 2 };
    return [...issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [issues]);

  // Group issues by severity
  const groupedIssues = useMemo(() => {
    return {
      errors: sortedIssues.filter((i) => i.severity === 'error'),
      warnings: sortedIssues.filter((i) => i.severity === 'warning'),
      infos: sortedIssues.filter((i) => i.severity === 'info'),
    };
  }, [sortedIssues]);

  const autoFixableCount = useMemo(
    () => issues.filter((i) => i.autoFixable).length,
    [issues]
  );

  if (issues.length === 0) {
    return (
      <EmptyState
        icon="check_circle"
        title="All validations passed!"
        message="No issues found with this resource."
        fieldMode={fieldMode}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with fix all button */}
      {autoFixableCount > 0 && (
        <div
          className={`flex items-center justify-between p-3 ${
            fieldMode ? 'bg-nb-black' : 'bg-nb-white'
          }`}
        >
          <span className={`text-sm ${fieldMode ? 'text-nb-black/30' : 'text-nb-black/60'}`}>
            {autoFixableCount} issue{autoFixableCount !== 1 ? 's' : ''} can be auto-fixed
          </span>
          <Button variant="ghost" size="bare"
            onClick={onFixAll}
            className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 ${
              fieldMode
                ? 'bg-nb-blue/50 text-nb-blue/60 hover:bg-nb-blue/70'
                : 'bg-nb-blue/20 text-nb-blue hover:bg-nb-blue/30'
            }`}
          >
            <Icon name="auto_fix" className="text-sm" />
            Fix All
          </Button>
        </div>
      )}

      {/* Error section */}
      {groupedIssues.errors.length > 0 && (
        <section>
          <h3
            className={`text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5 ${
              fieldMode ? 'text-nb-red' : 'text-nb-red'
            }`}
          >
            <Icon name="error" className="text-sm" />
            Errors ({groupedIssues.errors.length})
          </h3>
          <div className="space-y-2">
            {groupedIssues.errors.map((issue) => (
              <ValidationFixAction
                key={issue.id}
                issue={issue}
                onFix={onFixIssue}
                cx={cx}
                fieldMode={fieldMode}
              />
            ))}
          </div>
        </section>
      )}

      {/* Warning section */}
      {groupedIssues.warnings.length > 0 && (
        <section>
          <h3
            className={`text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5 ${
              fieldMode ? 'text-nb-orange' : 'text-nb-orange'
            }`}
          >
            <Icon name="warning" className="text-sm" />
            Warnings ({groupedIssues.warnings.length})
          </h3>
          <div className="space-y-2">
            {groupedIssues.warnings.map((issue) => (
              <ValidationFixAction
                key={issue.id}
                issue={issue}
                onFix={onFixIssue}
                cx={cx}
                fieldMode={fieldMode}
              />
            ))}
          </div>
        </section>
      )}

      {/* Info section */}
      {groupedIssues.infos.length > 0 && (
        <section>
          <h3
            className={`text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5 ${
              fieldMode ? 'text-nb-blue' : 'text-nb-blue'
            }`}
          >
            <Icon name="info" className="text-sm" />
            Suggestions ({groupedIssues.infos.length})
          </h3>
          <div className="space-y-2">
            {groupedIssues.infos.map((issue) => (
              <ValidationFixAction
                key={issue.id}
                issue={issue}
                onFix={onFixIssue}
                cx={cx}
                fieldMode={fieldMode}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

ValidationTabPanel.displayName = 'ValidationTabPanel';

export default ValidationTabPanel;
