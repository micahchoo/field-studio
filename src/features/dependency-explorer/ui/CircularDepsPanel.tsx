/**
 * Circular Dependencies Panel - Shows circular dependency chains
 */

import React, { useMemo } from 'react';
import type { FileAnalysis } from '../types';
import { CopyableSection, formatCircularDepsAsMarkdown } from './CopyableSection';

interface CircularDepsPanelProps {
  circularDeps: string[][];
  files: Record<string, FileAnalysis>;
}

export const CircularDepsPanel: React.FC<CircularDepsPanelProps> = ({
  circularDeps,
  files,
}) => {
  const markdown = useMemo(() => formatCircularDepsAsMarkdown(circularDeps), [circularDeps]);

  if (circularDeps.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-nb-green/10 ">
          <span className="material-icons text-4xl text-nb-green mb-4">check_circle</span>
          <h2 className="text-xl font-semibold text-nb-green mb-2">
            No Circular Dependencies
          </h2>
          <p className="text-nb-green/60">
            Your codebase is free of circular dependency chains.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        <CopyableSection title={`Circular Dependencies (${circularDeps.length} found)`} getMarkdown={() => markdown}>
        <div className="space-y-4">
          {circularDeps.map((cycle, idx) => (
            <div
              key={idx}
              className="bg-nb-white border border-nb-red/30 overflow-hidden"
            >
              <div className="px-4 py-2 bg-nb-red/10 border-b border-nb-red/30">
                <span className="text-sm font-medium text-nb-red">
                  Chain #{idx + 1} ({cycle.length - 1} files)
                </span>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {cycle.map((filePath, fileIdx) => {
                    const isLast = fileIdx === cycle.length - 1;
                    const file = files[filePath];
                    
                    return (
                      <React.Fragment key={fileIdx}>
                        <div className="flex items-center gap-2 px-3 py-2 bg-nb-cream/80 rounded">
                          <span className="material-icons text-nb-black/40 text-sm">
                            description
                          </span>
                          <div>
                            <div className="font-mono text-xs text-nb-black/20">
                              {file?.fileName || filePath.split('/').pop()}
                            </div>
                            <div className="text-xs text-nb-black/50">
                              {file?.directory}
                            </div>
                          </div>
                        </div>
                        {!isLast && (
                          <span className="material-icons text-nb-black/40">
                            arrow_forward
                          </span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
        </CopyableSection>
      </div>
    </div>
  );
};

export default CircularDepsPanel;
