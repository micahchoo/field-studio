
import React, { useMemo } from 'react';
import { getIIIFValue, IIIFItem } from '@/src/shared/types';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { RESOURCE_TYPE_CONFIG } from '@/src/shared/constants';

export interface StructureToolbarProps {
  selectedIds: Set<string>;
  selectedItems: IIIFItem[];
  parentType: string;
  onReorder?: (direction: 'up' | 'down' | 'start' | 'end') => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onCreateRange?: () => void;
  onBatchMetadata?: () => void;
  onMoveToManifest?: () => void;
  onFindDuplicates?: () => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
}

type SelectionType = 'none' | 'canvas' | 'manifest' | 'collection' | 'range' | 'mixed';

function getSelectionType(items: IIIFItem[]): SelectionType {
  if (items.length === 0) return 'none';

  const types = new Set(items.map(i => i.type));

  if (types.size > 1) return 'mixed';

  const {type} = items[0];
  switch (type) {
    case 'Canvas': return 'canvas';
    case 'Manifest': return 'manifest';
    case 'Collection': return 'collection';
    case 'Range': return 'range';
    default: return 'mixed';
  }
}

export const StructureToolbar: React.FC<StructureToolbarProps> = ({
  selectedIds,
  selectedItems,
  parentType,
  onReorder,
  onGroup,
  onUngroup,
  onDelete,
  onDuplicate,
  onCreateRange,
  onBatchMetadata,
  onMoveToManifest,
  onFindDuplicates,
  onSelectAll,
  onClearSelection,
}) => {
  const selectionType = useMemo(() => getSelectionType(selectedItems), [selectedItems]);
  const count = selectedIds.size;

  // Determine which actions are available based on selection
  const canReorder = count >= 1 && onReorder;
  const canGroup = count >= 2 && selectionType !== 'mixed' && onGroup;
  const canUngroup = count === 1 && selectionType === 'range' && onUngroup;
  const canDelete = count >= 1 && onDelete;
  const canDuplicate = count >= 1 && onDuplicate;
  const canCreateRange = count >= 1 && selectionType === 'canvas' && parentType === 'Manifest' && onCreateRange;
  const canBatchMetadata = count >= 1 && onBatchMetadata;
  const canMoveToManifest = count >= 1 && selectionType === 'canvas' && onMoveToManifest;
  const canFindDuplicates = (count >= 1 || count === 0) && onFindDuplicates;

  // Get config for the selection type badge
  const typeConfig = selectionType !== 'none' && selectionType !== 'mixed'
    ? RESOURCE_TYPE_CONFIG[selectedItems[0]?.type] || RESOURCE_TYPE_CONFIG['Content']
    : null;

  if (count === 0) {
    return (
      <div className="h-12 bg-white border-t flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3 text-slate-400">
          <Icon name="touch_app" className="text-lg" />
          <span className="text-sm">Select items to perform batch operations</span>
        </div>
        <div className="flex items-center gap-2">
          {onSelectAll && (
            <button
              onClick={onSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Icon name="select_all" className="text-sm" /> Select All
            </button>
          )}
          {canFindDuplicates && (
            <button
              onClick={onFindDuplicates}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              title="Scan for potential duplicate items"
            >
              <Icon name="find_replace" className="text-sm" /> Find Duplicates
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-14 bg-white border-t flex items-center justify-between px-4 shrink-0 shadow-lg animate-in slide-in-from-bottom-2">
      {/* Selection Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">
            {count} item{count !== 1 ? 's' : ''} selected
          </span>
          {typeConfig && selectionType !== 'mixed' && (
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${typeConfig.bgClass} ${typeConfig.colorClass}`}>
              {selectionType}
            </span>
          )}
          {selectionType === 'mixed' && (
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
              Mixed
            </span>
          )}
        </div>
        {onClearSelection && (
          <button
            onClick={onClearSelection}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        {/* Reorder buttons */}
        {canReorder && (
          <div className="flex items-center gap-0.5 mr-2 border-r border-slate-200 pr-2">
            <button
              onClick={() => onReorder('start')}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
              title="Move to start"
            >
              <Icon name="first_page" className="text-lg" />
            </button>
            <button
              onClick={() => onReorder('up')}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
              title="Move up"
            >
              <Icon name="keyboard_arrow_up" className="text-lg" />
            </button>
            <button
              onClick={() => onReorder('down')}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
              title="Move down"
            >
              <Icon name="keyboard_arrow_down" className="text-lg" />
            </button>
            <button
              onClick={() => onReorder('end')}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
              title="Move to end"
            >
              <Icon name="last_page" className="text-lg" />
            </button>
          </div>
        )}

        {/* Canvas-specific actions */}
        {canCreateRange && (
          <button
            onClick={onCreateRange}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Group selected canvases into a Range (Table of Contents entry)"
          >
            <Icon name="segment" className="text-sm" /> Create Range
          </button>
        )}

        {canMoveToManifest && (
          <button
            onClick={onMoveToManifest}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Move selected canvases to another Manifest"
          >
            <Icon name="drive_file_move" className="text-sm" /> Move to...
          </button>
        )}

        {/* Group/Ungroup */}
        {canGroup && selectionType === 'manifest' && (
          <button
            onClick={onGroup}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title="Group selected Manifests into a Collection"
          >
            <Icon name="create_new_folder" className="text-sm" /> Group into Collection
          </button>
        )}

        {canUngroup && (
          <button
            onClick={onUngroup}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Ungroup this Range"
          >
            <Icon name="unfold_more" className="text-sm" /> Ungroup
          </button>
        )}

        {/* Common actions */}
        {canBatchMetadata && (
          <button
            onClick={onBatchMetadata}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Edit metadata for all selected items"
          >
            <Icon name="edit_note" className="text-sm" /> Batch Edit
          </button>
        )}

        {canDuplicate && (
          <button
            onClick={onDuplicate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Duplicate selected items"
          >
            <Icon name="content_copy" className="text-sm" /> Duplicate
          </button>
        )}

        {canDelete && (
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove selected items"
          >
            <Icon name="delete" className="text-sm" /> Remove
          </button>
        )}
      </div>
    </div>
  );
};

// Keyboard shortcut hint component
export const StructureToolbarHints: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 bg-slate-900 text-white px-4 py-2 text-xs flex items-center justify-center gap-6">
      <span className="flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] font-mono">Space</kbd>
        Toggle select
      </span>
      <span className="flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] font-mono">Shift+Click</kbd>
        Range select
      </span>
      <span className="flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] font-mono">Cmd+A</kbd>
        Select all
      </span>
      <span className="flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] font-mono">Delete</kbd>
        Remove
      </span>
      <span className="flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] font-mono">[</kbd>/<kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] font-mono">]</kbd>
        Reorder
      </span>
    </div>
  );
};
