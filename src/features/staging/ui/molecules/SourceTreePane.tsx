/**
 * SourceTreePane Molecule
 *
 * FileTree-based left pane for the staging workbench.
 * Replaces the flat SourcePane with a nested folder/file tree view.
 *
 * @module features/staging/ui/molecules/SourceTreePane
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { FileTree, SourceManifests } from '@/src/shared/types';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { Button } from '@/ui/primitives/Button';
import { FileTreeNode } from '../atoms/FileTreeNode';
import type { NodeAnnotations } from '../../model';
import { flattenFileTree } from '../../model';

export interface SourceTreePaneProps {
  fileTree: FileTree;
  sourceManifests: SourceManifests;
  annotationsMap: Map<string, NodeAnnotations>;
  onAnnotationChange: (path: string, ann: NodeAnnotations) => void;
  selectedPaths: string[];
  onSelect: (path: string, additive: boolean) => void;
  onClearSelection: () => void;
  filterText: string;
  onFilterChange: (text: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string, isDirectory: boolean) => void;
  onDragStart: (e: React.DragEvent, paths: string[]) => void;
  isFocused: boolean;
  onFocus: () => void;
}

/** Collect all directory paths at depth 0 (root-level dirs) */
function getRootDirPaths(tree: FileTree): string[] {
  const paths: string[] = [];
  for (const dir of tree.directories.values()) {
    paths.push(dir.path);
  }
  return paths;
}

/** Count all files recursively */
function countAllFiles(tree: FileTree): number {
  let count = tree.files.size;
  for (const dir of tree.directories.values()) {
    count += countAllFiles(dir);
  }
  return count;
}

/** Collect all ancestor paths for matching nodes (for filter auto-expand) */
function collectAncestorPaths(matchingPaths: Set<string>): Set<string> {
  const ancestors = new Set<string>();
  for (const p of matchingPaths) {
    const parts = p.split('/');
    let current = '';
    for (let i = 0; i < parts.length - 1; i++) {
      current = current ? `${current}/${parts[i]}` : parts[i];
      ancestors.add(current);
    }
  }
  return ancestors;
}

/** Collect all paths (dirs + files) that match filter text */
function collectMatchingPaths(tree: FileTree, filterLower: string, parentPath: string): Set<string> {
  const matches = new Set<string>();

  for (const [, dir] of tree.directories) {
    if (dir.name.toLowerCase().includes(filterLower)) {
      matches.add(dir.path);
    }
    const childMatches = collectMatchingPaths(dir, filterLower, dir.path);
    for (const m of childMatches) matches.add(m);
  }

  for (const [fileName] of tree.files) {
    if (fileName.toLowerCase().includes(filterLower)) {
      const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;
      matches.add(filePath);
    }
  }

  return matches;
}

