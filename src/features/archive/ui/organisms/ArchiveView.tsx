/**
 * ArchiveView Organism
 *
 * Main organism for the archive feature. Composes ArchiveHeader, ArchiveGrid, and ArchiveList.
 * Receives cx and fieldMode via template render props, eliminating prop drilling.
 *
 * CHANGES:
 * - Redesigned empty state with clear onboarding flow
 * - Added step-by-step getting started guide
 * - Better visual hierarchy for first-time users
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type IIIFCanvas, type IIIFCollection, type IIIFItem, isCanvas } from '@/src/shared/types';
import { ValidationIssue } from '@/src/entities/manifest/model/validation/validator';
import { useToast } from '@/src/shared/ui/molecules/Toast';
import { useGridVirtualization, useIIIFTraversal, usePipeline, useResponsive, useSharedSelection } from '@/src/shared/lib/hooks';
import { IIIF_CONFIG, IIIF_SPEC } from '@/src/shared/constants';
import { isValidChildType } from '@/utils/iiifHierarchy';
import { ContextMenu, type ContextMenuSection, FloatingSelectionToolbar, BreadcrumbNav, type BreadcrumbItem, GuidedEmptyState, PipelineBanner } from '@/src/shared/ui/molecules';
import { createLanguageMap, generateUUID } from '@/utils/iiifTypes';
import { ArchiveHeader } from './ArchiveHeader';
import { ArchiveGrid } from './ArchiveGrid';
import { ArchiveList } from './ArchiveList';
import { type ArchiveViewMode, filterByTerm, getSelectionDNA, loadViewMode, saveViewMode, sortCanvases, type SortMode } from '../../model';
import { Button } from '@/src/shared/ui/atoms';

export interface ArchiveViewProps {
  root: IIIFItem | null;
  onSelect: (item: IIIFItem) => void;
  onOpen: (item: IIIFItem) => void;
  onBatchEdit: (ids: string[]) => void;
  onUpdate?: (newRoot: IIIFItem) => void;
  validationIssues?: Record<string, ValidationIssue[]>;
  onReveal?: (id: string, mode: 'collections' | 'viewer' | 'archive') => void;
  onCatalogSelection?: (ids: string[]) => void;
  onSwitchView?: (mode: string) => void;
  /** When true, renders as a compact filmstrip for sidebar use */
  filmstripMode?: boolean;
  /** Callback to open folder import dialog */
  onOpenImport?: () => void;
  /** Callback to open external URL import dialog */
  onOpenExternalImport?: () => void;
  cx: {
    surface: string;
    text: string;
    accent: string;
    border: string;
    divider: string;
    headerBg: string;
    textMuted: string;
    input: string;
    label: string;
    active: string;
    inactive: string;
    warningBg: string;
    pageBg: string;
  };
  fieldMode: boolean;
  t: (key: string) => string;
  /** Whether viewer panel is visible (for split view controls) */
  showViewerPanel?: boolean;
  /** Whether inspector panel is visible */
  showInspectorPanel?: boolean;
  /** Toggle viewer panel visibility */
  onToggleViewerPanel?: () => void;
  /** Toggle inspector panel visibility */
  onToggleInspectorPanel?: () => void;
  /** Whether a canvas is currently selected (for showing panel controls) */
  hasCanvasSelected?: boolean;
}

/**
 * Empty State Component - Uses GuidedEmptyState for better UX
 */
