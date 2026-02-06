/**
 * TrashView - Trash/Restore System UI Component
 *
 * Displays trashed items with options to restore or permanently delete.
 * Shows trash statistics, supports bulk operations, and follows IIIF Field
 * Archive Studio component patterns.
 *
 * Features:
 * - List/grid view of trashed items
 * - Individual and bulk restore/delete actions
 * - Trash statistics display
 * - Filter/search capabilities
 * - Item preview before restore
 *
 * @see Phase 2: Trash/Restore System (P0 - Data Safety)
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { EmptyState } from './EmptyState';
import { TrashStats } from '../services/trashService';
import { NormalizedState, TrashedEntity } from '../services/vault';
import { getIIIFValue, IIIFItem } from '@/src/shared/types';
import { FEATURE_FLAGS } from '@/src/shared/constants';

// ============================================================================
// Types
// ============================================================================

export interface TrashViewProps {
  /** Current normalized state (for accessing trashed entities) */
  state: NormalizedState;
  /** Called when user requests to restore items */
  onRestore: (ids: string[], options?: { parentId?: string }) => void;
  /** Called when user requests to permanently delete items */
  onDelete: (ids: string[]) => void;
  /** Called when user requests to empty entire trash */
  onEmptyTrash?: () => void;
  /** Optional callback when selection changes */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** View variant */
  variant?: 'default' | 'compact' | 'field-mode';
  /** Additional CSS classes */
  className?: string;
}

interface TrashedItemView {
  id: string;
  entity: TrashedEntity;
  displayLabel: string;
  type: string;
  trashedAt: Date;
  daysRemaining: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format relative time (e.g., "2 days ago")
 */
function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return `${Math.floor(seconds / 604800)} wks ago`;
}

/**
 * Get entity label for display
 */
function getEntityLabel(entity: IIIFItem): string {
  const label = getIIIFValue(entity.label, 'en');
  if (label) return label;

  // Fallback: extract from ID
  const idParts = entity.id.split('/');
  const lastPart = idParts[idParts.length - 1];
  return lastPart || entity.id;
}

/**
 * Get icon name for entity type
 */
function getEntityIcon(type: string): string {
  switch (type) {
    case 'Collection': return 'collections';
    case 'Manifest': return 'menu_book';
    case 'Canvas': return 'image';
    case 'Range': return 'format_list_bulleted';
    case 'AnnotationPage': return 'chat';
    case 'Annotation': return 'comment';
    default: return 'inventory_2';
  }
}

// ============================================================================
// TrashView Component
// ============================================================================