export const SourceTreePane: React.FC<SourceTreePaneProps> = ({
  fileTree,
  sourceManifests,
  annotationsMap,
  selectedPaths,
  onSelect,
  onClearSelection,
  filterText,
  onFilterChange,
  onContextMenu,
  onDragStart,
  isFocused,
  onFocus,
}) => {
  // Expanded paths — init with root-level directories
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(getRootDirPaths(fileTree))
  );

  const totalFiles = useMemo(() => countAllFiles(fileTree), [fileTree]);

  // Build lookup: file tree path → manifest ID(s)
  // A directory path maps to the manifest whose breadcrumbs match it.
  // A file path maps to the manifest that contains that file.
  const pathToManifestIds = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of sourceManifests.manifests) {
      // Directory path for this manifest (breadcrumbs joined by '/')
      const dirPath = m.breadcrumbs.join('/');
      if (dirPath) {
        const existing = map.get(dirPath) || [];
        existing.push(m.id);
        map.set(dirPath, existing);
      }
      // Each file in the manifest
      for (const f of m.files) {
        // File path = dirPath/filename (or just filename for root files)
        const filePath = dirPath ? `${dirPath}/${f.name}` : f.name;
        const existing = map.get(filePath) || [];
        existing.push(m.id);
        map.set(filePath, existing);
      }
    }
    return map;
  }, [sourceManifests.manifests]);

  // Filtering: compute matching paths + auto-expanded ancestors
  const { filterMatchPaths, filterExpandPaths } = useMemo(() => {
    if (!filterText.trim()) return { filterMatchPaths: null, filterExpandPaths: null };
    const lower = filterText.toLowerCase();
    const matchPaths = collectMatchingPaths(fileTree, lower, fileTree.path);
    const ancestorPaths = collectAncestorPaths(matchPaths);
    return { filterMatchPaths: matchPaths, filterExpandPaths: ancestorPaths };
  }, [fileTree, filterText]);

  // Effective expanded set: user-expanded + filter-expanded
  const effectiveExpanded = useMemo(() => {
    if (!filterExpandPaths) return expandedPaths;
    const merged = new Set(expandedPaths);
    for (const p of filterExpandPaths) merged.add(p);
    return merged;
  }, [expandedPaths, filterExpandPaths]);

  // Flatten
  const flatNodes = useMemo(
    () => flattenFileTree(fileTree, effectiveExpanded, annotationsMap),
    [fileTree, effectiveExpanded, annotationsMap]
  );

  // Apply filter
  const visibleNodes = useMemo(() => {
    if (!filterMatchPaths) return flatNodes;
    // Show a node if it matches OR is an ancestor of a match
    return flatNodes.filter(n =>
      filterMatchPaths.has(n.path) ||
      (filterExpandPaths && filterExpandPaths.has(n.path))
    );
  }, [flatNodes, filterMatchPaths, filterExpandPaths]);

  const handleToggleExpand = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, path: string) => {
    const paths = selectedPaths.includes(path) ? selectedPaths : [path];

    // Resolve file tree paths → SourceManifest IDs for ArchivePane drop compat
    const manifestIdSet = new Set<string>();
    for (const p of paths) {
      const ids = pathToManifestIds.get(p);
      if (ids) {
        ids.forEach(id => manifestIdSet.add(id));
      } else {
        // For directories that don't directly match, find manifests under this path
        for (const [key, ids] of pathToManifestIds) {
          if (key.startsWith(p + '/') || key === p) {
            ids.forEach(id => manifestIdSet.add(id));
          }
        }
      }
    }

    const manifestIds = [...manifestIdSet];
    e.dataTransfer.setData('application/iiif-manifest-ids', JSON.stringify(manifestIds));
    e.dataTransfer.effectAllowed = 'copyMove';
    onDragStart(e, paths);
  }, [selectedPaths, onDragStart, pathToManifestIds]);

  return (
    <div
      className={`h-full flex flex-col border-r transition-nb ${
        isFocused ? 'border-nb-blue/30 bg-nb-cream/30' : 'border-nb-black/20 bg-nb-cream/30'
      }`}
      onClick={onFocus}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-nb-black/20 bg-nb-cream/40">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-nb-black flex items-center gap-2 text-sm">
            <Icon name="source" className="text-nb-blue" />
            Source Files
          </h3>
          <div className="text-right">
            <span className="text-xs text-nb-black/50">{totalFiles} files</span>
          </div>
        </div>

        {/* Filter */}
        <div className="relative">
          <Icon
            name="search"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-nb-black/40 text-sm"
          />
          <input
            type="text"
            value={filterText}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="Filter files..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-nb-black/20 focus:ring-2 focus:ring-nb-blue focus:border-nb-blue outline-none"
          />
          {filterText && (
            <Button
              onClick={() => onFilterChange('')}
              variant="ghost"
              size="sm"
              icon={<Icon name="close" className="text-sm" />}
              aria-label="Clear filter"
              className="absolute right-2 top-1/2 -translate-y-1/2"
            />
          )}
        </div>

        {filterText && (
          <div className="mt-1.5 text-[10px] text-nb-black/50">
            {visibleNodes.length} of {flatNodes.length} nodes
          </div>
        )}
      </div>

      {/* Tree */}
      <div
        className="flex-1 overflow-y-auto"
        onClick={(e) => { if (e.target === e.currentTarget) onClearSelection(); }}
      >
        {visibleNodes.length === 0 ? (
          <div className="p-6 text-center text-nb-black/40">
            <Icon name="folder_open" className="text-3xl mb-2 opacity-50" />
            <p className="text-xs">{filterText ? 'No files match your filter' : 'No files'}</p>
          </div>
        ) : (
          visibleNodes.map(node => (
            <FileTreeNode
              key={node.path}
              node={node}
              isSelected={selectedPaths.includes(node.path)}
              onToggleExpand={handleToggleExpand}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              onDragStart={handleDragStart}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {selectedPaths.length > 0 && (
        <div className="flex-shrink-0 p-2 border-t border-nb-black/20 bg-nb-cream/40">
          <div className="flex items-center justify-between">
            <span className="text-xs text-nb-black/60">{selectedPaths.length} selected</span>
            <button
              onClick={onClearSelection}
              className="text-xs text-nb-blue hover:text-nb-blue font-medium"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

SourceTreePane.displayName = 'SourceTreePane';