const ArchiveEmptyState: React.FC<{
  fieldMode: boolean;
  cx: ArchiveViewProps['cx'];
  onImport: () => void;
  onOpenExternal: () => void;
  t: (key: string) => string;
}> = ({ fieldMode, cx, onImport, onOpenExternal, t }) => {
  const archiveTerm = t('Archive');

  const steps = [
    {
      id: 'import',
      number: 1,
      title: t('Ingest'),
      description: `Add photos, videos, or documents to your ${archiveTerm.toLowerCase()}`,
      icon: 'upload' as const,
      active: true,
      helpText: 'You can drag and drop folders or select files from your computer',
    },
    {
      id: 'organize',
      number: 2,
      title: 'Organize',
      description: `Structure items into ${t('Collection')}s and ${t('Manifest')}s`,
      icon: 'folder' as const,
      helpText: 'Group related items together for easier navigation',
    },
    {
      id: 'export',
      number: 3,
      title: t('Export'),
      description: 'Share your archive as IIIF or publish online',
      icon: 'download' as const,
      helpText: 'Export to standard formats for preservation and sharing',
    },
  ];

  return (
    <GuidedEmptyState
      icon="inventory_2"
      title={`Welcome to Field Studio`}
      subtitle={`Create, organize, and publish ${archiveTerm.toLowerCase()}s. Start by importing your media files.`}
      steps={steps}
      primaryAction={{
        label: `${t('Ingest')} Folder`,
        icon: 'folder_open',
        onClick: onImport,
      }}
      secondaryAction={{
        label: `${t('Ingest')} from URL`,
        icon: 'link',
        onClick: onOpenExternal,
      }}
      cx={cx}
      fieldMode={fieldMode}
      tip={`Tip: Drag and drop a folder to quickly ${t('ingest').toLowerCase()} multiple files`}
      expandableSteps={true}
    />
  );
};

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  root,
  onSelect,
  onOpen,
  onBatchEdit,
  onUpdate,
  validationIssues: _validationIssues = {},
  onReveal: _onReveal,
  onCatalogSelection,
  onSwitchView,
  filmstripMode = false,
  onOpenImport,
  onOpenExternalImport,
  cx,
  fieldMode,
  t: _t,
  // Viewer panel controls for split view
  showViewerPanel,
  showInspectorPanel,
  onToggleViewerPanel,
  onToggleInspectorPanel,
  hasCanvasSelected,
}) => {
  const { showToast } = useToast();
  const { isMobile } = useResponsive();
  const { archiveToMetadata, archiveToBoard, archiveToMap, hasPipeline, origin } = usePipeline();

  // Load persisted view mode
  const [view, setView] = useState<ArchiveViewMode>(loadViewMode);
  useEffect(() => { saveViewMode(view); }, [view]);

  // State
  const [filter, setFilter] = useState('');
  const [sortBy] = useState<SortMode>('name');
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable');
  useEffect(() => { console.log('[ArchiveView] Density changed to:', density); }, [density]);
  const [activeItem, setActiveItem] = useState<IIIFCanvas | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; targetId: string; isMulti?: boolean } | null>(null);

  // Selection
  const { selectedIds, handleSelectWithModifier, select, toggle, clear: clearSelection, isSelected } = useSharedSelection();
  const { getAllCanvases } = useIIIFTraversal(root);
  const allCanvases = useMemo(() => getAllCanvases(), [getAllCanvases]);

  // Filtered canvases
  const filteredCanvases = useMemo(() => {
    const filtered = filterByTerm(allCanvases, filter);
    return sortCanvases(filtered, sortBy);
  }, [allCanvases, filter, sortBy]);

  const selectedCanvases = useMemo(() => allCanvases.filter(c => isSelected(c.id)), [allCanvases, isSelected]);
  const selectionDNA = useMemo(() => getSelectionDNA(selectedCanvases), [selectedCanvases]);

  // Update active item
  useEffect(() => {
    if (selectedIds.size === 1) {
      const id = Array.from(selectedIds)[0];
      setActiveItem(allCanvases.find(a => a.id === id) || null);
    } else if (selectedIds.size > 1) {
      if (!activeItem || !selectedIds.has(activeItem.id)) {
        setActiveItem(allCanvases.find(a => a.id === Array.from(selectedIds)[0]) || null);
      }
    } else {
      setActiveItem(null);
    }
  }, [selectedIds, allCanvases, activeItem]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridItemSize = useMemo(() => {
    // Filmstrip mode: small thumbnails in single column
    if (filmstripMode) return { width: 240, height: 80 };
    if (fieldMode) return { width: 200, height: 220 };
    return { width: 140, height: 160 };
  }, [filmstripMode, fieldMode]);

  const { visibleRange: gridVisibleRange, columns: gridColumns } = useGridVirtualization({
    totalItems: filteredCanvases.length,
    itemSize: gridItemSize,
    containerRef: scrollContainerRef,
    overscan: 3,
  });

  // Handlers
  const handleFilterChange = useCallback((value: string) => setFilter(value), []);
  const handleViewChange = useCallback((newView: ArchiveViewMode) => {
    console.log('[ArchiveView] View change requested:', newView);
    if (newView === 'map' || newView === 'timeline') {
      console.log('[ArchiveView] Delegating to app mode:', newView);
      onSwitchView?.(newView);
      return;
    }
    console.log('[ArchiveView] Setting view to:', newView);
    setView(newView);
  }, [onSwitchView]);

  const handleClearFilter = useCallback(() => setFilter(''), []);
  
  const handleItemClick = useCallback((e: React.MouseEvent, asset: IIIFCanvas) => {
    handleSelectWithModifier(asset.id, e, filteredCanvases);
    if (!e.shiftKey && !e.metaKey && !e.ctrlKey) onSelect(asset);
  }, [handleSelectWithModifier, filteredCanvases, onSelect]);

  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const isMulti = selectedIds.size > 1 && selectedIds.has(id);
    setContextMenu({ x: e.clientX, y: e.clientY, targetId: id, isMulti });
  }, [selectedIds]);

  const handleCreateManifestFromSelection = useCallback((specificIds?: string[]) => {
    const idsToGroup = specificIds && specificIds.length > 0 ? new Set(specificIds) : selectedIds;
    if (!root || !onUpdate || idsToGroup.size === 0) return;
    
    const newRoot = JSON.parse(JSON.stringify(root)) as IIIFCollection;
    const canvasesToMove: any[] = [];

    const removeCanvases = (parent: any) => {
      const list = parent.items || parent.annotations || [];
      for (let i = list.length - 1; i >= 0; i--) {
        const item = list[i];
        if (idsToGroup.has(item.id)) {
          if (isCanvas(item) && isValidChildType('Manifest', item.type)) {
            canvasesToMove.push(list.splice(i, 1)[0]);
          }
        } else if (item.items || item.annotations) {
          removeCanvases(item);
        }
      }
    };

    removeCanvases(newRoot);

    if (canvasesToMove.length === 0) {
      showToast('No Canvases selected - only Canvases can be grouped into a Manifest', 'error');
      return;
    }

    const baseUrl = IIIF_CONFIG.BASE_URL.DEFAULT;
    const manifestId = IIIF_CONFIG.ID_PATTERNS.MANIFEST(baseUrl, generateUUID());

    const newManifest: any = {
      '@context': IIIF_SPEC.PRESENTATION_3.CONTEXT,
      id: manifestId,
      type: 'Manifest',
      label: createLanguageMap('Selection Bundle'),
      items: canvasesToMove,
      behavior: ['individuals'],
    };

    if (!newRoot.items) newRoot.items = [];
    if (isValidChildType(newRoot.type, 'Manifest')) {
      newRoot.items.push(newManifest);
      onUpdate(newRoot);
      select(manifestId);
      showToast(`Grouped ${canvasesToMove.length} Canvases into new Manifest`, 'success');
    }
  }, [root, onUpdate, selectedIds, select, showToast]);

  // Pipeline: Archive -> Map with selected items
  const handleOpenMap = useCallback(() => {
    if (selectedIds.size > 0) {
      archiveToMap(Array.from(selectedIds));
    }
    onSwitchView?.('map');
  }, [selectedIds, archiveToMap, onSwitchView]);

  // Pipeline: Archive -> Catalog with selected items
  const handleEditMetadata = useCallback(() => {
    const ids = Array.from(selectedIds);
    archiveToMetadata(ids);
    onCatalogSelection?.(ids);
    onSwitchView?.('metadata');
  }, [selectedIds, archiveToMetadata, onCatalogSelection, onSwitchView]);

  const handleBatchEdit = useCallback(() => onBatchEdit(Array.from(selectedIds)), [selectedIds, onBatchEdit]);

  // Pipeline: Archive -> Board with selected items
  const handleComposeOnBoard = useCallback(() => {
    if (selectedIds.size > 0) {
      const ids = Array.from(selectedIds);
      archiveToBoard(ids);
      onSwitchView?.('boards');
    }
  }, [selectedIds, archiveToBoard, onSwitchView]);

  // Reorder handler - moves canvas from one position to another
  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    if (!root || !onUpdate) return;

    // Find the parent manifest containing these canvases
    // For now, assume all canvases come from the first manifest in a collection
    // or the root itself if it's a manifest
    const newRoot = JSON.parse(JSON.stringify(root));

    const reorderInParent = (parent: any): boolean => {
      if (!parent.items || !Array.isArray(parent.items)) return false;

      // Check if this parent contains canvases
      const hasCanvases = parent.items.some((item: any) => item.type === 'Canvas');
      if (hasCanvases) {
        // Reorder the items array
        const items = [...parent.items];
        const [movedItem] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, movedItem);
        parent.items = items;
        return true;
      }

      // Recurse into children (manifests in collection)
      for (const item of parent.items) {
        if (reorderInParent(item)) return true;
      }
      return false;
    };

    if (reorderInParent(newRoot)) {
      onUpdate(newRoot);
      showToast('Canvas reordered', 'success');
    }
  }, [root, onUpdate, showToast]);

  // Reorder is enabled when viewer panel is closed (full grid mode)
  const reorderEnabled = !filmstripMode && showViewerPanel === false;

  // Render content view
  const renderContentView = () => {
    switch (view) {
      case 'grid':
        return (
          <ArchiveGrid
            items={filteredCanvases}
            visibleRange={gridVisibleRange}
            columns={gridColumns}
            itemSize={gridItemSize}
            isSelected={isSelected}
            onItemClick={handleItemClick}
            onToggleSelect={toggle}
            onContextMenu={handleContextMenu}
            cx={cx}
            fieldMode={fieldMode}
            isMobile={isMobile}
            activeItem={activeItem}
            filter={filter}
            onClearFilter={handleClearFilter}
            density={density}
            onDensityChange={setDensity}
            reorderEnabled={reorderEnabled}
            onReorder={handleReorder}
          />
        );
      case 'list':
        return (
          <ArchiveList
            items={filteredCanvases}
            isSelected={isSelected}
            onItemClick={handleItemClick}
            onItemDoubleClick={(canvas) => onOpen(canvas)}
            onContextMenu={handleContextMenu}
            cx={cx}
            fieldMode={fieldMode}
            activeItem={activeItem}
          />
        );
      case 'map':
      case 'timeline':
        return null;
      default:
        return null;
    }
  };

  // Render filmstrip view for sidebar mode
  const renderFilmstripView = () => {
    return (
      <div className="flex flex-col gap-1">
        {filteredCanvases.map((canvas) => {
          const selected = isSelected(canvas.id);
          const active = activeItem?.id === canvas.id;

          // Get thumbnail URL
          const thumbnail = canvas.thumbnail?.[0];
          const thumbnailUrl = thumbnail?.id || '';

          // Get label
          const label = typeof canvas.label === 'string'
            ? canvas.label
            : canvas.label?.en?.[0] || canvas.label?.none?.[0] || 'Untitled';

          return (
            <button
              key={canvas.id}
              onClick={(e) => handleItemClick(e, canvas)}
              onDoubleClick={() => onOpen(canvas)}
              onContextMenu={(e) => handleContextMenu(e, canvas.id)}
              className={`
                flex items-center gap-2 p-2 rounded-lg text-left w-full
                transition-all duration-150
                ${active
                  ? fieldMode
                    ? 'bg-yellow-500/30 ring-2 ring-yellow-400'
                    : 'bg-blue-500/30 ring-2 ring-blue-400'
                  : selected
                    ? fieldMode
                      ? 'bg-yellow-500/20'
                      : 'bg-blue-500/20'
                    : fieldMode
                      ? 'hover:bg-white/10'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }
              `}
            >
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className={`material-icons text-xl ${cx.textMuted}`}>image</span>
                  </div>
                )}
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${cx.text}`}>
                  {label}
                </div>
                {canvas.width && canvas.height && (
                  <div className={`text-xs ${cx.textMuted}`}>
                    {canvas.width} × {canvas.height}
                  </div>
                )}
              </div>

              {/* Selection indicator */}
              {selected && (
                <div className={`shrink-0 ${fieldMode ? 'text-yellow-400' : 'text-blue-400'}`}>
                  <span className="material-icons text-lg">check_circle</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // EMPTY STATE - When no root/archive loaded
  if (!root) {
    return (
      <ArchiveEmptyState
        fieldMode={fieldMode}
        cx={cx}
        onImport={() => onOpenImport?.()}
        onOpenExternal={() => onOpenExternalImport?.()}
        t={_t}
      />
    );
  }

  return (
    <div className={`flex-1 flex flex-col h-full relative overflow-hidden ${cx.pageBg}`}>
      {/* Pipeline Banner - show when coming from another view */}
      {!filmstripMode && hasPipeline && origin === 'search' && (
        <PipelineBanner
          onBack={(mode) => onSwitchView?.(mode)}
          cx={cx}
          fieldMode={fieldMode}
        />
      )}

      {/* Header - hide in filmstrip mode for compact sidebar */}
      {!filmstripMode && (
        <ArchiveHeader
          filter={filter}
          onFilterChange={handleFilterChange}
          view={view}
          onViewChange={handleViewChange}
          isMobile={isMobile}
          selectedCount={selectedIds.size}
          selectionHasGPS={selectionDNA.hasGPS}
          onClearSelection={clearSelection}
          onGroupIntoManifest={handleCreateManifestFromSelection}
          onOpenMap={handleOpenMap}
          onEditMetadata={handleEditMetadata}
          onBatchEdit={handleBatchEdit}
          onComposeOnBoard={handleComposeOnBoard}
          showViewerPanel={showViewerPanel}
          showInspectorPanel={showInspectorPanel}
          onToggleViewerPanel={onToggleViewerPanel}
          onToggleInspectorPanel={onToggleInspectorPanel}
          hasCanvasSelected={hasCanvasSelected}
          cx={cx}
          fieldMode={fieldMode}
        />
      )}

      {/* Filmstrip mode: compact header with just count */}
      {filmstripMode && (
        <div className={`px-3 py-2 border-b ${cx.border} ${cx.headerBg} shrink-0`}>
          <div className={`text-xs font-medium ${cx.textMuted}`}>
            {filteredCanvases.length} items
          </div>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto custom-scrollbar ${
          filmstripMode
            ? 'p-2'
            : view === 'map' || view === 'timeline'
              ? 'p-0'
              : 'p-6 pb-24'
        }`}
      >
        {filmstripMode ? renderFilmstripView() : renderContentView()}
      </div>

      {/* Context Menu - Enhanced with pipeline actions */}
      {contextMenu && (() => {
        const targetItem = allCanvases.find(c => c.id === contextMenu.targetId);
        const sections: ContextMenuSection[] = [
          {
            title: 'Actions',
            items: [
              { id: 'open', label: 'Open in Viewer', icon: 'visibility', onClick: () => { onOpen(targetItem as IIIFItem); setContextMenu(null); } },
              { id: 'select', label: selectedIds.has(contextMenu.targetId) ? 'Deselect' : 'Select', icon: selectedIds.has(contextMenu.targetId) ? 'check_box' : 'check_box_outline_blank', onClick: () => { 
                if (selectedIds.has(contextMenu.targetId)) {
                  // Deselect logic would go here
                } else {
                  select(contextMenu.targetId);
                }
                setContextMenu(null); 
              }},
            ]
          },
          {
            title: 'Organize',
            items: [
              { id: 'group-into-manifest', label: 'Group into Manifest', icon: 'folder_special', onClick: () => { handleCreateManifestFromSelection([contextMenu.targetId]); setContextMenu(null); } },
              { id: 'duplicate', label: 'Duplicate', icon: 'content_copy', onClick: () => { showToast('Duplicate feature coming soon', 'info'); setContextMenu(null); } },
            ]
          },
          {
            title: 'Pipeline',
            items: [
              { id: 'edit-metadata', label: 'Edit in Catalog', icon: 'table_chart', variant: 'primary', onClick: () => { 
                select(contextMenu.targetId);
                handleEditMetadata();
                setContextMenu(null); 
              }},
              { id: 'compose-board', label: 'Compose on Board', icon: 'dashboard', variant: 'primary', onClick: () => { 
                select(contextMenu.targetId);
                handleComposeOnBoard();
                setContextMenu(null); 
              }},
              ...(selectionDNA.hasGPS ? [{ id: 'view-map', label: 'View on Map', icon: 'explore', onClick: () => { handleOpenMap(); setContextMenu(null); } }] : []),
            ]
          },
          {
            title: 'Navigate',
            items: [
              { id: 'go-structure', label: 'View in Structure', icon: 'account_tree', onClick: () => { onSwitchView?.('structure'); setContextMenu(null); } },
              { id: 'go-catalog', label: 'Open Catalog', icon: 'table_chart', onClick: () => { onSwitchView?.('metadata'); setContextMenu(null); } },
              { id: 'go-boards', label: 'Open Boards', icon: 'dashboard', onClick: () => { onSwitchView?.('boards'); setContextMenu(null); } },
            ]
          }
        ];
        return (
          <ContextMenu
            isOpen={true}
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            sections={sections}
            selectionCount={contextMenu.isMulti ? selectedIds.size : 1}
            fieldMode={fieldMode}
            cx={cx}
          />
        );
      })()}

      {/* Mobile-only floating selection toolbar (desktop uses header toolbar) */}
      {selectedIds.size > 0 && !filmstripMode && isMobile && (
        <FloatingSelectionToolbar
          selectedItems={selectedCanvases}
          onClear={clearSelection}
          onOpenViewer={() => activeItem && onOpen(activeItem)}
          onEditMetadata={handleEditMetadata}
          onGroupIntoManifest={handleCreateManifestFromSelection}
          onComposeOnBoard={handleComposeOnBoard}
          onViewOnMap={selectionDNA.hasGPS ? handleOpenMap : undefined}
          hasGPS={selectionDNA.hasGPS}
          cx={cx}
          t={_t}
          fieldMode={fieldMode}
          position="bottom"
        />
      )}
    </div>
  );
};

export default ArchiveView;
