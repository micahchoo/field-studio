/**
 * Structure Toolbar Molecule
 *
 * Toolbar with actions for the structure view.
 * Expand/collapse all, selection info, view options.
 */

import React from 'react';

interface StructureToolbarProps {
  totalNodes: number;
  selectedCount: number;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onClearSelection: () => void;
  className?: string;
}

export const StructureToolbar: React.FC<StructureToolbarProps> = ({
  totalNodes,
  selectedCount,
  onExpandAll,
  onCollapseAll,
  onClearSelection,
  className = '',
}) => {
  return (
    <div
      className={`
        flex items-center justify-between px-3 py-2
        border-b border-slate-200 dark:border-slate-700
        bg-slate-50 dark:bg-slate-900
        ${className}
      `}
    >
      {/* Left: Tree controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onExpandAll}
          className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
          title="Expand all nodes"
        >
          Expand All
        </button>
        <button
          type="button"
          onClick={onCollapseAll}
          className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
          title="Collapse all nodes"
        >
          Collapse All
        </button>
      </div>

      {/* Right: Selection info */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {totalNodes} items
        </span>
        {selectedCount > 0 && (
          <>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {selectedCount} selected
            </span>
            <button
              type="button"
              onClick={onClearSelection}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  );
};

StructureToolbar.displayName = 'StructureToolbar';
