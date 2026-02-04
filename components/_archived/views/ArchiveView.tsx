import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppMode, getIIIFValue, IIIFCanvas, IIIFCollection, IIIFItem, isCanvas, ResourceState } from '../../types';
import { ValidationIssue } from '../../services/validator';
import { Icon } from '../Icon';
import { MapView } from './MapView';
import { TimelineView } from './TimelineView';
import { MuseumLabel } from '../MuseumLabel';
import { useToast } from '../Toast';
import { EmptyState } from '../EmptyState';
import { GridLoading } from '../LoadingState';
import { ARIA_LABELS, IIIF_CONFIG, IIIF_SPEC, KEYBOARD, REDUCED_MOTION, RESOURCE_TYPE_CONFIG } from '../../constants';
import { Viewer } from './Viewer';
import { useGridVirtualization, useIIIFTraversal, useResponsive, useSharedSelection, useVirtualization } from '../../hooks';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useContextualStyles } from '../../hooks/useContextualStyles';
import {
  findCanvasParent,
  getRelationshipType,
  isValidChildType
} from '../../utils/iiifHierarchy';
import { resolveHierarchicalThumbs, resolveThumbUrl } from '../../utils/imageSourceResolver';
import { StackedThumbnail } from '../StackedThumbnail';
import { ContextMenu, ContextMenuSection } from '../ContextMenu';
import { MultiSelectFilmstrip } from '../MultiSelectFilmstrip';
import { createLanguageMap, generateUUID } from '../../utils/iiifTypes';

interface ArchiveViewProps {
  root: IIIFItem | null;
  onSelect: (item: IIIFItem) => void;
  onOpen: (item: IIIFItem) => void;
  onBatchEdit: (ids: string[]) => void;
  onUpdate?: (newRoot: IIIFItem) => void;
  validationIssues?: Record<string, ValidationIssue[]>;
  onReveal?: (id: string, mode: 'collections' | 'viewer' | 'archive') => void;
  onCatalogSelection?: (ids: string[]) => void;
}

const getFileDNA = (item: IIIFItem) => {
    const has = { time: false, location: false, device: false };
    if (item.metadata) {
        const date = item.navDate || item.metadata.find(m => getIIIFValue(m.label).toLowerCase() === 'date created')?.value && getIIIFValue(item.metadata.find(m => getIIIFValue(m.label).toLowerCase() === 'date created')!.value, 'en');
        if (date) has.time = true;
        const loc = item.metadata.find(m => getIIIFValue(m.label).toLowerCase() === 'location')?.value && getIIIFValue(item.metadata.find(m => getIIIFValue(m.label).toLowerCase() === 'location')!.value, 'en');
        if (loc) has.location = true;
        const camera = item.metadata.find(m => getIIIFValue(m.label).toLowerCase() === 'camera')?.value && getIIIFValue(item.metadata.find(m => getIIIFValue(m.label).toLowerCase() === 'camera')!.value, 'en');
        if (camera) has.device = true;
    }
    return has;
};

// Rubber-band selection state
interface RubberBandState {
  isSelecting: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  containerRect: DOMRect | null;
}

