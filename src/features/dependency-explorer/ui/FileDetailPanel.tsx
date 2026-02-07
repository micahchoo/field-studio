/**
 * File Detail Panel - Shows detailed information about a selected file
 */

import React from 'react';
import { Button } from '@/src/shared/ui/atoms';
import type { FileAnalysis } from '../types';

interface FileDetailPanelProps {
  file: FileAnalysis;
  allFiles: Record<string, FileAnalysis>;
  onClose: () => void;
  onSelectFile: (file: FileAnalysis) => void;
}

export const FileDetailPanel: React.FC<FileDetailPanelProps> = ({
  file,
  allFiles,
  onClose,
  onSelectFile,
}) => {
  const externalImports = file.imports.filter(i => i.isExternal);
  const internalImports = file.imports.filter(i => !i.isExternal && !i.isInternalAlias);
  const aliasImports = file.imports.filter(i => i.isInternalAlias);

  const handleFileClick = (filePath: string) => {
    const targetFile = allFiles[filePath];
    if (targetFile) {
      onSelectFile(targetFile);
    }
  };

  return (
    <div className="w-96 border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-auto">
      <div className="sticky top-0 bg-slate-50 dark:bg-slate-800/95 backdrop-blur border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-200 break-all">
              {file.fileName}
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-1">{file.directory}/</p>
          </div>
          <Button variant="ghost" size="bare"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
          >
            <span className="material-icons text-sm">close</span>
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="text-center p-2 bg-white dark:bg-slate-700 rounded">
            <div className="text-lg font-semibold text-slate-700 dark:text-slate-300">
              {file.imports.length}
            </div>
            <div className="text-xs text-slate-500">Imports</div>
          </div>
          <div className="text-center p-2 bg-white dark:bg-slate-700 rounded">
            <div className="text-lg font-semibold text-slate-700 dark:text-slate-300">
              {file.exports.length}
            </div>
            <div className="text-xs text-slate-500">Exports</div>
          </div>
          <div className="text-center p-2 bg-white dark:bg-slate-700 rounded">
            <div className="text-lg font-semibold text-slate-700 dark:text-slate-300">
              {file.dependents.length}
            </div>
            <div className="text-xs text-slate-500">Used By</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Exports Section */}
        {file.exports.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <span className="material-icons text-green-500 text-sm">logout</span>
              Exports ({file.exports.length})
            </h3>
            <div className="space-y-1">
              {file.exports.map((exp, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-2 py-1.5 bg-white dark:bg-slate-700 rounded text-sm"
                >
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    exp.type === 'default'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-400'
                  }`}>
                    {exp.type}
                  </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {exp.name}
                  </span>
                  {exp.isTypeExport && (
                    <span className="text-xs text-purple-600 dark:text-purple-400">type</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Alias Imports */}
        {aliasImports.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <span className="material-icons text-purple-500 text-sm">shortcut</span>
              Alias Imports ({aliasImports.length})
            </h3>
            <div className="space-y-1">
              {aliasImports.map((imp, idx) => (
                <div
                  key={idx}
                  className="px-2 py-1.5 bg-white dark:bg-slate-700 rounded text-sm"
                >
                  <div className="font-mono text-xs text-purple-600 dark:text-purple-400">
                    {imp.source}
                  </div>
                  {imp.specifiers.length > 0 && !imp.specifiers[0].startsWith('[') && (
                    <div className="text-xs text-slate-500 mt-1">
                      {imp.specifiers.slice(0, 5).join(', ')}
                      {imp.specifiers.length > 5 && ` +${imp.specifiers.length - 5} more`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Internal Imports */}
        {internalImports.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <span className="material-icons text-blue-500 text-sm">arrow_forward</span>
              Internal Imports ({internalImports.length})
            </h3>
            <div className="space-y-1">
              {internalImports.map((imp, idx) => {
                const resolvedFile = file.dependencies[idx];
                return (
                  <div
                    key={idx}
                    className="px-2 py-1.5 bg-white dark:bg-slate-700 rounded text-sm"
                  >
                    <div className="font-mono text-xs text-blue-600 dark:text-blue-400">
                      {imp.source}
                    </div>
                    {resolvedFile && (
                      <Button variant="ghost" size="bare"
                        onClick={() => handleFileClick(resolvedFile)}
                        className="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 mt-1 flex items-center gap-1"
                      >
                        <span className="material-icons text-xs">open_in_new</span>
                        {resolvedFile.split('/').pop()}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* External Dependencies */}
        {externalImports.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <span className="material-icons text-orange-500 text-sm">language</span>
              External Dependencies ({externalImports.length})
            </h3>
            <div className="flex flex-wrap gap-1">
              {externalImports.map((imp, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-xs rounded border border-orange-200 dark:border-orange-800"
                >
                  {imp.source}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Dependents (Files that import this) */}
        {file.dependents.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <span className="material-icons text-green-500 text-sm">arrow_back</span>
              Used By ({file.dependents.length})
            </h3>
            <div className="space-y-1 max-h-48 overflow-auto">
              {file.dependents.map((depPath, idx) => (
                <Button variant="ghost" size="bare"
                  key={idx}
                  onClick={() => handleFileClick(depPath)}
                  className="w-full text-left px-2 py-1.5 bg-white dark:bg-slate-700 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                >
                  <div className="font-mono text-xs text-slate-500 truncate">
                    {depPath}
                  </div>
                </Button>
              ))}
            </div>
          </section>
        )}

        {/* File Info */}
        <section className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            File Info
          </h3>
          <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex justify-between">
              <span>Lines:</span>
              <span>{file.lines}</span>
            </div>
            <div className="flex justify-between">
              <span>Size:</span>
              <span>{formatBytes(file.size)}</span>
            </div>
            <div className="flex justify-between">
              <span>Extension:</span>
              <span>{file.extension}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default FileDetailPanel;
