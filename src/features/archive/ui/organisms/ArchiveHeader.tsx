/**
 * ArchiveHeader Organism
 *
 * Composes: SearchField, ViewToggle, SelectionToolbar molecules
 *
 * Header section for the archive feature, containing filter input, view mode toggle,
 * and selection toolbar when items are selected.
 * This organism is context-agnostic: receives cx and fieldMode via template render props.
 *
 * IDEAL OUTCOME: Header provides filtering, view switching, and selection actions
 * FAILURE PREVENTED: No fieldMode prop drilling, no hardcoded constants
 */

import React from 'react';
import { SearchField } from '@/src/shared/ui/molecules/SearchField';
import { ViewToggle } from '@/src/shared/ui/molecules/ViewToggle';
import { Icon } from '@/src/shared/ui/atoms';
import { Button } from '@/ui/primitives/Button';
import { type ArchiveViewMode, VIEW_MODE_OPTIONS } from '../../model';

export interface ArchiveHeaderProps {
  /** Current search/filter value */
  filter: string;
  /** Called when filter changes (debounced) */
  onFilterChange: (value: string) => void;
  /** Current view mode */
  view: ArchiveViewMode;
  /** Called when view mode changes */
  onViewChange: (view: ArchiveViewMode) => void;
  /** Whether mobile layout is active */
  isMobile: boolean;
  /** Number of selected items */
  selectedCount: number;
  /** Whether selection has GPS metadata */
  selectionHasGPS: boolean;
  /** Callback to clear selection */
  onClearSelection: () => void;
  /** Callback to group selected items into a manifest */
  onGroupIntoManifest: () => void;
  /** Callback to open map view */
  onOpenMap: () => void;
  /** Callback to edit metadata of selected items (sends to Catalog) */
  onEditMetadata: () => void;
  /** Callback to batch edit selected items */
  onBatchEdit: () => void;
  /** Callback to compose selected items on a Board */
  onComposeOnBoard?: () => void;
  /** Contextual styles from template */
  cx: {
    surface: string;
    text: string;
    accent: string;
    border?: string;
    headerBg?: string;
    textMuted?: string;
  };
  /** Current field mode */
  fieldMode: boolean;
  /** Whether viewer panel is visible (for split view) */
  showViewerPanel?: boolean;
  /** Whether inspector panel is visible */
  showInspectorPanel?: boolean;
  /** Toggle viewer panel visibility */
  onToggleViewerPanel?: () => void;
  /** Toggle inspector panel visibility */
  onToggleInspectorPanel?: () => void;
  /** Whether a canvas is currently selected */
  hasCanvasSelected?: boolean;
}

/**
 * ArchiveHeader Organism
 *
 * @example
 * <ArchiveHeader
 *   filter={filter}
 *   onFilterChange={setFilter}
 *   view={view}
 *   onViewChange={setView}
 *   isMobile={isMobile}
 *   selectedCount={selectedIds.size}
 *   selectionHasGPS={selectionDNA.hasGPS}
 *   onClearSelection={clearSelection}
 *   onGroupIntoManifest={handleCreateManifestFromSelection}
 *   onOpenMap={() => setView('map')}
 *   onEditMetadata={() => onCatalogSelection?.(Array.from(selectedIds))}
 *   onBatchEdit={() => onBatchEdit(Array.from(selectedIds))}
 *   cx={cx}
 *   fieldMode={fieldMode}
 * />
 */
