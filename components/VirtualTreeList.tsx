/**
 * VirtualTreeList - Virtualized tree component for CollectionsView
 * 
 * Implements presentation-layer tree flattening as specified in
 * Tree-Flattening-Architectural-Analysis.md:
 * - Uses flattened array for virtualization
 * - Preserves visual hierarchy via CSS indentation
 * - Full ARIA tree accessibility pattern
 * - Drag-and-drop support for tree reordering
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { IIIFItem, isCollection, isManifest, isCanvas } from '../types';
import { FlattenedTreeNode, useTreeVirtualization } from '../hooks/useTreeVirtualization';
import { Icon } from './Icon';
import { StackedThumbnail } from './StackedThumbnail';
import { RESOURCE_TYPE_CONFIG } from '../constants';
import { resolveHierarchicalThumbs } from '../utils/imageSourceResolver';
import { getIIIFValue } from '../types';

interface VirtualTreeListProps {
  /** Root IIIF item to display as tree */
  root: IIIFItem | null;
  /** Currently selected node ID */
  selectedId: string | null;
  /** Callback when node is selected */
  onSelect: (id: string) => void;
  /** Callback for drag-and-drop reordering */
  onDrop?: (draggedId: string, targetId: string) => void;
  /** Reference map for cross-collection tracking */
  referenceMap: Map<string, string[]>;
  /** Estimated height of each row in pixels */
  rowHeight?: number;
  /** Number of extra rows to render above/below viewport */
  overscan?: number;
  /** Maximum nesting depth */
  maxDepth?: number;
  /** Class name for styling */
  className?: string;
  /** Enable keyboard navigation */
  enableKeyboardNav?: boolean;
}

/**
 * Individual tree item component
 * Memoized to prevent unnecessary re-renders during scroll
 */
interface TreeItemProps {
  node: FlattenedTreeNode;
  isSelected: boolean;
  referenceCount: number;
  onSelect: (id: string) => void;
  onToggle: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  isDragOver: boolean;
  canAcceptDrop: boolean;
}

/**
 * MemoizedTreeItem - Exported for external use
 * Uses custom comparison to prevent unnecessary re-renders
 */
