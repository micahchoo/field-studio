
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { IIIFItem, IIIFCanvas, ResourceState, getIIIFValue, IIIFCollection, AppMode } from '../../types';
import { ValidationIssue } from '../../services/validator';
import { Icon } from '../Icon';
import { MapView } from './MapView';
import { TimelineView } from './TimelineView';
import { MuseumLabel } from '../MuseumLabel';
import { useToast } from '../Toast';
import { RESOURCE_TYPE_CONFIG } from '../../constants';
import { Viewer } from './Viewer';
import {
  isValidChildType,
  getRelationshipType,
  findCanvasParent
} from '../../utils/iiifHierarchy';

// Virtualization hook for efficient rendering of large lists
const useVirtualization = (totalItems: number, itemHeight: number, containerRef: React.RefObject<HTMLDivElement | null>, overscan = 5) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateVisibleRange = () => {
      const scrollTop = container.scrollTop;
      const viewportHeight = container.clientHeight;

      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const visibleCount = Math.ceil(viewportHeight / itemHeight);
      const end = Math.min(totalItems, start + visibleCount + overscan * 2);

      setVisibleRange(prev => {
        if (prev.start === start && prev.end === end) return prev;
        return { start, end };
      });
    };

    updateVisibleRange();
    container.addEventListener('scroll', updateVisibleRange, { passive: true });
    window.addEventListener('resize', updateVisibleRange);

    return () => {
      container.removeEventListener('scroll', updateVisibleRange);
      window.removeEventListener('resize', updateVisibleRange);
    };
  }, [totalItems, itemHeight, containerRef, overscan]);

  return visibleRange;
};

// Grid virtualization for 2D layouts
const useGridVirtualization = (
  totalItems: number,
  itemSize: { width: number; height: number },
  containerRef: React.RefObject<HTMLDivElement | null>,
  columnsOverride?: number,
  overscan = 2
) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const [columns, setColumns] = useState(columnsOverride || 4);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateVisibleRange = () => {
      const scrollTop = container.scrollTop;
      const viewportHeight = container.clientHeight;
      const viewportWidth = container.clientWidth;

      // Calculate columns based on container width
      const gap = 16; // 1rem gap
      const padding = 48; // 1.5rem padding on each side
      const availableWidth = viewportWidth - padding;
      const calculatedColumns = columnsOverride || Math.max(1, Math.floor(availableWidth / (itemSize.width + gap)));
      setColumns(calculatedColumns);

      const rowHeight = itemSize.height + gap;
      const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
      const visibleRows = Math.ceil(viewportHeight / rowHeight);
      const endRow = startRow + visibleRows + overscan * 2;

      const start = startRow * calculatedColumns;
      const end = Math.min(totalItems, endRow * calculatedColumns);

      setVisibleRange(prev => {
        if (prev.start === start && prev.end === end) return prev;
        return { start, end };
      });
    };

    updateVisibleRange();
    container.addEventListener('scroll', updateVisibleRange, { passive: true });
    window.addEventListener('resize', updateVisibleRange);

    // Use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(updateVisibleRange);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', updateVisibleRange);
      window.removeEventListener('resize', updateVisibleRange);
      resizeObserver.disconnect();
    };
  }, [totalItems, itemSize, containerRef, columnsOverride, overscan]);

  return { visibleRange, columns };
};

interface ArchiveViewProps {
  root: IIIFItem | null;
  onSelect: (item: IIIFItem) => void;
  onOpen: (item: IIIFItem) => void;
  onBatchEdit: (ids: string[]) => void;
  onUpdate?: (newRoot: IIIFItem) => void;
  validationIssues?: Record<string, ValidationIssue[]>;
  fieldMode: boolean;
  onReveal?: (id: string, mode: 'collections' | 'viewer' | 'archive') => void;
  onCatalogSelection?: (ids: string[]) => void;
}

