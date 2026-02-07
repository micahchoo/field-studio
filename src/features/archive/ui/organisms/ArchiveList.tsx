/**
 * ArchiveList Organism
 *
 * Table/list view for archive items with sortable columns.
 * Displays more metadata per item in a scannable format.
 *
 * Features:
 * - Sortable column headers
 * - Row selection with visual feedback
 * - Thumbnail preview in first column
 * - Metadata columns: label, type, date, dimensions
 * - Field mode support
 */

import React, { useMemo, useState } from 'react';
import { getIIIFValue, type IIIFCanvas } from '@/src/shared/types';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { resolveHierarchicalThumbs } from '@/utils/imageSourceResolver';
import { getFileDNA } from '../../model';

type SortColumn = 'label' | 'type' | 'date' | 'dimensions' | 'size';
type SortDirection = 'asc' | 'desc';

export interface ArchiveListProps {
  /** Canvas items to render */
  items: IIIFCanvas[];
  /** Check if an item is selected */
  isSelected: (id: string) => boolean;
  /** Click handler for an item */
  onItemClick: (e: React.MouseEvent, asset: IIIFCanvas) => void;
  /** Double-click handler */
  onItemDoubleClick?: (asset: IIIFCanvas) => void;
  /** Context menu handler */
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  /** Contextual styles from template */
  cx: {
    surface: string;
    text: string;
    accent: string;
    border: string;
    divider: string;
    headerBg: string;
    textMuted: string;
    input: string;
    label: string;
    active: string;
    inactive: string;
    warningBg: string;
  };
  /** Current field mode */
  fieldMode: boolean;
  /** Active item for detail panel */
  activeItem: IIIFCanvas | null;
  /** Whether reordering is enabled */
  reorderEnabled?: boolean;
  /** Callback when items are reordered */
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

// Column configuration
const COLUMNS: { key: SortColumn; label: string; width: string; align?: 'left' | 'center' | 'right' }[] = [
  { key: 'label', label: 'Name', width: 'flex-1' },
  { key: 'type', label: 'Type', width: 'w-24', align: 'center' },
  { key: 'date', label: 'Date', width: 'w-32' },
  { key: 'dimensions', label: 'Dimensions', width: 'w-28', align: 'right' },
];

/**
 * Get sort value for a canvas based on column
 */
const getSortValue = (canvas: IIIFCanvas, column: SortColumn): string | number => {
  switch (column) {
    case 'label':
      return getIIIFValue(canvas.label, 'en') || 'Untitled';
    case 'type':
      return canvas.type || 'Canvas';
    case 'date':
      return canvas.navDate || (canvas as any).metadata?.find((m: any) =>
        getIIIFValue(m.label, 'en')?.toLowerCase().includes('date')
      )?.value?.en?.[0] || '';
    case 'dimensions':
      return (canvas.width || 0) * (canvas.height || 0);
    default:
      return '';
  }
};

export const ArchiveList: React.FC<ArchiveListProps> = ({
  items,
  isSelected,
  onItemClick,
  onItemDoubleClick,
  onContextMenu,
  cx,
  fieldMode,
  activeItem,
  reorderEnabled = false,
  onReorder,
}) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('label');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!reorderEnabled || !onReorder) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!reorderEnabled || draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTargetIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDragLeave = () => {
    // Don't clear immediately to prevent flickering
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (!reorderEnabled || draggedIndex === null || !onReorder) return;
    if (draggedIndex !== toIndex) {
      onReorder(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  // Sort items (disabled when reordering to preserve manual order)
  const sortedItems = useMemo(() => {
    // Don't sort when reorder mode is enabled - preserve original order
    if (reorderEnabled) return items;

    const sorted = [...items].sort((a, b) => {
      const aVal = getSortValue(a, sortColumn);
      const bVal = getSortValue(b, sortColumn);

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
    return sorted;
  }, [items, sortColumn, sortDirection, reorderEnabled]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Empty state
  if (items.length === 0) {
    return (
      <div className={`flex-1 flex items-center justify-center ${cx.surface}`}>
        <div className="text-center">
          <Icon name="list" className={`text-4xl mb-2 ${cx.textMuted}`} />
          <p className={`text-sm ${cx.textMuted}`}>No items to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-auto ${cx.surface}`}>
      <table className="w-full border-collapse">
        {/* Header */}
        <thead className={`sticky top-0 z-10 ${fieldMode ? 'bg-yellow-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
          <tr>
            {/* Drag handle column (only when reorder enabled) */}
            {reorderEnabled && (
              <th className={`w-8 px-1 py-3 border-b ${cx.border}`} />
            )}
            {/* Thumbnail column */}
            <th className={`w-16 px-3 py-3 border-b ${cx.border}`} />

            {/* Data columns */}
            {COLUMNS.map(col => (
              <th
                key={col.key}
                className={`
                  px-3 py-3 border-b ${cx.border} ${col.width}
                  text-left text-[10px] font-bold uppercase tracking-wider cursor-pointer
                  hover:bg-black/5 dark:hover:bg-white/5 transition-colors
                  ${col.align === 'center' ? 'text-center' : ''}
                  ${col.align === 'right' ? 'text-right' : ''}
                  ${cx.textMuted}
                `}
                onClick={() => handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {sortColumn === col.key && (
                    <Icon
                      name={sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      className="text-xs"
                    />
                  )}
                </span>
              </th>
            ))}

            {/* Actions column */}
            <th className={`w-12 px-3 py-3 border-b ${cx.border}`} />
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {sortedItems.map((canvas, index) => {
            const selected = isSelected(canvas.id);
            const active = activeItem?.id === canvas.id;
            const label = getIIIFValue(canvas.label, 'en') || 'Untitled';
            const thumbUrls = resolveHierarchicalThumbs(canvas);
            const thumbUrl = thumbUrls[0] || '';
            const dna = getFileDNA(canvas);
            const isDragging = draggedIndex === index;
            const isDropTarget = dropTargetIndex === index && draggedIndex !== null && draggedIndex !== index;

            return (
              <tr
                key={canvas.id}
                draggable={reorderEnabled && !!onReorder}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={(e) => onItemClick(e, canvas)}
                onDoubleClick={() => onItemDoubleClick?.(canvas)}
                onContextMenu={(e) => onContextMenu(e, canvas.id)}
                className={`
                  border-b ${cx.border} transition-colors
                  ${reorderEnabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                  ${isDragging ? 'opacity-50' : ''}
                  ${isDropTarget
                    ? fieldMode
                      ? 'ring-2 ring-inset ring-yellow-400 bg-yellow-500/10'
                      : 'ring-2 ring-inset ring-blue-500 bg-blue-500/10'
                    : ''
                  }
                  ${active
                    ? fieldMode
                      ? 'bg-yellow-500/30'
                      : 'bg-blue-500/20 dark:bg-blue-500/30'
                    : selected
                      ? fieldMode
                        ? 'bg-yellow-500/20'
                        : 'bg-blue-500/10 dark:bg-blue-500/20'
                      : fieldMode
                        ? 'hover:bg-yellow-900/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }
                `}
              >
                {/* Drag handle (only when reorder enabled) */}
                {reorderEnabled && (
                  <td className="px-1 py-2">
                    <div className={`
                      flex items-center justify-center cursor-grab active:cursor-grabbing
                      ${fieldMode ? 'text-yellow-400/60' : 'text-slate-400'}
                    `}>
                      <Icon name="drag_indicator" className="text-lg" />
                    </div>
                  </td>
                )}
                {/* Thumbnail */}
                <td className="px-3 py-2">
                  <div className={`
                    w-10 h-10 rounded overflow-hidden
                    ${fieldMode ? 'bg-yellow-900/30' : 'bg-slate-200 dark:bg-slate-700'}
                  `}>
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon name="image" className={`text-sm ${cx.textMuted}`} />
                      </div>
                    )}
                  </div>
                </td>

                {/* Label */}
                <td className={`px-3 py-2 ${cx.text}`}>
                  <div className="flex items-center gap-2">
                    {selected && (
                      <Icon
                        name="check_circle"
                        className={`text-sm ${fieldMode ? 'text-yellow-400' : 'text-blue-500'}`}
                      />
                    )}
                    <span className="font-medium truncate">{label}</span>
                  </div>
                </td>

                {/* Type */}
                <td className={`px-3 py-2 text-center`}>
                  <span className={`
                    inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase
                    ${fieldMode
                      ? 'bg-yellow-900/50 text-yellow-300'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }
                  `}>
                    {canvas.type}
                  </span>
                </td>

                {/* Date */}
                <td className={`px-3 py-2 ${cx.textMuted}`}>
                  <span className="text-sm">
                    {canvas.navDate
                      ? new Date(canvas.navDate).toLocaleDateString()
                      : '-'
                    }
                  </span>
                </td>

                {/* Dimensions */}
                <td className={`px-3 py-2 text-right ${cx.textMuted}`}>
                  <span className="text-sm font-mono">
                    {canvas.width && canvas.height
                      ? `${canvas.width}×${canvas.height}`
                      : '-'
                    }
                  </span>
                </td>

                {/* Actions */}
                <td className="px-3 py-2">
                  <Button variant="ghost" size="bare"
                    onClick={(e) => {
                      e.stopPropagation();
                      onContextMenu(e, canvas.id);
                    }}
                    className={`
                      p-1 rounded transition-colors
                      ${fieldMode
                        ? 'hover:bg-yellow-500/20 text-yellow-400'
                        : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400'
                      }
                    `}
                  >
                    <Icon name="more_vert" className="text-sm" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer stats */}
      <div className={`
        sticky bottom-0 px-4 py-2 border-t ${cx.border}
        ${fieldMode ? 'bg-yellow-900/30' : 'bg-slate-50 dark:bg-slate-800'}
      `}>
        <span className={`text-xs ${cx.textMuted}`}>
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>
    </div>
  );
};

export default ArchiveList;
