/**
 * FileDropZone Atom
 *
 * Drag-and-drop file upload area with validation state.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Minimal local UI state (drag state only)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/metadata-edit/ui/atoms/FileDropZone
 */

import React, { useCallback, useState } from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface FileDropZoneProps {
  /** Whether file processing is in progress */
  isLoading?: boolean;
  /** Accepted file types (MIME types or extensions) */
  accept?: string;
  /** Called when a file is selected */
  onFileSelect: (file: File) => void;
  /** Optional label text (defaults to "Choose File") */
  buttonLabel?: string;
  /** Optional loading text (defaults to "Processing...") */
  loadingLabel?: string;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  isLoading = false,
  accept = '.csv,text/csv',
  onFileSelect,
  buttonLabel = 'Choose File',
  loadingLabel = 'Processing...',
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const dropZoneClasses = isDragging
    ? 'bg-blue-100 border-blue-400'
    : 'bg-blue-50 border-transparent';

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed rounded-xl transition-colors ${dropZoneClasses}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
        <Icon name="cloud_upload" className="text-4xl text-blue-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">
        Upload CSV File
      </h3>
      <p className="text-sm text-slate-500 text-center max-w-md mb-6">
        Drag and drop a CSV file here, or click to select. The first row should
        contain column headers.
      </p>
      <label className="relative cursor-pointer">
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={isLoading}
          className="sr-only"
        />
        <span
          className={`px-6 py-3 font-medium rounded-lg inline-flex items-center gap-2 transition-colors ${
            isLoading
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isLoading ? (
            <>
              <Icon name="hourglass_empty" className="animate-spin" />
              {loadingLabel}
            </>
          ) : (
            <>
              <Icon name="file_upload" />
              {buttonLabel}
            </>
          )}
        </span>
      </label>
    </div>
  );
};

export default FileDropZone;
