/**
 * Orphans Panel - Shows files that aren't imported by any other file
 */

import React, { useMemo } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import type { FileAnalysis } from '../types';
import { CopyableSection, formatOrphansAsMarkdown } from './CopyableSection';

interface OrphansPanelProps {
  orphans: string[];
  files: Record<string, FileAnalysis>;
  onSelectFile: (file: FileAnalysis) => void;
}

export const OrphansPanel: React.FC<OrphansPanelProps> = ({
  orphans,
  files,
  onSelectFile,
}) => {
  const markdown = useMemo(() => formatOrphansAsMarkdown(orphans, files), [orphans, files]);

  if (orphans.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <span className="material-icons text-4xl text-green-500 mb-4">check_circle</span>
          <h2 className="text-xl font-semibold text-green-700 dark:text-green-400 mb-2">
            No Unused Files
          </h2>
          <p className="text-green-600 dark:text-green-300">
            All files in the codebase are being used.
          </p>
        </div>
      </div>
    );
  }

  // Group orphans by directory
  const grouped = orphans.reduce((acc, filePath) => {
    const file = files[filePath];
    const dir = file?.directory || 'unknown';
    if (!acc[dir]) acc[dir] = [];
    acc[dir].push(file);
    return acc;
  }, {} as Record<string, FileAnalysis[]>);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        <CopyableSection title={`Unused Files (Orphans) - ${orphans.length} found`} getMarkdown={() => markdown}>
        <div className="space-y-6">
          {Object.entries(grouped).map(([directory, dirFiles]) => (
            <div key={directory} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
                  {directory}/
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {dirFiles.map((file) => (
                  <Button
                    variant="ghost"
                    key={file.filePath}
                    onClick={() => onSelectFile(file)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-icons text-slate-400">description</span>
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {file.fileName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {file.exports.length} exports, {file.lines} lines
                        </div>
                      </div>
                    </div>
                    <span className="material-icons text-slate-400">chevron_right</span>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
        </CopyableSection>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <span className="material-icons text-blue-500">info</span>
            <div>
              <h3 className="font-medium text-blue-700 dark:text-blue-400 mb-1">
                Note
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                These files may be entry points (like main.tsx) or might be candidates for deletion.
                Entry points and index files are typically excluded from this list.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrphansPanel;
