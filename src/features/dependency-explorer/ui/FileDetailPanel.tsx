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
    <div className="w-96 border-l border-nb-black/20 bg-nb-cream overflow-auto">
      <div className="sticky top-0 bg-nb-white backdrop-blur border-b border-nb-black/20 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold text-nb-black/20 break-all">
              {file.fileName}
            </h2>
            <p className="text-xs text-nb-black/50 font-mono mt-1">{file.directory}/</p>
          </div>
          <Button variant="ghost" size="bare"
            onClick={onClose}
            className="p-1 text-nb-black/40 hover:text-nb-black/60 rounded"
          >
            <span className="material-icons text-sm">close</span>
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="text-center p-2 bg-nb-white/80 rounded">
            <div className="text-lg font-semibold text-nb-black/70">
              {file.imports.length}
            </div>
            <div className="text-xs text-nb-black/50">Imports</div>
          </div>
          <div className="text-center p-2 bg-nb-white/80 rounded">
            <div className="text-lg font-semibold text-nb-black/70">
              {file.exports.length}
            </div>
            <div className="text-xs text-nb-black/50">Exports</div>
          </div>
          <div className="text-center p-2 bg-nb-white/80 rounded">
            <div className="text-lg font-semibold text-nb-black/70">
              {file.dependents.length}
            </div>
            <div className="text-xs text-nb-black/50">Used By</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Exports Section */}
        {file.exports.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-nb-black/70 mb-2 flex items-center gap-2">
              <span className="material-icons text-nb-green text-sm">logout</span>
              Exports ({file.exports.length})
            </h3>
            <div className="space-y-1">
              {file.exports.map((exp, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-2 py-1.5 bg-nb-white/80 text-sm"
                >
                  <span className={`text-xs px-1.5 py-0.5 ${
                    exp.type === 'default'
                      ? 'bg-nb-blue/20 text-nb-blue'
                      : 'bg-nb-cream text-nb-black/50'
                  }`}>
                    {exp.type}
                  </span>
                  <span className="font-mono text-nb-black/20">
                    {exp.name}
                  </span>
                  {exp.isTypeExport && (
                    <span className="text-xs text-nb-purple400">type</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Alias Imports */}
        {aliasImports.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-nb-black/70 mb-2 flex items-center gap-2">
              <span className="material-icons text-nb-purple text-sm">shortcut</span>
              Alias Imports ({aliasImports.length})
            </h3>
            <div className="space-y-1">
              {aliasImports.map((imp, idx) => (
                <div
                  key={idx}
                  className="px-2 py-1.5 bg-nb-white/80 text-sm"
                >
                  <div className="font-mono text-xs text-nb-purple400">
                    {imp.source}
                  </div>
                  {imp.specifiers.length > 0 && !imp.specifiers[0].startsWith('[') && (
                    <div className="text-xs text-nb-black/50 mt-1">
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
            <h3 className="text-sm font-medium text-nb-black/70 mb-2 flex items-center gap-2">
              <span className="material-icons text-nb-blue text-sm">arrow_forward</span>
              Internal Imports ({internalImports.length})
            </h3>
            <div className="space-y-1">
              {internalImports.map((imp, idx) => {
                const resolvedFile = file.dependencies[idx];
                return (
                  <div
                    key={idx}
                    className="px-2 py-1.5 bg-nb-white/80 text-sm"
                  >
                    <div className="font-mono text-xs text-nb-blue">
                      {imp.source}
                    </div>
                    {resolvedFile && (
                      <Button variant="ghost" size="bare"
                        onClick={() => handleFileClick(resolvedFile)}
                        className="text-xs text-nb-black/50 hover:text-nb-blue mt-1 flex items-center gap-1"
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
            <h3 className="text-sm font-medium text-nb-black/70 mb-2 flex items-center gap-2">
              <span className="material-icons text-nb-orange text-sm">language</span>
              External Dependencies ({externalImports.length})
            </h3>
            <div className="flex flex-wrap gap-1">
              {externalImports.map((imp, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-nb-orange/20 text-nb-orange text-xs border border-nb-orange"
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
            <h3 className="text-sm font-medium text-nb-black/70 mb-2 flex items-center gap-2">
              <span className="material-icons text-nb-green text-sm">arrow_back</span>
              Used By ({file.dependents.length})
            </h3>
            <div className="space-y-1 max-h-48 overflow-auto">
              {file.dependents.map((depPath, idx) => (
                <Button variant="ghost" size="bare"
                  key={idx}
                  onClick={() => handleFileClick(depPath)}
                  className="w-full text-left px-2 py-1.5 bg-nb-white/80 text-sm hover:bg-nb-cream transition-nb"
                >
                  <div className="font-mono text-xs text-nb-black/50 truncate">
                    {depPath}
                  </div>
                </Button>
              ))}
            </div>
          </section>
        )}

        {/* File Info */}
        <section className="pt-4 border-t border-nb-black/20">
          <h3 className="text-sm font-medium text-nb-black/70 mb-2">
            File Info
          </h3>
          <div className="space-y-1 text-sm text-nb-black/50">
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
