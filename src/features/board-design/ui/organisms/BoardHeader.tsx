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
import { Button, Icon } from '@/src/shared/ui/atoms';
import { ViewToggle } from '@/src/shared/ui/molecules/ViewToggle';
import { Toolbar } from '@/src/shared/ui/molecules/Toolbar';
import { IconButton } from '@/src/shared/ui/molecules/IconButton';
import { ActionButton } from '@/src/shared/ui/molecules/ActionButton';

export type BackgroundMode = 'grid' | 'dark' | 'light';

export interface BoardHeaderProps {
  /** Board title */
  title: string;
  /** Currently active tool */
  activeTool: 'select' | 'connect' | 'note' | 'text';
  /** Called when tool changes */
  onToolChange: (tool: 'select' | 'connect' | 'note' | 'text') => void;
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
  /** Delete callback (optional - shows delete button when provided) */
  onDelete?: () => void;
  /** Whether an item is selected (for delete button state) */
  hasSelection?: boolean;
  /** Number of items on board */
  itemCount?: number;
  /** Number of connections */
  connectionCount?: number;
  /** Background mode for canvas */
  bgMode?: BackgroundMode;
  /** Called when background mode changes */
  onBgModeChange?: (mode: BackgroundMode) => void;
  /** Alignment callbacks (when item selected) */
  onAlign?: (type: 'center' | 'left' | 'top' | 'right' | 'bottom') => void;
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
  onDelete,
  hasSelection,
  itemCount,
  connectionCount,
  bgMode = 'grid',
  onBgModeChange,
  onAlign,
  cx,
  fieldMode,
}) => {
  const toolOptions = [
    { value: 'select', icon: 'mouse', label: 'Select', shortcut: 'V' },
    { value: 'connect', icon: 'timeline', label: 'Connect', shortcut: 'C' },
    { value: 'text', icon: 'title', label: 'Text', shortcut: 'T' },
    { value: 'note', icon: 'sticky_note_2', label: 'Note', shortcut: 'N' },
  ];

  const bgModeOptions: { value: BackgroundMode; label: string }[] = [
    { value: 'grid', label: 'Grid' },
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
  ];

  const alignOptions = [
    { type: 'left' as const, icon: 'align_horizontal_left', label: 'Align Left' },
    { type: 'center' as const, icon: 'align_horizontal_center', label: 'Center Horizontally' },
    { type: 'right' as const, icon: 'align_horizontal_right', label: 'Align Right' },
    { type: 'top' as const, icon: 'align_vertical_top', label: 'Align Top' },
    { type: 'bottom' as const, icon: 'align_vertical_bottom', label: 'Align Bottom' },
  ];

  return (
    <div
      className={`
        h-16 border-b px-4 flex items-center justify-between
        ${fieldMode ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200'}
      `}
    >
      {/* Left: Title + Stats */}
      <div className="flex items-center gap-4">
        <div
          className={`
            p-2 rounded-lg
            ${fieldMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'}
          `}
        >
          <Icon name="dashboard" className="text-xl" />
        </div>
        <div>
          <h2 className={`font-bold ${fieldMode ? 'text-stone-200' : 'text-stone-800'}`}>
            {title}
          </h2>
          {(itemCount !== undefined || connectionCount !== undefined) && (
            <p className={`text-xs ${fieldMode ? 'text-stone-500' : 'text-stone-500'}`}>
              {itemCount !== undefined && `${itemCount} items`}
              {itemCount !== undefined && connectionCount !== undefined && ' · '}
              {connectionCount !== undefined && `${connectionCount} connections`}
            </p>
          )}
        </div>
      </div>

      {/* Center: Tools with shortcuts */}
      <div className="flex items-center gap-3">
        {/* Tool Selection */}
        <div className="flex items-center gap-1">
          {toolOptions.map((tool) => (
            <Button variant="ghost" size="bare"
              key={tool.value}
              onClick={() => onToolChange(tool.value as 'select' | 'connect' | 'note' | 'text')}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTool === tool.value
                  ? fieldMode
                    ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50'
                    : 'bg-amber-100 text-amber-700 ring-1 ring-amber-500/30'
                  : fieldMode
                    ? 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-800'
                }
              `}
              title={`${tool.label} (${tool.shortcut})`}
            >
              <Icon name={tool.icon} className="text-lg" />
              <span className="hidden md:inline">{tool.label}</span>
              <span className={`text-xs opacity-60 hidden lg:inline ${fieldMode ? 'text-stone-500' : 'text-stone-400'}`}>
                {tool.shortcut}
              </span>
            </Button>
          ))}
        </div>

        {/* Separator */}
        <div className={`w-px h-6 ${fieldMode ? 'bg-stone-700' : 'bg-stone-200'}`} />

        {/* Background Mode Toggle */}
        {onBgModeChange && (
          <div className={`flex rounded-lg p-0.5 ${fieldMode ? 'bg-stone-800' : 'bg-stone-100'}`}>
            {bgModeOptions.map((opt) => (
              <Button variant="ghost" size="bare"
                key={opt.value}
                onClick={() => onBgModeChange(opt.value)}
                className={`
                  px-2 py-1 text-xs font-medium rounded transition-all
                  ${bgMode === opt.value
                    ? fieldMode
                      ? 'bg-stone-700 text-stone-200'
                      : 'bg-white text-stone-700 shadow-sm'
                    : fieldMode
                      ? 'text-stone-500 hover:text-stone-300'
                      : 'text-stone-500 hover:text-stone-700'
                  }
                `}
                title={`${opt.label} background`}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        )}

        {/* Alignment Tools (shown when item selected) */}
        {hasSelection && onAlign && (
          <>
            <div className={`w-px h-6 ${fieldMode ? 'bg-stone-700' : 'bg-stone-200'}`} />
            <div className="flex items-center gap-0.5">
              {alignOptions.map((opt) => (
                <Button variant="ghost" size="bare"
                  key={opt.type}
                  onClick={() => onAlign(opt.type)}
                  className={`
                    p-1.5 rounded transition-all
                    ${fieldMode
                      ? 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                      : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
                    }
                  `}
                  title={opt.label}
                >
                  <Icon name={opt.icon} className="text-lg" />
                </Button>
              ))}
            </div>
          </>
        )}
      </div>

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

        {onDelete && (
          <>
            <div className={`w-px h-6 ${fieldMode ? 'bg-stone-700' : 'bg-stone-200'}`} />
            <IconButton
              icon="delete"
              ariaLabel="Delete selected"
              title="Delete (Delete key)"
              onClick={onDelete}
              disabled={!hasSelection}
              variant="ghost"
              cx={cx}
              fieldMode={fieldMode}
            />
          </>
        )}

        <div className={`w-px h-6 ${fieldMode ? 'bg-stone-700' : 'bg-stone-200'}`} />

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
