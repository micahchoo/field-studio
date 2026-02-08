/**
 * FileTreeNode Atom
 *
 * Single row in the staging file tree.
 * Shows expand/collapse, icon, name, size/count badge, and IIIF indicators.
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { ExpandButton } from '@/src/features/structure-view/ui/atoms/ExpandButton';
import { MIME_TYPE_MAP } from '@/src/shared/constants/image';
import type { FlatFileTreeNode } from '../../model';

export interface FileTreeNodeProps {
  node: FlatFileTreeNode;
  isSelected: boolean;
  onToggleExpand: (path: string) => void;
  onSelect: (path: string, additive: boolean) => void;
  onContextMenu: (e: React.MouseEvent, path: string, isDirectory: boolean) => void;
  onDragStart: (e: React.DragEvent, path: string) => void;
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const entry = MIME_TYPE_MAP[ext];
  if (!entry) return 'insert_drive_file';
  switch (entry.type) {
    case 'Image': return 'image';
    case 'Sound': return 'audiotrack';
    case 'Video': return 'videocam';
    case 'Text': return 'description';
    case 'Dataset': return 'table_chart';
    case 'Model': return 'view_in_ar';
    default: return 'insert_drive_file';
  }
}

function getDirIcon(intent?: string): string {
  switch (intent) {
    case 'Collection': return 'collections_bookmark';
    case 'Manifest': return 'auto_stories';
    case 'Range': return 'segment';
    default: return 'folder';
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`;
}

export const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  node,
  isSelected,
  onToggleExpand,
  onSelect,
  onContextMenu,
  onDragStart,
}) => {
  const { annotations } = node;
  const isExcluded = !!annotations.excluded;
  const hasBehaviors = (annotations.iiifBehavior?.length ?? 0) > 0;
  const hasViewDir = !!annotations.viewingDirection;
  const hasRights = !!annotations.rights;
  const hasNavDate = !!annotations.navDate;
  const isStart = !!annotations.start;
  const hasIIIFMeta = hasBehaviors || hasViewDir || !!annotations.iiifIntent || hasRights || hasNavDate || isStart;

  const icon = node.isDirectory
    ? getDirIcon(annotations.iiifIntent)
    : getFileIcon(node.name);

  const iconColor = node.isDirectory
    ? annotations.iiifIntent ? 'text-nb-purple' : 'text-nb-blue'
    : 'text-nb-black/50';

  return (
    <div
      className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer group text-sm select-none ${
        isSelected ? 'bg-nb-blue/15 text-nb-black' : 'hover:bg-nb-cream/60 text-nb-black/80'
      } ${isExcluded ? 'opacity-40 line-through' : ''}`}
      style={{ paddingLeft: `${node.depth * 20 + 4}px` }}
      onClick={(e) => onSelect(node.path, e.metaKey || e.ctrlKey)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, node.path, node.isDirectory); }}
      draggable
      onDragStart={(e) => onDragStart(e, node.path)}
    >
      {/* Expand button */}
      <ExpandButton
        isExpanded={node.isExpanded}
        hasChildren={node.isDirectory && node.childCount > 0}
        onClick={(e) => { e.stopPropagation(); onToggleExpand(node.path); }}
      />

      {/* Icon */}
      <Icon name={icon} className={`text-base ${iconColor}`} />

      {/* Name */}
      <span className="flex-1 truncate text-xs">{node.name}</span>

      {/* IIIF indicators */}
      {hasIIIFMeta && !isExcluded && (
        <span className="flex gap-0.5">
          {annotations.iiifIntent && (
            <span className="w-1.5 h-1.5 rounded-full bg-nb-purple" title={`Intent: ${annotations.iiifIntent}`} />
          )}
          {hasBehaviors && (
            <span className="w-1.5 h-1.5 rounded-full bg-nb-orange" title={`Behaviors: ${annotations.iiifBehavior!.join(', ')}`} />
          )}
          {hasViewDir && (
            <span className="w-1.5 h-1.5 rounded-full bg-nb-green" title={`Direction: ${annotations.viewingDirection}`} />
          )}
          {hasRights && (
            <span className="w-1.5 h-1.5 rounded-full bg-nb-blue" title={`Rights: ${annotations.rights}`} />
          )}
          {hasNavDate && (
            <span className="w-1.5 h-1.5 rounded-full bg-nb-teal" title={`Date: ${annotations.navDate}`} />
          )}
          {isStart && (
            <Icon name="star" className="text-[10px] text-nb-yellow" />
          )}
        </span>
      )}

      {/* Badge: file count or size */}
      {node.isDirectory ? (
        <span className="text-[10px] text-nb-black/40 tabular-nums whitespace-nowrap">
          {node.totalFileCount} file{node.totalFileCount !== 1 ? 's' : ''}
        </span>
      ) : (
        <span className="text-[10px] text-nb-black/40 tabular-nums whitespace-nowrap">
          {formatSize(node.size)}
        </span>
      )}
    </div>
  );
};

FileTreeNode.displayName = 'FileTreeNode';
