/**
 * Dependency Explorer - Main Component
 * 
 * Admin-only tool for visualizing code dependencies.
 * Accessible only when ?admin=true is in URL or localStorage has adminMode=true
 */

import React, { useMemo, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { useDependencyData } from '../model/useDependencyData';
import { DependencyGraphView } from './DependencyGraphView';
import { FileDetailPanel } from './FileDetailPanel';
import { StatsPanel } from './StatsPanel';
import { CircularDepsPanel } from './CircularDepsPanel';
import { OrphansPanel } from './OrphansPanel';
import { ArchitecturePanel } from './ArchitecturePanel';
import type { FileAnalysis, FilterType, ViewMode } from '../types';

interface DependencyExplorerProps {
  className?: string;
}

export const DependencyExplorer: React.FC<DependencyExplorerProps> = ({ className = '' }) => {
  // Check admin access
  const hasAdminAccess = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    const isAdminUrl = urlParams.get('admin') === 'true';
    const isAdminStored = localStorage.getItem('adminMode') === 'true';
    return isAdminUrl || isAdminStored;
  }, []);

  // Persist admin mode if set via URL
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('admin') === 'true') {
        localStorage.setItem('adminMode', 'true');
      }
    }
  }, []);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'imports' | 'exports' | 'dependents'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedFile, setSelectedFile] = useState<FileAnalysis | null>(null);
  const [showExternalDeps, setShowExternalDeps] = useState(false);

  const { data, isLoading, error, filteredFiles, refresh } = useDependencyData({
    searchQuery,
    filterType,
    sortBy,
    sortOrder,
  });

  // Toggle sort order when clicking same column
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  if (!hasAdminAccess) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center p-8 bg-nb-cream ">
          <span className="material-icons text-4xl text-nb-black/40 mb-4">lock</span>
          <h2 className="text-xl font-semibold text-nb-black/70 mb-2">
            Admin Access Required
          </h2>
          <p className="text-nb-black/50 mb-4">
            The Dependency Explorer is only accessible to administrators.
          </p>
          <code className="text-sm bg-nb-cream/80 px-2 py-1 rounded">
            Add ?admin=true to URL
          </code>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="flex items-center gap-3 text-nb-black/50">
          <div className="w-5 h-5 border-2 border-nb-black/20 border-t-nb-black/60 animate-spin" />
          <span>Loading dependency graph...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center p-8 bg-nb-red/10 ">
          <span className="material-icons text-4xl text-nb-red mb-4">error</span>
          <h2 className="text-xl font-semibold text-nb-red mb-2">
            Failed to Load Data
          </h2>
          <p className="text-nb-red/60 mb-4">{error.message}</p>
          <Button variant="ghost" size="bare"
            onClick={refresh}
            className="px-4 py-2 bg-nb-red text-white hover:bg-nb-red transition-nb"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center p-8 bg-yellow-50/20/20 ">
          <span className="material-icons text-4xl text-nb-yellow mb-4">warning</span>
          <h2 className="text-xl font-semibold text-nb-yellow mb-2">
            No Data Available
          </h2>
          <p className="text-nb-yellow mb-4">
            Run <code className="bg-nb-yellow/20 px-1 rounded">npm run analyze</code> to generate dependency data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-nb-white ${className}`}>
      {/* Header */}
      <header className="flex flex-wrap items-center gap-4 p-4 border-b border-nb-black/20 bg-nb-white">
        <div className="flex items-center gap-2">
          <span className="material-icons text-nb-black/50">account_tree</span>
          <h1 className="text-lg font-semibold text-nb-black/20">
            Dependency Explorer
          </h1>
          <span className="text-xs text-nb-black/50">
            Generated: {new Date(data.generatedAt).toLocaleString()}
          </span>
        </div>

        <div className="flex-1" />

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 bg-nb-cream/80 p-1">
          {[
        { id: 'list', label: 'List', icon: 'list' },
          { id: 'graph', label: 'Graph', icon: 'hub' },
          { id: 'architecture', label: 'Architecture', icon: 'architecture' },
          { id: 'stats', label: 'Stats', icon: 'bar_chart' },
          { id: 'circular', label: 'Circular', icon: 'sync_problem' },
          { id: 'orphans', label: 'Orphans', icon: 'link_off' },
          ].map(({ id, label, icon }) => (
            <Button variant="ghost" size="bare"
              key={id}
              onClick={() => setViewMode(id as ViewMode)}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium transition-nb ${
                viewMode === id
                  ? 'bg-nb-white/60 text-nb-black/20 shadow-brutal-sm'
                  : 'text-nb-black/50 hover:text-nb-black'
              }`}
            >
              <span className="material-icons text-sm">{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>

        <Button variant="ghost" size="bare"
          onClick={refresh}
          className="p-2 text-nb-black/50 hover:text-nb-black/80 hover:bg-nb-cream"
          title="Refresh"
        >
          <span className="material-icons text-sm">refresh</span>
        </Button>
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 border-b border-nb-black/20 bg-nb-white">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-nb-black/40 text-sm">
            search
          </span>
          <input
            type="text"
            placeholder="Search files, exports, imports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-nb-black/20 bg-nb-white text-nb-black/20 focus:ring-2 focus:ring-nb-blue focus:border-transparent"
          />
          {searchQuery && (
            <Button variant="ghost" size="bare"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-nb-black/40 hover:text-nb-black/60"
            >
              <span className="material-icons text-sm">close</span>
            </Button>
          )}
        </div>

        {/* Filter Type */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as FilterType)}
          className="px-3 py-1.5 text-sm border border-nb-black/20 bg-nb-white text-nb-black/20"
        >
          <option value="all">All Files</option>
          <option value="components">Components</option>
          <option value="hooks">Hooks</option>
          <option value="utils">Utils</option>
          <option value="services">Services</option>
          <option value="types">Types</option>
        </select>

        {/* External Dependencies Toggle */}
        <label className="flex items-center gap-2 text-sm text-nb-black/50 cursor-pointer">
          <input
            type="checkbox"
            checked={showExternalDeps}
            onChange={(e) => setShowExternalDeps(e.target.checked)}
            className="border-nb-black/20"
          />
          Show External
        </label>

        <div className="flex-1" />

        {/* Results count */}
        <span className="text-sm text-nb-black/50">
          {filteredFiles.length} of {data.totalFiles} files
        </span>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === 'list' && (
          <div className="h-full flex">
            {/* File List */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-nb-white z-10">
                  <tr className="border-b border-nb-black/20">
                    <th 
                      className="px-4 py-2 text-left font-medium text-nb-black/50 cursor-pointer hover:bg-nb-cream"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        File
                        {sortBy === 'name' && (
                          <span className="material-icons text-xs">
                            {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-2 text-center font-medium text-nb-black/50 cursor-pointer hover:bg-nb-cream w-20"
                      onClick={() => handleSort('imports')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Imports
                        {sortBy === 'imports' && (
                          <span className="material-icons text-xs">
                            {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-2 text-center font-medium text-nb-black/50 cursor-pointer hover:bg-nb-cream w-20"
                      onClick={() => handleSort('exports')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Exports
                        {sortBy === 'exports' && (
                          <span className="material-icons text-xs">
                            {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-2 text-center font-medium text-nb-black/50 cursor-pointer hover:bg-nb-cream w-24"
                      onClick={() => handleSort('dependents')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Used By
                        {sortBy === 'dependents' && (
                          <span className="material-icons text-xs">
                            {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-2 text-right font-medium text-nb-black/50 cursor-pointer hover:bg-nb-cream w-24"
                      onClick={() => handleSort('size')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Size
                        {sortBy === 'size' && (
                          <span className="material-icons text-xs">
                            {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                          </span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nb-black/10">
                  {filteredFiles.map((file) => (
                    <tr
                      key={file.filePath}
                      onClick={() => setSelectedFile(file)}
                      className={`cursor-pointer transition-nb ${
                        selectedFile?.filePath === file.filePath
                          ? 'bg-nb-blue/10'
                          : 'hover:bg-nb-cream/50'
                      }`}
                    >
                      <td className="px-4 py-2">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-nb-black/50">
                            {file.directory}/
                          </span>
                          <span className="font-medium text-nb-black/20">
                            {file.fileName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs bg-nb-cream/80 text-nb-black/50">
                          {file.imports.length}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs bg-nb-green/20 text-nb-green">
                          {file.exports.length}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 text-xs ${
                          file.dependents.length > 5
                            ? 'bg-nb-orange/20 text-nb-orange'
                            : file.dependents.length > 0
                            ? 'bg-nb-blue/20 text-nb-blue'
                            : 'bg-nb-cream/80 text-nb-black/50'
                        }`}>
                          {file.dependents.length}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-nb-black/50">
                        {formatBytes(file.size)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Detail Panel */}
            {selectedFile && (
              <FileDetailPanel
                file={selectedFile}
                allFiles={data.files}
                onClose={() => setSelectedFile(null)}
                onSelectFile={setSelectedFile}
              />
            )}
          </div>
        )}

        {viewMode === 'graph' && (
          <DependencyGraphView
            files={filteredFiles}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        )}

        {viewMode === 'architecture' && <ArchitecturePanel data={data} />}

        {viewMode === 'stats' && <StatsPanel data={data} />}

        {viewMode === 'circular' && (
          <CircularDepsPanel circularDeps={data.circularDependencies} files={data.files} />
        )}

        {viewMode === 'orphans' && (
          <OrphansPanel orphans={data.orphans} files={data.files} onSelectFile={setSelectedFile} />
        )}
      </div>
    </div>
  );
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default DependencyExplorer;