export const MemoizedTreeItem = React.memo<TreeItemProps>(({
  node,
  isSelected,
  referenceCount,
  onSelect,
  onToggle,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver,
  canAcceptDrop
}) => {
  const config = RESOURCE_TYPE_CONFIG[node.node.type] || RESOURCE_TYPE_CONFIG['Content'];
  const thumbUrls = resolveHierarchicalThumbs(node.node, 40);
  const nodeIsCollection = isCollection(node.node);
  const nodeIsManifest = isManifest(node.node);

  // Calculate indentation based on nesting level
  const indentPadding = node.level * 12;

  return (
    <div
      role="treeitem"
      aria-level={node.aria.level}
      aria-setsize={node.aria.setSize}
      aria-posinset={node.aria.posInSet}
      aria-expanded={node.hasChildren ? node.isExpanded : undefined}
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
      data-node-id={node.id}
      draggable
      onDragStart={(e) => onDragStart(e, node.id)}
      onDragOver={(e) => canAcceptDrop && onDragOver(e, node.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, node.id)}
      className={`
        flex items-center gap-2 p-2 rounded-lg cursor-pointer 
        transition-all select-none border
        ${isDragOver ? 'bg-blue-100 border-blue-500' : ''}
        ${isSelected ? 'bg-white border-blue-400 shadow-md font-bold' : 'hover:bg-slate-50 text-slate-700 border-transparent'}
      `}
      style={{ 
        paddingLeft: `${16 + indentPadding}px`,
        height: '40px' // Fixed height for virtualization
      }}
      onClick={() => onSelect(node.id)}
    >
      {/* Expand/Collapse chevron */}
      <div
        className={`
          p-0.5 rounded hover:bg-black/10 
          ${!node.hasChildren ? 'invisible' : ''}
          ${isSelected ? 'text-slate-800' : 'text-slate-500'}
        `}
        onClick={onToggle}
        role="button"
        aria-label={node.isExpanded ? 'Collapse' : 'Expand'}
      >
        <Icon name={node.isExpanded ? "expand_more" : "chevron_right"} className="text-[14px]" />
      </div>

      {/* Thumbnail */}
      <StackedThumbnail 
        urls={thumbUrls} 
        size="xs" 
        icon={config.icon}
        placeholderBg="bg-transparent"
      />

      {/* Label */}
      <span className="text-sm truncate flex-1">
        {getIIIFValue(node.node.label) || 'Untitled'}
      </span>

      {/* Reference badge */}
      {referenceCount > 1 && (
        <span 
          className="text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-bold" 
          title={`Referenced in ${referenceCount} Collections`}
        >
          {referenceCount}
        </span>
      )}

      {/* Type badge */}
      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
        nodeIsCollection ? 'bg-amber-100 text-amber-600' :
        nodeIsManifest ? 'bg-emerald-100 text-emerald-600' :
        'bg-slate-100 text-slate-500'
      }`}>
        {isCollection(node.node) ? 'COLL' :
         isManifest(node.node) ? 'MAN' :
         isCanvas(node.node) ? 'CVS' : ''}
      </span>
    </div>
  );
});

MemoizedTreeItem.displayName = 'MemoizedTreeItem';

// Keep internal TreeItem as alias for backward compatibility
const TreeItem = MemoizedTreeItem;

export const VirtualTreeList: React.FC<VirtualTreeListProps> = ({
  root,
  selectedId,
  onSelect,
  onDrop,
  referenceMap,
  rowHeight = 40,
  overscan = 5,
  maxDepth = 15,
  className = '',
  enableKeyboardNav = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedId, setFocusedId] = useState<string | null>(selectedId);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Tree virtualization hook
  const {
    visibleNodes,
    visibleRange,
    totalHeight,
    topSpacer,
    bottomSpacer,
    toggleExpanded,
    handleKeyNavigation,
    findNode
  } = useTreeVirtualization({
    root,
    containerRef,
    estimatedRowHeight: rowHeight,
    overscan,
    maxDepth,
    defaultExpanded: true
  });

  // Sync focused ID with selected ID
  useEffect(() => {
    setFocusedId(selectedId);
  }, [selectedId]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!enableKeyboardNav) return;
    
    const nextId = handleKeyNavigation(event, focusedId);
    if (nextId) {
      setFocusedId(nextId);
      onSelect(nextId);
      
      // Scroll into view if needed
      const node = findNode(nextId);
      if (node && containerRef.current) {
        const itemTop = node.index * rowHeight;
        const containerScroll = containerRef.current.scrollTop;
        const containerHeight = containerRef.current.clientHeight;
        
        if (itemTop < containerScroll) {
          containerRef.current.scrollTop = itemTop;
        } else if (itemTop + rowHeight > containerScroll + containerHeight) {
          containerRef.current.scrollTop = itemTop + rowHeight - containerHeight;
        }
      }
    }
  }, [enableKeyboardNav, handleKeyNavigation, focusedId, onSelect, findNode, rowHeight]);

  // Handle toggle expand/collapse
  const handleToggle = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleExpanded(id);
  }, [toggleExpanded]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('resourceId', id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(id);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    const draggedId = e.dataTransfer.getData('resourceId');
    if (draggedId && draggedId !== targetId) {
      onDrop?.(draggedId, targetId);
    }
  }, [onDrop]);

  // Check if drop is allowed
  const canAcceptDrop = useCallback((node: FlattenedTreeNode): boolean => {
    const nodeIsCollection = isCollection(node.node);
    const nodeIsManifest = isManifest(node.node);
    return (nodeIsCollection || nodeIsManifest) && node.level < maxDepth;
  }, [maxDepth]);

  return (
    <div
      ref={containerRef}
      role="tree"
      aria-label="Archive structure"
      onKeyDown={handleKeyDown}
      className={`overflow-y-auto outline-none ${className}`}
      tabIndex={0}
    >
      {/* Top spacer for virtualization */}
      <div style={{ height: topSpacer }} aria-hidden="true" />

      {/* Visible tree items */}
      {visibleNodes.map(node => {
        const isSelected = node.id === selectedId;
        const refCount = referenceMap.get(node.id)?.length || 0;
        const isDragOver = dragOverId === node.id;

        return (
          <MemoizedTreeItem
            key={node.id}
            node={node}
            isSelected={isSelected}
            referenceCount={refCount}
            onSelect={onSelect}
            onToggle={(e) => handleToggle(e, node.id)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            isDragOver={isDragOver}
            canAcceptDrop={canAcceptDrop(node)}
          />
        );
      })}

      {/* Bottom spacer for virtualization */}
      <div style={{ height: bottomSpacer }} aria-hidden="true" />
    </div>
  );
};

export default VirtualTreeList;
