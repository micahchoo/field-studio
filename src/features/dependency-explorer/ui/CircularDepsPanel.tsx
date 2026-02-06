/**
 * Circular Dependencies Panel - Shows circular dependency chains
 */

import React from 'react';
import type { FileAnalysis } from '../types';

interface CircularDepsPanelProps {
  circularDeps: string[][];
  files: Record<string, FileAnalysis>;
}

export const CircularDepsPanel: React.FC<CircularDepsPanelProps> = ({
  circularDeps,
  files,
}) => {
  if (circularDeps.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <span className="material-icons text-4xl text-green-500 mb-4">check_circle</span>
          <h2 className="text-xl font-semibold text-green-700 dark:text-green-400 mb-2">
            No Circular Dependencies
          </h2>
          <p className="text-green-600 dark:text-green-300">
            Your codebase is free of circular dependency chains.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-icons text-red-500 text-2xl">sync_problem</span>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Circular Dependencies
            </h2>
            <p className="text-sm text-slate-500">
              Found {circularDeps.length} circular dependency chain(s) that should be refactored
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {circularDeps.map((cycle, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-800 rounded-lg border border-red-200 dark:border-red-800/50 overflow-hidden"
            >
              <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800/50">
                <span className="text-sm font-medium text-red-700 dark:text-red-400">
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
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded">
                          <span className="material-icons text-slate-400 text-sm">
                            description
                          </span>
                          <div>
                            <div className="font-mono text-xs text-slate-800 dark:text-slate-200">
                              {file?.fileName || filePath.split('/').pop()}
                            </div>
                            <div className="text-xs text-slate-500">
                              {file?.directory}
                            </div>
                          </div>
                        </div>
                        {!isLast && (
                          <span className="material-icons text-slate-400">
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
      </div>
    </div>
  );
};

export default CircularDepsPanel;
