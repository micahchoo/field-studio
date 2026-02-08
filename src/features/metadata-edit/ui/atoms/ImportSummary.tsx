/**
 * ImportSummary Atom
 *
 * Summary display for CSV import results with success/warning/error counts.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/metadata-edit/ui/atoms/ImportSummary
 */

import React from 'react';
import { ValidationBadge, type ValidationStatus } from './ValidationBadge';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface ImportSummaryProps {
  /** Total number of rows processed */
  totalRows: number;
  /** Number of successful rows */
  successCount: number;
  /** Number of rows with warnings */
  warningCount?: number;
  /** Number of rows with errors */
  errorCount?: number;
  /** Detailed error messages */
  errors?: Array<{ row: number; message: string }>;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const ImportSummary: React.FC<ImportSummaryProps> = ({
  totalRows,
  successCount,
  warningCount = 0,
  errorCount = 0,
  errors,
}) => {
  const hasErrors = errorCount > 0 || (errors && errors.length > 0);

  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-nb-green/20 flex items-center justify-center mx-auto mb-6">
        <span className="text-4xl text-nb-green">✓</span>
      </div>
      <h3 className="text-lg font-semibold text-nb-black mb-2">
        Import Complete
      </h3>
      <p className="text-sm text-nb-black/50 mb-6">
        Successfully processed {totalRows} rows
      </p>

      <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-6">
        <ValidationBadge
          status="success"
          value={successCount}
          label="Successful"
        />
        <ValidationBadge
          status="warning"
          value={warningCount}
          label="Warnings"
        />
        <ValidationBadge
          status="error"
          value={errorCount}
          label="Errors"
        />
      </div>

      {hasErrors && (
        <div className="mt-6 text-left">
          <h4 className="text-sm font-medium text-nb-black/80 mb-2">Errors</h4>
          <div className="bg-nb-red/10 border border-nb-red/30 p-3 max-h-40 overflow-y-auto">
            {errors?.map((error, i) => (
              <div key={i} className="text-xs text-nb-red py-1">
                Row {error.row}: {error.message}
              </div>
            ))}
            {!errors && errorCount > 0 && (
              <div className="text-xs text-nb-red py-1">
                {errorCount} rows failed to import
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportSummary;
