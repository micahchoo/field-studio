/**
 * BoardHeader Organism
 *
 * Header for the board-design feature.
 * Composes: Toolbar, ViewToggle molecules
 *
 * IDEAL OUTCOME: Provides tool selection, undo/redo, and export actions
 * FAILURE PREVENTED: Lost work (no undo), unclear tool state
 */

import React, { useState } from 'react';
import type { IIIFItem } from '@/src/shared/types';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { ViewToggle } from '@/src/shared/ui/molecules/ViewToggle';
import { Toolbar } from '@/src/shared/ui/molecules/Toolbar';
import { IconButton } from '@/src/shared/ui/molecules/IconButton';
import { ActionButton } from '@/src/shared/ui/molecules/ActionButton';
import { ShareButton } from '@/src/features/metadata-edit/ui/atoms/ShareButton';
import type { LayoutArrangement } from '../../model';

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
  /** Save callback */
  onSave?: () => void;
  /** Whether the board has unsaved changes */
  isDirty?: boolean;
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
  /** Whether snap-to-grid is enabled */
  snapEnabled?: boolean;
  /** Toggle snap-to-grid */
  onSnapToggle?: () => void;
  /** Auto-arrange items in a layout */
  onAutoArrange?: (arrangement: LayoutArrangement) => void;
  /** Toggle inspector panel */
  onToggleInspector?: () => void;
  /** Currently selected IIIF resource (for sharing) */
  selectedResource?: IIIFItem | null;
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
  onSave,
  isDirty,
  onExport,
  onDelete,
  hasSelection,
  itemCount,
  connectionCount,
  bgMode = 'grid',
  onBgModeChange,
  onAlign,
  snapEnabled,
  onSnapToggle,
  onAutoArrange,
  onToggleInspector,
  selectedResource,
  cx,
  fieldMode,
}) => {
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  const layoutOptions: { value: LayoutArrangement; icon: string; label: string }[] = [
    { value: 'grid', icon: 'grid_view', label: 'Grid' },
    { value: 'continuous', icon: 'view_day', label: 'Strip' },
    { value: 'paged', icon: 'menu_book', label: 'Book' },
    { value: 'circle', icon: 'radio_button_unchecked', label: 'Circle' },
    { value: 'timeline', icon: 'view_timeline', label: 'Timeline' },
  ];
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
        h-header border-b border-l-4 border-l-mode-accent-border bg-mode-accent-bg-subtle transition-mode px-6 flex items-center justify-between
        ${fieldMode ? 'border-nb-black' : 'border-nb-black/10'}
      `}
    >
      {/* Left: Title + Stats */}
      <div className="flex items-center gap-4">
        <div
          className={`
            p-2 
            ${fieldMode ? 'bg-nb-orange/20 text-nb-orange' : 'bg-nb-orange/20 text-nb-orange'}
          `}
        >
          <Icon name="dashboard" className="text-xl" />
        </div>
        <div>
          <h2 className="font-bold text-mode-accent">
            {title}
          </h2>
          {(itemCount !== undefined || connectionCount !== undefined) && (
            <p className={`text-xs ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/50'}`}>
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
                flex items-center gap-2 px-3 py-2  text-sm font-medium transition-nb
                ${activeTool === tool.value
                  ? fieldMode
                    ? 'bg-nb-orange/20 text-nb-orange ring-1 ring-nb-orange/50'
                    : 'bg-nb-orange/20 text-nb-orange ring-1 ring-nb-orange/30'
                  : fieldMode
                    ? 'text-nb-black/40 hover:bg-nb-black hover:text-nb-black/10'
                    : 'text-nb-black/60 hover:bg-nb-cream hover:text-nb-black'
                }
              `}
              title={`${tool.label} (${tool.shortcut})`}
            >
              <Icon name={tool.icon} className="text-lg" />
              <span className="hidden md:inline">{tool.label}</span>
              <span className={`text-xs opacity-60 hidden lg:inline ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}`}>
                {tool.shortcut}
              </span>
            </Button>
          ))}
        </div>

        {/* Separator */}
        <div className={`w-px h-6 ${fieldMode ? 'bg-nb-black/70' : 'bg-nb-black/10'}`} />

        {/* Background Mode Toggle */}
        {onBgModeChange && (
          <div className={`flex p-0.5 ${fieldMode ? 'bg-nb-black' : 'bg-nb-cream'}`}>
            {bgModeOptions.map((opt) => (
              <Button variant="ghost" size="bare"
                key={opt.value}
                onClick={() => onBgModeChange(opt.value)}
                className={`
                  px-2 py-1 text-xs font-medium transition-nb
                  ${bgMode === opt.value
                    ? fieldMode
                      ? 'bg-nb-black/70 text-nb-black/10'
                      : 'bg-nb-white text-nb-black/70 shadow-brutal-sm'
                    : fieldMode
                      ? 'text-nb-black/50 hover:text-nb-black/20'
                      : 'text-nb-black/50 hover:text-nb-black/70'
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
            <div className={`w-px h-6 ${fieldMode ? 'bg-nb-black/70' : 'bg-nb-black/10'}`} />
            <div className="flex items-center gap-0.5">
              {alignOptions.map((opt) => (
                <Button variant="ghost" size="bare"
                  key={opt.type}
                  onClick={() => onAlign(opt.type)}
                  className={`
                    p-1.5 transition-nb
                    ${fieldMode
                      ? 'text-nb-black/40 hover:bg-nb-black hover:text-nb-black/10'
                      : 'text-nb-black/50 hover:bg-nb-cream hover:text-nb-black/70'
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

        {/* Separator */}
        <div className={`w-px h-6 ${fieldMode ? 'bg-nb-black/70' : 'bg-nb-black/10'}`} />

        {/* Snap-to-Grid Toggle */}
        {onSnapToggle && (
          <Button variant="ghost" size="bare"
            onClick={onSnapToggle}
            className={`
              flex items-center gap-1 px-2 py-1.5  text-xs font-medium transition-nb
              ${snapEnabled
                ? fieldMode
                  ? 'bg-nb-orange/20 text-nb-orange ring-1 ring-nb-orange/50'
                  : 'bg-nb-orange/20 text-nb-orange ring-1 ring-nb-orange/30'
                : fieldMode
                  ? 'text-nb-black/50 hover:bg-nb-black hover:text-nb-black/20'
                  : 'text-nb-black/50 hover:bg-nb-cream hover:text-nb-black/70'
              }
            `}
            title="Snap to Grid (G)"
          >
            <Icon name="grid_on" className="text-sm" />
            <span className="hidden md:inline">Snap</span>
          </Button>
        )}

        {/* Layout Tool */}
        {onAutoArrange && (
          <div className="relative">
            <Button variant="ghost" size="bare"
              onClick={() => setShowLayoutMenu((s) => !s)}
              className={`
                flex items-center gap-1 px-2 py-1.5  text-xs font-medium transition-nb
                ${fieldMode
                  ? 'text-nb-black/40 hover:bg-nb-black hover:text-nb-black/10'
                  : 'text-nb-black/50 hover:bg-nb-cream hover:text-nb-black/70'
                }
              `}
              title="Auto Layout (L)"
            >
              <Icon name="auto_fix_high" className="text-sm" />
              <span className="hidden md:inline">Layout</span>
            </Button>
            {showLayoutMenu && (
              <div className={`absolute top-full left-0 mt-1 z-50 shadow-brutal border py-1 min-w-[140px] ${
                fieldMode ? 'bg-nb-black border-nb-black/70' : 'bg-nb-white border-nb-black/10'
              }`}>
                {layoutOptions.map((opt) => (
                  <Button variant="ghost" size="bare"
                    key={opt.value}
                    onClick={() => {
                      onAutoArrange(opt.value);
                      setShowLayoutMenu(false);
                    }}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-nb
                      ${fieldMode
                        ? 'text-nb-black/20 hover:bg-nb-black/70'
                        : 'text-nb-black/70 hover:bg-nb-cream'
                      }
                    `}
                  >
                    <Icon name={opt.icon} className="text-sm" />
                    {opt.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
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
            <div className={`w-px h-6 ${fieldMode ? 'bg-nb-black/70' : 'bg-nb-black/10'}`} />
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

        <div className={`w-px h-6 ${fieldMode ? 'bg-nb-black/70' : 'bg-nb-black/10'}`} />

        {onSave && (
          <ActionButton
            label={isDirty ? 'Save' : 'Saved'}
            icon="save"
            onClick={onSave}
            variant={isDirty ? 'primary' : 'ghost'}
            size="sm"
            cx={cx}
            fieldMode={fieldMode}
          />
        )}

        <ActionButton
          label="Export"
          icon="download"
          onClick={onExport}
          variant="primary"
          size="sm"
          cx={cx}
          fieldMode={fieldMode}
        />

        {onToggleInspector && (
          <>
            <div className={`w-px h-6 ${fieldMode ? 'bg-nb-black/70' : 'bg-nb-black/10'}`} />
            <IconButton
              icon="info"
              ariaLabel="Toggle Inspector"
              title="Inspector (I)"
              onClick={onToggleInspector}
              variant="ghost"
              cx={cx}
              fieldMode={fieldMode}
            />
          </>
        )}

        {selectedResource && (
          <ShareButton
            item={selectedResource}
            fieldMode={fieldMode}
            size="sm"
          />
        )}
      </Toolbar>
    </div>
  );
};

export default BoardHeader;
