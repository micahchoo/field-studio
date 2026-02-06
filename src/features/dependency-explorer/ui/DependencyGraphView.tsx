/**
 * Dependency Graph View - Simple visual representation of dependencies
 */

import React, { useMemo } from 'react';
import type { FileAnalysis } from '../types';

interface DependencyGraphViewProps {
  files: FileAnalysis[];
  selectedFile: FileAnalysis | null;
  onSelectFile: (file: FileAnalysis) => void;
}

export const DependencyGraphView: React.FC<DependencyGraphViewProps> = ({
  files,
  selectedFile,
  onSelectFile,
}) => {
  // Group files by directory for tree-like visualization
  const treeData = useMemo(() => {
    const root: Record<string, any> = {};
    
    for (const file of files) {
      const parts = file.directory.split('/');
      let current = root;
      
      for (const part of parts) {
        if (!current[part]) {
          current[part] = { __files: [] };
        }
        current = current[part];
      }
      
      current.__files.push(file);
    }
    
    return root;
  }, [files]);

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        No files to display
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderTreeNodes(treeData, '', 0, selectedFile, onSelectFile)}
        </div>
      </div>
    </div>
  );
};

function renderTreeNodes(
  node: Record<string, any>,
  path: string,
  depth: number,
  selectedFile: FileAnalysis | null,
  onSelectFile: (file: FileAnalysis) => void
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];

  for (const [key, value] of Object.entries(node)) {
    if (key === '__files') continue;

    const fullPath = path ? `${path}/${key}` : key;
    const files = value.__files || [];
    const hasChildren = Object.keys(value).some(k => k !== '__files');

    // Color code by directory type
    const getColorClass = () => {
      if (key.includes('feature')) return 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10';
      if (key.includes('shared')) return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10';
      if (key.includes('entity')) return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10';
      if (key.includes('widget')) return 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10';
      if (key.includes('app')) return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10';
      return 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800';
    };

    nodes.push(
      <div
        key={fullPath}
        className={`rounded-lg border ${getColorClass()} overflow-hidden`}
      >
        <div className="px-3 py-2 border-b border-inherit bg-white/50 dark:bg-black/20">
          <div className="flex items-center gap-2">
            <span className="material-icons text-sm text-slate-500">folder</span>
            <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">
              {key}
            </span>
            <span className="text-xs text-slate-400">
              ({files.length} files)
            </span>
          </div>
        </div>
        
        {files.length > 0 && (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {files.map((file: FileAnalysis) => (
              <button
                key={file.filePath}
                onClick={() => onSelectFile(file)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/80 dark:hover:bg-white/5 transition-colors ${
                  selectedFile?.filePath === file.filePath
                    ? 'bg-blue-50/80 dark:bg-blue-900/20'
                    : ''
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileIcon extension={file.extension} />
                  <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                    {file.fileName}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  {file.dependents.length > 0 && (
                    <span className="flex items-center gap-0.5">
                      <span className="material-icons text-xs">arrow_back</span>
                      {file.dependents.length}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Nested directories */}
        {hasChildren && (
          <div className="px-2 pb-2">
            <div className="border-l-2 border-slate-200 dark:border-slate-700 pl-2 space-y-2 mt-2">
              {renderTreeNodes(value, fullPath, depth + 1, selectedFile, onSelectFile)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return nodes;
}

function FileIcon({ extension }: { extension: string }) {
  const getIcon = () => {
    if (extension === '.tsx' || extension === '.jsx') return 'code';
    if (extension === '.ts') return 'terminal';
    if (extension === '.css' || extension === '.scss') return 'style';
    return 'description';
  };

  const getColor = () => {
    if (extension === '.tsx' || extension === '.jsx') return 'text-blue-500';
    if (extension === '.ts') return 'text-cyan-500';
    if (extension === '.css' || extension === '.scss') return 'text-pink-500';
    return 'text-slate-400';
  };

  return (
    <span className={`material-icons text-sm ${getColor()}`}>
      {getIcon()}
    </span>
  );
}

export default DependencyGraphView;
