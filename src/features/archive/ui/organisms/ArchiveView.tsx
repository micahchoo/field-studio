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
import { type BreadcrumbItem, BreadcrumbNav } from '@/src/shared/ui/molecules/BreadcrumbNav';
import { ContextMenu, type ContextMenuSectionType } from '@/src/shared/ui/molecules/ContextMenu';
import { FloatingSelectionToolbar } from '@/src/shared/ui/molecules/FloatingSelectionToolbar';
import { GuidedEmptyState } from '@/src/shared/ui/molecules/GuidedEmptyState';
import { PipelineBanner } from '@/src/shared/ui/molecules/PipelineBanner';
import { createLanguageMap, generateUUID } from '@/utils/iiifTypes';
import { ArchiveHeader } from './ArchiveHeader';
import { ArchiveGrid } from './ArchiveGrid';
import { ArchiveList } from './ArchiveList';
import { type ArchiveViewMode, filterByTerm, getSelectionDNA, loadViewMode, saveViewMode, sortCanvases, type SortMode } from '../../model';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { contentStateService } from '@/src/shared/services/contentState';
import { BehaviorSelector } from '@/src/features/metadata-edit/ui/atoms/BehaviorSelector';
import { RightsSelector } from '@/src/features/metadata-edit/ui/atoms/RightsSelector';
import { ModalDialog } from '@/src/shared/ui/molecules/ModalDialog';
import { BEHAVIOR_OPTIONS, getConflictingBehaviors } from '@/src/shared/constants/iiif';

/**
 * NavDate Bulk Set Modal
 * Sets navDate on multiple selected canvases at once.
 */
const NavDateBulkModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onApply: (updates: Array<{ id: string; navDate: string }>) => void;
  selectedIds: Set<string>;
  fieldMode: boolean;
}> = ({ isOpen, onClose, selectedCount, onApply, selectedIds, fieldMode }) => {
  const [dateValue, setDateValue] = useState('');
  const [timeValue, setTimeValue] = useState('09:00');
  const [autoIncrement, setAutoIncrement] = useState(false);
  const [incrementUnit, setIncrementUnit] = useState<'minute' | 'hour' | 'day'>('day');

  if (!isOpen) return null;

  const handleApply = () => {
    if (!dateValue) return;
    const ids = Array.from(selectedIds);
    const updates: Array<{ id: string; navDate: string }> = [];

    const baseDate = new Date(`${dateValue}T${timeValue}:00`);

    ids.forEach((id, i) => {
      const d = new Date(baseDate.getTime());
      if (autoIncrement && i > 0) {
        if (incrementUnit === 'minute') d.setMinutes(d.getMinutes() + i);
        else if (incrementUnit === 'hour') d.setHours(d.getHours() + i);
        else d.setDate(d.getDate() + i);
      }
      updates.push({ id, navDate: d.toISOString() });
    });

    onApply(updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-nb-black/50" onClick={onClose} />
      <div className={`relative w-full max-w-sm shadow-brutal-lg ${
        fieldMode ? 'bg-nb-black border border-nb-black/80' : 'bg-nb-white'
      }`}>
        <div className={`flex items-center justify-between px-4 py-3 border-b ${
          fieldMode ? 'border-nb-black/80' : 'border-nb-black/20'
        }`}>
          <h3 className={`font-bold text-sm ${fieldMode ? 'text-white' : 'text-nb-black'}`}>
            Set Navigation Dates
          </h3>
          <Button variant="ghost" size="bare"
            onClick={onClose}
            className={`p-1 ${fieldMode ? 'hover:bg-nb-black' : 'hover:bg-nb-cream'}`}
          >
            <Icon name="close" className={fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'} />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <div className={`text-xs ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/60'}`}>
            Apply navDate to {selectedCount} selected item{selectedCount !== 1 ? 's' : ''}
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className={`block text-[10px] font-bold uppercase mb-1 ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}`}>
                Date
              </label>
              <input
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className={`w-full text-sm px-2 py-1.5 border outline-none ${
                  fieldMode
                    ? 'bg-nb-black text-white border-nb-black/80 focus:border-nb-yellow'
                    : 'bg-nb-white border-nb-black/20 focus:border-nb-blue'
                }`}
              />
            </div>
            <div className="w-28">
              <label className={`block text-[10px] font-bold uppercase mb-1 ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}`}>
                Time
              </label>
              <input
                type="time"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                className={`w-full text-sm px-2 py-1.5 border outline-none ${
                  fieldMode
                    ? 'bg-nb-black text-white border-nb-black/80 focus:border-nb-yellow'
                    : 'bg-nb-white border-nb-black/20 focus:border-nb-blue'
                }`}
              />
            </div>
          </div>

          {selectedCount > 1 && (
            <div className={`p-3 border ${fieldMode ? 'border-nb-black bg-nb-black/50' : 'border-nb-black/20 bg-nb-white'}`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoIncrement}
                  onChange={(e) => setAutoIncrement(e.target.checked)}
                  className="rounded"
                />
                <span className={`text-xs ${fieldMode ? 'text-nb-black/30' : 'text-nb-black/80'}`}>
                  Auto-increment by
                </span>
                <select
                  value={incrementUnit}
                  onChange={(e) => setIncrementUnit(e.target.value as 'minute' | 'hour' | 'day')}
                  disabled={!autoIncrement}
                  className={`text-xs px-1.5 py-0.5 border ${
                    fieldMode
                      ? 'bg-nb-black text-white border-nb-black/80'
                      : 'bg-nb-white border-nb-black/20'
                  } ${!autoIncrement ? 'opacity-50' : ''}`}
                >
                  <option value="minute">1 minute</option>
                  <option value="hour">1 hour</option>
                  <option value="day">1 day</option>
                </select>
              </label>
            </div>
          )}
        </div>

        <div className={`flex items-center justify-end gap-2 px-4 py-3 border-t ${
          fieldMode ? 'border-nb-black/80' : 'border-nb-black/20'
        }`}>
          <Button variant="ghost" size="bare"
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium ${
              fieldMode ? 'bg-nb-black text-nb-black/30 hover:bg-nb-black/80' : 'bg-nb-cream text-nb-black/80 hover:bg-nb-cream'
            }`}
          >
            Cancel
          </Button>
          <Button variant="ghost" size="bare"
            onClick={handleApply}
            disabled={!dateValue}
            className={`px-4 py-2 text-sm font-medium disabled:opacity-50 ${
              fieldMode ? 'bg-nb-yellow text-white hover:bg-nb-yellow' : 'bg-nb-blue text-white hover:bg-nb-blue'
            }`}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
};

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
  /** Whether advanced mode is enabled (deprecated, kept for API compatibility) */
  isAdvanced?: boolean;
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
  const [showNavDateModal, setShowNavDateModal] = useState(false);
  const [showBehaviorModal, setShowBehaviorModal] = useState(false);
  const [showRightsModal, setShowRightsModal] = useState(false);

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
    itemWidth: gridItemSize.width,
    itemHeight: gridItemSize.height,
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

  // Handle bulk navDate updates
  const handleBulkNavDate = useCallback((updates: Array<{ id: string; navDate: string }>) => {
    if (!root || !onUpdate) return;
    const newRoot = JSON.parse(JSON.stringify(root));

    const applyNavDates = (parent: any) => {
      const list = parent.items || [];
      for (const item of list) {
        const update = updates.find(u => u.id === item.id);
        if (update) {
          item.navDate = update.navDate;
        }
        if (item.items) applyNavDates(item);
      }
    };

    applyNavDates(newRoot);
    onUpdate(newRoot);
    showToast(`Set navDate on ${updates.length} item${updates.length !== 1 ? 's' : ''}`, 'success');
  }, [root, onUpdate, showToast]);

  // Handle setting behavior on the parent manifest of the context menu target
  const handleSetBehavior = useCallback((behavior: string[]) => {
    if (!root || !onUpdate || !contextMenu) return;
    const newRoot = JSON.parse(JSON.stringify(root));
    // Find the parent manifest of the target canvas and set behavior on it
    const findAndSetBehavior = (parent: IIIFItem): boolean => {
      if (!parent.items) return false;
      for (const item of parent.items) {
        if (item.type === 'Manifest') {
          const hasTarget = (item as IIIFCollection).items?.some((c: IIIFItem) => c.id === contextMenu.targetId);
          if (hasTarget) {
            item.behavior = behavior;
            return true;
          }
        }
        if (findAndSetBehavior(item)) return true;
      }
      return false;
    };
    // If root is the manifest itself
    if (newRoot.type === 'Manifest') {
      newRoot.behavior = behavior;
    } else {
      findAndSetBehavior(newRoot);
    }
    onUpdate(newRoot);
    showToast(`Behavior set to ${behavior.join(', ')}`, 'success');
    setShowBehaviorModal(false);
  }, [root, onUpdate, contextMenu, showToast]);

  // Handle setting rights on the context menu target item
  const handleSetRights = useCallback((rights: string) => {
    if (!root || !onUpdate || !contextMenu) return;
    const newRoot = JSON.parse(JSON.stringify(root));
    const applyRights = (parent: IIIFItem): boolean => {
      if (!parent.items) return false;
      for (const item of parent.items) {
        if (item.id === contextMenu.targetId) {
          item.rights = rights;
          return true;
        }
        if (applyRights(item)) return true;
      }
      return false;
    };
    applyRights(newRoot);
    onUpdate(newRoot);
    showToast('Rights updated', 'success');
    setShowRightsModal(false);
  }, [root, onUpdate, contextMenu, showToast]);

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

  // Keyboard-based reordering with Alt+Arrow keys
  useEffect(() => {
    if (!reorderEnabled || !activeItem || selectedIds.size !== 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+Up or Alt+Down to move selected item
      if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;

      e.preventDefault();
      const currentIndex = filteredCanvases.findIndex(c => c.id === activeItem.id);
      if (currentIndex === -1) return;

      const targetIndex = e.key === 'ArrowUp'
        ? Math.max(0, currentIndex - 1)
        : Math.min(filteredCanvases.length - 1, currentIndex + 1);

      if (targetIndex !== currentIndex) {
        handleReorder(currentIndex, targetIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reorderEnabled, activeItem, selectedIds.size, filteredCanvases, handleReorder]);

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
            reorderEnabled={reorderEnabled}
            onReorder={handleReorder}
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
      <div className="flex flex-col divide-y divide-nb-black/50">
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
            <Button variant="ghost" size="bare"
              key={canvas.id}
              onClick={(e) => handleItemClick(e, canvas)}
              onDoubleClick={() => onOpen(canvas)}
              onContextMenu={(e) => handleContextMenu(e, canvas.id)}
              className={`
                flex items-center gap-3 px-3 py-2.5 text-left w-full border-l-4
                transition-nb 
                ${active
                  ? 'bg-mode-accent-bg-dark border-l-mode-accent-border pl-2'
                  : selected
                    ? 'bg-mode-accent-bg-subtle border-l-mode-accent-border'
                    : 'border-l-transparent hover:bg-nb-white/5'
                }
              `}
            >
              {/* Thumbnail */}
              <div className="w-14 h-14 overflow-hidden bg-nb-cream/80 shrink-0">
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
                <div className={`shrink-0 ${fieldMode ? 'text-nb-yellow' : 'text-nb-blue'}`}>
                  <span className="material-icons text-lg">check_circle</span>
                </div>
              )}
            </Button>
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
        <div className="px-3 py-2.5 border-b border-mode-accent-border bg-mode-accent-bg-subtle shrink-0">
          <span className="text-[10px] font-bold text-mode-accent uppercase tracking-wider">
            {filteredCanvases.length} items
          </span>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto custom-scrollbar ${
          filmstripMode
            ? 'p-2'
            : view === 'map' || view === 'timeline'
              ? 'p-0'
              : 'p-6 pb-8'
        }`}
      >
        {filmstripMode ? renderFilmstripView() : renderContentView()}
      </div>

      {/* Context Menu - Enhanced with pipeline actions */}
      {contextMenu && (() => {
        const targetItem = allCanvases.find(c => c.id === contextMenu.targetId);
        const sections: ContextMenuSectionType[] = [
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
              { id: 'copy-share-link', label: 'Copy Share Link', icon: 'link', onClick: () => {
                try {
                  const baseUrl = window.location.origin + window.location.pathname;
                  const link = contentStateService.generateCanvasLink(baseUrl, '', contextMenu.targetId);
                  navigator.clipboard.writeText(link);
                  showToast('Share link copied', 'success');
                } catch {
                  showToast('Failed to generate link', 'error');
                }
                setContextMenu(null);
              }},
            ]
          },
          {
            title: 'Organize',
            items: [
              { id: 'group-into-manifest', label: 'Group into Manifest', icon: 'folder_special', onClick: () => { handleCreateManifestFromSelection([contextMenu.targetId]); setContextMenu(null); } },
              { id: 'set-navdate', label: 'Set Date', icon: 'event', onClick: () => { setShowNavDateModal(true); setContextMenu(null); } },
              { id: 'duplicate', label: 'Duplicate', icon: 'content_copy', onClick: () => { showToast('Duplicate feature coming soon', 'info'); setContextMenu(null); } },
              { id: 'set-behavior', label: 'Set Behavior\u2026', icon: 'tune', onClick: () => { setShowBehaviorModal(true); setContextMenu(null); } },
              { id: 'set-rights', label: 'Set Rights\u2026', icon: 'gavel', onClick: () => { setShowRightsModal(true); setContextMenu(null); } },
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
              ...(selectedIds.size >= 2 ? [{ id: 'compose-board', label: `Compose ${selectedIds.size} on Board`, icon: 'dashboard', variant: 'primary' as const, onClick: () => {
                handleComposeOnBoard();
                setContextMenu(null);
              }}] : []),
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

      {/* NavDate Bulk Set Modal */}
      <NavDateBulkModal
        isOpen={showNavDateModal}
        onClose={() => setShowNavDateModal(false)}
        selectedCount={selectedIds.size || 1}
        onApply={handleBulkNavDate}
        selectedIds={selectedIds}
        fieldMode={fieldMode}
      />

      {/* Behavior Set Modal */}
      {showBehaviorModal && (
        <ModalDialog
          title="Set Behavior"
          isOpen={showBehaviorModal}
          onClose={() => setShowBehaviorModal(false)}
          size="md"
          fieldMode={fieldMode}
        >
          <div className="p-4">
            <BehaviorSelector
              options={BEHAVIOR_OPTIONS['Manifest']}
              selected={[]}
              onChange={(behaviors) => handleSetBehavior(behaviors)}
              getConflicts={getConflictingBehaviors}
              fieldMode={fieldMode}
            />
          </div>
        </ModalDialog>
      )}

      {/* Rights Set Modal */}
      {showRightsModal && (
        <ModalDialog
          title="Set Rights"
          isOpen={showRightsModal}
          onClose={() => setShowRightsModal(false)}
          size="sm"
          fieldMode={fieldMode}
        >
          <div className="p-4">
            <RightsSelector
              value=""
              onChange={(rights) => handleSetRights(rights)}
              fieldMode={fieldMode}
            />
          </div>
        </ModalDialog>
      )}
    </div>
  );
};

export default ArchiveView;