export const TrashView: React.FC<TrashViewProps> = ({
  state,
  onRestore,
  onDelete,
  onEmptyTrash,
  onSelectionChange,
  variant = 'default',
  className = ''
}) => {
  // State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [previewItem, setPreviewItem] = useState<TrashedItemView | null>(null);
  const [showConfirmEmpty, setShowConfirmEmpty] = useState(false);

  // Get trashed items
  const trashedItems = useMemo<TrashedItemView[]>(() => {
    const entries = Object.entries(state.trashedEntities || {});
    const retentionDays = 30; // Default retention

    return entries.map(([id, entity]) => {
      const daysInTrash = Math.floor((Date.now() - entity.trashedAt) / (24 * 60 * 60 * 1000));
      const daysRemaining = Math.max(0, retentionDays - daysInTrash);

      return {
        id,
        entity,
        displayLabel: getEntityLabel(entity.entity),
        type: entity.entity.type,
        trashedAt: new Date(entity.trashedAt),
        daysRemaining
      };
    }).sort((a, b) => b.trashedAt.getTime() - a.trashedAt.getTime());
  }, [state.trashedEntities]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return trashedItems;
    const query = searchQuery.toLowerCase();
    return trashedItems.filter(item =>
      item.displayLabel.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query)
    );
  }, [trashedItems, searchQuery]);

  // Calculate stats
  const stats: TrashStats = useMemo(() => {
    const items = trashedItems;
    const totalSize = items.reduce((sum, item) => {
      try {
        return sum + new Blob([JSON.stringify(item.entity.entity)]).size;
      } catch {
        return sum + 1024;
      }
    }, 0);

    const itemsByType: Record<string, number> = {};
    let expiringSoon = 0;

    for (const item of items) {
      itemsByType[item.type] = (itemsByType[item.type] || 0) + 1;
      if (item.daysRemaining <= 7) {
        expiringSoon++;
      }
    }

    return {
      itemCount: items.length,
      totalSize,
      oldestItem: items.length > 0 ? items[items.length - 1].entity.trashedAt : null,
      newestItem: items.length > 0 ? items[0].entity.trashedAt : null,
      itemsByType,
      expiringSoon
    };
  }, [trashedItems]);

  // Selection handlers
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      onSelectionChange?.(Array.from(newSet));
      return newSet;
    });
  }, [onSelectionChange]);

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === filteredItems.length) {
        onSelectionChange?.([]);
        return new Set();
      }
      const allIds = filteredItems.map(item => item.id);
      onSelectionChange?.(allIds);
      return new Set(allIds);
    });
  }, [filteredItems, onSelectionChange]);

  // Action handlers
  const handleRestore = useCallback((ids: string[]) => {
    onRestore(ids);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      for (const id of ids) {
        newSet.delete(id);
      }
      return newSet;
    });
    setPreviewItem(null);
  }, [onRestore]);

  const handleDelete = useCallback((ids: string[]) => {
    onDelete(ids);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      for (const id of ids) {
        newSet.delete(id);
      }
      return newSet;
    });
    setPreviewItem(null);
  }, [onDelete]);

  const handleEmptyTrash = useCallback(() => {
    onEmptyTrash?.();
    setShowConfirmEmpty(false);
    setSelectedIds(new Set());
  }, [onEmptyTrash]);

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Styles based on variant
  const isFieldMode = variant === 'field-mode';
  const containerClasses = isFieldMode
    ? 'bg-slate-900 text-slate-100'
    : 'bg-white text-slate-900';

  const headerClasses = isFieldMode
    ? 'border-b border-slate-700 bg-slate-800'
    : 'border-b border-slate-200 bg-slate-50';

  // Empty state
  if (trashedItems.length === 0) {
    return (
      <div className={`h-full ${containerClasses} ${className}`}>
        <EmptyState
          icon="delete_outline"
          title="Trash is Empty"
          message="Deleted items will appear here and can be restored within 30 days."
          variant={isFieldMode ? 'field-mode' : 'default'}
        />
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${containerClasses} ${className}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 ${headerClasses}`}>
        <div className="flex items-center gap-3">
          <Icon name="delete_outline" className="text-xl opacity-60" />
          <h2 className="font-semibold">Trash</h2>
          <span className={`text-sm px-2 py-0.5 rounded-full ${
            isFieldMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
          }`}>
            {stats.itemCount}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className={`flex rounded-lg overflow-hidden ${isFieldMode ? 'bg-slate-700' : 'bg-white border'}`}>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 transition-colors ${
                viewMode === 'list'
                  ? isFieldMode ? 'bg-slate-600' : 'bg-slate-100'
                  : isFieldMode ? 'hover:bg-slate-600/50' : 'hover:bg-slate-50'
              }`}
              title="List view"
            >
              <Icon name="view_list" className="text-sm" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors ${
                viewMode === 'grid'
                  ? isFieldMode ? 'bg-slate-600' : 'bg-slate-100'
                  : isFieldMode ? 'hover:bg-slate-600/50' : 'hover:bg-slate-50'
              }`}
              title="Grid view"
            >
              <Icon name="grid_view" className="text-sm" />
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={`flex items-center gap-3 px-4 py-2 border-b ${
        isFieldMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'
      }`}>
        {/* Search */}
        <div className="flex-1 relative">
          <Icon
            name="search"
            className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${
              isFieldMode ? 'text-slate-400' : 'text-slate-400'
            }`}
          />
          <input
            type="text"
            placeholder="Search trash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3 py-1.5 text-sm rounded-lg outline-none transition-colors ${
              isFieldMode
                ? 'bg-slate-700 text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-yellow-400'
                : 'bg-white border border-slate-200 focus:border-iiif-blue focus:ring-1 focus:ring-iiif-blue'
            }`}
          />
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <>
            <span className={`text-sm ${isFieldMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {selectedIds.size} selected
            </span>
            <button
              onClick={() => handleRestore(Array.from(selectedIds))}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                isFieldMode
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              <Icon name="restore" className="text-sm" />
              Restore
            </button>
            <button
              onClick={() => handleDelete(Array.from(selectedIds))}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                isFieldMode
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              <Icon name="delete_forever" className="text-sm" />
              Delete
            </button>
          </>
        )}

        {/* Empty trash button */}
        {onEmptyTrash && trashedItems.length > 0 && (
          <button
            onClick={() => setShowConfirmEmpty(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              isFieldMode
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <Icon name="delete_sweep" className="text-sm" />
            Empty Trash
          </button>
        )}
      </div>

      {/* Stats bar */}
      <div className={`flex items-center gap-4 px-4 py-2 text-xs border-b ${
        isFieldMode ? 'border-slate-700 bg-slate-800/30 text-slate-400' : 'border-slate-200 bg-slate-50/30 text-slate-500'
      }`}>
        <span className="flex items-center gap-1">
          <Icon name="data_usage" className="text-xs" />
          {formatBytes(stats.totalSize)}
        </span>
        {stats.expiringSoon > 0 && (
          <span className={`flex items-center gap-1 ${isFieldMode ? 'text-yellow-400' : 'text-orange-500'}`}>
            <Icon name="warning" className="text-xs" />
            {stats.expiringSoon} expiring soon
          </span>
        )}
        <span className="ml-auto">
          Items kept for 30 days
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Select all checkbox */}
        {filteredItems.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
              onChange={toggleAll}
              className={`rounded ${isFieldMode ? 'bg-slate-700 border-slate-600' : ''}`}
            />
            <span className={`text-sm ${isFieldMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Select all
            </span>
          </div>
        )}

        {/* Items list/grid */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3' : 'space-y-2'}>
          {filteredItems.map(item => (
            <div
              key={item.id}
              onClick={() => setPreviewItem(item)}
              className={`group relative p-3 rounded-lg border cursor-pointer transition-all ${
                viewMode === 'grid' ? 'flex flex-col items-center text-center' : 'flex items-center gap-3'
              } ${
                selectedIds.has(item.id)
                  ? isFieldMode
                    ? 'border-yellow-400 bg-yellow-400/10'
                    : 'border-iiif-blue bg-iiif-blue/5'
                  : isFieldMode
                    ? 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selectedIds.has(item.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleSelection(item.id);
                }}
                className={`${viewMode === 'grid' ? 'absolute top-2 left-2' : ''} rounded ${
                  isFieldMode ? 'bg-slate-700 border-slate-600' : ''
                }`}
              />

              {/* Icon */}
              <div className={`${viewMode === 'grid' ? 'mb-2' : ''}`}>
                <Icon
                  name={getEntityIcon(item.type)}
                  className={`text-2xl ${isFieldMode ? 'text-slate-400' : 'text-slate-400'}`}
                />
              </div>

              {/* Info */}
              <div className={`flex-1 min-w-0 ${viewMode === 'grid' ? '' : ''}`}>
                <p className={`font-medium truncate ${isFieldMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {item.displayLabel}
                </p>
                <p className={`text-xs ${isFieldMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {item.type} • {formatRelativeTime(item.entity.trashedAt)}
                </p>
                {item.daysRemaining <= 7 && (
                  <p className={`text-xs mt-1 ${isFieldMode ? 'text-yellow-400' : 'text-orange-500'}`}>
                    Expires in {item.daysRemaining} days
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className={`flex items-center gap-1 ${viewMode === 'grid' ? 'mt-2' : ''}`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRestore([item.id]);
                  }}
                  className={`p-1.5 rounded transition-colors ${
                    isFieldMode
                      ? 'hover:bg-green-600/20 text-green-400'
                      : 'hover:bg-green-50 text-green-600'
                  }`}
                  title="Restore"
                >
                  <Icon name="restore" className="text-sm" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete([item.id]);
                  }}
                  className={`p-1.5 rounded transition-colors ${
                    isFieldMode
                      ? 'hover:bg-red-600/20 text-red-400'
                      : 'hover:bg-red-50 text-red-600'
                  }`}
                  title="Delete permanently"
                >
                  <Icon name="delete_forever" className="text-sm" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* No results */}
        {filteredItems.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Icon name="search_off" className={`text-4xl mb-2 ${isFieldMode ? 'text-slate-600' : 'text-slate-300'}`} />
            <p className={isFieldMode ? 'text-slate-400' : 'text-slate-500'}>
              No items match "{searchQuery}"
            </p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-xl shadow-xl ${
            isFieldMode ? 'bg-slate-800' : 'bg-white'
          }`}>
            <div className={`flex items-center justify-between p-4 border-b ${
              isFieldMode ? 'border-slate-700' : 'border-slate-200'
            }`}>
              <h3 className={`font-semibold ${isFieldMode ? 'text-slate-100' : ''}`}>
                Preview Item
              </h3>
              <button
                onClick={() => setPreviewItem(null)}
                className={`p-1 rounded transition-colors ${
                  isFieldMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <Icon
                  name={getEntityIcon(previewItem.type)}
                  className="text-3xl text-iiif-blue"
                />
                <div>
                  <p className={`font-medium ${isFieldMode ? 'text-slate-100' : ''}`}>
                    {previewItem.displayLabel}
                  </p>
                  <p className={`text-sm ${isFieldMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Type: {previewItem.type}
                  </p>
                </div>
              </div>

              <div className={`text-sm space-y-2 ${isFieldMode ? 'text-slate-300' : ''}`}>
                <p>
                  <span className={isFieldMode ? 'text-slate-400' : 'text-slate-500'}>Deleted:</span>{' '}
                  {previewItem.trashedAt.toLocaleString()}
                </p>
                <p>
                  <span className={isFieldMode ? 'text-slate-400' : 'text-slate-500'}>Time in trash:</span>{' '}
                  {formatRelativeTime(previewItem.entity.trashedAt)}
                </p>
                <p>
                  <span className={isFieldMode ? 'text-slate-400' : 'text-slate-500'}>Days remaining:</span>{' '}
                  {previewItem.daysRemaining} days
                </p>
                {previewItem.entity.originalParentId && (
                  <p>
                    <span className={isFieldMode ? 'text-slate-400' : 'text-slate-500'}>Original parent:</span>{' '}
                    {previewItem.entity.originalParentId}
                  </p>
                )}
              </div>

              <div className={`flex gap-2 pt-2 ${isFieldMode ? 'border-t border-slate-700' : 'border-t border-slate-100'}`}>
                <button
                  onClick={() => handleRestore([previewItem.id])}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isFieldMode
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  <Icon name="restore" />
                  Restore
                </button>
                <button
                  onClick={() => handleDelete([previewItem.id])}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isFieldMode
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  <Icon name="delete_forever" />
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty Trash Confirmation */}
      {showConfirmEmpty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-sm w-full rounded-xl shadow-xl ${
            isFieldMode ? 'bg-slate-800' : 'bg-white'
          }`}>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-full ${isFieldMode ? 'bg-red-600/20' : 'bg-red-100'}`}>
                  <Icon name="warning" className="text-red-500 text-xl" />
                </div>
                <h3 className={`font-semibold ${isFieldMode ? 'text-slate-100' : ''}`}>
                  Empty Trash?
                </h3>
              </div>

              <p className={`text-sm mb-4 ${isFieldMode ? 'text-slate-300' : 'text-slate-600'}`}>
                This will permanently delete all {stats.itemCount} items in the trash.
                This action cannot be undone.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmEmpty(false)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isFieldMode
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmptyTrash}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isFieldMode
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  Empty Trash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrashView;
