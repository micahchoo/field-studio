/**
 * Virtual Tree List Molecule
 *
 * Custom virtual scroll component for rendering large tree structures efficiently.
 * Handles 1000+ nodes at 60fps with configurable overscan for smooth scrolling.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Renders TreeNodeItem molecules
 * - No domain logic, only virtualization
 * - Props-only API
 *
 * @module features/structure-view/ui/molecules/VirtualTreeList
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StructureNode } from '../../model/useStructureTree';
import { TreeNodeItem } from './TreeNodeItem';
import type { DropPosition } from '../atoms/DropIndicator';

export interface VirtualTreeListProps {
  /** Nodes to render */
  nodes: StructureNode[];
  /** Height of the container in pixels */
  containerHeight: number;
  /** Height of each row in pixels (default: 36) */
  rowHeight?: number;
  /** Number of extra rows to render above/below viewport (default: 5) */
  overscan?: number;
  /** Callback when a node is selected */
  onSelect: (id: string, additive: boolean) => void;
  /** Callback when a node is expanded/collapsed */
  onToggleExpand: (id: string) => void;
  /** Callback when drag starts */
  onDragStart: (id: string) => void;
  /** Callback when drag ends */
  onDragEnd: () => void;
  /** Callback when a node is dropped */
  onDrop: (targetId: string, position?: DropPosition) => void;
  /** Callback when a node is double-clicked */
  onDoubleClick?: (id: string) => void;
  /** Optional className */
  className?: string;
  /** Optional ref callback for scroll container */
  onScrollContainerRef?: (el: HTMLDivElement | null) => void;
}

/**
 * Virtual Tree List Molecule
 *
 * Renders only visible tree nodes for performance with large trees.
 * @example
 * <VirtualTreeList
 *   nodes={flattenedNodes}
 *   containerHeight={400}
 *   onSelect={handleSelect}
 *   onToggleExpand={handleToggle}
 * />
 */
export const VirtualTreeList: React.FC<VirtualTreeListProps> = ({
  nodes,
  containerHeight,
  rowHeight = 36,
  overscan = 5,
  onSelect,
  onToggleExpand,
  onDragStart,
  onDragEnd,
  onDrop,
  onDoubleClick,
  className = '',
  onScrollContainerRef,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Total height of all content
  const totalHeight = useMemo(() => nodes.length * rowHeight, [nodes.length, rowHeight]);

  // Calculate visible range
  const { startIndex, endIndex, virtualNodes } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const end = Math.min(
      nodes.length,
      Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
    );

    const visibleNodes = nodes.slice(start, end).map((node, index) => ({
      ...node,
      index: start + index,
      style: {
        position: 'absolute' as const,
        top: (start + index) * rowHeight,
        left: 0,
        right: 0,
        height: rowHeight,
      },
    }));

    return {
      startIndex: start,
      endIndex: end,
      virtualNodes: visibleNodes,
    };
  }, [nodes, scrollTop, containerHeight, rowHeight, overscan]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Sync ref with parent
  useEffect(() => {
    if (onScrollContainerRef) {
      onScrollContainerRef(scrollContainerRef.current);
    }
  }, [onScrollContainerRef]);

  // Handle double click wrapper
  const handleDoubleClick = useCallback(
    (id: string) => {
      onDoubleClick?.(id);
    },
    [onDoubleClick]
  );

  // Find currently selected node index
  const selectedIndex = useMemo(() => {
    return nodes.findIndex((n) => n.isSelected);
  }, [nodes]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
      const currentNode = nodes[currentIndex];

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < nodes.length - 1) {
            const nextNode = nodes[currentIndex + 1];
            onSelect(nextNode.id, false);
            // Scroll into view
            if (scrollContainerRef.current) {
              const nextTop = (currentIndex + 1) * rowHeight;
              const containerBottom = scrollTop + containerHeight;
              if (nextTop + rowHeight > containerBottom) {
                scrollContainerRef.current.scrollTop = nextTop - containerHeight + rowHeight;
              }
            }
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            const prevNode = nodes[currentIndex - 1];
            onSelect(prevNode.id, false);
            // Scroll into view
            if (scrollContainerRef.current) {
              const prevTop = (currentIndex - 1) * rowHeight;
              if (prevTop < scrollTop) {
                scrollContainerRef.current.scrollTop = prevTop;
              }
            }
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (currentNode && currentNode.childCount > 0 && !currentNode.isExpanded) {
            onToggleExpand(currentNode.id);
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (currentNode) {
            if (currentNode.isExpanded) {
              onToggleExpand(currentNode.id);
            } else if (currentNode.depth > 0) {
              // Find parent and select it
              const parentIndex = nodes.findIndex((n) => n.id === currentNode.parentId);
              if (parentIndex >= 0) {
                onSelect(nodes[parentIndex].id, false);
              }
            }
          }
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          if (currentNode && currentNode.childCount > 0) {
            onToggleExpand(currentNode.id);
          }
          break;

        case 'Home':
          e.preventDefault();
          if (nodes.length > 0) {
            onSelect(nodes[0].id, false);
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = 0;
            }
          }
          break;

        case 'End':
          e.preventDefault();
          if (nodes.length > 0) {
            onSelect(nodes[nodes.length - 1].id, false);
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = totalHeight;
            }
          }
          break;

        case '*':
          // Expand all siblings
          e.preventDefault();
          if (currentNode) {
            const siblings = nodes.filter(
              (n) => n.parentId === currentNode.parentId && n.childCount > 0
            );
            siblings.forEach((n) => {
              if (!n.isExpanded) onToggleExpand(n.id);
            });
          }
          break;
      }
    },
    [nodes, selectedIndex, onSelect, onToggleExpand, rowHeight, scrollTop, containerHeight, totalHeight]
  );

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      className={`overflow-y-auto overflow-x-hidden ${className}`}
      style={{ height: containerHeight }}
      role="tree"
      aria-label="Structure tree"
      aria-activedescendant={nodes.find((n) => n.isSelected)?.id}
      tabIndex={0}
    >
      {/* Spacer for total content height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualNodes.map((node) => (
          <div
            key={node.id}
            onDoubleClick={() => handleDoubleClick(node.id)}
            style={node.style}
            role="treeitem"
            aria-level={node.depth + 1}
            aria-expanded={node.childCount > 0 ? node.isExpanded : undefined}
            aria-selected={node.isSelected}
          >
            <TreeNodeItem
              node={node}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
            />
          </div>
        ))}
      </div>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="flex items-center justify-center h-full text-nb-black/40 text-sm">
          No items to display
        </div>
      )}
    </div>
  );
};

VirtualTreeList.displayName = 'VirtualTreeList';

export default VirtualTreeList;
