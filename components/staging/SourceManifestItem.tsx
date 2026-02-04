
import React, { useCallback, useState } from 'react';
import { SourceManifest } from '../../types';
import { Icon } from '../Icon';
import { CanvasItem } from './CanvasItem';

interface SourceManifestItemProps {
  manifest: SourceManifest;
  isSelected: boolean;
  selectedCanvasIndices: number[];
  onSelect: (e: React.MouseEvent) => void;
  onCanvasSelect: (index: number, e: React.MouseEvent) => void;
  onReorderCanvases: (newOrder: string[]) => void;
  onDragStart: (e: React.DragEvent) => void;
}

export const SourceManifestItem: React.FC<SourceManifestItemProps> = ({
  manifest,
  isSelected,
  selectedCanvasIndices,
  onSelect,
  onCanvasSelect,
  onReorderCanvases,
  onDragStart
}) => {
  const [expanded, setExpanded] = useState(false);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);

  const handleCanvasDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDragSourceIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleCanvasDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragSourceIndex !== null && index !== dragSourceIndex) {
      setDragTargetIndex(index);
    }
  }, [dragSourceIndex]);

  const handleCanvasDragEnd = useCallback(() => {
    setDragSourceIndex(null);
    setDragTargetIndex(null);
  }, []);

  const handleCanvasDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (dragSourceIndex === null || dragSourceIndex === targetIndex) {
      handleCanvasDragEnd();
      return;
    }

    const newOrder = [...manifest.canvasOrder];
    const [movedItem] = newOrder.splice(dragSourceIndex, 1);
    newOrder.splice(targetIndex, 0, movedItem);

    onReorderCanvases(newOrder);
    handleCanvasDragEnd();
  }, [dragSourceIndex, manifest.canvasOrder, onReorderCanvases, handleCanvasDragEnd]);

  return (
    <div
      className={`
        border rounded-xl overflow-hidden transition-all
        ${isSelected
          ? 'border-blue-400 bg-blue-50 shadow-md ring-2 ring-blue-200'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
        }
      `}
    >
      {/* Header */}
      <div
        draggable
        onClick={onSelect}
        onDragStart={onDragStart}
        className={`
          flex items-center gap-3 p-3 cursor-pointer transition-colors
          ${isSelected ? 'bg-blue-100' : 'hover:bg-slate-50'}
        `}
      >
        {/* Expand/collapse button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="p-1 rounded hover:bg-white/50 transition-colors"
        >
          <Icon
            name={expanded ? 'expand_more' : 'chevron_right'}
            className="text-lg text-slate-500"
          />
        </button>

        {/* Manifest icon */}
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
          ${isSelected ? 'bg-blue-200' : 'bg-emerald-100'}
        `}>
          <Icon name="menu_book" className={`text-xl ${isSelected ? 'text-blue-600' : 'text-emerald-600'}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-800 truncate" title={manifest.name}>
            {manifest.name}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>{manifest.files.length} {manifest.files.length === 1 ? 'canvas' : 'canvases'}</span>
            {manifest.detectedPattern && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <Icon name="auto_awesome" className="text-[10px]" />
                  {manifest.detectedPattern}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="flex-shrink-0">
            <Icon name="check_circle" className="text-blue-500 text-xl" />
          </div>
        )}

        {/* Drag indicator */}
        <div className="flex-shrink-0 text-slate-300 hover:text-slate-500 cursor-grab">
          <Icon name="drag_indicator" className="text-lg" />
        </div>
      </div>

      {/* Breadcrumb path */}
      {manifest.breadcrumbs.length > 0 && (
        <div className="px-4 pb-2 -mt-1">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            {manifest.breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Icon name="chevron_right" className="text-[10px]" />}
                <span>{crumb}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Canvas list (expanded) */}
      {expanded && (
        <div className="border-t border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Icon name="layers" className="text-sm" />
            Canvas Order (drag to reorder)
          </div>
          {manifest.files.map((file, index) => (
            <CanvasItem
              key={file.name}
              file={file}
              index={index}
              isSelected={selectedCanvasIndices.includes(index)}
              isDragTarget={dragTargetIndex === index}
              onSelect={(e) => onCanvasSelect(index, e)}
              onDragStart={handleCanvasDragStart}
              onDragOver={handleCanvasDragOver}
              onDragEnd={handleCanvasDragEnd}
              onDrop={handleCanvasDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
};
