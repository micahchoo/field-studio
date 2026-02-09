/**
 * ArchiveHeader Organism
 *
 * Composes: ViewHeader, SearchField, ViewToggle, SelectionBar molecules
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
import {
  ViewHeader,
  ViewHeaderTitle,
  ViewHeaderActions,
  ViewHeaderDivider,
  ViewHeaderSelectionBar,
} from '@/src/shared/ui/molecules/ViewHeader';
import { Icon } from '@/src/shared/ui/atoms';
import { Button } from '@/ui/primitives/Button';
import { type ArchiveViewMode, type SortDirection, type SortMode, SORT_OPTIONS, VIEW_MODE_OPTIONS } from '../../model';

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
  /** Current sort field */
  sortBy?: SortMode;
  /** Current sort direction */
  sortDirection?: SortDirection;
  /** Called when sort field changes */
  onSortChange?: (sort: SortMode) => void;
  /** Called when sort direction changes */
  onSortDirectionChange?: (dir: SortDirection) => void;
  /** Whether group-by-manifest is active */
  groupByManifest?: boolean;
  /** Toggle group-by-manifest */
  onToggleGroupByManifest?: () => void;
}

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
  sortBy = 'name',
  sortDirection = 'asc',
  onSortChange,
  onSortDirectionChange,
  groupByManifest = false,
  onToggleGroupByManifest,
}) => {
  const hasSelection = selectedCount > 0;
  const showReorderMode = hasCanvasSelected && !showViewerPanel;

  // Use explicit color classes (not dynamic) so Tailwind includes them
  const selectionActions = [
    {
      label: isMobile ? 'Group' : 'Group into Manifest',
      icon: 'auto_stories' as const,
      iconClass: fieldMode ? 'text-nb-yellow' : 'text-nb-green',
      onClick: onGroupIntoManifest,
    },
    ...(selectionHasGPS
      ? [{
          label: isMobile ? 'Map' : 'View on Map',
          icon: 'explore' as const,
          iconClass: fieldMode ? 'text-nb-yellow' : 'text-nb-blue',
          onClick: onOpenMap,
        }]
      : []),
    {
      label: isMobile ? 'Catalog' : 'Edit in Catalog',
      icon: 'table_chart' as const,
      iconClass: fieldMode ? 'text-nb-yellow' : 'text-nb-orange',
      onClick: onEditMetadata,
    },
    {
      label: isMobile ? 'Board' : 'Compose on Board',
      icon: 'dashboard' as const,
      iconClass: fieldMode ? 'text-nb-yellow' : 'text-nb-pink',
      onClick: onComposeOnBoard,
    },
  ];

  const selectionTextColor = fieldMode ? 'text-nb-yellow/40' : 'text-white';

  return (
    <>
      <ViewHeader cx={cx} fieldMode={fieldMode}>
        <ViewHeaderTitle title="Archive">
          {!isMobile && !hasSelection && !showReorderMode && (
            <>
              <ViewHeaderDivider />
              <div className={`flex items-center gap-2 text-nb-caption font-bold uppercase tracking-wider font-mono ${cx.textMuted || 'text-nb-black/40'}`}>
                Select items to begin synthesis pipeline
              </div>
            </>
          )}
          {!isMobile && showReorderMode && (
            <>
              <ViewHeaderDivider />
              <span className={`text-xs font-medium ${fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40'}`}>
                Viewer closed — reorder enabled
              </span>
            </>
          )}
        </ViewHeaderTitle>

        <ViewHeaderActions>
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
          {!isMobile && (
            <div className="flex items-center gap-1">
              {SORT_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant="ghost"
                  size="bare"
                  onClick={() => {
                    if (sortBy === opt.value) {
                      onSortDirectionChange?.(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      onSortChange?.(opt.value);
                      onSortDirectionChange?.('asc');
                    }
                  }}
                  className={`px-2 py-1 text-xs font-medium flex items-center gap-0.5 transition-nb ${
                    sortBy === opt.value
                      ? fieldMode ? 'bg-nb-yellow/30 text-nb-yellow' : 'bg-nb-blue/20 text-nb-blue'
                      : fieldMode ? 'text-nb-yellow/60 hover:text-nb-yellow' : 'text-nb-black/40 hover:text-nb-black/70'
                  }`}
                  title={`Sort by ${opt.label}`}
                >
                  {opt.label}
                  {sortBy === opt.value && (
                    <Icon
                      name={sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      className="text-xs"
                    />
                  )}
                </Button>
              ))}
              {onToggleGroupByManifest && (
                <Button
                  variant="ghost"
                  size="bare"
                  onClick={onToggleGroupByManifest}
                  className={`px-2 py-1 text-xs font-medium flex items-center gap-0.5 transition-nb ${
                    groupByManifest
                      ? fieldMode ? 'bg-nb-yellow/30 text-nb-yellow' : 'bg-nb-blue/20 text-nb-blue'
                      : fieldMode ? 'text-nb-yellow/60 hover:text-nb-yellow' : 'text-nb-black/40 hover:text-nb-black/70'
                  }`}
                  title={groupByManifest ? 'Ungroup' : 'Group by Manifest'}
                >
                  <Icon name="auto_stories" className="text-sm" />
                </Button>
              )}
            </div>
          )}
          <ViewToggle
            value={view}
            onChange={onViewChange}
            options={VIEW_MODE_OPTIONS}
            ariaLabel="Archive view mode toggle"
            cx={cx}
            fieldMode={fieldMode}
          />
          {hasCanvasSelected && onToggleInspectorPanel && onToggleViewerPanel && (
            <>
              <ViewHeaderDivider className={`h-6 w-px ${fieldMode ? 'bg-nb-yellow' : 'bg-nb-black/60'}`} />
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
        </ViewHeaderActions>
      </ViewHeader>

      <ViewHeaderSelectionBar
        count={selectedCount}
        onClear={onClearSelection}
        fieldMode={fieldMode}
        isMobile={isMobile}
      >
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
      </ViewHeaderSelectionBar>
    </>
  );
};

export default ArchiveHeader;
