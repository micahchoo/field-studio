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
  onComposeOnBoard: () => void;
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
}) => {
  const hasSelection = selectedCount > 0;

  // Desktop selection toolbar actions - Pipeline flow
  const selectionActions = [
    {
      label: 'Group into Manifest',
      icon: 'auto_stories' as const,
      color: 'green' as const,
      onClick: onGroupIntoManifest,
    },
    ...(selectionHasGPS
      ? [
          {
            label: 'View on Map',
            icon: 'explore' as const,
            color: 'blue' as const,
            onClick: onOpenMap,
          },
        ]
      : []),
    {
      label: 'Edit in Catalog',
      icon: 'table_chart' as const,
      color: 'amber' as const,
      onClick: onEditMetadata,
    },
    {
      label: 'Compose on Board',
      icon: 'dashboard' as const,
      color: 'pink' as const,
      onClick: onComposeOnBoard,
    },
  ];

  // Mobile floating bar actions (simplified)
  const mobileActions = [
    {
      label: 'Group',
      icon: 'auto_stories' as const,
      color: 'green' as const,
      onClick: onGroupIntoManifest,
    },
    ...(selectionHasGPS
      ? [
          {
            label: 'Map',
            icon: 'explore' as const,
            color: 'blue' as const,
            onClick: onOpenMap,
          },
        ]
      : []),
    {
      label: 'Catalog',
      icon: 'table_chart' as const,
      color: 'amber' as const,
      onClick: onEditMetadata,
    },
    {
      label: 'Board',
      icon: 'dashboard' as const,
      color: 'pink' as const,
      onClick: onComposeOnBoard,
    },
  ];

  return (
    <>
      {/* Main header */}
      <div className={`h-16 border-b px-6 flex items-center justify-between shadow-sm z-10 shrink-0 ${cx.surface}`}>
        <div className="flex items-center gap-4">
          <h2 className={`font-bold ${cx.headingSize} ${cx.accent}`}>Archive</h2>
          {!isMobile && !hasSelection && (
            <>
              <div className="h-4 w-px bg-slate-500" />
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                Select items to begin synthesis pipeline
              </div>
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
        </div>
      </div>

      {/* Desktop selection bar */}
      {!isMobile && hasSelection && (
        <div className="w-full px-6 py-2 bg-slate-800 border-b border-slate-700 z-10 animate-in slide-in-from-top-2 flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-white">{selectedCount} selected</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {selectionActions.map((action) => (
              <Button
                key={action.label}
                onClick={action.onClick}
                variant="ghost"
                size="sm"
                icon={<Icon name={action.icon} className={`text-${action.color}-400 text-sm`} />}
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
            icon={<Icon name="close" className="text-sm" />}
            title="Clear selection"
            aria-label="Clear selection"
          />
        </div>
      )}

      {/* Mobile floating selection bar */}
      {isMobile && hasSelection && (
        <div className="absolute z-[100] animate-in slide-in-from-bottom-4 duration-300 bottom-8 left-4 right-4 translate-x-0">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl rounded-2xl p-1 flex items-center gap-1 ring-4 ring-black/10 overflow-x-auto no-scrollbar max-w-full">
            <div className="flex p-1 gap-1 shrink-0">
              {mobileActions.map((action) => (
                <Button
                  key={action.label}
                  onClick={action.onClick}
                  variant="ghost"
                  size="sm"
                  icon={<Icon name={action.icon} className={`text-${action.color}-400`} />}
                >
                  {action.label}
                </Button>
              ))}
              <div className="w-px h-8 bg-slate-700 mx-1" />
              <Button
                onClick={onClearSelection}
                variant="ghost"
                size="sm"
                icon={<Icon name="close" />}
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