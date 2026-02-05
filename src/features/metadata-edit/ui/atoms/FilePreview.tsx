/**
 * FilePreview Atom
 *
 * CSV data preview table showing first few rows.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/metadata-edit/ui/atoms/FilePreview
 */

import React from 'react';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface FilePreviewProps {
  /** Column headers */
  headers: string[];
  /** Data rows */
  rows: Record<string, string>[];
  /** Maximum number of columns to display (default: 5) */
  maxColumns?: number;
  /** Maximum number of rows to display (default: 3) */
  maxRows?: number;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  headers,
  rows,
  maxColumns = 5,
  maxRows = 3,
}) => {
  const displayHeaders = headers.slice(0, maxColumns);
  const displayRows = rows.slice(0, maxRows);
  const hasMoreColumns = headers.length > maxColumns;
  const hasMoreRows = rows.length > maxRows;

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {displayHeaders.map((header) => (
              <th
                key={header}
                className="px-3 py-2 text-left font-medium text-slate-700"
              >
                {header}
              </th>
            ))}
            {hasMoreColumns && (
              <th className="px-3 py-2 text-left font-medium text-slate-500">
                +{headers.length - maxColumns} more
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-slate-100 last:border-0"
            >
              {displayHeaders.map((header) => (
                <td
                  key={header}
                  className="px-3 py-2 text-slate-600 truncate max-w-xs"
                >
                  {row[header] || '-'}
                </td>
              ))}
              {hasMoreColumns && (
                <td className="px-3 py-2 text-slate-400">...</td>
              )}
            </tr>
          ))}
          {hasMoreRows && (
            <tr className="border-b border-slate-100 last:border-0">
              <td
                colSpan={displayHeaders.length + (hasMoreColumns ? 1 : 0)}
                className="px-3 py-2 text-slate-400 italic text-center"
              >
                +{rows.length - maxRows} more rows
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default FilePreview;
