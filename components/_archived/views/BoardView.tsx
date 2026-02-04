
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppSettings, ConnectionType, getIIIFValue, IIIFAnnotation, IIIFAnnotationPage, IIIFCanvas, IIIFItem, IIIFManifest, isCanvas, LanguageString } from '../../types';
import { ARIA_LABELS, DEFAULT_INGEST_PREFS, IIIF_CONFIG, IIIF_SPEC, KEYBOARD, REDUCED_MOTION } from '../../constants';
import { Icon } from '../Icon';
import { useToast } from '../Toast';
import { Inspector } from '../Inspector';
import { saveAs } from 'file-saver';
import { usePanZoomGestures, useViewport } from '../../hooks';
import { useHistory } from '../../hooks/useHistory';
import { PolygonAnnotationTool } from '../PolygonAnnotationTool';
import { ImageRequestWorkbench } from '../ImageRequestWorkbench';
import { CanvasComposer } from '../CanvasComposer';
import { resolveHierarchicalThumbs } from '../../utils/imageSourceResolver';
import { StackedThumbnail } from '../StackedThumbnail';
import { BoardDesignPanel } from '../BoardDesignPanel';
import { ItemPreviewPanel } from '../ItemPreviewPanel';
import { ItemDetailModal } from '../ItemDetailModal';
import { BoardExportDialog } from '../BoardExportDialog';
import { createLanguageMap, generateUUID } from '../../utils/iiifTypes';
import { sanitizeSvg } from '../../utils/sanitization';
import { useTerminology } from '../../hooks/useTerminology';

export type AnchorSide = 'T' | 'R' | 'B' | 'L';

interface BoardItem {
  id: string;
  resourceId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  resourceType: string;
  label: string;
  blobUrl?: string;
  blobUrls?: string[];
  annotation?: string;
  isNote?: boolean;
  isMetadataNode?: boolean; // For dynamic metadata linking
  annotations?: IIIFAnnotation[]; // Drawing annotations
  layers?: any[]; // Composed layers
  // Full IIIF properties
  metadata?: IIIFItem['metadata'];
  summary?: IIIFItem['summary'];
  requiredStatement?: IIIFItem['requiredStatement'];
  rights?: IIIFItem['rights'];
  provider?: IIIFItem['provider'];
  behavior?: IIIFItem['behavior'];
}

interface Connection {
  id: string;
  fromId: string;
  toId: string;
  type: ConnectionType;
  label?: string;
  fromAnchor?: AnchorSide;
  toAnchor?: AnchorSide;
  waypoints?: { x: number, y: number }[];
  // Visual properties
  style?: 'straight' | 'elbow' | 'curved';
  color?: string;
  direction?: 'auto' | 'horizontal-first' | 'vertical-first';
  purpose?: string; // IIIF motivation
  displayMode?: 'none' | 'purpose-only' | 'full';
  // Full IIIF properties for connection (Annotation)
  metadata?: IIIFItem['metadata'];
  summary?: IIIFItem['summary'];
  requiredStatement?: IIIFItem['requiredStatement'];
  rights?: IIIFItem['rights'];
}

interface BoardState {
    items: BoardItem[];
    connections: Connection[];
}

