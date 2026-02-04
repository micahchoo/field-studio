
import React, { useCallback, useMemo, useState } from 'react';
import { getIIIFValue, IIIFCanvas, IIIFCollection, IIIFItem, IIIFManifest, isCanvas, isCollection, isManifest } from '../types';
import { Icon } from './Icon';
import { RESOURCE_TYPE_CONFIG } from '../constants';
import { resolveHierarchicalThumbs, resolveThumbUrl } from '../utils/imageSourceResolver';
import { StackedThumbnail } from './StackedThumbnail';

export interface StructureCanvasProps {
  item: IIIFItem | null;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onSelect: (id: string) => void;
  onMultiSelect?: (ids: string[], additive: boolean) => void;
  selectedIds: Set<string>;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  onMoveToManifest?: (canvasIds: string[], targetManifestId: string) => void;
  onRemove?: (ids: string[]) => void;
  onDuplicate?: (ids: string[]) => void;
}

interface DragState {
  draggedId: string | null;
  dragOverIndex: number | null;
}

export const StructureCanvas: React.FC<StructureCanvasProps> = ({
  item,
  onReorder,
  onSelect,
  onMultiSelect,
  selectedIds,
  viewMode = 'grid',
  onViewModeChange,
  onRemove,
  onDuplicate,
}) => {
  const [dragState, setDragState] = useState<DragState>({ draggedId: null, dragOverIndex: null });
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Get children based on item type
  const children = useMemo(() => {
    if (!item) return [];
    if (isManifest(item)) return item.items || [];
    if (isCollection(item)) return item.items || [];
    return [];
  }, [item]);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDragState(prev => ({ ...prev, draggedId: id }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragState(prev => ({ ...prev, dragOverIndex: index }));
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragState(prev => ({ ...prev, dragOverIndex: null }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    const fromIndex = children.findIndex(c => c.id === draggedId);

    if (fromIndex !== -1 && fromIndex !== targetIndex) {
      onReorder(fromIndex, targetIndex);
    }

    setDragState({ draggedId: null, dragOverIndex: null });
  }, [children, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragState({ draggedId: null, dragOverIndex: null });
  }, []);

  const handleClick = useCallback((e: React.MouseEvent, id: string, index: number) => {
    if (e.shiftKey && onMultiSelect && lastSelectedIndex !== null) {
      // Range selection
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = children.slice(start, end + 1).map(c => c.id);
      onMultiSelect(rangeIds, true);
    } else if ((e.ctrlKey || e.metaKey) && onMultiSelect) {
      // Toggle selection
      onMultiSelect([id], true);
    } else {
      // Single selection
      onSelect(id);
      setLastSelectedIndex(index);
    }
  }, [children, lastSelectedIndex, onMultiSelect, onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, id: string, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(id);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (onRemove && selectedIds.size > 0) {
        e.preventDefault();
        onRemove(Array.from(selectedIds));
      }
    }
  }, [onRemove, onSelect, selectedIds]);

  if (!item) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 text-slate-400">
        <div className="text-center space-y-2">
          <Icon name="account_tree" className="text-4xl" />
          <p className="text-sm font-medium">Select a Manifest or Collection to view its structure</p>
        </div>
      </div>
    );
  }

  const config = RESOURCE_TYPE_CONFIG[item.type] || RESOURCE_TYPE_CONFIG['Content'];
  const childType = isManifest(item) ? 'Canvas' : (isCollection(item) ? 'Manifest/Collection' : 'Item');

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="h-12 bg-white border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${config.bgClass} ${config.colorClass}`}>
            {item.type}
          </span>
          <h2 className="font-bold text-slate-700 text-sm truncate max-w-xs">
            {getIIIFValue(item.label) || 'Untitled'}
          </h2>
          <span className="text-xs text-slate-400">
            {children.length} {childType}{children.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onViewModeChange && (
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm text-iiif-blue' : 'text-slate-400 hover:text-slate-600'}`}
                title="Grid view"
              >
                <Icon name="grid_view" className="text-sm" />
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm text-iiif-blue' : 'text-slate-400 hover:text-slate-600'}`}
                title="List view"
              >
                <Icon name="view_list" className="text-sm" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {children.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <div className="text-center space-y-2">
              <Icon name="add_photo_alternate" className="text-4xl" />
              <p className="text-sm font-medium">No {childType.toLowerCase()}s yet</p>
              <p className="text-xs">Drag items here or add new ones</p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {children.map((child, index) => (
              <StructureCard
                key={child.id}
                item={child}
                index={index}
                isSelected={selectedIds.has(child.id)}
                isDragging={dragState.draggedId === child.id}
                isDragOver={dragState.dragOverIndex === index}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {children.map((child, index) => (
              <StructureListItem
                key={child.id}
                item={child}
                index={index}
                isSelected={selectedIds.has(child.id)}
                isDragging={dragState.draggedId === child.id}
                isDragOver={dragState.dragOverIndex === index}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Structure Card Component (Grid View)
interface StructureItemProps {
  item: IIIFItem;
  index: number;
  isSelected: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onClick: (e: React.MouseEvent, id: string, index: number) => void;
  onKeyDown: (e: React.KeyboardEvent, id: string, index: number) => void;
}

const StructureCard: React.FC<StructureItemProps> = ({
  item,
  index,
  isSelected,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onClick,
  onKeyDown,
}) => {
  const config = RESOURCE_TYPE_CONFIG[item.type] || RESOURCE_TYPE_CONFIG['Content'];
  const thumbUrls = resolveHierarchicalThumbs(item, 200);
  const label = getIIIFValue(item.label) || `${item.type} ${index + 1}`;

  // Get annotation count for canvases
  const annotationCount = isCanvas(item) ?
    item.items?.reduce((sum, ap) => sum + (ap.items?.length || 0), 0) || 0 : 0;

  return (
    <div
      draggable
      tabIndex={0}
      role="button"
      aria-selected={isSelected}
      className={`
        group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all
        focus:outline-none focus:ring-2 focus:ring-iiif-blue focus:ring-offset-2
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isDragOver ? 'border-iiif-blue bg-blue-50 scale-105' : ''}
        ${isSelected ? 'border-iiif-blue shadow-lg ring-2 ring-iiif-blue/30' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}
      `}
      onDragStart={(e) => onDragStart(e, item.id)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      onClick={(e) => onClick(e, item.id, index)}
      onKeyDown={(e) => onKeyDown(e, item.id, index)}
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-slate-100 relative flex items-center justify-center">
        <StackedThumbnail 
          urls={thumbUrls} 
          size="xl" 
          className="w-full h-full"
          icon={config.icon}
        />

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-iiif-blue rounded-full flex items-center justify-center shadow-lg">
            <Icon name="check" className="text-white text-sm" />
          </div>
        )}

        {/* Index badge */}
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded">
          {index + 1}
        </div>

        {/* Type badge */}
        <div className={`absolute top-2 left-2 text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${config.bgClass} ${config.colorClass}`}>
          {isCanvas(item) ? 'CVS' : isManifest(item) ? 'MAN' : isCollection(item) ? 'COLL' : item.type.slice(0, 3)}
        </div>
      </div>

      {/* Label */}
      <div className="p-2 bg-white">
        <p className="text-xs font-medium text-slate-700 truncate" title={label}>
          {label}
        </p>
        {annotationCount > 0 && (
          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
            <Icon name="chat_bubble" className="text-[10px]" />
            {annotationCount} annotation{annotationCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
};

// Structure List Item Component (List View)
const StructureListItem: React.FC<StructureItemProps> = ({
  item,
  index,
  isSelected,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onClick,
  onKeyDown,
}) => {
  const config = RESOURCE_TYPE_CONFIG[item.type] || RESOURCE_TYPE_CONFIG['Content'];
  const thumbUrls = resolveHierarchicalThumbs(item, 80);
  const label = getIIIFValue(item.label) || `${item.type} ${index + 1}`;

  const annotationCount = isCanvas(item) ?
    item.items?.reduce((sum, ap) => sum + (ap.items?.length || 0), 0) || 0 : 0;

  return (
    <div
      draggable
      tabIndex={0}
      role="button"
      aria-selected={isSelected}
      className={`
        group flex items-center gap-3 p-2 rounded-lg border-2 cursor-pointer transition-all
        focus:outline-none focus:ring-2 focus:ring-iiif-blue focus:ring-offset-1
        ${isDragging ? 'opacity-50' : ''}
        ${isDragOver ? 'border-iiif-blue bg-blue-50' : ''}
        ${isSelected ? 'border-iiif-blue bg-blue-50/50' : 'border-transparent hover:bg-white hover:border-slate-200'}
      `}
      onDragStart={(e) => onDragStart(e, item.id)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      onClick={(e) => onClick(e, item.id, index)}
      onKeyDown={(e) => onKeyDown(e, item.id, index)}
    >
      {/* Drag handle */}
      <div className="text-slate-300 cursor-grab active:cursor-grabbing">
        <Icon name="drag_indicator" className="text-lg" />
      </div>

      {/* Index */}
      <span className="text-xs font-mono text-slate-400 w-6 text-right">{index + 1}</span>

      {/* Thumbnail */}
      <StackedThumbnail 
        urls={thumbUrls} 
        size="sm" 
        icon={config.icon}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${config.bgClass} ${config.colorClass}`}>
            {item.type}
          </span>
          {annotationCount > 0 && (
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <Icon name="chat_bubble" className="text-[10px]" />
              {annotationCount}
            </span>
          )}
        </div>
      </div>

      {/* Selection checkbox */}
      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
        isSelected ? 'bg-iiif-blue border-iiif-blue' : 'border-slate-300 group-hover:border-slate-400'
      }`}>
        {isSelected && <Icon name="check" className="text-white text-sm" />}
      </div>
    </div>
  );
};