export const ArchiveHeader: React.FC<ArchiveHeaderProps> = ({
  filter,
  onFilterChange,
  view,
  onViewChange,
  isMobile,
  selectedCount,
  selectionHasGPS,
  onClearSelection,
  onGroupIntoManifest,
  onOpenMap,
  onEditMetadata,
  onBatchEdit,
  onComposeOnBoard,
  cx,
  fieldMode,
  showViewerPanel = true,
  showInspectorPanel = false,
  onToggleViewerPanel,
  onToggleInspectorPanel,
  hasCanvasSelected = false,
}) => {
  const hasSelection = selectedCount > 0;
  // Show reorder mode indicator when viewer is closed but canvas is selected
  const showReorderMode = hasCanvasSelected && !showViewerPanel;

  // Desktop selection toolbar actions - Pipeline flow
  // Use explicit color classes (not dynamic) so Tailwind includes them
  const selectionActions = [
    {
      label: 'Group into Manifest',
      icon: 'auto_stories' as const,
      iconClass: fieldMode ? 'text-nb-yellow' : 'text-nb-green',
      onClick: onGroupIntoManifest,
    },
    ...(selectionHasGPS
      ? [
          {
            label: 'View on Map',
            icon: 'explore' as const,
            iconClass: fieldMode ? 'text-nb-yellow' : 'text-nb-blue',
            onClick: onOpenMap,
          },
        ]
      : []),
    {
      label: 'Edit in Catalog',
      icon: 'table_chart' as const,
      iconClass: fieldMode ? 'text-nb-yellow' : 'text-nb-orange',
      onClick: onEditMetadata,
    },
    {
      label: 'Compose on Board',
      icon: 'dashboard' as const,
      iconClass: fieldMode ? 'text-nb-yellow' : 'text-nb-pink',
      onClick: onComposeOnBoard,
    },
  ];

  // Mobile floating bar actions (simplified)
  const mobileActions = [
    {
      label: 'Group',
      icon: 'auto_stories' as const,
      iconClass: fieldMode ? 'text-nb-yellow' : 'text-nb-green',
      onClick: onGroupIntoManifest,
    },
    ...(selectionHasGPS
      ? [
          {
            label: 'Map',
            icon: 'explore' as const,
            iconClass: fieldMode ? 'text-nb-yellow' : 'text-nb-blue',
            onClick: onOpenMap,
          },
        ]
      : []),
    {
      label: 'Catalog',
      icon: 'table_chart' as const,
      iconClass: fieldMode ? 'text-nb-yellow' : 'text-nb-orange',
      onClick: onEditMetadata,
    },
    {
      label: 'Board',
      icon: 'dashboard' as const,
      iconClass: fieldMode ? 'text-nb-yellow' : 'text-nb-pink',
      onClick: onComposeOnBoard,
    },
  ];

  // Selection bar colors based on field mode
  const selectionBarBg = fieldMode ? 'bg-nb-yellow/20' : 'bg-nb-black';
  const selectionBarBorder = fieldMode ? 'border-nb-yellow' : 'border-nb-black/80';
  const selectionTextColor = fieldMode ? 'text-nb-yellow/40' : 'text-white';

  return (
    <>
      {/* Main header */}
      <div className={`h-header border-b border-l-4 border-l-mode-accent-border bg-mode-accent-bg-subtle transition-mode px-6 flex items-center justify-between shadow-brutal-sm z-10 shrink-0 ${cx.border || 'border-nb-black/20'}`}>
        <div className="flex items-center gap-4">
          <h2 className="text-nb-lg font-bold text-mode-accent">Archive</h2>
          {!isMobile && !hasSelection && !showReorderMode && (
            <>
              <div className={`h-4 w-px ${fieldMode ? 'bg-nb-yellow' : 'bg-nb-black/40'}`} />
              <div className={`flex items-center gap-2 text-nb-caption font-bold uppercase tracking-wider font-mono ${cx.textMuted || 'text-nb-black/40'}`}>
                Select items to begin synthesis pipeline
              </div>
            </>
          )}
          {/* Reorder mode indicator - shown when viewer is closed but item selected */}
          {!isMobile && showReorderMode && (
            <>
              <div className={`h-4 w-px ${fieldMode ? 'bg-nb-yellow' : 'bg-nb-black/40'}`} />
              <span className={`text-xs font-medium ${fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40'}`}>
                Viewer closed — reorder enabled
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isMobile && (
            <SearchField
              value={filter}
              onChange={onFilterChange}
              placeholder="Filter archive..."
              width="w-64"
              showClear={true}
              cx={cx}
              fieldMode={fieldMode}
            />
          )}
          <ViewToggle
            value={view}
            onChange={onViewChange}
            options={VIEW_MODE_OPTIONS}
            ariaLabel="Archive view mode toggle"
            cx={cx}
            fieldMode={fieldMode}
          />
          {/* Viewer panel controls - shown when canvas selected */}
          {hasCanvasSelected && onToggleInspectorPanel && onToggleViewerPanel && (
            <>
              <div className={`h-6 w-px ${fieldMode ? 'bg-nb-yellow' : 'bg-nb-black/60'}`} />
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="bare"
                  onClick={onToggleInspectorPanel}
                  className={`p-1.5 transition-nb ${
                    showInspectorPanel
                      ? fieldMode ? 'bg-nb-yellow/30 text-nb-yellow' : 'bg-nb-blue/30 text-nb-blue'
                      : fieldMode ? 'text-nb-yellow hover:bg-nb-yellow/20' : 'text-nb-black/40 hover:bg-nb-black/80'
                  }`}
                  title={showInspectorPanel ? 'Hide Inspector' : 'Show Inspector'}
                >
                  <Icon name="info" className="text-lg" />
                </Button>
                <Button variant="ghost" size="bare"
                  onClick={onToggleViewerPanel}
                  className={`p-1.5 transition-nb ${
                    showViewerPanel
                      ? fieldMode ? 'bg-nb-yellow/30 text-nb-yellow' : 'bg-nb-blue/30 text-nb-blue'
                      : fieldMode ? 'text-nb-yellow hover:bg-nb-yellow/20' : 'text-nb-black/40 hover:bg-nb-black/80'
                  }`}
                  title={showViewerPanel ? 'Close Viewer' : 'Open Viewer'}
                >
                  <Icon name={showViewerPanel ? 'visibility' : 'visibility_off'} className="text-lg" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Desktop selection bar */}
      {!isMobile && hasSelection && (
        <div className={`w-full px-6 py-2 ${selectionBarBg} border-b ${selectionBarBorder} ${selectionTextColor} z-10 animate-in slide-in-from-top-2 flex items-center gap-4`}>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-bold ${selectionTextColor}`}>{selectedCount} selected</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {selectionActions.map((action) => (
              <Button
                key={action.label}
                onClick={action.onClick}
                variant="ghost"
                size="sm"
                icon={<Icon name={action.icon} className={`${action.iconClass} text-sm`} />}
                className={selectionTextColor}
              >
                {action.label}
              </Button>
            ))}
          </div>
          <div className="flex-1" />
          <Button
            onClick={onClearSelection}
            variant="ghost"
            size="sm"
            icon={<Icon name="close" className={`text-sm ${selectionTextColor}`} />}
            title="Clear selection"
            aria-label="Clear selection"
          />
        </div>
      )}

      {/* Mobile floating selection bar */}
      {isMobile && hasSelection && (
        <div className="absolute z-[100] animate-in slide-in-from-bottom-4 bottom-8 left-4 right-4 translate-x-0">
          <div className={`${fieldMode ? 'bg-nb-black/95 border-nb-yellow' : 'bg-nb-black/95 border-nb-black/80'} backdrop-blur-md border shadow-brutal-lg  p-1 flex items-center gap-1 ring-4 ring-black/10 overflow-x-auto no-scrollbar max-w-full`}>
            <div className="flex p-1 gap-1 shrink-0">
              {mobileActions.map((action) => (
                <Button
                  key={action.label}
                  onClick={action.onClick}
                  variant="ghost"
                  size="sm"
                  icon={<Icon name={action.icon} className={action.iconClass} />}
                  className={selectionTextColor}
                >
                  {action.label}
                </Button>
              ))}
              <div className={`w-px h-8 ${fieldMode ? 'bg-nb-yellow' : 'bg-nb-black/80'} mx-1`} />
              <Button
                onClick={onClearSelection}
                variant="ghost"
                size="sm"
                icon={<Icon name="close" className={selectionTextColor} />}
                aria-label="Clear selection"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ArchiveHeader;