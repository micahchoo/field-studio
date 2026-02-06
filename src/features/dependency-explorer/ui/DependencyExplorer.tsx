/**
 * Dependency Explorer - Main Component
 * 
 * Admin-only tool for visualizing code dependencies.
 * Accessible only when ?admin=true is in URL or localStorage has adminMode=true
 */

import React, { useState, useMemo } from 'react';
import { useDependencyData } from '../model/useDependencyData';
import { DependencyGraphView } from './DependencyGraphView';
import { FileDetailPanel } from './FileDetailPanel';
import { StatsPanel } from './StatsPanel';
import { CircularDepsPanel } from './CircularDepsPanel';
import { OrphansPanel } from './OrphansPanel';
import type { ViewMode, FilterType, FileAnalysis } from '../types';

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
        <div className="text-center p-8 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <span className="material-icons text-4xl text-slate-400 mb-4">lock</span>
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Admin Access Required
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            The Dependency Explorer is only accessible to administrators.
          </p>
          <code className="text-sm bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
            Add ?admin=true to URL
          </code>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          <span>Loading dependency graph...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <span className="material-icons text-4xl text-red-500 mb-4">error</span>
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">
            Failed to Load Data
          </h2>
          <p className="text-red-600 dark:text-red-300 mb-4">{error.message}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center p-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <span className="material-icons text-4xl text-yellow-500 mb-4">warning</span>
          <h2 className="text-xl font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
            No Data Available
          </h2>
          <p className="text-yellow-600 dark:text-yellow-300 mb-4">
            Run <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">npm run analyze</code> to generate dependency data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-slate-900 ${className}`}>
      {/* Header */}
      <header className="flex flex-wrap items-center gap-4 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <span className="material-icons text-slate-500">account_tree</span>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Dependency Explorer
          </h1>
          <span className="text-xs text-slate-500">
            Generated: {new Date(data.generatedAt).toLocaleString()}
          </span>
        </div>

        <div className="flex-1" />

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
          {[
            { id: 'list', label: 'List', icon: 'list' },
            { id: 'graph', label: 'Graph', icon: 'hub' },
            { id: 'stats', label: 'Stats', icon: 'bar_chart' },
            { id: 'circular', label: 'Circular', icon: 'sync_problem' },
            { id: 'orphans', label: 'Orphans', icon: 'link_off' },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setViewMode(id as ViewMode)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === id
                  ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-200 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span className="material-icons text-sm">{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={refresh}
          className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
          title="Refresh"
        >
          <span className="material-icons text-sm">refresh</span>
        </button>
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            search
          </span>
          <input
            type="text"
            placeholder="Search files, exports, imports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <span className="material-icons text-sm">close</span>
            </button>
          )}
        </div>

        {/* Filter Type */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as FilterType)}
          className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
        >
          <option value="all">All Files</option>
          <option value="components">Components</option>
          <option value="hooks">Hooks</option>
          <option value="utils">Utils</option>
          <option value="services">Services</option>
          <option value="types">Types</option>
        </select>

        {/* External Dependencies Toggle */}
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showExternalDeps}
            onChange={(e) => setShowExternalDeps(e.target.checked)}
            className="rounded border-slate-300"
          />
          Show External
        </label>

        <div className="flex-1" />

        {/* Results count */}
        <span className="text-sm text-slate-500">
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
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th 
                      className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
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
                      className="px-4 py-2 text-center font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 w-20"
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
                      className="px-4 py-2 text-center font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 w-20"
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
                      className="px-4 py-2 text-center font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 w-24"
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
                      className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 w-24"
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredFiles.map((file) => (
                    <tr
                      key={file.filePath}
                      onClick={() => setSelectedFile(file)}
                      className={`cursor-pointer transition-colors ${
                        selectedFile?.filePath === file.filePath
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="px-4 py-2">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                            {file.directory}/
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {file.fileName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                          {file.imports.length}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          {file.exports.length}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs ${
                          file.dependents.length > 5
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                            : file.dependents.length > 0
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}>
                          {file.dependents.length}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-400">
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
