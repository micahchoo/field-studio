/**
 * BoardHeader Organism
 *
 * Header for the board-design feature.
 * Composes: ViewHeader, Toolbar, ViewToggle molecules
 *
 * IDEAL OUTCOME: Provides tool selection, undo/redo, export dropdown, and present mode
 * FAILURE PREVENTED: Lost work (no undo), unclear tool state
 */

import React, { useState } from 'react';
import type { IIIFItem } from '@/src/shared/types';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { Toolbar } from '@/src/shared/ui/molecules/Toolbar';
import { IconButton } from '@/src/shared/ui/molecules/IconButton';
import { ActionButton } from '@/src/shared/ui/molecules/ActionButton';
import {
  ViewHeader,
  ViewHeaderTitle,
  ViewHeaderCenter,
  ViewHeaderActions,
  ViewHeaderSubBar,
  ViewHeaderDivider,
} from '@/src/shared/ui/molecules/ViewHeader';
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
  /** Export as IIIF Manifest callback */
  onExport: () => void;
  /** Export as PNG callback */
  onExportPNG?: () => void;
  /** Export as SVG callback */
  onExportSVG?: () => void;
  /** Copy Content State link callback */
  onCopyContentState?: () => void;
  /** Enter presentation mode */
  onPresent?: () => void;
  /** Delete callback (optional - shows delete button when provided) */
  onDelete?: () => void;
  /** Whether an item is selected (for delete button state) */
  hasSelection?: boolean;
  /** Number of selected items (for multi-select) */
  selectionCount?: number;
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
  onExportPNG,
  onExportSVG,
  onCopyContentState,
  onPresent,
  onDelete,
  hasSelection,
  selectionCount,
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
  const [showExportMenu, setShowExportMenu] = useState(false);

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

  const exportOptions = [
    { id: 'iiif', icon: 'data_object', label: 'IIIF Manifest', onClick: onExport },
    ...(onExportPNG ? [{ id: 'png', icon: 'image', label: 'Export as PNG', onClick: onExportPNG }] : []),
    ...(onExportSVG ? [{ id: 'svg', icon: 'draw', label: 'Export as SVG', onClick: onExportSVG }] : []),
    ...(onCopyContentState ? [{ id: 'content-state', icon: 'link', label: 'Copy Content State', onClick: onCopyContentState }] : []),
  ];

  const dividerCls = `w-px h-5 ${fieldMode ? 'bg-nb-yellow/30' : 'bg-nb-black/15'}`;

  return (
    <ViewHeader cx={cx} fieldMode={fieldMode} zIndex="">
      {/* Header: Title + Stats */}
      <ViewHeaderTitle icon="dashboard" title={title}>
        {itemCount !== undefined && (
          <>
            <div className={dividerCls} />
            <span className={`text-[10px] font-bold uppercase font-mono ${fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40'}`}>
              {itemCount} items
              {connectionCount !== undefined && ` · ${connectionCount} connections`}
              {selectionCount != null && selectionCount > 1 && ` · ${selectionCount} selected`}
            </span>
          </>
        )}
      </ViewHeaderTitle>

      <ViewHeaderActions>
        {onToggleInspector && (
          <IconButton icon="info" ariaLabel="Toggle Inspector" title="Inspector (I)" onClick={onToggleInspector} variant="ghost" cx={cx} fieldMode={fieldMode} />
        )}
        {selectedResource && <ShareButton item={selectedResource} fieldMode={fieldMode} size="sm" />}
      </ViewHeaderActions>

      {/* Sub-header: All tools */}
      <ViewHeaderSubBar visible={true}>
        {/* Tool Selection */}
        <div className="flex items-center gap-1">
          {toolOptions.map((tool) => (
            <Button variant="ghost" size="bare"
              key={tool.value}
              onClick={() => onToolChange(tool.value as 'select' | 'connect' | 'note' | 'text')}
              className={`
                flex items-center gap-1.5 px-2 py-1 text-xs font-medium transition-nb
                ${activeTool === tool.value
                  ? fieldMode
                    ? 'bg-nb-orange/20 text-nb-orange ring-1 ring-nb-orange/50'
                    : 'bg-nb-orange/20 text-nb-orange ring-1 ring-nb-orange/30'
                  : fieldMode
                    ? 'text-nb-yellow/60 hover:text-nb-yellow'
                    : 'text-nb-black/60 hover:bg-nb-cream hover:text-nb-black'
                }
              `}
              title={`${tool.label} (${tool.shortcut})`}
            >
              <Icon name={tool.icon} className="text-base" />
              <span className="hidden md:inline">{tool.label}</span>
            </Button>
          ))}
        </div>

        <ViewHeaderDivider className={dividerCls} />

        {/* Background Mode Toggle */}
        {onBgModeChange && (
          <div className={`flex p-0.5 ${fieldMode ? 'bg-nb-black' : 'bg-nb-cream'}`}>
            {bgModeOptions.map((opt) => (
              <Button variant="ghost" size="bare"
                key={opt.value}
                onClick={() => onBgModeChange(opt.value)}
                className={`
                  px-2 py-0.5 text-[10px] font-medium transition-nb
                  ${bgMode === opt.value
                    ? fieldMode ? 'bg-nb-yellow/20 text-nb-yellow' : 'bg-nb-white text-nb-black shadow-brutal-sm'
                    : fieldMode ? 'text-nb-yellow/40 hover:text-nb-yellow/70' : 'text-nb-black/50 hover:text-nb-black/70'
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
            <ViewHeaderDivider className={dividerCls} />
            <div className="flex items-center gap-0.5">
              {alignOptions.map((opt) => (
                <Button variant="ghost" size="bare"
                  key={opt.type}
                  onClick={() => onAlign(opt.type)}
                  className={`p-1 transition-nb ${fieldMode ? 'text-nb-yellow/40 hover:text-nb-yellow' : 'text-nb-black/50 hover:text-nb-black/70'}`}
                  title={opt.label}
                >
                  <Icon name={opt.icon} className="text-base" />
                </Button>
              ))}
            </div>
          </>
        )}

        <ViewHeaderDivider className={dividerCls} />

        {/* Snap-to-Grid Toggle */}
        {onSnapToggle && (
          <Button variant="ghost" size="bare"
            onClick={onSnapToggle}
            className={`
              flex items-center gap-1 px-2 py-1 text-xs font-medium transition-nb
              ${snapEnabled
                ? fieldMode ? 'bg-nb-orange/20 text-nb-orange' : 'bg-nb-orange/20 text-nb-orange'
                : fieldMode ? 'text-nb-yellow/40 hover:text-nb-yellow' : 'text-nb-black/50 hover:text-nb-black/70'
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
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium transition-nb ${fieldMode ? 'text-nb-yellow/40 hover:text-nb-yellow' : 'text-nb-black/50 hover:text-nb-black/70'}`}
              title="Auto Layout (L)"
            >
              <Icon name="auto_fix_high" className="text-sm" />
              <span className="hidden md:inline">Layout</span>
            </Button>
            {showLayoutMenu && (
              <div className={`absolute top-full left-0 mt-1 z-50 shadow-brutal border py-1 min-w-[140px] ${
                fieldMode ? 'bg-nb-black border-nb-yellow/30' : 'bg-nb-white border-nb-black/10'
              }`}>
                {layoutOptions.map((opt) => (
                  <Button variant="ghost" size="bare"
                    key={opt.value}
                    onClick={() => { onAutoArrange(opt.value); setShowLayoutMenu(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-nb ${
                      fieldMode ? 'text-nb-yellow/70 hover:bg-nb-yellow/10' : 'text-nb-black/70 hover:bg-nb-cream'
                    }`}
                  >
                    <Icon name={opt.icon} className="text-sm" />
                    {opt.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Right side actions */}
        <Toolbar>
          <IconButton icon="undo" ariaLabel="Undo" title="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo} variant="ghost" cx={cx} fieldMode={fieldMode} />
          <IconButton icon="redo" ariaLabel="Redo" title="Redo (Ctrl+Shift+Z)" onClick={onRedo} disabled={!canRedo} variant="ghost" cx={cx} fieldMode={fieldMode} />

          {onDelete && (
            <>
              <ViewHeaderDivider className={dividerCls} />
              <IconButton icon="delete" ariaLabel="Delete selected" title="Delete (Delete key)" onClick={onDelete} disabled={!hasSelection} variant="ghost" cx={cx} fieldMode={fieldMode} />
            </>
          )}

          <ViewHeaderDivider className={dividerCls} />

          {onSave && (
            <ActionButton label={isDirty ? 'Save' : 'Saved'} icon="save" onClick={onSave} variant={isDirty ? 'primary' : 'ghost'} size="sm" cx={cx} fieldMode={fieldMode} />
          )}

          {onPresent && (
            <IconButton icon="slideshow" ariaLabel="Present" title="Present (P)" onClick={onPresent} variant="ghost" cx={cx} fieldMode={fieldMode} />
          )}

          {/* Export dropdown */}
          <div className="relative">
            <ActionButton
              label="Export"
              icon="download"
              onClick={() => {
                if (exportOptions.length <= 1) { onExport(); }
                else { setShowExportMenu(s => !s); }
              }}
              variant="primary"
              size="sm"
              cx={cx}
              fieldMode={fieldMode}
            />
            {showExportMenu && exportOptions.length > 1 && (
              <div className={`absolute top-full right-0 mt-1 z-50 shadow-brutal border py-1 min-w-[180px] ${
                fieldMode ? 'bg-nb-black border-nb-yellow/30' : 'bg-nb-white border-nb-black/10'
              }`}>
                {exportOptions.map((opt) => (
                  <Button variant="ghost" size="bare"
                    key={opt.id}
                    onClick={() => { opt.onClick(); setShowExportMenu(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-nb ${
                      fieldMode ? 'text-nb-yellow/70 hover:bg-nb-yellow/10' : 'text-nb-black/70 hover:bg-nb-cream'
                    }`}
                  >
                    <Icon name={opt.icon} className="text-sm" />
                    {opt.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </Toolbar>
      </ViewHeaderSubBar>
    </ViewHeader>
  );
};

export default BoardHeader;
