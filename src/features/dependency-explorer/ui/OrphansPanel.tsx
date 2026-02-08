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
        <div className="text-center p-8 bg-nb-green/10 ">
          <span className="material-icons text-4xl text-nb-green mb-4">check_circle</span>
          <h2 className="text-xl font-semibold text-nb-green mb-2">
            No Unused Files
          </h2>
          <p className="text-nb-green/60">
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
            <div key={directory} className="bg-nb-white border border-nb-black/20 overflow-hidden">
              <div className="px-4 py-2 bg-nb-cream border-b border-nb-black/20">
                <span className="font-mono text-sm text-nb-black/50">
                  {directory}/
                </span>
              </div>
              <div className="divide-y divide-nb-black/10">
                {dirFiles.map((file) => (
                  <Button
                    variant="ghost"
                    key={file.filePath}
                    onClick={() => onSelectFile(file)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-nb-cream transition-nb text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-icons text-nb-black/40">description</span>
                      <div>
                        <div className="font-medium text-nb-black/20">
                          {file.fileName}
                        </div>
                        <div className="text-xs text-nb-black/50">
                          {file.exports.length} exports, {file.lines} lines
                        </div>
                      </div>
                    </div>
                    <span className="material-icons text-nb-black/40">chevron_right</span>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
        </CopyableSection>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-nb-blue/10 border border-nb-blue/30">
          <div className="flex items-start gap-3">
            <span className="material-icons text-nb-blue">info</span>
            <div>
              <h3 className="font-medium text-nb-blue mb-1">
                Note
              </h3>
              <p className="text-sm text-nb-blue/60">
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
