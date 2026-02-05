/**
 * ResultStep Molecule
 *
 * Step 3: Import results summary display.
 * Composes ImportSummary atom with completion messaging.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses feature-specific atoms
 *
 * @module features/metadata-edit/ui/molecules/ResultStep
 */

import React from 'react';
import { ImportSummary } from '../atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface CSVImportResult {
  totalRows: number;
  successCount: number;
  warningCount?: number;
  errorCount?: number;
  errors?: Array<{ row: number; message: string }>;
  matched: number;
  unmatched: number;
}

export interface ResultStepProps {
  /** Import result data */
  result: CSVImportResult;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const ResultStep: React.FC<ResultStepProps> = ({ result }) => {
  const isSuccess = result.errorCount === 0 && result.unmatched === 0;

  return (
    <div className="text-center py-8">
      <div
        className={`w-20 h-20 ${
          isSuccess ? 'bg-green-100' : 'bg-amber-100'
        } rounded-full flex items-center justify-center mx-auto mb-6`}
      >
        <span
          className={`text-4xl ${
            isSuccess ? 'text-green-600' : 'text-amber-600'
          }`}
        >
          {isSuccess ? '✓' : '⚠'}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">
        {isSuccess ? 'Import Complete' : 'Import Completed with Issues'}
      </h3>
      <p className="text-sm text-slate-500 mb-6">
        Processed {result.totalRows} rows
        {result.matched > 0 && ` • ${result.matched} matched`}
        {result.unmatched > 0 && ` • ${result.unmatched} unmatched`}
      </p>

      <ImportSummary
        totalRows={result.totalRows}
        successCount={result.successCount}
        warningCount={result.warningCount}
        errorCount={result.errorCount}
        errors={result.errors}
      />

      <div className="mt-8 text-xs text-slate-400 max-w-md mx-auto">
        <p>
          {isSuccess
            ? 'All metadata has been successfully imported. You can close this dialog.'
            : 'Review the errors above. You may need to adjust your CSV file and try again.'}
        </p>
      </div>
    </div>
  );
};

export default ResultStep;
