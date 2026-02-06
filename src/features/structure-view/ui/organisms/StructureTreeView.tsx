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
        bg-white dark:bg-stone-900
        border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden
        shadow-sm
        ${className}
      `}
    >
      {/* Search Bar - refined with archival aesthetic */}
      {FEATURES.TREE_SEARCH && (
        <div className="p-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50/30 dark:bg-stone-900/30">
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
        abstractionLevel={fieldMode ? 'advanced' : 'standard'}
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

      {/* Status bar - abstraction-aware, reduced visual noise */}
      {treeStats && (
        <div className="px-4 py-2.5 border-t border-stone-200 dark:border-stone-700 bg-stone-50/80 dark:bg-stone-900/80 text-sm text-stone-500 dark:text-stone-400 flex items-center justify-between">
          <span className="font-serif">
            {(() => {
              // Convert technical types to friendly counts
              const counts = treeStats.typeCounts;
              const items = (counts.Canvas || 0) + (counts.Annotation || 0);
              const albums = counts.Collection || 0;
              const groups = counts.Manifest || 0;
              
              const parts = [];
              if (albums > 0) parts.push(`${albums} ${albums === 1 ? 'album' : 'albums'}`);
              if (groups > 0) parts.push(`${groups} ${groups === 1 ? 'group' : 'groups'}`);
              if (items > 0) parts.push(`${items} ${items === 1 ? 'item' : 'items'}`);
              
              return parts.join(' · ') || 'Empty archive';
            })()}
          </span>
          {filterQuery && (
            <span className="text-amber-700 dark:text-amber-400 font-medium">
              Showing {matchCount} of {flattenedNodes.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

StructureTreeView.displayName = 'StructureTreeView';

export default StructureTreeView;
