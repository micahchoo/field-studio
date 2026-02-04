/**
 * BoardHeader Organism
 *
 * Header for the board-design feature.
 * Composes: Toolbar, ViewToggle molecules
 *
 * IDEAL OUTCOME: Provides tool selection, undo/redo, and export actions
 * FAILURE PREVENTED: Lost work (no undo), unclear tool state
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { ViewToggle } from '@/src/shared/ui/molecules/ViewToggle';
import { Toolbar } from '@/src/shared/ui/molecules/Toolbar';
import { IconButton } from '@/src/shared/ui/molecules/IconButton';
import { ActionButton } from '@/src/shared/ui/molecules/ActionButton';

export interface BoardHeaderProps {
  /** Board title */
  title: string;
  /** Currently active tool */
  activeTool: 'select' | 'connect' | 'note';
  /** Called when tool changes */
  onToolChange: (tool: 'select' | 'connect' | 'note') => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Undo callback */
  onUndo: () => void;
  /** Redo callback */
  onRedo: () => void;
  /** Export callback */
  onExport: () => void;
  /** Number of items on board */
  itemCount?: number;
  /** Number of connections */
  connectionCount?: number;
  /** Contextual styles from template */
  cx: {
    surface: string;
    text: string;
    accent: string;
  };
  /** Current field mode */
  fieldMode: boolean;
}

/**
 * BoardHeader Organism
 */
export const BoardHeader: React.FC<BoardHeaderProps> = ({
  title,
  activeTool,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExport,
  itemCount,
  connectionCount,
  cx,
  fieldMode,
}) => {
  const toolOptions = [
    { value: 'select', icon: 'mouse', label: 'Select' },
    { value: 'connect', icon: 'timeline', label: 'Connect' },
    { value: 'note', icon: 'sticky_note_2', label: 'Note' },
  ];

  return (
    <div
      className={`
        h-16 border-b px-4 flex items-center justify-between
        ${fieldMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}
      `}
    >
      {/* Left: Title + Stats */}
      <div className="flex items-center gap-4">
        <div
          className={`
            p-2 rounded-lg
            ${fieldMode ? 'bg-yellow-400/20 text-yellow-400' : 'bg-iiif-blue/10 text-iiif-blue'}
          `}
        >
          <Icon name="dashboard" className="text-xl" />
        </div>
        <div>
          <h2 className={`font-bold ${fieldMode ? 'text-yellow-400' : 'text-slate-800'}`}>
            {title}
          </h2>
          {(itemCount !== undefined || connectionCount !== undefined) && (
            <p className={`text-xs ${fieldMode ? 'text-slate-500' : 'text-slate-500'}`}>
              {itemCount !== undefined && `${itemCount} items`}
              {itemCount !== undefined && connectionCount !== undefined && ' · '}
              {connectionCount !== undefined && `${connectionCount} connections`}
            </p>
          )}
        </div>
      </div>

      {/* Center: Tool Selection */}
      <ViewToggle
        value={activeTool}
        onChange={(value) => onToolChange(value as 'select' | 'connect' | 'note')}
        options={toolOptions}
        ariaLabel="Board tools"
        cx={cx}
        fieldMode={fieldMode}
      />

      {/* Right: Actions */}
      <Toolbar>
        <IconButton
          icon="undo"
          ariaLabel="Undo"
          title="Undo (Ctrl+Z)"
          onClick={onUndo}
          disabled={!canUndo}
          variant="ghost"
          cx={cx}
          fieldMode={fieldMode}
        />
        <IconButton
          icon="redo"
          ariaLabel="Redo"
          title="Redo (Ctrl+Shift+Z)"
          onClick={onRedo}
          disabled={!canRedo}
          variant="ghost"
          cx={cx}
          fieldMode={fieldMode}
        />

        <div className={`w-px h-6 ${fieldMode ? 'bg-slate-700' : 'bg-slate-200'}`} />

        <ActionButton
          label="Export"
          icon="download"
          onClick={onExport}
          variant="primary"
          size="sm"
          cx={cx}
          fieldMode={fieldMode}
        />
      </Toolbar>
    </div>
  );
};

export default BoardHeader;
