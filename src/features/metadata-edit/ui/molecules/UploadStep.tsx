/**
 * UploadStep Molecule
 *
 * Step 1: File upload for CSV import wizard.
 * Composes FileDropZone atom with contextual styling.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Minimal local UI state
 * - No domain logic (delegates file handling to parent)
 * - Props-only API
 * - Uses feature-specific atoms
 *
 * @module features/metadata-edit/ui/molecules/UploadStep
 */

import React from 'react';
import { FileDropZone } from '../atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface UploadStepProps {
  /** Whether file processing is in progress */
  isLoading: boolean;
  /** Called when a file is selected */
  onFileUpload: (file: File) => void;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const UploadStep: React.FC<UploadStepProps> = ({
  isLoading,
  onFileUpload,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <span className="text-4xl text-blue-500">📄</span>
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">
        Upload CSV File
      </h3>
      <p className="text-sm text-slate-500 text-center max-w-md mb-6">
        Select a CSV file containing metadata to import. The first row should
        contain column headers.
      </p>
      <FileDropZone
        isLoading={isLoading}
        onFileSelect={onFileUpload}
        buttonLabel="Choose CSV File"
        loadingLabel="Processing CSV..."
      />
      <div className="mt-8 text-xs text-slate-400 max-w-md">
        <p className="mb-1">• Supports .csv files with UTF-8 encoding</p>
        <p className="mb-1">• First row must contain column headers</p>
        <p>• Maximum file size: 10MB</p>
      </div>
    </div>
  );
};

export default UploadStep;
