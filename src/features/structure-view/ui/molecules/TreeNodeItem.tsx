/**
 * Tree Node Item Molecule
 *
 * A single row in the structure tree.
 * Composes atoms: StructureNodeIcon, ExpandButton, NodeLabel, DropIndicator
 * Handles selection, expansion, and drag-drop interactions.
 */

import React, { useCallback, useState } from 'react';
import { DropIndicator, ExpandButton, NodeLabel, StructureNodeIcon } from '../atoms';
import type { StructureNode } from '../../model/useStructureTree';
import type { DropPosition } from '../atoms/DropIndicator';

export interface TreeNodeItemProps {
  node: StructureNode;
  onSelect: (id: string, additive: boolean) => void;
  onToggleExpand: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (targetId: string, position?: DropPosition) => void;
  style?: React.CSSProperties;
  canDrop?: boolean;
  dropPosition?: DropPosition | null;
  isDropOver?: boolean;
}

export const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  onSelect,
  onToggleExpand,
  onDragStart,
  onDragEnd,
  onDrop,
  style,
  canDrop = false,
  dropPosition = null,
  isDropOver = false,
}) => {
  const [localDropPosition, setLocalDropPosition] = useState<DropPosition | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const calculateDropPosition = useCallback((e: React.DragEvent<HTMLDivElement>): DropPosition => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const {height} = rect;

    if (y < height * 0.25) return 'before';
    if (y > height * 0.75) return 'after';
    return 'inside';
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(node.id, e.metaKey || e.ctrlKey);
    },
    [node.id, onSelect]
  );

  const handleExpandClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleExpand(node.id);
    },
    [node.id, onToggleExpand]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', node.id);
      e.dataTransfer.effectAllowed = 'move';
      onDragStart(node.id);
    },
    [node.id, onDragStart]
  );

  const handleDragEnd = useCallback(() => {
    onDragEnd();
  }, [onDragEnd]);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = canDrop ? 'move' : 'none';

      if (canDrop) {
        const position = calculateDropPosition(e);
        setLocalDropPosition(position);
        setIsDraggingOver(true);
      }
    },
    [canDrop, calculateDropPosition]
  );

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false);
    setLocalDropPosition(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const position = localDropPosition || 'inside';
      onDrop(node.id, position);
      setIsDraggingOver(false);
      setLocalDropPosition(null);
    },
    [node.id, onDrop, localDropPosition]
  );

  const indentWidth = node.depth * 16;
  const effectiveDropPosition = dropPosition || localDropPosition;
  const effectiveIsDropOver = isDropOver || isDraggingOver;

  return (
    <div
      role="treeitem"
      aria-level={node.depth + 1}
      aria-expanded={node.childCount > 0 ? node.isExpanded : undefined}
      aria-selected={node.isSelected}
      tabIndex={node.isSelected ? 0 : -1}
      style={style}
      className={`
        relative flex items-center gap-1 px-2 py-1.5 cursor-pointer
        border-b border-slate-100 dark:border-slate-800
        hover:bg-slate-50 dark:hover:bg-slate-800
        ${node.isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
        ${node.relationship === 'reference' ? 'italic' : ''}
        ${node.isDragging ? 'opacity-40' : ''}
        ${effectiveIsDropOver && canDrop ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
        transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset
      `}
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {effectiveIsDropOver && canDrop && effectiveDropPosition && (
        <DropIndicator position={effectiveDropPosition} isValid={canDrop} />
      )}

      <span style={{ width: indentWidth }} className="flex-shrink-0" />

      <ExpandButton
        isExpanded={node.isExpanded}
        onClick={handleExpandClick}
        hasChildren={node.childCount > 0}
      />

      <StructureNodeIcon
        type={node.type}
        className={`
          flex-shrink-0 ml-1
          ${node.type === 'Collection' ? 'text-blue-500' : ''}
          ${node.type === 'Manifest' ? 'text-green-500' : ''}
          ${node.type === 'Canvas' ? 'text-purple-500' : ''}
          ${node.type === 'Range' ? 'text-orange-500' : ''}
        `}
      />

      <NodeLabel
        label={node.label}
        type={node.type}
        isSelected={node.isSelected}
        isDragging={node.isDragging}
        className="flex-1 ml-2"
      />

      {node.childCount > 0 && (
        <span className="text-xs text-slate-400 dark:text-slate-500 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
          {node.childCount}
        </span>
      )}

      {node.relationship === 'reference' && (
        <span
          className="text-xs text-slate-400 dark:text-slate-500 ml-1"
          title="Reference (not owned)"
        >
          ↗
        </span>
      )}
    </div>
  );
};

TreeNodeItem.displayName = 'TreeNodeItem';

export default TreeNodeItem;
