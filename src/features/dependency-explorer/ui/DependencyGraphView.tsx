/**
 * Dependency Graph View - Simple visual representation of dependencies
 */

import React, { useMemo } from 'react';
import { Button } from '@/src/shared/ui/atoms';
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
      <div className="flex items-center justify-center h-full text-nb-black/50">
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
      if (key.includes('feature')) return 'border-nb-purple/20 bg-nb-purple/5';
      if (key.includes('shared')) return 'border-nb-blue/30 bg-nb-blue/10';
      if (key.includes('entity')) return 'border-nb-green/30 bg-nb-green/10';
      if (key.includes('widget')) return 'border-nb-orange bg-nb-orange/10';
      if (key.includes('app')) return 'border-nb-red/30 bg-nb-red/10';
      return 'border-nb-black/20 bg-nb-white';
    };

    nodes.push(
      <div
        key={fullPath}
        className={` border ${getColorClass()} overflow-hidden`}
      >
        <div className="px-3 py-2 border-b border-inherit bg-nb-cream/20">
          <div className="flex items-center gap-2">
            <span className="material-icons text-sm text-nb-black/50">folder</span>
            <span className="font-medium text-nb-black/70 text-sm">
              {key}
            </span>
            <span className="text-xs text-nb-black/40">
              ({files.length} files)
            </span>
          </div>
        </div>
        
        {files.length > 0 && (
          <div className="divide-y divide-nb-black/10">
            {files.map((file: FileAnalysis) => (
              <Button variant="ghost" size="bare"
                key={file.filePath}
                onClick={() => onSelectFile(file)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-nb-white/80 transition-nb ${
                  selectedFile?.filePath === file.filePath
                    ? 'bg-nb-blue/10'
                    : ''
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileIcon extension={file.extension} />
                  <span className="text-sm text-nb-black/70 truncate">
                    {file.fileName}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-nb-black/40">
                  {file.dependents.length > 0 && (
                    <span className="flex items-center gap-0.5">
                      <span className="material-icons text-xs">arrow_back</span>
                      {file.dependents.length}
                    </span>
                  )}
                </div>
              </Button>
            ))}
          </div>
        )}

        {/* Nested directories */}
        {hasChildren && (
          <div className="px-2 pb-2">
            <div className="border-l-2 border-nb-black/20 pl-2 space-y-2 mt-2">
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
    if (extension === '.tsx' || extension === '.jsx') return 'text-nb-blue';
    if (extension === '.ts') return 'text-nb-blue';
    if (extension === '.css' || extension === '.scss') return 'text-nb-pink';
    return 'text-nb-black/40';
  };

  return (
    <span className={`material-icons text-sm ${getColor()}`}>
      {getIcon()}
    </span>
  );
}

export default DependencyGraphView;
