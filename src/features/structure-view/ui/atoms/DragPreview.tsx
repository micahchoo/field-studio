/**
 * Drag Preview Atom
 *
 * Custom drag preview showing the node label and type icon.
 * Used for visual feedback during drag operations.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Pure presentational component
 * - No state or logic
 * - Props-only API
 *
 * @module features/structure-view/ui/atoms/DragPreview
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';

export interface DragPreviewProps {
  /** Label to display */
  label: string;
  /** Type of the node being dragged */
  type: string;
  /** Number of items being dragged (for multi-select) */
  count?: number;
  /** Additional className */
  className?: string;
}

/**
 * Get icon name based on node type
 */
function getTypeIcon(type: string): string {
  switch (type) {
    case 'Collection':
      return 'folder';
    case 'Manifest':
      return 'description';
    case 'Canvas':
      return 'image';
    case 'Range':
      return 'format_list_bulleted';
    case 'AnnotationPage':
      return 'note';
    case 'Annotation':
      return 'push_pin';
    default:
      return 'label';
  }
}

/**
 * Get color class based on node type
 */
function getTypeColor(type: string): string {
  switch (type) {
    case 'Collection':
      return 'text-blue-500';
    case 'Manifest':
      return 'text-green-500';
    case 'Canvas':
      return 'text-purple-500';
    case 'Range':
      return 'text-orange-500';
    default:
      return 'text-slate-500';
  }
}

/**
 * Drag Preview Atom
 *
 * @example
 * <DragPreview label="My Manifest" type="Manifest" />
 */
export const DragPreview: React.FC<DragPreviewProps> = ({
  label,
  type,
  count = 1,
  className = '',
}) => {
  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2 
        bg-white dark:bg-slate-800 
        border border-slate-200 dark:border-slate-700 
        rounded-lg shadow-lg
        min-w-[200px]
        ${className}
      `}
    >
      <Icon
        name={getTypeIcon(type)}
        className={`text-lg ${getTypeColor(type)}`}
      />
      <span className="flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
      {count > 1 && (
        <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
};

DragPreview.displayName = 'DragPreview';

export default DragPreview;