const ArchiveViewComponent: React.FC<ArchiveViewProps> = ({ root, onSelect, onOpen, onBatchEdit, onUpdate, validationIssues = {}, onReveal, onCatalogSelection }) => {
  const { showToast } = useToast();
  const { settings } = useAppSettings();
  const {fieldMode} = settings;
  const cx = useContextualStyles(fieldMode);

  // Loading state for initial data
  const [isLoading, setIsLoading] = useState(true);

  // Track last deleted snapshot for undo
  const [deletedSnapshot, setDeletedSnapshot] = useState<{ root: IIIFItem; ids: string[] } | null>(null);

  // Update loading state when root changes
  useEffect(() => {
    if (root) {
      setIsLoading(false);
    }
  }, [root]);

  // Load persisted view mode from localStorage
  const [view, setView] = useState<'grid' | 'list' | 'map' | 'timeline'>(() => {
    if (typeof window === 'undefined') return 'grid';
    const saved = localStorage.getItem('field-studio:archive-view-mode');
    if (saved && ['grid', 'list', 'map', 'timeline'].includes(saved)) {
      return saved as 'grid' | 'list' | 'map' | 'timeline';
    }
    return 'grid';
  });
  
  // Persist view mode changes to localStorage
  useEffect(() => {
    localStorage.setItem('field-studio:archive-view-mode', view);
  }, [view]);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
  const [activeItem, setActiveItem] = useState<IIIFCanvas | null>(null);
  
  // Context menu state with multi-selection support
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    targetId: string;
    isMulti?: boolean;
  } | null>(null);

  // Use shared selection hook for cross-view persistence
  const {
    selectedIds,
    lastClickedId,
    handleSelectWithModifier,
    selectRange,
    toggle,
    select,
    selectAll: selectAllItems,
    clear: clearSelection,
    isSelected
  } = useSharedSelection();

  // Use IIIF traversal hook for efficient tree operations
  const { getAllCanvases } = useIIIFTraversal(root);

  // Rubber-band selection state
  const [rubberBand, setRubberBand] = useState<RubberBandState>({
    isSelecting: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    containerRect: null
  });
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useResponsive();

  // Get all Canvas items using the traversal hook
  const assets = useMemo(() => getAllCanvases(), [getAllCanvases]);

  const selectedAssets = useMemo(() => assets.filter(a => isSelected(a.id)), [assets, isSelected]);

  const selectionDNA = useMemo(() => {
    const dna = { hasGPS: false, hasTime: false, commonPrefix: '' };
    if (selectedAssets.length > 0) {
        dna.hasGPS = selectedAssets.some(a => getFileDNA(a).location);
        dna.hasTime = selectedAssets.some(a => getFileDNA(a).time);
    }
    return dna;
  }, [selectedAssets]);

  // Update active item when selection changes
  useEffect(() => {
      if (selectedIds.size === 1) {
          // Single selection: set as active item
          const id = Array.from(selectedIds)[0];
          const item = assets.find(a => a.id === id);
          setActiveItem(item || null);
      } else if (selectedIds.size > 1) {
          // Multi-selection: keep the first item as focused if it was previously active
          // or if no active item is set, use the first selected
          if (!activeItem || !selectedIds.has(activeItem.id)) {
              const firstId = Array.from(selectedIds)[0];
              const firstItem = assets.find(a => a.id === firstId);
              setActiveItem(firstItem || null);
          }
          // Otherwise keep the current active item (allows focusing within multi-selection)
      } else {
          setActiveItem(null);
      }
  }, [selectedIds, assets, activeItem]);

  // Memoize expensive filter and sort operations
  const filterLower = filter.toLowerCase();
  const filteredAssets = useMemo(() => {
    return assets.filter(a =>
      getIIIFValue(a.label).toLowerCase().includes(filterLower)
    ).sort((a, b) => {
        if (sortBy === 'name') return getIIIFValue(a.label).localeCompare(getIIIFValue(b.label));
        return (b.navDate || '').localeCompare(a.navDate || '');
    });
  }, [assets, filterLower, sortBy]);

  // Virtualization for grid view - estimate item size based on mode
  const gridItemSize = useMemo(() => {
    if (activeItem && !isMobile) return { width: 160, height: 180 }; // Compact when detail view is open
    if (fieldMode) return { width: 200, height: 220 };
    return { width: 140, height: 160 };
  }, [activeItem, isMobile, fieldMode]);

  const { visibleRange: gridVisibleRange, columns: gridColumns } = useGridVirtualization({
    totalItems: filteredAssets.length,
    itemSize: gridItemSize,
    containerRef: scrollContainerRef,
    overscan: 3
  });

  // Virtualization for list view
  const { visibleRange: listVisibleRange } = useVirtualization({
    totalItems: filteredAssets.length,
    itemHeight: 56, // Approximate row height
    containerRef: scrollContainerRef,
    overscan: 10
  });

  // Get visible items based on current view
  const visibleAssets = useMemo(() => {
    if (view === 'grid') {
      return filteredAssets.slice(gridVisibleRange.start, gridVisibleRange.end);
    }
    if (view === 'list') {
      return filteredAssets.slice(listVisibleRange.start, listVisibleRange.end);
    }
    return filteredAssets;
  }, [view, filteredAssets, gridVisibleRange, listVisibleRange]);

  const handleCreateManifestFromSelection = useCallback((specificIds?: string[]) => {
      const idsToGroup = specificIds && specificIds.length > 0
        ? new Set(specificIds)
        : selectedIds;
      
      if (!root || !onUpdate || idsToGroup.size === 0) return;
      const newRoot = JSON.parse(JSON.stringify(root)) as IIIFCollection;
      const canvasesToMove: any[] = [];

      // Validate that selected items are Canvases (the only valid child of Manifest)
      const removeCanvases = (parent: any) => {
          const list = parent.items || parent.annotations || [];
          for (let i = list.length - 1; i >= 0; i--) {
              const item = list[i];
              if (idsToGroup.has(item.id)) {
                  // Only move Canvases - use IIIF hierarchy validation
                  if (isCanvas(item) && isValidChildType('Manifest', item.type)) {
                      canvasesToMove.push(list.splice(i, 1)[0]);
                  } else {
                      console.warn(`Cannot move ${item.type} into Manifest - only Canvas is valid`);
                  }
              } else if (item.items || item.annotations) {
                  removeCanvases(item);
              }
          }
      };

      removeCanvases(newRoot);

      if (canvasesToMove.length === 0) {
          showToast("No Canvases selected - only Canvases can be grouped into a Manifest", "error");
          return;
      }

      const baseUrl = IIIF_CONFIG.BASE_URL.DEFAULT;
      const manifestId = IIIF_CONFIG.ID_PATTERNS.MANIFEST(baseUrl, generateUUID());

      // Create new Manifest with proper IIIF 3.0 structure
      // Manifest → Canvas is an OWNERSHIP relationship (exclusive)
      const relationship = getRelationshipType('Manifest', 'Canvas');
      console.log(`Creating Manifest with ${canvasesToMove.length} Canvases (${relationship} relationship)`);

      const newManifest: any = {
          "@context": IIIF_SPEC.PRESENTATION_3.CONTEXT,
          id: manifestId,
          type: 'Manifest',
          label: createLanguageMap('Selection Bundle'),
          items: canvasesToMove,
          behavior: ['individuals'] // Default behavior for new Manifests
      };

      // Validate that Manifest can be added to Collection (REFERENCE relationship)
      if (!newRoot.items) newRoot.items = [];
      if (isValidChildType(newRoot.type, 'Manifest')) {
          newRoot.items.push(newManifest);
          onUpdate(newRoot);
          select(manifestId);
          showToast(`Grouped ${canvasesToMove.length} Canvases into new Manifest`, "success");
      } else {
          showToast(`Cannot add Manifest to ${newRoot.type}`, "error");
      }
  }, [root, onUpdate, selectedIds, select, showToast]);

  // Stable callback handlers for item interactions
  const handleItemClick = useCallback((e: React.MouseEvent, asset: IIIFItem) => {
      // Use the shared selection hook's modifier handler
      handleSelectWithModifier(asset.id, e, filteredAssets);
      
      if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
          // Regular click without modifiers - also trigger onSelect
          onSelect(asset);
      }
  }, [handleSelectWithModifier, filteredAssets, onSelect]);

  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    // Check if this item is part of a multi-selection
    const isMulti = selectedIds.size > 1 && selectedIds.has(id);
    setContextMenu({ x: e.clientX, y: e.clientY, targetId: id, isMulti });
  }, [selectedIds]);

  // Stable view change handlers
  const handleSetViewGrid = useCallback(() => setView('grid'), [setView]);
  const handleSetViewList = useCallback(() => setView('list'), [setView]);
  const handleSetViewMap = useCallback(() => setView('map'), [setView]);
  const handleSetViewTimeline = useCallback(() => setView('timeline'), [setView]);

  // Stable filter change handler with debounce
  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  }, [setFilter]);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleDelete = useCallback((idsToDelete: string[]) => {
      if (!onUpdate || !root) return;
      if (!confirm(`Permanently remove ${idsToDelete.length} item(s)?`)) return;

      // Save snapshot for undo
      const snapshot = JSON.parse(JSON.stringify(root));
      setDeletedSnapshot({ root: snapshot, ids: idsToDelete });

      const newRoot = JSON.parse(JSON.stringify(root));
      const traverseAndRemove = (parent: any) => {
          const list = parent.items || parent.annotations || [];
          for (let i = list.length - 1; i >= 0; i--) {
              if (idsToDelete.includes(list[i].id)) {
                  list.splice(i, 1);
              } else if (list[i].items || list[i].annotations) {
                  traverseAndRemove(list[i]);
              }
          }
      };
      traverseAndRemove(newRoot);
      onUpdate(newRoot);
      clearSelection();
      showToast(
        `Deleted ${idsToDelete.length} item(s)`,
        "success",
        {
          label: 'Undo',
          onClick: () => {
            onUpdate(snapshot);
            showToast('Deletion undone', 'info');
          },
          variant: 'primary'
        }
      );
  }, [onUpdate, root, showToast, clearSelection]);

  // Keyboard shortcuts for selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Ctrl/Cmd+A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAllItems(filteredAssets.map(a => a.id));
        showToast(`Selected ${filteredAssets.length} items`, 'info');
      }

      // Escape: Clear selection and close detail view
      if (e.key === 'Escape') {
        if (selectedIds.size > 0) {
          clearSelection();
          setActiveItem(null);
        }
      }

      // Delete/Backspace: Delete selected (with confirmation)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        e.preventDefault();
        handleDelete(Array.from(selectedIds));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredAssets, selectedIds, showToast, handleDelete, selectAllItems, clearSelection]);

  useEffect(() => {
      const close = () => setContextMenu(null);
      window.addEventListener('click', close);
      return () => window.removeEventListener('click', close);
  }, []);

  // Rubber-band selection handlers
  const handleRubberBandStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only start rubber-band on direct container clicks (not on items)
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('rubber-band-area')) return;
    // Don't start if modifier keys are pressed (they're for item selection)
    if (e.metaKey || e.ctrlKey) return;

    // Prevent browser default to stop text selection and image dragging
    e.preventDefault();

    const container = scrollContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left + container.scrollLeft;
    const y = e.clientY - rect.top + container.scrollTop;

    setRubberBand({
      isSelecting: true,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      containerRect: rect
    });
  }, []);

  // Global mouse handlers for rubber band to handle dragging outside container
  useEffect(() => {
    if (!rubberBand.isSelecting) return;

    const handleGlobalMove = (e: MouseEvent) => {
      const container = scrollContainerRef.current;
      if (!container || !rubberBand.containerRect) return;

      // Calculate position relative to container, accounting for scroll
      const x = e.clientX - rubberBand.containerRect.left + container.scrollLeft;
      const y = e.clientY - rubberBand.containerRect.top + container.scrollTop;

      setRubberBand(prev => ({
        ...prev,
        currentX: x,
        currentY: y
      }));
    };

    const handleGlobalUp = (e: MouseEvent) => {
      const container = scrollContainerRef.current;
      
      if (!container) {
        setRubberBand(prev => ({ ...prev, isSelecting: false }));
        return;
      }

      // Calculate selection rectangle bounds
      const {startX} = rubberBand;
      const {startY} = rubberBand;
      // Use current mouse position or last known position
      const endX = rubberBand.currentX; 
      const endY = rubberBand.currentY;

      const selectionRect = {
        left: Math.min(startX, endX),
        right: Math.max(startX, endX),
        top: Math.min(startY, endY),
        bottom: Math.max(startY, endY)
      };

      // Minimum drag distance to count as rubber-band (avoid accidental selections)
      const width = selectionRect.right - selectionRect.left;
      const height = selectionRect.bottom - selectionRect.top;
      
      if (width >= 10 || height >= 10) {
        // Find items within the selection rectangle
        const newSelectedIds = new Set<string>(e.shiftKey ? Array.from(selectedIds) : []);
        const containerRect = container.getBoundingClientRect();

        itemRefs.current.forEach((element, id) => {
          const itemRect = element.getBoundingClientRect();
          // Convert to container-relative coordinates
          const itemLeft = itemRect.left - containerRect.left + container.scrollLeft;
          const itemRight = itemRect.right - containerRect.left + container.scrollLeft;
          const itemTop = itemRect.top - containerRect.top + container.scrollTop;
          const itemBottom = itemRect.bottom - containerRect.top + container.scrollTop;

          // Check if item intersects with selection rectangle
          const intersects = !(
            itemRight < selectionRect.left ||
            itemLeft > selectionRect.right ||
            itemBottom < selectionRect.top ||
            itemTop > selectionRect.bottom
          );

          if (intersects) {
            if (e.ctrlKey || e.metaKey) {
              // Toggle selection with Ctrl/Cmd
              if (newSelectedIds.has(id)) {
                newSelectedIds.delete(id);
              } else {
                newSelectedIds.add(id);
              }
            } else {
              newSelectedIds.add(id);
            }
          }
        });

        // Update selection via the hook
        if (e.ctrlKey || e.metaKey) {
          // Toggle mode - add/remove individually
          newSelectedIds.forEach(id => {
            if (!selectedIds.has(id)) toggle(id);
          });
        } else {
          // Replace mode - clear and select new set
          clearSelection();
          newSelectedIds.forEach(id => select(id));
        }
      }
      
      setRubberBand(prev => ({ ...prev, isSelecting: false }));
    };

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
    };
  }, [rubberBand.isSelecting, rubberBand.containerRect, rubberBand.startX, rubberBand.startY, rubberBand.currentX, rubberBand.currentY, selectedIds, clearSelection, toggle, select]);

  // Calculate rubber-band rectangle for rendering
  const rubberBandRect = useMemo(() => {
    if (!rubberBand.isSelecting) return null;
    return {
      left: Math.min(rubberBand.startX, rubberBand.currentX),
      top: Math.min(rubberBand.startY, rubberBand.currentY),
      width: Math.abs(rubberBand.currentX - rubberBand.startX),
      height: Math.abs(rubberBand.currentY - rubberBand.startY)
    };
  }, [rubberBand]);

  return (
    <div className={`flex-1 flex flex-col h-full relative overflow-hidden ${fieldMode ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Mobile Floating Bar */}
      {isMobile && selectedIds.size > 0 && (
          <div className={`absolute z-[100] animate-in slide-in-from-bottom-4 duration-300 bottom-8 left-4 right-4 translate-x-0`}>
              <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl rounded-2xl p-1 flex items-center gap-1 ring-4 ring-black/10 overflow-x-auto no-scrollbar max-w-full">
                  <div className="flex p-1 gap-1 shrink-0">
                      <button onClick={() => handleCreateManifestFromSelection()} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-xl transition-all text-white group whitespace-nowrap">
                          <Icon name="auto_stories" className="text-green-400" />
                          <div className="text-left">
                              <div className="text-xs font-bold">Group</div>
                          </div>
                      </button>
                      
                      {selectionDNA.hasGPS && (
                          <button onClick={() => setView('map')} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-xl transition-all text-white group whitespace-nowrap">
                              <Icon name="explore" className="text-blue-400" />
                              <div className="text-left">
                                  <div className="text-xs font-bold">Map</div>
                              </div>
                          </button>
                      )}

                      <button onClick={() => onCatalogSelection?.(Array.from(selectedIds))} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-xl transition-all text-white group whitespace-nowrap">
                          <Icon name="table_chart" className="text-amber-400" />
                          <div className="text-left">
                              <div className="text-xs font-bold">Catalog</div>
                          </div>
                      </button>

                      <div className="w-px h-8 bg-slate-700 mx-1"></div>
                      
                      <button onClick={clearSelection} className="p-3 text-slate-500 hover:text-white hover:bg-red-500/20 rounded-xl transition-all">
                          <Icon name="close" />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className={`h-16 border-b px-6 flex items-center justify-between shadow-sm z-10 shrink-0 ${cx.surface}`}>
        <div className="flex items-center gap-4">
          <h2 className={`font-bold ${fieldMode ? 'text-xl' : 'text-lg'} ${cx.accent}`}>Archive</h2>
          {!isMobile && selectedIds.size === 0 && (
              <div className="h-4 w-px bg-slate-500"></div>
          )}
          {!isMobile && selectedIds.size === 0 && (
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                  Select items to begin synthesis pipeline
              </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isMobile && (
              <div className="relative">
                <Icon name="search" className={`absolute left-3 top-2.5 text-lg ${cx.label}`} />
                <input type="text" placeholder="Filter archive..." value={filter} onChange={handleFilterChange} className={`pl-10 pr-3 py-2 border rounded-md text-sm outline-none transition-all w-64 ${fieldMode ? 'bg-slate-800 border-slate-600 text-white focus:border-yellow-400 placeholder:text-slate-600' : 'bg-slate-100 border-transparent focus:bg-white focus:border-iiif-blue'}`} />
              </div>
          )}
          <div className={`flex p-1 rounded-md ${fieldMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <button onClick={handleSetViewGrid} className={`p-2 rounded ${view === 'grid' ? (fieldMode ? 'bg-yellow-400 text-black font-bold' : 'bg-white text-iiif-blue shadow-sm') : 'text-slate-400'}`}>
              <Icon name="grid_view" />
            </button>
            <button onClick={handleSetViewList} className={`p-2 rounded ${view === 'list' ? (fieldMode ? 'bg-yellow-400 text-black font-bold' : 'bg-white text-iiif-blue shadow-sm') : 'text-slate-400'}`}>
              <Icon name="view_list" />
            </button>
            <button onClick={handleSetViewMap} className={`p-2 rounded ${view === 'map' ? (fieldMode ? 'bg-yellow-400 text-black font-bold' : 'bg-white text-iiif-blue shadow-sm') : 'text-slate-400'}`}>
              <Icon name="map" />
            </button>
            <button onClick={handleSetViewTimeline} className={`p-2 rounded ${view === 'timeline' ? (fieldMode ? 'bg-yellow-400 text-black font-bold' : 'bg-white text-iiif-blue shadow-sm') : 'text-slate-400'}`}>
              <Icon name="timeline" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Selection Bar - Integrated into header area */}
      {!isMobile && selectedIds.size > 0 && (
          <div className="w-full px-6 py-2 bg-slate-800 border-b border-slate-700 z-10 animate-in slide-in-from-top-2 flex items-center gap-4">
              <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-white">{selectedIds.size} selected</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleCreateManifestFromSelection()} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-700 rounded-lg transition-all text-white text-xs font-medium whitespace-nowrap">
                      <Icon name="auto_stories" className="text-green-400 text-sm" />
                      Group into Manifest
                  </button>

                  {selectionDNA.hasGPS && (
                      <button onClick={() => setView('map')} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-700 rounded-lg transition-all text-white text-xs font-medium whitespace-nowrap">
                          <Icon name="explore" className="text-blue-400 text-sm" />
                          View on Map
                      </button>
                  )}

                  <button onClick={() => onCatalogSelection?.(Array.from(selectedIds))} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-700 rounded-lg transition-all text-white text-xs font-medium whitespace-nowrap">
                      <Icon name="table_chart" className="text-amber-400 text-sm" />
                      Edit Metadata
                  </button>

                  <button onClick={() => onBatchEdit(Array.from(selectedIds))} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-700 rounded-lg transition-all text-white text-xs font-medium whitespace-nowrap">
                      <Icon name="edit" className="text-purple-400 text-sm" />
                      Batch Edit
                  </button>
              </div>
              <div className="flex-1"></div>
              <button onClick={clearSelection} className="p-1.5 text-slate-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-all" title="Clear selection">
                  <Icon name="close" className="text-sm" />
              </button>
          </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div
          ref={scrollContainerRef}
          className={`flex-1 overflow-y-auto custom-scrollbar pb-24 ${view === 'map' || view === 'timeline' ? 'p-0' : 'p-6'} transition-all duration-300 ${!isMobile && activeItem ? 'w-1/3 max-w-sm border-r border-slate-200' : ''} ${rubberBand.isSelecting ? 'select-none cursor-crosshair' : ''} relative`}
          onMouseDown={view === 'grid' ? handleRubberBandStart : undefined}
          onDragStart={(e) => rubberBand.isSelecting && e.preventDefault()}
        >
          {/* Rubber-band selection rectangle */}
          {rubberBandRect && (
            <div
              className="absolute pointer-events-none border-2 border-iiif-blue bg-iiif-blue/10 z-50"
              style={{
                left: rubberBandRect.left,
                top: rubberBandRect.top,
                width: rubberBandRect.width,
                height: rubberBandRect.height
              }}
            />
          )}
            {view === 'grid' && isLoading && (
            <div className="p-6">
              <GridLoading items={12} className={fieldMode ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : ''} />
            </div>
            )}
            {view === 'grid' && !isLoading && (
            <div className="rubber-band-area">
            <VirtualizedGrid
              items={filteredAssets}
              visibleRange={gridVisibleRange}
              columns={gridColumns}
              itemSize={gridItemSize}
              renderItem={(asset) => {
                const dna = getFileDNA(asset);
                const selected = isSelected(asset.id);
                const thumbUrls = resolveHierarchicalThumbs(asset, 200);
                const config = RESOURCE_TYPE_CONFIG['Canvas'];

                return (
                    <div
                    key={asset.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(asset.id, el);
                      else itemRefs.current.delete(asset.id);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, asset.id)}
                    className={`group relative rounded-lg shadow-sm cursor-pointer transition-all ${
                        fieldMode
                            ? (selected ? 'bg-slate-800 border-4 border-yellow-400 p-2' : 'bg-slate-800 border border-slate-700 p-3')
                            : (selected ? 'bg-blue-50 border border-iiif-blue ring-2 ring-iiif-blue p-2' : `bg-white border p-2 hover:shadow-md border-slate-200`)
                    }`}
                    onClick={(e) => handleItemClick(e, asset)}
                    >
                    <div className={`aspect-square rounded overflow-hidden flex items-center justify-center mb-2 relative ${fieldMode ? 'bg-black' : 'bg-slate-100'}`}>
                        <StackedThumbnail 
                          urls={thumbUrls} 
                          size="lg" 
                          className="w-full h-full"
                          icon={config.icon}
                        />
                        <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded-full flex gap-1.5 font-sans">
                            {dna.time && <Icon name="schedule" className="text-[10px] text-yellow-400" title="Has Time metadata"/>}
                            {dna.location && <Icon name="location_on" className="text-[10px] text-green-400" title="Has GPS metadata"/>}
                            {dna.device && <Icon name="photo_camera" className="text-[10px] text-blue-400" title="Has Device metadata"/>}
                        </div>
                    </div>
                    <div className="px-1 min-w-0">
                        <div className={`font-medium truncate ${fieldMode ? 'text-white text-sm' : 'text-slate-700 text-[11px]'}`}>
                            <Icon name={config.icon} className={`mr-1 text-[10px] opacity-60 ${config.colorClass}`}/>
                            {getIIIFValue(asset.label)}
                        </div>
                    </div>
                    </div>
                );
              }}
              fieldMode={fieldMode}
              activeItem={activeItem}
              isMobile={isMobile}
              filter={filter}
              onClearFilter={() => setFilter('')}
            />
            </div>
            )}
            {view === 'list' && isLoading && (
            <div className="p-6">
              <GridLoading items={8} />
            </div>
            )}
            {view === 'list' && !isLoading && <VirtualizedList assets={filteredAssets} visibleRange={listVisibleRange} onSelect={handleItemClick} isSelected={isSelected} fieldMode={fieldMode} />}
            {view === 'map' && <MapView root={root} onSelect={(item: IIIFItem) => onSelect(item)} />}
            {view === 'timeline' && <TimelineView root={root} onSelect={(item: IIIFItem) => onSelect(item)} />}
        </div>

        {!isMobile && selectedIds.size === 1 && activeItem && (
            <div className="flex-1 bg-slate-900 relative z-0 flex flex-col overflow-hidden shadow-2xl border-l border-slate-800">
                <Viewer item={activeItem} onUpdate={() => {}} />
                <button
                    onClick={clearSelection}
                    className="absolute top-3 right-3 z-50 p-2 bg-black/60 text-white/70 hover:text-white rounded-full hover:bg-red-500 transition-all backdrop-blur-md"
                    title="Close Detail View"
                >
                    <Icon name="close_fullscreen" className="text-lg"/>
                </button>
            </div>
        )}

        {/* Multi-select filmstrip at bottom */}
        {!isMobile && selectedIds.size > 1 && (
          <div className="h-28 bg-slate-900 border-t border-slate-800 shadow-2xl shrink-0">
              <MultiSelectFilmstrip
                  items={selectedAssets}
                  focusedId={activeItem?.id || null}
                  onFocus={(item) => {
                      setActiveItem(item);
                      const element = itemRefs.current.get(item.id);
                      if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                  }}
                  onClear={clearSelection}
                  fieldMode={fieldMode}
                  orientation="horizontal"
              />
          </div>
        )}
      </div>

      {/* Comprehensive Context Menu */}
      {contextMenu && (() => {
        const targetIds = contextMenu.isMulti
          ? Array.from(selectedIds)
          : [contextMenu.targetId];
        const targetAsset = assets.find(a => a.id === contextMenu.targetId);
        const targetDNA = targetAsset ? getFileDNA(targetAsset) : { time: false, location: false, device: false };
        const isMulti = contextMenu.isMulti || false;

        const sections: ContextMenuSection[] = [
          // Navigation Section
          {
            items: [
              {
                id: 'reveal-structure',
                label: 'Reveal in Structure',
                icon: 'account_tree',
                onClick: () => onReveal?.(contextMenu.targetId, 'collections')
              },
              {
                id: 'open-workbench',
                label: 'Open in Workbench',
                icon: 'auto_awesome_motion',
                onClick: () => onReveal?.(contextMenu.targetId, 'viewer')
              },
              {
                id: 'view-archive',
                label: 'View in Archive',
                icon: 'inventory_2',
                onClick: () => onReveal?.(contextMenu.targetId, 'archive')
              }
            ]
          },
          // Edit Section
          {
            title: 'Edit',
            items: [
              {
                id: 'edit-catalog',
                label: isMulti ? 'Edit Selected in Catalog' : 'Edit in Catalog',
                icon: 'table_chart',
                shortcut: 'Ctrl+E',
                onClick: () => onCatalogSelection?.(targetIds)
              },
              {
                id: 'batch-edit',
                label: 'Batch Edit',
                icon: 'edit_note',
                disabled: !isMulti && targetIds.length === 1,
                onClick: () => onBatchEdit(targetIds)
              },
              {
                id: 'duplicate',
                label: isMulti ? `Duplicate ${targetIds.length} Items` : 'Duplicate',
                icon: 'content_copy',
                onClick: () => {
                  // Duplicate logic - clone with new IDs
                  if (!onUpdate || !root) return;
                  const newRoot = JSON.parse(JSON.stringify(root)) as IIIFCollection;
                  
                  const duplicateInTree = (parent: any) => {
                    const list = parent.items || parent.annotations || [];
                    const toDuplicate: any[] = [];
                    
                    for (const item of list) {
                      if (targetIds.includes(item.id)) {
                        const duplicate = JSON.parse(JSON.stringify(item));
                        duplicate.id = `${item.id}_copy_${generateUUID().slice(0, 8)}`;
                        const originalLabel = getIIIFValue(duplicate.label);
                        duplicate.label = createLanguageMap(`${originalLabel} (Copy)`);
                        toDuplicate.push(duplicate);
                      }
                      if (item.items || item.annotations) {
                        duplicateInTree(item);
                      }
                    }
                    
                    list.push(...toDuplicate);
                  };
                  
                  duplicateInTree(newRoot);
                  onUpdate(newRoot);
                  showToast(`Duplicated ${targetIds.length} item(s)`, 'success');
                }
              }
            ]
          },
          // Organize Section
          {
            title: 'Organize',
            items: [
              {
                id: 'group-manifest',
                label: isMulti ? 'Group into New Manifest' : 'Add to New Manifest',
                icon: 'auto_stories',
                onClick: () => {
                  // Add targetIds to selection and create manifest
                  if (!isMulti) {
                    select(contextMenu.targetId);
                  }
                  handleCreateManifestFromSelection();
                }
              },
              {
                id: 'select-all',
                label: 'Select All',
                icon: 'select_all',
                shortcut: 'Ctrl+A',
                onClick: () => {
                  selectAllItems(filteredAssets.map(a => a.id));
                  showToast(`Selected ${filteredAssets.length} items`, 'info');
                }
              },
              {
                id: 'clear-selection',
                label: 'Clear Selection',
                icon: 'deselect',
                disabled: selectedIds.size === 0,
                onClick: () => {
                  clearSelection();
                  setActiveItem(null);
                }
              }
            ]
          },
          // View Section (conditional)
          ...(targetDNA.location ? [{
            title: 'View',
            items: [
              {
                id: 'view-map',
                label: isMulti ? 'View Selected on Map' : 'View on Map',
                icon: 'explore',
                onClick: () => setView('map')
              }
            ]
          }] : []),
          // Export Section
          {
            title: 'Export',
            items: [
              {
                id: 'copy-id',
                label: 'Copy IIIF ID',
                icon: 'link',
                onClick: () => {
                  navigator.clipboard.writeText(contextMenu.targetId);
                  showToast('IIIF ID copied to clipboard', 'success');
                }
              },
              {
                id: 'copy-json',
                label: isMulti ? 'Copy JSON (First Item)' : 'Copy JSON',
                icon: 'code',
                onClick: () => {
                  const asset = assets.find(a => a.id === contextMenu.targetId);
                  if (asset) {
                    navigator.clipboard.writeText(JSON.stringify(asset, null, 2));
                    showToast('JSON copied to clipboard', 'success');
                  }
                }
              }
            ]
          },
          // Danger Section
          {
            items: [
              {
                id: 'delete',
                label: isMulti ? `Delete ${targetIds.length} Items` : 'Remove from Archive',
                icon: 'delete',
                variant: 'danger',
                shortcut: 'Del',
                onClick: () => handleDelete(targetIds)
              }
            ]
          }
        ];

        return (
          <ContextMenu
            isOpen={true}
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={handleContextMenuClose}
            sections={sections}
            selectionCount={isMulti ? targetIds.length : 1}
          />
        );
      })()}
    </div>
  );
};

export const ArchiveView = React.memo(ArchiveViewComponent, (prev, next) => {
  // Custom comparison to prevent unnecessary re-renders.
  // fieldMode is read via useAppSettings inside the component — context updates
  // will trigger re-renders independently of this memo gate.
  const prevRootId = prev.root?.id;
  const nextRootId = next.root?.id;

  const prevIssueCount = Object.keys(prev.validationIssues || {}).length;
  const nextIssueCount = Object.keys(next.validationIssues || {}).length;

  return prevRootId === nextRootId &&
         prevIssueCount === nextIssueCount;
});

// Memoized Grid Item Component for ArchiveView
interface ArchiveGridItemProps {
  asset: IIIFCanvas;
  index: number;
  isSelected: boolean;
  fieldMode: boolean;
  onItemClick: (e: React.MouseEvent, asset: IIIFItem) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  itemRefCallback: (el: HTMLDivElement | null, id: string) => void;
}

const MemoizedArchiveGridItem = React.memo<ArchiveGridItemProps>(({
  asset,
  isSelected,
  fieldMode,
  onItemClick,
  onContextMenu,
  itemRefCallback
}) => {
  const dna = getFileDNA(asset);
  const thumbUrls = resolveHierarchicalThumbs(asset, 200);
  const config = RESOURCE_TYPE_CONFIG['Canvas'];

  return (
    <div
      key={asset.id}
      ref={(el) => itemRefCallback(el, asset.id)}
      onContextMenu={(e) => onContextMenu(e, asset.id)}
      className={`group relative rounded-lg shadow-sm cursor-pointer transition-all ${
        fieldMode
          ? (isSelected ? 'bg-slate-800 border-4 border-yellow-400 p-2' : 'bg-slate-800 border border-slate-700 p-3')
          : (isSelected ? 'bg-blue-50 border border-iiif-blue ring-2 ring-iiif-blue p-2' : `bg-white border p-2 hover:shadow-md border-slate-200`)
      }`}
      onClick={(e) => onItemClick(e, asset)}
    >
      <div className={`aspect-square rounded overflow-hidden flex items-center justify-center mb-2 relative ${fieldMode ? 'bg-black' : 'bg-slate-100'}`}>
        <StackedThumbnail
          urls={thumbUrls}
          size="lg"
          className="w-full h-full"
          icon={config.icon}
        />
        <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded-full flex gap-1.5 font-sans">
          {dna.time && <Icon name="schedule" className="text-[10px] text-yellow-400" title="Has Time metadata"/>}
          {dna.location && <Icon name="location_on" className="text-[10px] text-green-400" title="Has GPS metadata"/>}
          {dna.device && <Icon name="photo_camera" className="text-[10px] text-blue-400" title="Has Device metadata"/>}
        </div>
      </div>
      <div className="px-1 min-w-0">
        <div className={`font-medium truncate ${fieldMode ? 'text-white text-sm' : 'text-slate-700 text-[11px]'}`}>
          <Icon name={config.icon} className={`mr-1 text-[10px] opacity-60 ${config.colorClass}`}/>
          {getIIIFValue(asset.label)}
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  // Custom comparison: only re-render if ID or selection state changes
  return prev.asset.id === next.asset.id &&
         prev.isSelected === next.isSelected &&
         prev.fieldMode === next.fieldMode;
});

MemoizedArchiveGridItem.displayName = 'MemoizedArchiveGridItem';

// Virtualized Grid component for efficient rendering
interface VirtualizedGridProps {
  items: IIIFCanvas[];
  visibleRange: { start: number; end: number };
  columns: number;
  itemSize: { width: number; height: number };
  renderItem: (item: IIIFCanvas) => React.ReactNode;
  fieldMode: boolean;
  activeItem: IIIFCanvas | null;
  isMobile: boolean;
  filter?: string;
  onClearFilter?: () => void;
}

const VirtualizedGrid: React.FC<VirtualizedGridProps> = ({
  items,
  visibleRange,
  columns,
  itemSize,
  renderItem,
  fieldMode,
  activeItem,
  isMobile,
  filter,
  onClearFilter
}) => {
  const gap = 16;
  const rowHeight = itemSize.height + gap;
  const totalRows = Math.ceil(items.length / columns);
  const totalHeight = totalRows * rowHeight;

  const startRow = Math.floor(visibleRange.start / columns);
  const topSpacer = startRow * rowHeight;

  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const endRow = Math.ceil(visibleRange.end / columns);
  const bottomSpacer = Math.max(0, (totalRows - endRow) * rowHeight);

  // Determine grid columns class
  const gridColsClass = !isMobile && activeItem
    ? 'grid-cols-1 lg:grid-cols-2'
    : fieldMode
      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8';

  return (
    <div>
      {topSpacer > 0 && <div style={{ height: topSpacer }} aria-hidden="true" />}
      <div className={`grid gap-4 ${gridColsClass}`}>
        {visibleItems.map(renderItem)}
      </div>
      {bottomSpacer > 0 && <div style={{ height: bottomSpacer }} aria-hidden="true" />}
      {items.length === 0 && (
        <EmptyState
          icon="inventory_2"
          title={filter ? 'No items match your filter' : 'No items in archive'}
          message={filter
            ? `Try adjusting your search for "${filter}" or clear the filter to see all items.`
            : 'Import files to get started building your archive.'}
          action={filter && onClearFilter
            ? { label: 'Clear Filter', icon: 'clear', onClick: onClearFilter }
            : undefined}
          variant={fieldMode ? 'field-mode' : 'default'}
        />
      )}
    </div>
  );
};

// Virtualized List component for efficient table rendering
interface VirtualizedListProps {
  assets: IIIFCanvas[];
  visibleRange: { start: number; end: number };
  onSelect: any;
  isSelected: (id: string) => boolean;
  fieldMode: boolean;
}

const VirtualizedList: React.FC<VirtualizedListProps> = ({
  assets,
  visibleRange,
  onSelect,
  isSelected,
  fieldMode
}) => {
  const cx = useContextualStyles(fieldMode);
  const rowHeight = 56;
  const totalHeight = assets.length * rowHeight;
  const topSpacer = visibleRange.start * rowHeight;
  const visibleItems = assets.slice(visibleRange.start, visibleRange.end);
  const bottomSpacer = Math.max(0, (assets.length - visibleRange.end) * rowHeight);

  return (
    <div className={`border rounded-lg shadow-sm overflow-hidden flex flex-col ${cx.surface}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className={`${cx.headerBg} ${cx.textMuted} border-b ${cx.border} sticky top-0 z-10`}>
            <tr>
              <th className="px-4 py-3 font-medium w-10">
                <Icon name="check_box_outline_blank" className="opacity-50" />
              </th>
              <th className="px-4 py-3 font-medium">Label</th>
              <th className="px-4 py-3 font-medium w-32">Type</th>
              <th className="px-4 py-3 font-medium w-40">Date</th>
              <th className="px-4 py-3 font-medium w-32 text-right">Dimensions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${fieldMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
            {topSpacer > 0 && (
              <tr aria-hidden="true">
                <td colSpan={5} style={{ height: topSpacer, padding: 0 }} />
              </tr>
            )}
            {visibleItems.map((asset) => {
              const selected = isSelected(asset.id);
              const label = getIIIFValue(asset.label) || 'Untitled';
              const config = RESOURCE_TYPE_CONFIG[asset.type] || RESOURCE_TYPE_CONFIG['Canvas'];
              const date = asset.navDate ? new Date(asset.navDate).toLocaleDateString() : '-';
              const dims = asset.width && asset.height ? `${asset.width} x ${asset.height}` : (asset.duration ? `${asset.duration}s` : '-');

              return (
                <tr
                  key={asset.id}
                  className={`cursor-pointer transition-colors group ${
                    fieldMode
                      ? (selected ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800')
                      : (selected ? 'bg-blue-50 text-slate-900' : 'text-slate-600 hover:bg-slate-50')
                  }`}
                  onClick={(e) => onSelect(e, asset)}
                  style={{ height: rowHeight }}
                >
                  <td className="px-4 py-3">
                    <Icon
                      name={selected ? "check_box" : "check_box_outline_blank"}
                      className={`${selected ? 'text-iiif-blue' : (fieldMode ? 'text-slate-600' : 'text-slate-300')} group-hover:text-iiif-blue transition-colors`}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-3">
                      <StackedThumbnail 
                        urls={resolveHierarchicalThumbs(asset, 64)} 
                        size="xs" 
                        icon={config.icon}
                      />
                      <span className="truncate max-w-[200px] md:max-w-md" title={label}>{label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] uppercase font-black px-2 py-1 rounded border ${
                      fieldMode
                        ? 'bg-slate-950 border-slate-800 text-slate-400'
                        : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}>
                      {asset.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs opacity-70">{date}</td>
                  <td className="px-4 py-3 font-mono text-xs opacity-70 text-right">{dims}</td>
                </tr>
              );
            })}
            {bottomSpacer > 0 && (
              <tr aria-hidden="true">
                <td colSpan={5} style={{ height: bottomSpacer, padding: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {assets.length === 0 && (
        <EmptyState
          icon="inventory_2"
          title="No items in archive"
          message="Import files to get started building your archive."
          variant={fieldMode ? 'field-mode' : 'default'}
        />
      )}
    </div>
  );
};

// Skeleton loading component for grid
interface SkeletonGridProps {
  count?: number;
  fieldMode?: boolean;
}

const SkeletonGrid: React.FC<SkeletonGridProps> = ({ count = 8, fieldMode }) => {
  return (
    <div className={`grid gap-4 ${fieldMode ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded-lg border p-3 ${
            fieldMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <div className={`aspect-square rounded mb-2 ${fieldMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
          <div className={`h-4 rounded w-3/4 ${fieldMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
        </div>
      ))}
    </div>
  );
};
