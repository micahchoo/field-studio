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
    ? 'bg-nb-blue/20 border-nb-blue'
    : 'bg-nb-blue/10 border-transparent';

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed transition-nb ${dropZoneClasses}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="w-24 h-24 bg-nb-white flex items-center justify-center mb-6 shadow-brutal-sm">
        <Icon name="cloud_upload" className="text-4xl text-nb-blue" />
      </div>
      <h3 className="text-lg font-semibold text-nb-black mb-2">
        Upload CSV File
      </h3>
      <p className="text-sm text-nb-black/50 text-center max-w-md mb-6">
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
          className={`px-6 py-3 font-medium inline-flex items-center gap-2 transition-nb ${
            isLoading
              ? 'bg-nb-cream text-nb-black/50 cursor-not-allowed'
              : 'bg-nb-blue text-white hover:bg-nb-blue'
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