export const BoardView: React.FC<{ root: IIIFItem | null, settings: AppSettings }> = ({ root, settings }) => {
  const { showToast } = useToast();
  const { t, isAdvanced } = useTerminology({ level: settings.abstractionLevel });

  // History state
  const { state: board, update: updateBoard, undo, redo, canUndo, canRedo } = useHistory<BoardState>({
      items: [],
      connections: []
  });

  const { items, connections } = board;

  // Tools: select (with pan via space/middle-mouse), connect, note
  const [tool, setTool] = useState<'select' | 'connect' | 'note'>('select');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [connectingStart, setConnectingStart] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [mode, setMode] = useState<'edit' | 'view'>('edit');

  // Unified viewport management
  const viewport = useViewport({
    minScale: 0.1,
    maxScale: 5,
    initialScale: 1,
  });

  // Convenience access to viewport state
  const viewState = viewport.viewport;
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Tool Modals
  const [showAnnotationTool, setShowAnnotationTool] = useState(false);
  const [showWorkbench, setShowWorkbench] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showItemDetail, setShowItemDetail] = useState<BoardItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  // Pan/zoom gesture handling
  const gestures = usePanZoomGestures(containerRef, viewport, {
    enabled: true,
    panButton: 'middle',
    requireCtrlForZoom: true, // Ctrl+wheel to zoom, plain wheel to pan
    enableWheelPan: true,
  });

  // Derived isPanning from gestures (pan is now part of select tool via space/middle-mouse)
  const {isPanning} = gestures;

  // Convert screen coordinates to canvas coordinates (accounting for pan/zoom)
  const getCanvasCoords = useCallback((e: React.MouseEvent | MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    let x = (e.clientX - rect.left - viewState.x) / viewState.scale;
    let y = (e.clientY - rect.top - viewState.y) / viewState.scale;

    if (snapToGrid) {
        x = Math.round(x / 24) * 24;
        y = Math.round(y / 24) * 24;
    }

    return { x, y };
  }, [viewState, snapToGrid]);

  // Convert canvas coordinates to screen (for lines)
  const toScreen = (x: number, y: number) => ({
      x: x * viewState.scale + viewState.x,
      y: y * viewState.scale + viewState.y
  });

  // Handle Drag & Drop from Archive
  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const itemId = e.dataTransfer.getData('application/iiif-item-id');
      if (!itemId || !root) return;
      const coords = getCanvasCoords(e as any);
      
      const findItem = (node: IIIFItem): IIIFItem | null => {
          if (node.id === itemId) return node;
          if (node.items) for (const c of node.items) { const f = findItem(c); if (f) return f; }
          return null;
      };
      const resource = findItem(root);
      const label = resource?.label ? new LanguageString(resource.label).get() : 'New Item';
      
      // Better resolution strategy:
      // 1. Local blob (new uploads)
      // 2. Painting annotation body (full IIIF image)
      // 3. Thumbnail (fallback)
      let blob = (resource as any)._blobUrl;
      if (!blob && resource && isCanvas(resource)) {
          const painting = (resource as any).items?.[0]?.items?.[0]?.body;
          if (painting?.id) blob = painting.id;
      }
      if (!blob) {
          blob = (resource as any).thumbnail?.[0]?.id;
      }

      const blobUrls = resolveHierarchicalThumbs(resource, 400);

      updateBoard(prev => ({
          ...prev,
          items: [...prev.items, {
            id: generateUUID(),
            resourceId: itemId,
            resourceType: resource?.type || 'Resource',
            label,
            blobUrl: blob,
            blobUrls,
            x: coords.x - 100,
            y: coords.y - 75,
            w: 200,
            h: 150
        }]
      }));
      showToast("Resource pinned to research board", "success");
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      // Middle click or Spacebar or Shift for panning (pan merged into select)
      if (e.button === 1 || e.shiftKey || gestures.isPanModeActive) {
          gestures.handlers.onMouseDown(e);
          return;
      }

      if (mode === 'view') return;

      if (tool === 'note') {
          const coords = getCanvasCoords(e);
          updateBoard(prev => ({
              ...prev,
              items: [...prev.items, {
                  id: generateUUID(),
                  resourceId: `urn:note:${generateUUID()}`,
                  resourceType: 'Annotation',
                  label: 'New Note',
                  annotation: 'Double click to edit...',
                  isNote: true,
                  x: coords.x - 100,
                  y: coords.y - 75,
                  w: 200,
                  h: 150
              }]
          }));
          setTool('select');
      } else {
          // Deselect
          setActiveId(null);
          setSelectedConnectionId(null);
      }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent | MouseEvent) => {
    // Panning is handled by gesture system
    if (gestures.isPanning) {
        gestures.handlers.onMouseMove(e as React.MouseEvent);
        return;
    }

    if (!draggingId && !connectingStart && e.type !== 'mousemove') return;

    const coords = getCanvasCoords(e as React.MouseEvent);
    setMousePos(coords);

    if (draggingId && tool === 'select') {
        updateBoard(prev => ({
            ...prev,
            items: prev.items.map(it => it.id === draggingId ? { ...it, x: coords.x, y: coords.y } : it)
        }));
    }
  }, [draggingId, connectingStart, tool, getCanvasCoords, gestures, updateBoard]);

  const handleGlobalMouseUp = useCallback(() => {
    setDraggingId(null);
    setConnectingStart(null);
  }, []);

  useEffect(() => {
      if (draggingId || connectingStart) {
          window.addEventListener('mousemove', handleMouseMove as any);
          window.addEventListener('mouseup', handleGlobalMouseUp);
          return () => {
              window.removeEventListener('mousemove', handleMouseMove as any);
              window.removeEventListener('mouseup', handleGlobalMouseUp);
          };
      }
  }, [draggingId, connectingStart, handleMouseMove, handleGlobalMouseUp]);

  const [activeAnchor, setActiveAnchor] = useState<{ id: string, side: AnchorSide } | null>(null);

  const handleItemDown = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (mode === 'view') return;

      setActiveId(id);
      setSelectedConnectionId(null);
      if (tool === 'select') {
          setDraggingId(id);
      } else {
          // If we clicked near an anchor, start connecting from there
          // Handled by anchor hit areas now
      }
  };

  const handleItemUp = (id: string) => {
    if (tool === 'connect' && connectingStart && connectingStart !== id) {
        const exists = connections.some(c =>
            (c.fromId === connectingStart && c.toId === id && c.fromAnchor === activeAnchor?.side)
        );
        if (!exists) {
            updateBoard(prev => ({
                ...prev,
                connections: [...prev.connections, {
                    id: generateUUID(),
                    fromId: connectingStart,
                    toId: id,
                    type: 'relatesTo',
                    fromAnchor: activeAnchor?.side || 'B',
                    toAnchor: 'T',
                    style: 'elbow', // Default to elbow style
                    direction: 'auto',
                    color: '#3b82f6',
                    purpose: 'linking',
                    displayMode: 'full'
                }]
            }));
            showToast("Archive connection synthesized", "success");
        }
    }
    setDraggingId(null);
    setConnectingStart(null);
    setActiveAnchor(null);
  };

  const applyTemplate = (type: 'grid' | 'sequence' | 'comparison') => {
      const newItems: BoardItem[] = [];
      const startX = -viewState.x / viewState.scale + 100;
      const startY = -viewState.y / viewState.scale + 100;

      if (type === 'grid') {
          for (let i = 0; i < 4; i++) {
              newItems.push({
                  id: generateUUID(),
                  resourceId: `urn:placeholder:${generateUUID()}`,
                  resourceType: 'Canvas',
                  label: `Grid Item ${i+1}`,
                  x: startX + (i % 2) * 220,
                  y: startY + Math.floor(i / 2) * 170,
                  w: 200, h: 150
              });
          }
      } else if (type === 'sequence') {
          for (let i = 0; i < 3; i++) {
              newItems.push({
                  id: generateUUID(),
                  resourceId: `urn:placeholder:${generateUUID()}`,
                  resourceType: 'Canvas',
                  label: `Step ${i+1}`,
                  x: startX + i * 250,
                  y: startY,
                  w: 200, h: 150
              });
          }
      } else if (type === 'comparison') {
          newItems.push({ id: generateUUID(), resourceId: `urn:p1:${generateUUID()}`, resourceType: 'Canvas', label: 'Object A', x: startX, y: startY, w: 300, h: 400 });
          newItems.push({ id: generateUUID(), resourceId: `urn:p2:${generateUUID()}`, resourceType: 'Canvas', label: 'Object B', x: startX + 320, y: startY, w: 300, h: 400 });
      }

      updateBoard(prev => ({
          ...prev,
          items: [...prev.items, ...newItems]
      }));
      setShowTemplates(false);
      showToast("Template applied", "success");
  };

  // Anchor offset for external anchor positioning (increased for clearer visibility)
  const ANCHOR_OFFSET = 24;

  const getAnchorPos = (id: string, side: AnchorSide = 'B') => {
      const it = items.find(i => i.id === id);
      if (!it) return { x: 0, y: 0 };
      switch (side) {
          case 'T': return { x: it.x + it.w / 2, y: it.y - ANCHOR_OFFSET };
          case 'R': return { x: it.x + it.w + ANCHOR_OFFSET, y: it.y + it.h / 2 };
          case 'B': return { x: it.x + it.w / 2, y: it.y + it.h + ANCHOR_OFFSET };
          case 'L': return { x: it.x - ANCHOR_OFFSET, y: it.y + it.h / 2 };
      }
  };

  const getCenter = (id: string) => {
      const it = items.find(i => i.id === id);
      return it ? { x: it.x + it.w / 2, y: it.y + it.h / 2 } : { x: 0, y: 0 };
  };

  const deleteItem = (id: string) => {
      updateBoard(prev => ({
          items: prev.items.filter(it => it.id !== id),
          connections: prev.connections.filter(c => c.fromId !== id && c.toId !== id)
      }));
      if (activeId === id) setActiveId(null);
  };

  const duplicateItem = (id: string) => {
      const item = items.find(i => i.id === id);
      if (!item) return;
      const newItem = { ...item, id: generateUUID(), x: item.x + 20, y: item.y + 20 };
      updateBoard(prev => ({ ...prev, items: [...prev.items, newItem] }));
      setActiveId(newItem.id);
  };

  const reorderItem = (id: string, direction: 'forward' | 'backward') => {
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) return;
      const newItems = [...items];
      if (direction === 'backward' && idx > 0) {
          [newItems[idx], newItems[idx - 1]] = [newItems[idx - 1], newItems[idx]];
      } else if (direction === 'forward' && idx < items.length - 1) {
          [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
      }
      updateBoard(prev => ({ ...prev, items: newItems }));
  };

  const alignItem = (id: string, alignment: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v') => {
      const item = items.find(i => i.id === id);
      if (!item) return;
      
      const viewCenter = { x: -viewState.x / viewState.scale + window.innerWidth / (2 * viewState.scale), y: -viewState.y / viewState.scale + window.innerHeight / (2 * viewState.scale) };
      
      let newX = item.x;
      let newY = item.y;

      if (alignment === 'center-h') newX = viewCenter.x - item.w / 2;
      if (alignment === 'center-v') newY = viewCenter.y - item.h / 2;
      
      updateBoard(prev => ({ ...prev, items: prev.items.map(i => i.id === id ? { ...i, x: newX, y: newY } : i) }));
  };

  const activeItem = items.find(i => i.id === activeId);
  const activeConn = connections.find(c => c.id === selectedConnectionId);

  // Fullscreen handling
  const enterFullscreen = useCallback(async () => {
    try {
      if (boardContainerRef.current) {
        await boardContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (e) {
      console.error('Fullscreen failed:', e);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.error('Exit fullscreen failed:', e);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Connection management
  const updateConnection = useCallback((id: string, updates: Partial<Connection>) => {
    updateBoard(prev => ({
      ...prev,
      connections: prev.connections.map(c => c.id === id ? { ...c, ...updates } : c)
    }));
  }, [updateBoard]);

  const deleteConnection = useCallback((id: string) => {
    updateBoard(prev => ({
      ...prev,
      connections: prev.connections.filter(c => c.id !== id)
    }));
    if (selectedConnectionId === id) setSelectedConnectionId(null);
  }, [selectedConnectionId, updateBoard]);

  const straightenConnection = useCallback((id: string) => {
    updateBoard(prev => ({
      ...prev,
      connections: prev.connections.map(c => c.id === id ? { ...c, waypoints: [] } : c)
    }));
  }, [updateBoard]);

  // Generate path for connection based on style
  const generateConnectionPath = useCallback((
    start: { x: number, y: number },
    end: { x: number, y: number },
    waypoints: { x: number, y: number }[] | undefined,
    style: Connection['style'] = 'straight',
    direction: Connection['direction'] = 'auto'
  ): string => {
    if (waypoints && waypoints.length > 0) {
      // Use waypoints for manual routing
      let path = `M ${start.x} ${start.y}`;
      waypoints.forEach(wp => {
        path += ` L ${wp.x} ${wp.y}`;
      });
      path += ` L ${end.x} ${end.y}`;
      return path;
    }

    if (style === 'elbow') {
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;

      if (direction === 'horizontal-first' || (direction === 'auto' && Math.abs(end.x - start.x) > Math.abs(end.y - start.y))) {
        return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
      } else {
        return `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;
      }
    }

    if (style === 'curved') {
      const ctrlX = (start.x + end.x) / 2;
      const ctrlY1 = start.y;
      const ctrlY2 = end.y;
      return `M ${start.x} ${start.y} C ${ctrlX} ${ctrlY1}, ${ctrlX} ${ctrlY2}, ${end.x} ${end.y}`;
    }

    // Default straight line
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (document.activeElement?.tagName.match(/INPUT|TEXTAREA/)) return;

          // Tools (V for select, C for connect, T for note - pan is via Space/middle-mouse)
          if (e.key.toLowerCase() === 'v') setTool('select');
          if (e.key.toLowerCase() === 'c') setTool('connect');
          if (e.key.toLowerCase() === 't') setTool('note');

          // Space for pan mode
          if (e.code === 'Space' && !e.repeat) {
              e.preventDefault();
              gestures.setPanModeActive(true);
          }

          // View
          if (e.key === '\\') {
            if (mode === 'edit') {
              setMode('view');
              enterFullscreen();
            } else {
              setMode('edit');
              exitFullscreen();
            }
          }
          if (e.key === 'Escape' && mode === 'view') {
            setMode('edit');
            exitFullscreen();
          }
          if (e.key === '=' || e.key === '+') viewport.zoomIn();
          if (e.key === '-') viewport.zoomOut();
          if ((e.metaKey || e.ctrlKey) && e.key === '0') {
              e.preventDefault();
              viewport.reset();
          }

          // Edit
          if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
              e.preventDefault();
              if (e.shiftKey) redo(); else undo();
          }
          if ((e.metaKey || e.ctrlKey) && e.key === 'd' && activeId) {
              e.preventDefault();
              duplicateItem(activeId);
          }
          if ((e.key === 'Delete' || e.key === 'Backspace') && activeId) {
              deleteItem(activeId);
          }

          // Arrange
          if (e.key === '[' && activeId) reorderItem(activeId, 'backward');
          if (e.key === ']' && activeId) reorderItem(activeId, 'forward');

          // Align (Alt + Key)
          if (e.altKey && activeId) {
              if (e.key.toLowerCase() === 'h') alignItem(activeId, 'center-h');
              if (e.key.toLowerCase() === 'v') alignItem(activeId, 'center-v');
          }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
          if (e.code === 'Space') {
              gestures.setPanModeActive(false);
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
      };
  }, [undo, redo, activeId, deleteItem, viewport, duplicateItem, reorderItem, alignItem, gestures, mode, enterFullscreen, exitFullscreen]);

  /**
   * Export board as IIIF Manifest
   */
  const exportBoardAsManifest = useCallback(() => {
    if (items.length === 0) {
      showToast("No items on board to export", "info");
      return;
    }

    const padding = 100;
    const minX = Math.min(...items.map(i => i.x)) - padding;
    const minY = Math.min(...items.map(i => i.y)) - padding;
    const maxX = Math.max(...items.map(i => i.x + i.w)) + padding;
    const maxY = Math.max(...items.map(i => i.y + i.h)) + padding;
    const boardWidth = Math.max(maxX - minX, DEFAULT_INGEST_PREFS.defaultCanvasWidth);
    const boardHeight = Math.max(maxY - minY, DEFAULT_INGEST_PREFS.defaultCanvasHeight);

    const baseUrl = IIIF_CONFIG.BASE_URL.DEFAULT;
    const boardId = IIIF_CONFIG.ID_PATTERNS.MANIFEST(baseUrl, `board-${generateUUID()}`);
    const canvasId = `${boardId}/canvas/1`;

    const paintingAnnotations: IIIFAnnotation[] = items.map((item, idx) => {
      const normX = item.x - minX;
      const normY = item.y - minY;

      // Handle Sticky Notes as TextualBody
      const body = item.isNote ? {
          type: "TextualBody",
          value: item.annotation || item.label,
          format: "text/plain"
      } : (item.blobUrl ? {
          id: item.blobUrl,
          type: "Image",
          format: "image/jpeg",
          width: item.w,
          height: item.h
      } : {
          type: "TextualBody",
          value: item.label,
          format: "text/plain"
      });

      const anno: any = {
        id: `${canvasId}/annotation/item-${idx}`,
        type: "Annotation",
        motivation: "painting",
        label: createLanguageMap(item.label),
        body: body as any,
        target: `${canvasId}#xywh=${Math.round(normX)},${Math.round(normY)},${Math.round(item.w)},${Math.round(item.h)}`,
        metadata: item.metadata,
        summary: item.summary,
        requiredStatement: item.requiredStatement,
        rights: item.rights,
        provider: item.provider
      };
      if (item.behavior) anno.behavior = item.behavior;
      return anno;
    });

    const linkingAnnotations: IIIFAnnotation[] = connections.map((conn, idx) => {
        const fromItem = items.find(i => i.id === conn.fromId);
        const toItem = items.find(i => i.id === conn.toId);
        if (!fromItem || !toItem) return null;
  
        const fromAnchor = getAnchorPos(conn.fromId, conn.fromAnchor || 'B');
        const normX = (fromAnchor?.x || 0) - minX;
        const normY = (fromAnchor?.y || 0) - minY;
        
        return {
          id: `${canvasId}/annotation/link-${idx}`,
          type: "Annotation",
          motivation: "linking",
          label: createLanguageMap(conn.label || conn.type),
          body: {
            type: "TextualBody",
            value: JSON.stringify({
                relationshipType: conn.type,
                label: conn.label,
                fromAnchor: conn.fromAnchor,
                toAnchor: conn.toAnchor,
                waypoints: conn.waypoints
            }),
            format: "application/json"
          },
          target: `${canvasId}#xywh=${Math.round(normX)},${Math.round(normY)},1,1`,
          metadata: conn.metadata,
          summary: conn.summary,
          requiredStatement: conn.requiredStatement,
          rights: conn.rights
        } as IIIFAnnotation;
    }).filter(Boolean) as IIIFAnnotation[];

    const paintingPage: IIIFAnnotationPage = {
      id: `${canvasId}/page/painting`,
      type: "AnnotationPage",
      items: paintingAnnotations
    };

    const boardCanvas: IIIFCanvas = {
      id: canvasId,
      type: "Canvas",
      label: { none: ["Research Board"] },
      width: boardWidth,
      height: boardHeight,
      items: [paintingPage]
    };

    const manifest: IIIFManifest = {
      "@context": IIIF_SPEC.PRESENTATION_3.CONTEXT,
      id: boardId,
      type: "Manifest",
      label: { none: [`Research Board - ${new Date().toLocaleDateString()}`] },
      items: [boardCanvas]
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/ld+json' });
    saveAs(blob, `board-export-${new Date().toISOString().split('T')[0]}.json`);
    showToast("Board exported as IIIF Manifest", "success");
  }, [items, connections, showToast, getAnchorPos]);

  // View mode styles
  const viewModeClass = mode === 'view' ? 'bg-slate-900' : 'bg-slate-100';

  return (
    <div
      ref={boardContainerRef}
      className={`flex flex-col h-full overflow-hidden relative font-sans ${viewModeClass}`}
      role="application"
      aria-label="Research Board - Spatial canvas for organizing IIIF resources"
    >
      {/* Header - hidden in fullscreen view mode */}
      {!(mode === 'view' && isFullscreen) && (
      <div className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
              <Icon name="dashboard" className="text-amber-500 text-2xl" />
              <div>
                  <h1 className="font-black text-slate-800 uppercase tracking-tighter text-lg leading-none">Boards</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Spatial Synthesis</p>
              </div>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          
          {mode === 'edit' && (
            <div className="flex items-center gap-3">
                {/* Interaction Tools */}
                <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                    <button
                        onClick={() => setTool('select')}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all ${tool === 'select' ? 'bg-white shadow-md text-iiif-blue' : 'text-slate-500 hover:text-slate-800'}`}
                        title="Select & Pan (V) - Hold Space to pan"
                    >
                        <Icon name="near_me" className="text-sm"/> Select
                    </button>
                </div>

                <div className="w-px h-8 bg-slate-300" />

                {/* Creation Tools */}
                <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200 gap-1">
                    <button
                        onClick={() => setTool('connect')}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all ${tool === 'connect' ? 'bg-white shadow-md text-iiif-blue' : 'text-slate-500 hover:text-slate-800'}`}
                        title="Connect items (C)"
                    >
                        <Icon name="mediation" className="text-sm"/> Connect
                    </button>
                    <button
                        onClick={() => setTool('note')}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all relative ${tool === 'note' ? 'bg-yellow-100 shadow-md text-yellow-700 border border-yellow-300' : 'text-slate-500 hover:text-slate-800 hover:bg-yellow-50'}`}
                        title="Add sticky note (T)"
                    >
                        <Icon name="sticky_note_2" className="text-sm"/>
                        <span>Note</span>
                        {tool === 'note' && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-white" />}
                    </button>
                </div>
            </div>
          )}

          {mode === 'edit' && (
            <>
                <button onClick={() => setSnapToGrid(!snapToGrid)} className={`p-2 rounded-lg transition-all ${snapToGrid ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`} title="Snap to Grid">
                    <Icon name="grid_4x4" />
                </button>
                <div className="relative">
                    <button onClick={() => setShowTemplates(!showTemplates)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Templates">
                        <Icon name="grid_view" />
                    </button>
                    {showTemplates && (
                        <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl w-48 py-2 z-50">
                            <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Layouts</div>
                            <button onClick={() => applyTemplate('grid')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex items-center gap-2"><Icon name="grid_on" className="text-xs"/> 2x2 Grid</button>
                            <button onClick={() => applyTemplate('sequence')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex items-center gap-2"><Icon name="linear_scale" className="text-xs"/> Sequence</button>
                            <button onClick={() => applyTemplate('comparison')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex items-center gap-2"><Icon name="compare" className="text-xs"/> Comparison</button>
                        </div>
                    )}
                </div>
            </>
          )}

          <div className="flex gap-1 ml-2">
              <button onClick={undo} disabled={!canUndo} className={`p-2 rounded-lg ${canUndo ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-300'}`}><Icon name="undo"/></button>
              <button onClick={redo} disabled={!canRedo} className={`p-2 rounded-lg ${canRedo ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-300'}`}><Icon name="redo"/></button>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <button 
                onClick={() => setShowShortcuts(!showShortcuts)} 
                className={`p-2 rounded-lg transition-all ${showShortcuts ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}
                title="Keyboard Shortcuts"
            >
                <Icon name="keyboard" />
            </button>
            <button 
                onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${mode === 'view' ? 'bg-green-100 text-green-700' : 'text-slate-500 hover:bg-slate-100'}`}
            >
                <Icon name={mode === 'view' ? 'visibility' : 'edit'} className="text-sm"/>
                {mode === 'view' ? 'View Mode' : 'Edit Mode'}
            </button>
            <div className="text-xs font-bold text-slate-400 border-l pl-4">
                <span>{viewport.scalePercent}% Zoom</span>
            </div>
            <button onClick={() => setShowExportDialog(true)} className="flex items-center gap-2 px-4 py-2 bg-iiif-blue text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-all">
                <Icon name="file_download" className="text-sm"/> Export
            </button>
        </div>
      </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div
            ref={containerRef}
            className={`flex-1 relative overflow-hidden bg-slate-100 ${isPanning || gestures.isPanModeActive ? 'cursor-grab active:cursor-grabbing' : tool === 'connect' ? 'cursor-crosshair' : tool === 'note' ? 'cursor-cell' : 'cursor-default'}`}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onMouseDown={handleMouseDown}
            onMouseMove={(e) => {
                if (gestures.isPanning) gestures.handlers.onMouseMove(e);
            }}
            onMouseUp={gestures.handlers.onMouseUp}
            onMouseLeave={gestures.handlers.onMouseLeave}
            onWheel={gestures.handlers.onWheel}
            style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', backgroundSize: `${24 * viewState.scale}px ${24 * viewState.scale}px`, backgroundPosition: `${viewState.x}px ${viewState.y}px` }}
            role="region"
            aria-label="Board canvas"
            aria-describedby="board-instructions"
        >
          <div id="board-instructions" className="sr-only">
            Use mouse to pan and zoom. Press V for select tool, H for pan, C for connect, T for note.
            Drag items from archive to add them to the board.
          </div>
                <div
                  style={{ transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`, transformOrigin: '0 0', width: '100%', height: '100%' }}
                  role="group"
                  aria-label="Board items container"
                >
                    <svg className="absolute inset-0 overflow-visible pointer-events-none z-10" style={{ width: '10000px', height: '10000px' }}>
                        {connections.map(c => {
                            const start = getAnchorPos(c.fromId, c.fromAnchor || 'B');
                            const end = getAnchorPos(c.toId, c.toAnchor || 'T');
                            const isSelected = selectedConnectionId === c.id;
                            const strokeColor = c.color || (isSelected ? "#005596" : "#3b82f6");

                            // Generate path based on style
                            const pathD = generateConnectionPath(
                              start || { x: 0, y: 0 },
                              end || { x: 0, y: 0 },
                              c.waypoints,
                              c.style || 'elbow',
                              c.direction
                            );

                            return (
                                <g key={c.id} className="pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedConnectionId(c.id); setActiveId(null); }}>
                                    {/* Hit area for easier selection */}
                                    <path
                                        d={pathD}
                                        fill="none"
                                        stroke="transparent"
                                        strokeWidth="20"
                                    />
                                    <path
                                        d={pathD}
                                        fill="none"
                                        stroke={strokeColor}
                                        strokeWidth={isSelected ? "4" : "2.5"}
                                        strokeDasharray="none"
                                        strokeLinejoin="round"
                                        strokeLinecap="round"
                                        className="transition-all"
                                    />

                                    {/* Arrow marker at end */}
                                    <circle
                                        cx={end?.x || 0}
                                        cy={end?.y || 0}
                                        r="4"
                                        fill={strokeColor}
                                    />

                                    {/* Segment midpoint handles for adding waypoints (max 10) */}
                                    {isSelected && (!c.waypoints || c.waypoints.length < 10) && (() => {
                                        // Build list of segments: start -> wp1 -> wp2 -> ... -> end
                                        const points = [start, ...(c.waypoints || []), end].filter(Boolean) as { x: number; y: number }[];
                                        const segmentMidpoints = [];
                                        for (let i = 0; i < points.length - 1; i++) {
                                            segmentMidpoints.push({
                                                x: (points[i].x + points[i + 1].x) / 2,
                                                y: (points[i].y + points[i + 1].y) / 2,
                                                insertAfter: i // Insert after this index in waypoints array
                                            });
                                        }
                                        return segmentMidpoints.map((seg, idx) => (
                                            <g key={`seg-${idx}`}>
                                                <circle
                                                    cx={seg.x}
                                                    cy={seg.y}
                                                    r="22"
                                                    fill="transparent"
                                                    className="cursor-pointer"
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        const newWP = { x: seg.x, y: seg.y };
                                                        updateBoard(prev => ({
                                                            ...prev,
                                                            connections: prev.connections.map(conn => {
                                                                if (conn.id !== c.id) return conn;
                                                                const wps = [...(conn.waypoints || [])];
                                                                // Insert at the correct position
                                                                wps.splice(seg.insertAfter, 0, newWP);
                                                                return { ...conn, waypoints: wps };
                                                            })
                                                        }));
                                                    }}
                                                />
                                                <circle
                                                    cx={seg.x}
                                                    cy={seg.y}
                                                    r="5"
                                                    fill="white"
                                                    stroke={strokeColor}
                                                    strokeWidth="2"
                                                    strokeDasharray="2,2"
                                                    className="pointer-events-none"
                                                />
                                            </g>
                                        ));
                                    })()}

                                    {/* Draggable waypoints - 44px touch target */}
                                    {isSelected && c.waypoints?.map((wp, i) => (
                                        <g key={i}>
                                            {/* Touch target */}
                                            <circle
                                                cx={wp.x} cy={wp.y} r="22"
                                                fill="transparent"
                                                className="cursor-move"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    const handleWPMove = (me: MouseEvent) => {
                                                        let coords = getCanvasCoords(me);
                                                        // Shift+drag: snap to 0°, 45°, 90°, 135°, 180°
                                                        if (me.shiftKey) {
                                                            const prev = i > 0 ? c.waypoints![i - 1] : start;
                                                            const refX = prev?.x || 0;
                                                            const refY = prev?.y || 0;
                                                            const dx = coords.x - refX;
                                                            const dy = coords.y - refY;
                                                            const distance = Math.sqrt(dx * dx + dy * dy);
                                                            const angle = Math.atan2(dy, dx);
                                                            // Snap to nearest 45° (π/4 radians)
                                                            const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
                                                            coords = {
                                                                x: refX + Math.cos(snapAngle) * distance,
                                                                y: refY + Math.sin(snapAngle) * distance
                                                            };
                                                        }
                                                        updateBoard(prev => ({
                                                            ...prev,
                                                            connections: prev.connections.map(conn => {
                                                                if (conn.id !== c.id || !conn.waypoints) return conn;
                                                                const newWPs = [...conn.waypoints];
                                                                newWPs[i] = coords;
                                                                return { ...conn, waypoints: newWPs };
                                                            })
                                                        }));
                                                    };
                                                    const handleWPUp = () => {
                                                        window.removeEventListener('mousemove', handleWPMove);
                                                        window.removeEventListener('mouseup', handleWPUp);
                                                    };
                                                    window.addEventListener('mousemove', handleWPMove);
                                                    window.addEventListener('mouseup', handleWPUp);
                                                }}
                                                onDoubleClick={(e) => {
                                                    e.stopPropagation();
                                                    updateBoard(prev => ({
                                                        ...prev,
                                                        connections: prev.connections.map(conn => conn.id === c.id ? { ...conn, waypoints: conn.waypoints?.filter((_, idx) => idx !== i) } : conn)
                                                    }));
                                                }}
                                            />
                                            <circle
                                                cx={wp.x} cy={wp.y} r="6"
                                                fill={strokeColor}
                                                stroke="white"
                                                strokeWidth="2"
                                                className="pointer-events-none"
                                            />
                                        </g>
                                    ))}

                                    {/* Connection label */}
                                    {(c.label || c.purpose) && c.displayMode !== 'none' && (
                                      <g>
                                        <rect
                                          x={((start?.x || 0) + (end?.x || 0)) / 2 - 40}
                                          y={((start?.y || 0) + (end?.y || 0)) / 2 - 22}
                                          width="80"
                                          height="16"
                                          fill="white"
                                          rx="4"
                                          opacity="0.9"
                                        />
                                        <text
                                          x={((start?.x || 0) + (end?.x || 0)) / 2}
                                          y={((start?.y || 0) + (end?.y || 0)) / 2 - 10}
                                          textAnchor="middle"
                                          className="text-[9px] font-bold uppercase"
                                          fill={strokeColor}
                                        >
                                          {c.displayMode === 'purpose-only' ? c.purpose : (c.label || c.purpose)}
                                        </text>
                                      </g>
                                    )}
                                </g>
                            );
                        })}
                        {connectingStart && (
                            <line 
                                x1={getAnchorPos(connectingStart, activeAnchor?.side || 'B')?.x || 0} y1={getAnchorPos(connectingStart, activeAnchor?.side || 'B')?.y || 0} 
                                x2={mousePos.x} y2={mousePos.y} 
                                stroke="#3b82f6" strokeWidth="2" strokeDasharray="4,4" 
                            />
                        )}
                    </svg>

                    {items.map(it => {
                        // Resource type gradient colors
                        const typeGradient = it.resourceType === 'Canvas'
                          ? 'from-green-500 to-emerald-600'
                          : it.resourceType === 'Manifest'
                            ? 'from-blue-500 to-indigo-600'
                            : it.resourceType === 'Collection'
                              ? 'from-amber-500 to-orange-600'
                              : 'from-slate-500 to-slate-600';

                        return (
                        <div
                            key={it.id}
                            onMouseDown={(e) => handleItemDown(e, it.id)}
                            onMouseUp={() => handleItemUp(it.id)}
                            onDoubleClick={() => {
                              if (mode === 'view') {
                                setMode('edit');
                                exitFullscreen();
                              } else {
                                setShowItemDetail(it);
                              }
                            }}
                            className={`absolute shadow-2xl rounded-2xl overflow-hidden group select-none transition-all duration-200 ${
                              activeId === it.id
                                ? 'ring-4 ring-iiif-blue/30 shadow-iiif-blue/20'
                                : 'hover:shadow-3xl'
                            } ${
                              it.isNote
                                ? 'bg-yellow-50 border-2 border-yellow-300'
                                : it.isMetadataNode
                                  ? 'bg-purple-50 border-2 border-dashed border-purple-400'
                                  : 'bg-white border border-slate-200/50'
                            } z-20 backdrop-blur-sm`}
                            style={{ left: it.x, top: it.y, width: it.w, height: it.h }}
                            role="button"
                            aria-label={`${it.isNote ? 'Note' : t(it.resourceType)}: ${it.label}`}
                            aria-selected={activeId === it.id}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Delete' || e.key === 'Backspace') {
                                e.preventDefault();
                                deleteItem(it.id);
                              }
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setActiveId(it.id);
                              }
                            }}
                        >
                            {/* Anchor Points */}
                            {(tool === 'connect' || activeId === it.id) && (
                                <>
                                    <div 
                                        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-iiif-blue border-2 border-white z-50 cursor-crosshair hover:scale-150 transition-transform" 
                                        onMouseDown={(e) => { e.stopPropagation(); setConnectingStart(it.id); setActiveAnchor({ id: it.id, side: 'T' }); }}
                                        onMouseUp={(e) => {
                                            if (connectingStart && connectingStart !== it.id) {
                                                e.stopPropagation();
                                                const fromAnchor = activeAnchor?.side || 'B';
                                                updateBoard(prev => ({
                                                    ...prev,
                                                    connections: [...prev.connections, {
                                                        id: generateUUID(),
                                                        fromId: connectingStart,
                                                        toId: it.id,
                                                        type: 'relatesTo',
                                                        fromAnchor,
                                                        toAnchor: 'T',
                                                        style: 'elbow',
                                                        direction: 'auto',
                                                        color: '#3b82f6',
                                                        purpose: 'linking',
                                                        displayMode: 'full'
                                                    }]
                                                }));
                                                setConnectingStart(null);
                                                setActiveAnchor(null);
                                            }
                                        }}
                                    />
                                    <div 
                                        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full bg-iiif-blue border-2 border-white z-50 cursor-crosshair hover:scale-150 transition-transform" 
                                        onMouseDown={(e) => { e.stopPropagation(); setConnectingStart(it.id); setActiveAnchor({ id: it.id, side: 'B' }); }}
                                        onMouseUp={(e) => {
                                            if (connectingStart && connectingStart !== it.id) {
                                                e.stopPropagation();
                                                const fromAnchor = activeAnchor?.side || 'B';
                                                updateBoard(prev => ({
                                                    ...prev,
                                                    connections: [...prev.connections, {
                                                        id: generateUUID(),
                                                        fromId: connectingStart,
                                                        toId: it.id,
                                                        type: 'relatesTo',
                                                        fromAnchor,
                                                        toAnchor: 'B',
                                                        style: 'elbow',
                                                        direction: 'auto',
                                                        color: '#3b82f6',
                                                        purpose: 'linking',
                                                        displayMode: 'full'
                                                    }]
                                                }));
                                                setConnectingStart(null);
                                                setActiveAnchor(null);
                                            }
                                        }}
                                    />
                                    <div 
                                        className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-iiif-blue border-2 border-white z-50 cursor-crosshair hover:scale-150 transition-transform" 
                                        onMouseDown={(e) => { e.stopPropagation(); setConnectingStart(it.id); setActiveAnchor({ id: it.id, side: 'L' }); }}
                                        onMouseUp={(e) => {
                                            if (connectingStart && connectingStart !== it.id) {
                                                e.stopPropagation();
                                                const fromAnchor = activeAnchor?.side || 'B';
                                                updateBoard(prev => ({
                                                    ...prev,
                                                    connections: [...prev.connections, {
                                                        id: crypto.randomUUID(),
                                                        fromId: connectingStart,
                                                        toId: it.id,
                                                        type: 'relatesTo',
                                                        fromAnchor,
                                                        toAnchor: 'L',
                                                        style: 'elbow',
                                                        direction: 'auto',
                                                        color: '#3b82f6',
                                                        purpose: 'linking',
                                                        displayMode: 'full'
                                                    }]
                                                }));
                                                setConnectingStart(null);
                                                setActiveAnchor(null);
                                            }
                                        }}
                                    />
                                    <div 
                                        className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-iiif-blue border-2 border-white z-50 cursor-crosshair hover:scale-150 transition-transform" 
                                        onMouseDown={(e) => { e.stopPropagation(); setConnectingStart(it.id); setActiveAnchor({ id: it.id, side: 'R' }); }}
                                        onMouseUp={(e) => {
                                            if (connectingStart && connectingStart !== it.id) {
                                                e.stopPropagation();
                                                const fromAnchor = activeAnchor?.side || 'B';
                                                updateBoard(prev => ({
                                                    ...prev,
                                                    connections: [...prev.connections, {
                                                        id: crypto.randomUUID(),
                                                        fromId: connectingStart,
                                                        toId: it.id,
                                                        type: 'relatesTo',
                                                        fromAnchor,
                                                        toAnchor: 'R',
                                                        style: 'elbow',
                                                        direction: 'auto',
                                                        color: '#3b82f6',
                                                        purpose: 'linking',
                                                        displayMode: 'full'
                                                    }]
                                                }));
                                                setConnectingStart(null);
                                                setActiveAnchor(null);
                                            }
                                        }}
                                    />
                                </>
                            )}
                            {it.isNote ? (
                                <div className="h-full flex flex-col">
                                    {/* Note header with drag handle */}
                                    <div className="h-6 bg-gradient-to-r from-yellow-400 to-amber-400 flex items-center px-2">
                                      <Icon name="drag_indicator" className="text-yellow-800/50 text-xs" />
                                    </div>
                                    <div className="flex-1 p-3">
                                      <textarea
                                          value={it.annotation}
                                          onChange={(e) => updateBoard(prev => ({...prev, items: prev.items.map(x => x.id === it.id ? {...x, annotation: e.target.value} : x)}))}
                                          className="w-full h-full bg-transparent border-none outline-none resize-none font-handwriting text-slate-800 text-sm leading-relaxed rounded-lg p-2 focus:bg-yellow-100/50 transition-colors"
                                          placeholder="Type your note here..."
                                          onMouseDown={e => e.stopPropagation()}
                                      />
                                    </div>
                                </div>
                            ) : it.isMetadataNode ? (
                                <div className="h-full flex flex-col items-center justify-center p-4">
                                    <Icon name="sell" className="text-4xl text-purple-400 mb-2" />
                                    <div className="text-xs font-bold text-purple-600 text-center">{it.label}</div>
                                    <div className="text-[9px] text-purple-400 mt-1">Metadata Value</div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col relative">
                                    {/* Type gradient header */}
                                    <div className={`h-1.5 bg-gradient-to-r ${typeGradient}`} />
                                    <div className="flex-1 bg-slate-900 flex items-center justify-center relative overflow-hidden">
                                        {it.blobUrls && it.blobUrls.length > 0 ? (
                                            <StackedThumbnail
                                                urls={it.blobUrls}
                                                size="xl"
                                                className="w-full h-full"
                                                icon="description"
                                            />
                                        ) : it.blobUrl ? (
                                            <img src={it.blobUrl} className="w-full h-full object-contain pointer-events-none" alt="Pin" />
                                        ) : (
                                            <Icon name="description" className="text-5xl text-slate-700 opacity-50"/>
                                        )}
                                        {/* Type badge */}
                                        <div className={`absolute top-2 left-2 bg-gradient-to-r ${typeGradient} text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-lg`}>
                                            {t(it.resourceType)}
                                        </div>
                                    </div>
                                    {/* Footer with label over dark gradient */}
                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
                                        <div className="text-[11px] font-bold text-white truncate drop-shadow-md">{it.label}</div>
                                    </div>
                                </div>
                            )}

                            {/* Annotations Overlay */}
                            {it.annotations && it.annotations.map((anno, idx) => {
                                const svgString = (anno.target as any).selector?.value;
                                if (!svgString) return null;
                                // Sanitize SVG to prevent XSS while preserving valid SVG markup
                                // SVG is drawn via user interaction in PolygonAnnotationTool, so we sanitize
                                // but allow SVG tags and basic attributes for proper rendering
                                const sanitizedSvg = sanitizeSvg(svgString);
                                return (
                                    <div
                                        key={idx}
                                        className="absolute inset-0 pointer-events-auto group/anno"
                                        title={getIIIFValue(anno.body as any)}
                                    >
                                        <div
                                            className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                                            dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
                                        />
                                        <div className="absolute bottom-2 left-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/anno:opacity-100 transition-opacity whitespace-pre-wrap max-w-[150px] z-50">
                                            {getIIIFValue(anno.body as any)}
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {activeId === it.id && !it.isNote && (
                                <div className="absolute top-2 right-2 flex flex-col gap-1 z-40">
                                    <button onClick={(e) => { e.stopPropagation(); setShowAnnotationTool(true); }} className="p-1.5 bg-white text-slate-500 rounded hover:text-iiif-blue shadow-sm" title="Annotate"><Icon name="draw" className="text-xs"/></button>
                                    <button onClick={(e) => { e.stopPropagation(); setShowWorkbench(true); }} className="p-1.5 bg-white text-slate-500 rounded hover:text-iiif-blue shadow-sm" title="Adjust"><Icon name="tune" className="text-xs"/></button>
                                    <button onClick={(e) => { e.stopPropagation(); setShowComposer(true); }} className="p-1.5 bg-white text-slate-500 rounded hover:text-iiif-blue shadow-sm" title="Compose"><Icon name="auto_awesome_motion" className="text-xs"/></button>
                                </div>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteItem(it.id); }}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 z-30 shadow-lg"
                            >
                                <Icon name="close" className="text-xs"/>
                            </button>
                        </div>
                        );
                    })}
                </div>

                {/* Empty State with Tips */}
                {items.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className={`text-center p-10 rounded-3xl ${mode === 'view' ? 'bg-slate-800/95' : 'bg-white/95'} backdrop-blur-md shadow-2xl border ${mode === 'view' ? 'border-slate-700' : 'border-slate-200'} max-w-lg`}>
                      <Icon name="dashboard" className={`text-6xl mb-6 ${mode === 'view' ? 'text-slate-500' : 'text-amber-500'}`} />
                      <h2 className={`text-2xl font-black mb-3 ${mode === 'view' ? 'text-white' : 'text-slate-800'}`}>
                        Start Your Research Board
                      </h2>
                      <p className={`text-sm mb-8 ${mode === 'view' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Create spatial connections between your archival materials
                      </p>
                      {!isAdvanced && (
                        <div className={`space-y-3 text-left ${mode === 'view' ? 'text-slate-300' : 'text-slate-600'}`}>
                          <div className="flex items-center gap-4">
                            <kbd className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold ${mode === 'view' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>Drag</kbd>
                            <span className="text-sm">Drag media from the Archive panel</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <kbd className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold min-w-[48px] text-center ${mode === 'view' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>T</kbd>
                            <span className="text-sm">Add sticky notes for annotations</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <kbd className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold min-w-[48px] text-center ${mode === 'view' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>C</kbd>
                            <span className="text-sm">Connect items to show relationships</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <kbd className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold min-w-[48px] text-center ${mode === 'view' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>Space</kbd>
                            <span className="text-sm">Hold to pan around the board</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Floating Zoom Controls */}
                <div className={`absolute bottom-4 right-4 flex items-center gap-1 rounded-xl shadow-lg z-30 ${mode === 'view' ? 'bg-slate-800/90' : 'bg-white/90'} backdrop-blur-sm p-1`}>
                  <button
                    onClick={viewport.zoomOut}
                    className={`p-2 rounded-lg transition-colors ${mode === 'view' ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    title="Zoom out (-)"
                  >
                    <Icon name="remove" />
                  </button>
                  <button
                    onClick={viewport.reset}
                    className={`px-3 py-2 rounded-lg text-xs font-bold min-w-[60px] transition-colors ${mode === 'view' ? 'text-white hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}
                    title="Reset zoom (Cmd+0)"
                  >
                    {viewport.scalePercent}%
                  </button>
                  <button
                    onClick={viewport.zoomIn}
                    className={`p-2 rounded-lg transition-colors ${mode === 'view' ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    title="Zoom in (+)"
                  >
                    <Icon name="add" />
                  </button>
                  <div className={`w-px h-6 mx-1 ${mode === 'view' ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <button
                    onClick={viewport.reset}
                    className={`p-2 rounded-lg transition-colors ${mode === 'view' ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    title="Reset zoom"
                  >
                    <Icon name="fit_screen" />
                  </button>
                </div>

                {/* View Mode Exit Button */}
                {mode === 'view' && (
                  <button
                    onClick={() => { setMode('edit'); exitFullscreen(); }}
                    className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-white/90 text-slate-800 rounded-xl shadow-lg z-30 font-bold text-sm hover:bg-white transition-colors"
                  >
                    <Icon name="edit" />
                    Exit View Mode
                  </button>
                )}
        </div>

        {/* Item Preview Panel */}
        {activeItem && !showItemDetail && mode === 'edit' && (
          <ItemPreviewPanel
            item={activeItem}
            onExpand={(item) => setShowItemDetail(item)}
            fieldMode={settings.fieldMode}
          />
        )}

        {/* Unified Inspector Panel with Design Tab */}
        {(activeItem || activeConn) && mode === 'edit' && (
            <Inspector
                resource={activeItem ? {
                    id: activeItem.resourceId,
                    type: activeItem.resourceType as any,
                    label: { none: [activeItem.label] },
                    metadata: activeItem.metadata,
                    summary: activeItem.summary,
                    requiredStatement: activeItem.requiredStatement,
                    rights: activeItem.rights,
                    provider: activeItem.provider,
                    behavior: activeItem.behavior
                } : activeConn ? {
                    id: activeConn.id,
                    type: 'Annotation',
                    label: { none: [activeConn.label || 'Connection'] },
                    metadata: activeConn.metadata,
                    summary: activeConn.summary,
                    requiredStatement: activeConn.requiredStatement,
                    rights: activeConn.rights
                } : null}
                onUpdateResource={(updates) => {
                    if (activeItem) {
                        updateBoard(prev => ({
                            ...prev,
                            items: prev.items.map(it => it.id === activeId ? {
                                ...it,
                                label: updates.label ? getIIIFValue(updates.label) : it.label,
                                metadata: updates.metadata || it.metadata,
                                summary: updates.summary || it.summary,
                                requiredStatement: updates.requiredStatement || it.requiredStatement,
                                rights: updates.rights || it.rights,
                                provider: updates.provider || it.provider,
                                behavior: updates.behavior || it.behavior
                            } : it)
                        }));
                    } else if (activeConn) {
                        updateBoard(prev => ({
                            ...prev,
                            connections: prev.connections.map(c => c.id === selectedConnectionId ? {
                                ...c,
                                label: updates.label ? getIIIFValue(updates.label) : c.label,
                                metadata: updates.metadata || c.metadata,
                                summary: updates.summary || c.summary,
                                requiredStatement: updates.requiredStatement || c.requiredStatement,
                                rights: updates.rights || c.rights
                            } : c)
                        }));
                    }
                }}
                settings={settings}
                visible={true}
                onClose={() => { setActiveId(null); setSelectedConnectionId(null); }}
                designTab={
                    <BoardDesignPanel
                        activeItem={activeItem || null}
                        activeConnection={activeConn || null}
                        items={items}
                        onAlignItem={alignItem}
                        onReorderItem={reorderItem}
                        onDuplicateItem={duplicateItem}
                        onDeleteItem={deleteItem}
                        onUpdateItem={(id, updates) => {
                            updateBoard(prev => ({
                                ...prev,
                                items: prev.items.map(it => it.id === id ? { ...it, ...updates } : it)
                            }));
                        }}
                        onUpdateConnection={updateConnection}
                        onDeleteConnection={deleteConnection}
                        onStraightenConnection={straightenConnection}
                        fieldMode={settings.fieldMode}
                    />
                }
            />
        )}
      </div>

      {/* Modals */}
      {showAnnotationTool && activeItem && activeItem.blobUrl && (
          <PolygonAnnotationTool
            canvas={{ id: activeItem.resourceId, width: DEFAULT_INGEST_PREFS.defaultCanvasWidth, height: DEFAULT_INGEST_PREFS.defaultCanvasHeight, type: 'Canvas', items: [] }}
            imageUrl={activeItem.blobUrl}
            onCreateAnnotation={(anno) => {
                updateBoard(prev => ({
                    ...prev,
                    items: prev.items.map(it => it.id === activeId ? { ...it, annotations: [...(it.annotations || []), anno] } : it)
                }));
                showToast("Annotation added to board item", "success");
            }}
            onClose={() => setShowAnnotationTool(false)}
            existingAnnotations={activeItem.annotations}
          />
      )}
      {showWorkbench && activeItem && (
          <ImageRequestWorkbench 
            canvas={{ id: activeItem.resourceId, type: 'Canvas', items: [{ items: [{ body: { id: activeItem.blobUrl } }] }] } as any} 
            onClose={() => setShowWorkbench(false)}
            onApply={(url) => {
                updateBoard(prev => ({
                    ...prev,
                    items: prev.items.map(it => it.id === activeId ? { ...it, blobUrl: url } : it)
                }));
                showToast("Image adjustment applied", "success");
            }}
          />
      )}
      {showComposer && activeItem && (
          <CanvasComposer
            root={root}
            canvas={{
                id: activeItem.resourceId,
                width: DEFAULT_INGEST_PREFS.defaultCanvasWidth,
                height: DEFAULT_INGEST_PREFS.defaultCanvasHeight,
                type: 'Canvas',
                items: activeItem.layers ? [{ type: 'AnnotationPage', items: activeItem.layers }] : []
            } as any}
            onUpdate={(updatedCanvas) => {
                // Extract layers from the updated canvas
                const newLayers = updatedCanvas.items?.[0]?.items || [];
                updateBoard(prev => ({
                    ...prev,
                    items: prev.items.map(it => it.id === activeId ? { ...it, layers: newLayers } : it)
                }));
                showToast("Composition updated", "success");
            }}
            onClose={() => setShowComposer(false)}
          />
      )}

      {/* Item Detail Modal */}
      {showItemDetail && (
          <ItemDetailModal
            item={showItemDetail}
            onClose={() => setShowItemDetail(null)}
            fieldMode={settings.fieldMode}
          />
      )}

      {/* Board Export Dialog */}
      {showExportDialog && (
          <BoardExportDialog
            items={items}
            connections={connections}
            onClose={() => setShowExportDialog(false)}
            fieldMode={settings.fieldMode}
          />
      )}

      {/* Shortcuts Help Panel */}
      {showShortcuts && (
          <div className="absolute top-16 right-6 bg-white border border-slate-200 rounded-xl shadow-2xl p-6 z-50 w-80 animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest flex items-center gap-2"><Icon name="keyboard" className="text-iiif-blue"/> Shortcuts</h3>
                  <button onClick={() => setShowShortcuts(false)} className="text-slate-400 hover:text-slate-600"><Icon name="close" className="text-sm"/></button>
              </div>
              <div className="space-y-4 text-xs">
                  <div>
                      <h4 className="font-bold text-slate-500 mb-2 uppercase tracking-tight text-[10px]">Tools</h4>
                      <div className="grid grid-cols-2 gap-2 text-slate-700">
                          <div className="flex justify-between"><span>Select</span> <kbd className="bg-slate-100 px-1.5 rounded font-mono">V</kbd></div>
                          <div className="flex justify-between"><span>Pan</span> <kbd className="bg-slate-100 px-1.5 rounded font-mono">Space</kbd></div>
                          <div className="flex justify-between"><span>Connect</span> <kbd className="bg-slate-100 px-1.5 rounded font-mono">C</kbd></div>
                          <div className="flex justify-between"><span>Note</span> <kbd className="bg-slate-100 px-1.5 rounded font-mono">T</kbd></div>
                      </div>
                  </div>
                  <div>
                      <h4 className="font-bold text-slate-500 mb-2 uppercase tracking-tight text-[10px]">Editing</h4>
                      <div className="grid grid-cols-2 gap-2 text-slate-700">
                          <div className="flex justify-between"><span>Duplicate</span> <kbd className="bg-slate-100 px-1.5 rounded font-mono">Cmd+D</kbd></div>
                          <div className="flex justify-between"><span>Delete</span> <kbd className="bg-slate-100 px-1.5 rounded font-mono">Del</kbd></div>
                          <div className="flex justify-between"><span>Undo</span> <kbd className="bg-slate-100 px-1.5 rounded font-mono">Cmd+Z</kbd></div>
                          <div className="flex justify-between"><span>Redo</span> <kbd className="bg-slate-100 px-1.5 rounded font-mono">Shift+Cmd+Z</kbd></div>
                      </div>
                  </div>
                  <div>
                      <h4 className="font-bold text-slate-500 mb-2 uppercase tracking-tight text-[10px]">View & Arrange</h4>
                      <div className="grid grid-cols-2 gap-2 text-slate-700">
                          <div className="flex justify-between"><span>Zoom In/Out</span> <kbd className="bg-slate-100 px-1.5 rounded font-mono">+/-</kbd></div>
                          <div className="flex justify-between"><span>Reset Zoom</span> <kbd className="bg-slate-100 px-1.5 rounded font-mono">Cmd+0</kbd></div>
                          <div className="flex justify-between"><span>Send Back</span> <kbd className="bg-slate-100 px-1.5 rounded font-mono">[</kbd></div>
                          <div className="flex justify-between"><span>Bring Front</span> <kbd className="bg-slate-100 px-1.5 rounded font-mono">]</kbd></div>
                          <div className="flex justify-between"><span>Align H/V</span> <kbd className="bg-slate-100 px-1.5 rounded font-mono">Alt+H/V</kbd></div>
                          <div className="flex justify-between"><span>Toggle UI</span> <kbd className="bg-slate-100 px-1.5 rounded font-mono">\</kbd></div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
