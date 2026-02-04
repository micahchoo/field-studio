
import React, { useEffect, useState } from 'react';
import { Icon } from '../Icon';

interface CanvasItemProps {
  file: File;
  index: number;
  isSelected: boolean;
  isDragTarget: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}

export const CanvasItem: React.FC<CanvasItemProps> = ({
  file,
  index,
  isSelected,
  isDragTarget,
  onSelect,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop
}) => {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  // Generate thumbnail for image files
  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setThumbnail(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const getFileIcon = (): string => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'movie';
    if (file.type.startsWith('audio/')) return 'audio_file';
    return 'description';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      draggable
      onClick={onSelect}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index)}
      className={`
        group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all
        ${isSelected
          ? 'bg-blue-100 border-2 border-blue-400 shadow-sm'
          : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm'
        }
        ${isDragTarget ? 'border-blue-500 border-dashed bg-blue-50' : ''}
      `}
    >
      {/* Drag handle */}
      <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
        <Icon name="drag_indicator" className="text-lg" />
      </div>

      {/* Index badge */}
      <span className="flex-shrink-0 w-6 h-6 bg-slate-100 rounded text-[10px] font-bold text-slate-500 flex items-center justify-center">
        {index + 1}
      </span>

      {/* Thumbnail or icon */}
      <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon name={getFileIcon()} className="text-xl text-slate-400" />
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700 truncate" title={file.name}>
          {file.name}
        </div>
        <div className="text-[10px] text-slate-400">
          {formatFileSize(file.size)}
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="flex-shrink-0">
          <Icon name="check_circle" className="text-blue-500 text-lg" />
        </div>
      )}
    </div>
  );
};