const getFileDNA = (item: IIIFItem) => {
    const has = { time: false, location: false, device: false };
    if (item.metadata) {
        const date = item.navDate || item.metadata.find(m => getIIIFValue(m.label).toLowerCase() === 'date created')?.value?.['en']?.[0];
        if (date) has.time = true;
        const loc = item.metadata.find(m => getIIIFValue(m.label).toLowerCase() === 'location')?.value?.['en']?.[0];
        if (loc) has.location = true;
        const camera = item.metadata.find(m => getIIIFValue(m.label).toLowerCase() === 'camera')?.value?.['en']?.[0];
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

export const ArchiveView: React.FC<ArchiveViewProps> = ({ root, onSelect, onOpen, onBatchEdit, onUpdate, validationIssues = {}, fieldMode, onReveal, onCatalogSelection }) => {
  const { showToast } = useToast();
  const [view, setView] = useState<'grid' | 'list' | 'map' | 'timeline'>('grid');
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, id: string } | null>(null);
  const [activeItem, setActiveItem] = useState<IIIFCanvas | null>(null);
  const [lastClickedId, setLastClickedId] = useState<string | null>(null); // For shift+click range selection

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
  const isMobile = window.innerWidth < 768;

  const assets = useMemo(() => {
    if (!root) return [];
    const results: IIIFCanvas[] = [];
    const traverse = (item: IIIFItem) => {
      if (item.type === 'Canvas') results.push(item as IIIFCanvas);
      if (item.items) item.items.forEach(traverse);
    };
    traverse(root);
    return results;
  }, [root]);

  const selectedAssets = useMemo(() => assets.filter(a => selectedIds.has(a.id)), [assets, selectedIds]);

  const selectionDNA = useMemo(() => {
    const dna = { hasGPS: false, hasTime: false, commonPrefix: '' };
    if (selectedAssets.length > 0) {
        dna.hasGPS = selectedAssets.some(a => getFileDNA(a).location);
        dna.hasTime = selectedAssets.some(a => getFileDNA(a).time);
    }
    return dna;
  }, [selectedAssets]);

  useEffect(() => {
      if (selectedIds.size === 1) {
          const id = Array.from(selectedIds)[0];
          const item = assets.find(a => a.id === id);
          setActiveItem(item || null);
      } else {
          setActiveItem(null);
      }
  }, [selectedIds, assets]);

  const filteredAssets = assets.filter(a =>
    getIIIFValue(a.label).toLowerCase().includes(filter.toLowerCase())
  ).sort((a, b) => {
      if (sortBy === 'name') return getIIIFValue(a.label).localeCompare(getIIIFValue(b.label));
      return (b.navDate || '').localeCompare(a.navDate || '');
  });

  // Virtualization for grid view - estimate item size based on mode
  const gridItemSize = useMemo(() => {
    if (activeItem && !isMobile) return { width: 160, height: 180 }; // Compact when detail view is open
    if (fieldMode) return { width: 200, height: 220 };
    return { width: 140, height: 160 };
  }, [activeItem, isMobile, fieldMode]);

  const { visibleRange: gridVisibleRange, columns: gridColumns } = useGridVirtualization(
    filteredAssets.length,
    gridItemSize,
    scrollContainerRef,
    undefined,
    3
  );

  // Virtualization for list view
  const listVisibleRange = useVirtualization(
    filteredAssets.length,
    56, // Approximate row height
    scrollContainerRef,
    10
  );

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

  const handleCreateManifestFromSelection = () => {
      if (!root || !onUpdate || selectedIds.size === 0) return;
      const newRoot = JSON.parse(JSON.stringify(root)) as IIIFCollection;
      const canvasesToMove: any[] = [];

      // Validate that selected items are Canvases (the only valid child of Manifest)
      const removeCanvases = (parent: any) => {
          const list = parent.items || parent.annotations || [];
          for (let i = list.length - 1; i >= 0; i--) {
              const item = list[i];
              if (selectedIds.has(item.id)) {
                  // Only move Canvases - use IIIF hierarchy validation
                  if (item.type === 'Canvas' && isValidChildType('Manifest', item.type)) {
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

      const manifestId = `https://archive.local/iiif/manifest/${crypto.randomUUID()}`;

      // Create new Manifest with proper IIIF 3.0 structure
      // Manifest → Canvas is an OWNERSHIP relationship (exclusive)
      const relationship = getRelationshipType('Manifest', 'Canvas');
      console.log(`Creating Manifest with ${canvasesToMove.length} Canvases (${relationship} relationship)`);

      const newManifest: any = {
          "@context": "http://iiif.io/api/presentation/3/context.json",
          id: manifestId,
          type: 'Manifest',
          label: { none: ['Selection Bundle'] },
          items: canvasesToMove,
          behavior: ['individuals'] // Default behavior for new Manifests
      };

      // Validate that Manifest can be added to Collection (REFERENCE relationship)
      if (!newRoot.items) newRoot.items = [];
      if (isValidChildType(newRoot.type, 'Manifest')) {
          newRoot.items.push(newManifest);
          onUpdate(newRoot);
          setSelectedIds(new Set([manifestId]));
          showToast(`Grouped ${canvasesToMove.length} Canvases into new Manifest`, "success");
      } else {
          showToast(`Cannot add Manifest to ${newRoot.type}`, "error");
      }
  };

  const handleItemClick = (e: React.MouseEvent, asset: IIIFItem) => {
      if (e.shiftKey && lastClickedId) {
          // Shift+click: range selection
          e.stopPropagation();
          const startIdx = filteredAssets.findIndex(a => a.id === lastClickedId);
          const endIdx = filteredAssets.findIndex(a => a.id === asset.id);
          if (startIdx !== -1 && endIdx !== -1) {
              const [minIdx, maxIdx] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
              const rangeIds = filteredAssets.slice(minIdx, maxIdx + 1).map(a => a.id);
              const newSet = new Set(selectedIds);
              rangeIds.forEach(id => newSet.add(id));
              setSelectedIds(newSet);
          }
      } else if (e.metaKey || e.ctrlKey) {
          // Ctrl/Cmd+click: toggle selection
          e.stopPropagation();
          const newSet = new Set(selectedIds);
          if (newSet.has(asset.id)) newSet.delete(asset.id);
          else newSet.add(asset.id);
          setSelectedIds(newSet);
          setLastClickedId(asset.id);
      } else {
          // Regular click: select single item
          onSelect(asset);
          setSelectedIds(new Set([asset.id]));
          setLastClickedId(asset.id);
      }
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, id });
  };

  const handleDelete = useCallback((idsToDelete: string[]) => {
      if (!onUpdate || !root) return;
      if (!confirm(`Permanently remove ${idsToDelete.length} item(s)?`)) return;
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
      setSelectedIds(new Set());
      showToast("Archive modified", "success");
  }, [onUpdate, root, showToast]);

  // Keyboard shortcuts for selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Ctrl/Cmd+A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedIds(new Set(filteredAssets.map(a => a.id)));
        showToast(`Selected ${filteredAssets.length} items`, 'info');
      }

      // Escape: Clear selection and close detail view
      if (e.key === 'Escape') {
        if (selectedIds.size > 0) {
          setSelectedIds(new Set());
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
  }, [filteredAssets, selectedIds, showToast, handleDelete]);

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

  const handleRubberBandMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!rubberBand.isSelecting) return;

    const container = scrollContainerRef.current;
    if (!container || !rubberBand.containerRect) return;

    const x = e.clientX - rubberBand.containerRect.left + container.scrollLeft;
    const y = e.clientY - rubberBand.containerRect.top + container.scrollTop;

    setRubberBand(prev => ({
      ...prev,
      currentX: x,
      currentY: y
    }));
  }, [rubberBand.isSelecting, rubberBand.containerRect]);

  const handleRubberBandEnd = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!rubberBand.isSelecting) return;

    const container = scrollContainerRef.current;
    if (!container) {
      setRubberBand(prev => ({ ...prev, isSelecting: false }));
      return;
    }

    // Calculate selection rectangle bounds
    const selectionRect = {
      left: Math.min(rubberBand.startX, rubberBand.currentX),
      right: Math.max(rubberBand.startX, rubberBand.currentX),
      top: Math.min(rubberBand.startY, rubberBand.currentY),
      bottom: Math.max(rubberBand.startY, rubberBand.currentY)
    };

    // Minimum drag distance to count as rubber-band (avoid accidental selections)
    const width = selectionRect.right - selectionRect.left;
    const height = selectionRect.bottom - selectionRect.top;
    if (width < 10 && height < 10) {
      setRubberBand(prev => ({ ...prev, isSelecting: false }));
      return;
    }

    // Find items within the selection rectangle
    const newSelectedIds = new Set<string>(e.shiftKey ? selectedIds : []);
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

    setSelectedIds(newSelectedIds);
    setRubberBand(prev => ({ ...prev, isSelecting: false }));
  }, [rubberBand, selectedIds]);

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
                      <button onClick={handleCreateManifestFromSelection} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-xl transition-all text-white group whitespace-nowrap">
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
                      
                      <button onClick={() => setSelectedIds(new Set())} className="p-3 text-slate-500 hover:text-white hover:bg-red-500/20 rounded-xl transition-all">
                          <Icon name="close" />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className={`h-16 border-b px-6 flex items-center justify-between shadow-sm z-10 shrink-0 ${fieldMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <h2 className={`font-bold ${fieldMode ? 'text-xl text-yellow-400' : 'text-lg text-slate-800'}`}>Archive</h2>
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
                <Icon name="search" className={`absolute left-3 top-2.5 text-lg ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <input type="text" placeholder="Filter archive..." value={filter} onChange={(e) => setFilter(e.target.value)} className={`pl-10 pr-3 py-2 border rounded-md text-sm outline-none transition-all w-64 ${fieldMode ? 'bg-slate-800 border-slate-600 text-white focus:border-yellow-400 placeholder:text-slate-600' : 'bg-slate-100 border-transparent focus:bg-white focus:border-iiif-blue'}`} />
              </div>
          )}
          <div className={`flex p-1 rounded-md ${fieldMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
            {['grid', 'list', 'map', 'timeline'].map((v: any) => (
              <button key={v} onClick={() => setView(v)} className={`p-2 rounded ${view === v ? (fieldMode ? 'bg-yellow-400 text-black font-bold' : 'bg-white text-iiif-blue shadow-sm') : 'text-slate-400'}`}>
                <Icon name={v === 'grid' ? 'grid_view' : v === 'list' ? 'view_list' : v} />
              </button>
            ))}
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
                  <button onClick={handleCreateManifestFromSelection} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-700 rounded-lg transition-all text-white text-xs font-medium whitespace-nowrap">
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
              <button onClick={() => setSelectedIds(new Set())} className="p-1.5 text-slate-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-all" title="Clear selection">
                  <Icon name="close" className="text-sm" />
              </button>
          </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div
          ref={scrollContainerRef}
          className={`flex-1 overflow-y-auto custom-scrollbar pb-24 ${view === 'map' || view === 'timeline' ? 'p-0' : 'p-6'} transition-all duration-300 ${!isMobile && activeItem ? 'w-1/3 max-w-sm border-r border-slate-200' : ''} ${rubberBand.isSelecting ? 'select-none cursor-crosshair' : ''} relative`}
          onMouseDown={view === 'grid' ? handleRubberBandStart : undefined}
          onMouseMove={view === 'grid' ? handleRubberBandMove : undefined}
          onMouseUp={view === 'grid' ? handleRubberBandEnd : undefined}
          onMouseLeave={view === 'grid' ? handleRubberBandEnd : undefined}
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
            {view === 'grid' && (
            <div className="rubber-band-area">
            <VirtualizedGrid
              items={filteredAssets}
              visibleRange={gridVisibleRange}
              columns={gridColumns}
              itemSize={gridItemSize}
              renderItem={(asset) => {
                const dna = getFileDNA(asset);
                const isSelected = selectedIds.has(asset.id);
                const paintingBody = asset.items?.[0]?.items?.[0]?.body as any;
                const imageUrl = asset.thumbnail?.[0]?.id || paintingBody?.id || asset._blobUrl;
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
                            ? (isSelected ? 'bg-slate-800 border-4 border-yellow-400 p-2' : 'bg-slate-800 border border-slate-700 p-3')
                            : (isSelected ? 'bg-blue-50 border border-iiif-blue ring-2 ring-iiif-blue p-2' : `bg-white border p-2 hover:shadow-md border-slate-200`)
                    }`}
                    onClick={(e) => handleItemClick(e, asset)}
                    >
                    <div className={`aspect-square rounded overflow-hidden flex items-center justify-center mb-2 relative ${fieldMode ? 'bg-black' : 'bg-slate-100'}`}>
                        {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" loading="lazy" /> : null}
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
            />
            </div>
            )}
            {view === 'list' && <VirtualizedList assets={filteredAssets} visibleRange={listVisibleRange} onSelect={handleItemClick} selectedIds={selectedIds} fieldMode={fieldMode} />}
            {view === 'map' && <MapView root={root} onSelect={(item: IIIFItem) => onSelect(item)} />}
            {view === 'timeline' && <TimelineView root={root} onSelect={(item: IIIFItem) => onSelect(item)} />}
        </div>

        {!isMobile && activeItem && (
            <div className="flex-1 bg-slate-900 relative z-0 flex flex-col overflow-hidden shadow-2xl border-l border-slate-800">
                <Viewer item={activeItem} onUpdate={() => {}} />
                <button 
                    onClick={() => setSelectedIds(new Set())}
                    className="absolute top-3 right-3 z-50 p-2 bg-black/60 text-white/70 hover:text-white rounded-full hover:bg-red-500 transition-all backdrop-blur-md"
                    title="Close Detail View"
                >
                    <Icon name="close_fullscreen" className="text-lg"/>
                </button>
            </div>
        )}
      </div>

      {contextMenu && (
          <div className="fixed z-[1000] bg-white border border-slate-200 shadow-2xl rounded-xl py-2 min-w-[200px]" style={{ left: contextMenu.x, top: contextMenu.y }}>
              <button onClick={() => { const id = contextMenu.id as string; onReveal?.(id, 'collections'); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"><Icon name="account_tree" className="text-slate-400"/> Reveal in Structure</button>
              <button onClick={() => { const id = contextMenu.id as string; onReveal?.(id, 'viewer'); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"><Icon name="auto_awesome_motion" className="text-slate-400"/> Open in Workbench</button>
              <button onClick={() => { onCatalogSelection?.([contextMenu.id]); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"><Icon name="table_chart" className="text-slate-400"/> Edit in Catalog</button>
              <div className="h-px bg-slate-100 my-1"></div>
              <button onClick={() => handleDelete([contextMenu.id])} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-red-600"><Icon name="delete" className="text-red-400"/> Remove from Archive</button>
          </div>
      )}
    </div>
  );
};

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
}

const VirtualizedGrid: React.FC<VirtualizedGridProps> = ({
  items,
  visibleRange,
  columns,
  itemSize,
  renderItem,
  fieldMode,
  activeItem,
  isMobile
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
        <div className="p-8 text-center text-slate-400 italic">No items found</div>
      )}
    </div>
  );
};

// Virtualized List component for efficient table rendering
interface VirtualizedListProps {
  assets: IIIFCanvas[];
  visibleRange: { start: number; end: number };
  onSelect: any;
  selectedIds: Set<string>;
  fieldMode: boolean;
}

const VirtualizedList: React.FC<VirtualizedListProps> = ({
  assets,
  visibleRange,
  onSelect,
  selectedIds,
  fieldMode
}) => {
  const rowHeight = 56;
  const totalHeight = assets.length * rowHeight;
  const topSpacer = visibleRange.start * rowHeight;
  const visibleItems = assets.slice(visibleRange.start, visibleRange.end);
  const bottomSpacer = Math.max(0, (assets.length - visibleRange.end) * rowHeight);

  return (
    <div className={`border rounded-lg shadow-sm overflow-hidden flex flex-col ${fieldMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className={`${fieldMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-500'} border-b ${fieldMode ? 'border-slate-700' : 'border-slate-200'} sticky top-0 z-10`}>
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
              const isSelected = selectedIds.has(asset.id);
              const label = getIIIFValue(asset.label) || 'Untitled';
              const config = RESOURCE_TYPE_CONFIG[asset.type] || RESOURCE_TYPE_CONFIG['Canvas'];
              const date = asset.navDate ? new Date(asset.navDate).toLocaleDateString() : '-';
              const dims = asset.width && asset.height ? `${asset.width} x ${asset.height}` : (asset.duration ? `${asset.duration}s` : '-');

              return (
                <tr
                  key={asset.id}
                  className={`cursor-pointer transition-colors group ${
                    fieldMode
                      ? (isSelected ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800')
                      : (isSelected ? 'bg-blue-50 text-slate-900' : 'text-slate-600 hover:bg-slate-50')
                  }`}
                  onClick={(e) => onSelect(e, asset)}
                  style={{ height: rowHeight }}
                >
                  <td className="px-4 py-3">
                    <Icon
                      name={isSelected ? "check_box" : "check_box_outline_blank"}
                      className={`${isSelected ? 'text-iiif-blue' : (fieldMode ? 'text-slate-600' : 'text-slate-300')} group-hover:text-iiif-blue transition-colors`}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 overflow-hidden ${fieldMode ? 'bg-black' : 'bg-slate-100'}`}>
                        {(asset as any).thumbnail?.[0]?.id || asset._blobUrl ? (
                          <img src={(asset as any).thumbnail?.[0]?.id || asset._blobUrl} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <Icon name={config.icon} className={`${config.colorClass} opacity-70`} />
                        )}
                      </div>
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
        <div className="p-8 text-center text-slate-400 italic">No items found</div>
      )}
    </div>
  );
};

const AssetList: React.FC<{ assets: IIIFCanvas[], onSelect: any, selectedIds: Set<string>, fieldMode: boolean }> = ({ assets, onSelect, selectedIds, fieldMode }) => {
    return (
    <div className={`border rounded-lg shadow-sm overflow-hidden flex flex-col ${fieldMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead className={`${fieldMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-500'} border-b ${fieldMode ? 'border-slate-700' : 'border-slate-200'}`}>
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
                {assets.map((asset) => {
                    const isSelected = selectedIds.has(asset.id);
                    const label = getIIIFValue(asset.label) || 'Untitled';
                    const config = RESOURCE_TYPE_CONFIG[asset.type] || RESOURCE_TYPE_CONFIG['Canvas'];
                    const date = asset.navDate ? new Date(asset.navDate).toLocaleDateString() : '-';
                    const dims = asset.width && asset.height ? `${asset.width} x ${asset.height}` : (asset.duration ? `${asset.duration}s` : '-');

                    return (
                        <tr 
                            key={asset.id} 
                            className={`cursor-pointer transition-colors group ${
                                fieldMode 
                                    ? (isSelected ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800') 
                                    : (isSelected ? 'bg-blue-50 text-slate-900' : 'text-slate-600 hover:bg-slate-50')
                            }`} 
                            onClick={(e) => onSelect(e, asset)}
                        >
                            <td className="px-4 py-3">
                                <Icon 
                                    name={isSelected ? "check_box" : "check_box_outline_blank"} 
                                    className={`${isSelected ? 'text-iiif-blue' : (fieldMode ? 'text-slate-600' : 'text-slate-300')} group-hover:text-iiif-blue transition-colors`} 
                                />
                            </td>
                            <td className="px-4 py-3 font-medium">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 overflow-hidden ${fieldMode ? 'bg-black' : 'bg-slate-100'}`}>
                                        {(asset as any).thumbnail?.[0]?.id || asset._blobUrl ? (
                                            <img src={(asset as any).thumbnail?.[0]?.id || asset._blobUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <Icon name={config.icon} className={`${config.colorClass} opacity-70`} />
                                        )}
                                    </div>
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
            </tbody>
            </table>
        </div>
        {assets.length === 0 && (
            <div className="p-8 text-center text-slate-400 italic">No items found</div>
        )}
    </div>
)};
