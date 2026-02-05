/**
 * Structure Tree View Organism
 *
 * Main tree view component for the structure feature.
 * Composes molecules: TreeNodeItem, StructureToolbar, EmptyStructure, VirtualTreeList
 * Uses model: useStructureTree
 *
 * ATOMIC DESIGN:
 * - Organism level: has business logic via hook
 * - Composes molecules and atoms
 * - No direct service calls
 *
 * FEATURES:
 * - Virtual scrolling for 1000+ nodes
 * - Search/filter with auto-expand
 * - Drag-drop visual feedback
 * - Mobile responsive (adaptive indentation)
 * - Keyboard navigation support
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { IIIFItem } from '@/types';
import { VirtualTreeList, StructureToolbar, EmptyStructure } from '../molecules';
import { TreeSearchBar } from '../atoms';
import { useStructureTree } from '../../model/useStructureTree';
import type { DropPosition } from '../atoms/DropIndicator';
import { useResponsive } from '@/src/shared/lib/hooks';

// Feature flags for gradual rollout
const FEATURES = {
  TREE_VIRTUALIZATION: true,
  TREE_SEARCH: true,
};

interface StructureTreeViewProps {
  root: IIIFItem | null;
  onUpdate?: (newRoot: IIIFItem) => void;
  onSelect?: (id: string) => void;
  onOpen?: (item: IIIFItem) => void;
  selectedId?: string | null;
  className?: string;
  /** Height of the tree container (default: 100% of parent) */
  containerHeight?: number;
  /** Enable field mode theming */
  fieldMode?: boolean;
}

export const StructureTreeView: React.FC<StructureTreeViewProps> = ({
  root,
  onUpdate,
  onSelect,
  onOpen,
  selectedId,
  className = '',
  containerHeight = 400,
  fieldMode = false,
}) => {
  const { isMobile, isTablet } = useResponsive();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Tree state and operations
  const {
    flattenedNodes,
    filteredNodes,
    selectedIds,
    selectNode,
    selectRange,
    clearSelection,
    toggleExpanded,
    expandAll,
    collapseAll,
    draggingId,
    setDraggingId,
    setDropTargetId,
    canDrop,
    findNode,
    treeStats,
    filterQuery,
    setFilterQuery,
    matchCount,
    setScrollContainerRef,
  } = useStructureTree({ root, onUpdate });

  // Sync scroll container ref
  useEffect(() => {
    if (scrollContainerRef.current) {
      setScrollContainerRef(scrollContainerRef.current);
    }
  }, [setScrollContainerRef]);

  // Sync external selection
  React.useEffect(() => {
    if (selectedId && !selectedIds.has(selectedId)) {
      selectNode(selectedId, false);
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent of selection changes
  React.useEffect(() => {
    if (onSelect && selectedIds.size === 1) {
      const [id] = selectedIds;
      onSelect(id);
    }
  }, [selectedIds, onSelect]);

  // Keyboard shortcut: Ctrl+F to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('tree-search-input');
        searchInput?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle node selection
  const handleSelect = useCallback(
    (id: string, additive: boolean) => {
      selectNode(id, additive);
    },
    [selectNode]
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (id: string) => {
      setDraggingId(id);
    },
    [setDraggingId]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTargetId(null);
  }, [setDraggingId, setDropTargetId]);

  // Handle drop with position
  const handleDrop = useCallback(
    (targetId: string, position?: DropPosition) => {
      if (!draggingId) return;

      if (canDrop(draggingId, targetId)) {
        const draggedNode = findNode(draggingId);
        const targetNode = findNode(targetId);

        if (draggedNode && targetNode && onUpdate && root) {
          // TODO: Implement actual move using hierarchy utils with position
          console.log('Move', draggedNode.type, 'to', targetNode.type, 'position:', position);
        }
      }

      setDraggingId(null);
      setDropTargetId(null);
    },
    [draggingId, canDrop, findNode, onUpdate, root, setDraggingId, setDropTargetId]
  );

  // Handle double click to open
  const handleDoubleClick = useCallback(
    (id: string) => {
      const node = findNode(id);
      if (node && onOpen) {
        onOpen(node);
      }
    },
    [findNode, onOpen]
  );

  // Calculate responsive indentation
  const indentPerLevel = isMobile ? 8 : isTablet ? 12 : 16;

  // Apply responsive indentation to nodes
  const nodesWithResponsiveIndent = React.useMemo(() => {
    const nodesToRender = filterQuery ? filteredNodes : flattenedNodes;
    return nodesToRender.map((node) => ({
      ...node,
      depth: node.depth, // Keep original depth, will be used with responsive indent
    }));
  }, [flattenedNodes, filteredNodes, filterQuery]);

  if (!root) {
    return <EmptyStructure className={className} />;
  }

  return (
    <div
      className={`
        flex flex-col h-full
        bg-white dark:bg-slate-900
        border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden
        ${className}
      `}
    >
      {/* Search Bar */}
      {FEATURES.TREE_SEARCH && (
        <div className="p-3 border-b border-slate-200 dark:border-slate-700">
          <TreeSearchBar
            query={filterQuery}
            onQueryChange={setFilterQuery}
            matchCount={matchCount}
            totalCount={flattenedNodes.length}
            fieldMode={fieldMode}
          />
        </div>
      )}

      <StructureToolbar
        totalNodes={filterQuery ? matchCount : flattenedNodes.length}
        selectedCount={selectedIds.size}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onClearSelection={clearSelection}
      />

      {/* Tree Content - Virtual or Standard */}
      {FEATURES.TREE_VIRTUALIZATION ? (
        <VirtualTreeList
          nodes={nodesWithResponsiveIndent}
          containerHeight={containerHeight}
          onSelect={handleSelect}
          onToggleExpand={toggleExpanded}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          onDoubleClick={handleDoubleClick}
          onScrollContainerRef={(el) => {
            scrollContainerRef.current = el;
            setScrollContainerRef(el);
          }}
          className="flex-1"
        />
      ) : (
        <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
          {nodesWithResponsiveIndent.map((node) => (
            <div key={node.id} onDoubleClick={() => handleDoubleClick(node.id)}>
              {/* Note: Would need to update TreeNodeItem to accept responsive indent */}
            </div>
          ))}
        </div>
      )}

      {treeStats && (
        <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400">
          Depth: {treeStats.maxDepth} | Types:{' '}
          {Object.entries(treeStats.typeCounts)
            .map(([type, count]) => `${type}: ${count}`)
            .join(', ')}
          {filterQuery && ` | Filtered: ${matchCount} of ${flattenedNodes.length}`}
        </div>
      )}
    </div>
  );
};

StructureTreeView.displayName = 'StructureTreeView';

export default StructureTreeView;
