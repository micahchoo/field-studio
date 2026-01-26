
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { IIIFManifest, IIIFItem, IIIFCanvas, IIIFAnnotationPage, IIIFAnnotation, ConnectionType, getIIIFValue } from '../../types';
import { Icon } from '../Icon';
import { useToast } from '../Toast';
import { saveAs } from 'file-saver';
import { useViewport, usePanZoomGestures } from '../../hooks';
import { useHistory } from '../../hooks/useHistory';
import { PolygonAnnotationTool } from '../PolygonAnnotationTool';
import { ImageRequestWorkbench } from '../ImageRequestWorkbench';
import { CanvasComposer } from '../CanvasComposer';

interface BoardItem {
  id: string; resourceId: string; x: number; y: number; w: number; h: number;
  resourceType: string; label: string; blobUrl?: string; annotation?: string;
  isNote?: boolean;
  annotations?: IIIFAnnotation[]; // Drawing annotations
  layers?: any[]; // Composed layers
}

interface Connection {
  id: string; fromId: string; toId: string; type: ConnectionType; label?: string;
}

interface BoardState {
    items: BoardItem[];
    connections: Connection[];
}

export const BoardView: React.FC<{ root: IIIFItem | null }> = ({ root }) => {
  const { showToast } = useToast();
  
  // History state
  const { state: board, update: updateBoard, undo, redo, canUndo, canRedo } = useHistory<BoardState>({
      items: [],
      connections: []
  });

  const { items, connections } = board;

  const [tool, setTool] = useState<'select' | 'connect' | 'pan' | 'note'>('select');
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
  const [inspectorTab, setInspectorTab] = useState<'properties' | 'design'>('properties');

  // Tool Modals
  const [showAnnotationTool, setShowAnnotationTool] = useState(false);
  const [showWorkbench, setShowWorkbench] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Pan/zoom gesture handling
  const gestures = usePanZoomGestures(containerRef, viewport, {
    enabled: true,
    panButton: 'middle',
    requireCtrlForZoom: true, // Ctrl+wheel to zoom, plain wheel to pan
    enableWheelPan: true,
  });

  // Derived isPanning from gestures
  const isPanning = gestures.isPanning || tool === 'pan';

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
      const label = resource?.label?.['none']?.[0] || 'New Item';
      
      // Better resolution strategy:
      // 1. Local blob (new uploads)
      // 2. Painting annotation body (full IIIF image)
      // 3. Thumbnail (fallback)
      let blob = (resource as any)._blobUrl;
      if (!blob && resource?.type === 'Canvas') {
          const painting = (resource as any).items?.[0]?.items?.[0]?.body;
          if (painting?.id) blob = painting.id;
      }
      if (!blob) {
          blob = (resource as any).thumbnail?.[0]?.id;
      }

      updateBoard(prev => ({
          ...prev,
          items: [...prev.items, { 
            id: crypto.randomUUID(), 
            resourceId: itemId, 
            resourceType: resource?.type || 'Resource', 
            label, 
            blobUrl: blob,
            x: coords.x - 100, 
            y: coords.y - 75, 
            w: 200, 
            h: 150 
        }]
      }));
      showToast("Resource pinned to research board", "success");
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      // Middle click or Pan tool or Spacebar or Shift for panning
      if (e.button === 1 || tool === 'pan' || e.shiftKey || gestures.isPanModeActive) {
          gestures.handlers.onMouseDown(e);
          return;
      }

      if (mode === 'view') return;

      if (tool === 'note') {
          const coords = getCanvasCoords(e);
          updateBoard(prev => ({
              ...prev,
              items: [...prev.items, {
                  id: crypto.randomUUID(),
                  resourceId: `urn:note:${crypto.randomUUID()}`,
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

  const handleItemDown = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (mode === 'view') return;
      if (tool === 'pan') return;
      
      setActiveId(id);
      setSelectedConnectionId(null);
      if (tool === 'select') {
          setDraggingId(id);
      } else {
          setConnectingStart(id);
      }
  };

  const handleItemUp = (id: string) => {
    if (tool === 'connect' && connectingStart && connectingStart !== id) {
        const exists = connections.some(c => (c.fromId === connectingStart && c.toId === id) || (c.fromId === id && c.toId === connectingStart));
        if (!exists) {
            updateBoard(prev => ({
                ...prev,
                connections: [...prev.connections, { id: crypto.randomUUID(), fromId: connectingStart, toId: id, type: 'relatesTo' }]
            }));
            showToast("Archive connection synthesized", "success");
        }
    }
    setDraggingId(null);
    setConnectingStart(null);
  };

  const applyTemplate = (type: 'grid' | 'sequence' | 'comparison') => {
      const newItems: BoardItem[] = [];
      const startX = -viewState.x / viewState.scale + 100;
      const startY = -viewState.y / viewState.scale + 100;

      if (type === 'grid') {
          for (let i = 0; i < 4; i++) {
              newItems.push({
                  id: crypto.randomUUID(),
                  resourceId: `urn:placeholder:${crypto.randomUUID()}`,
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
                  id: crypto.randomUUID(),
                  resourceId: `urn:placeholder:${crypto.randomUUID()}`,
                  resourceType: 'Canvas',
                  label: `Step ${i+1}`,
                  x: startX + i * 250,
                  y: startY,
                  w: 200, h: 150
              });
          }
      } else if (type === 'comparison') {
          newItems.push({ id: crypto.randomUUID(), resourceId: `urn:p1:${crypto.randomUUID()}`, resourceType: 'Canvas', label: 'Object A', x: startX, y: startY, w: 300, h: 400 });
          newItems.push({ id: crypto.randomUUID(), resourceId: `urn:p2:${crypto.randomUUID()}`, resourceType: 'Canvas', label: 'Object B', x: startX + 320, y: startY, w: 300, h: 400 });
      }

      updateBoard(prev => ({
          ...prev,
          items: [...prev.items, ...newItems]
      }));
      setShowTemplates(false);
      showToast("Template applied", "success");
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
      const newItem = { ...item, id: crypto.randomUUID(), x: item.x + 20, y: item.y + 20 };
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

  // Keyboard shortcuts
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (document.activeElement?.tagName.match(/INPUT|TEXTAREA/)) return;

          // Tools
          if (e.key.toLowerCase() === 'v') setTool('select');
          if (e.key.toLowerCase() === 'h') setTool('pan');
          if (e.key.toLowerCase() === 'c') setTool('connect');
          if (e.key.toLowerCase() === 't') setTool('note');

          // Space for pan mode
          if (e.code === 'Space' && !e.repeat) {
              e.preventDefault();
              gestures.setPanModeActive(true);
          }

          // View
          if (e.key === '\\') setMode(prev => prev === 'edit' ? 'view' : 'edit');
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
  }, [undo, redo, activeId, deleteItem, viewport, duplicateItem, reorderItem, alignItem, gestures]);

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
    const boardWidth = Math.max(maxX - minX, 2000);
    const boardHeight = Math.max(maxY - minY, 2000);

    const boardId = `urn:field-studio:board:${crypto.randomUUID()}`;
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

      return {
        id: `${canvasId}/annotation/item-${idx}`,
        type: "Annotation",
        motivation: "painting",
        label: { none: [item.label] },
        body: body as any,
        target: `${canvasId}#xywh=${Math.round(normX)},${Math.round(normY)},${Math.round(item.w)},${Math.round(item.h)}`
      };
    });

    // ... (Linking annotations same as before) ...
    // To save space, reusing existing logic structure
    const linkingAnnotations: IIIFAnnotation[] = connections.map((conn, idx) => {
        const fromItem = items.find(i => i.id === conn.fromId);
        const toItem = items.find(i => i.id === conn.toId);
        if (!fromItem || !toItem) return null;
  
        const fromCenter = { x: fromItem.x - minX + fromItem.w / 2, y: fromItem.y - minY + fromItem.h / 2 };
        
        return {
          id: `${canvasId}/annotation/link-${idx}`,
          type: "Annotation",
          motivation: "linking",
          label: { none: [conn.label || conn.type] },
          body: {
            type: "TextualBody",
            value: JSON.stringify({ relationshipType: conn.type, label: conn.label }),
            format: "application/json"
          },
          target: `${canvasId}#xywh=${Math.round(fromCenter.x)},${Math.round(fromCenter.y)},1,1`
        };
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
      "@context": "http://iiif.io/api/presentation/3/context.json",
      id: boardId,
      type: "Manifest",
      label: { none: [`Research Board - ${new Date().toLocaleDateString()}`] },
      items: [boardCanvas]
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/ld+json' });
    saveAs(blob, `board-export-${new Date().toISOString().split('T')[0]}.json`);
    showToast("Board exported as IIIF Manifest", "success");
  }, [items, connections, showToast]);

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden relative font-sans">
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
            <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                <button onClick={() => setTool('select')} className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg flex items-center gap-2 ${tool === 'select' ? 'bg-white shadow-md text-iiif-blue' : 'text-slate-500 hover:text-slate-800'}`}><Icon name="near_me" className="text-sm"/> Select</button>
                <button onClick={() => setTool('pan')} className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg flex items-center gap-2 ${tool === 'pan' ? 'bg-white shadow-md text-iiif-blue' : 'text-slate-500 hover:text-slate-800'}`}><Icon name="pan_tool" className="text-sm"/> Pan</button>
                <button onClick={() => setTool('connect')} className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg flex items-center gap-2 ${tool === 'connect' ? 'bg-white shadow-md text-iiif-blue' : 'text-slate-500 hover:text-slate-800'}`}><Icon name="mediation" className="text-sm"/> Connect</button>
                <button onClick={() => setTool('note')} className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg flex items-center gap-2 ${tool === 'note' ? 'bg-white shadow-md text-iiif-blue' : 'text-slate-500 hover:text-slate-800'}`}><Icon name="note_add" className="text-sm"/> Note</button>
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
            <button onClick={exportBoardAsManifest} className="flex items-center gap-2 px-4 py-2 bg-iiif-blue text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-all">
                <Icon name="file_download" className="text-sm"/> Export
            </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div
            ref={containerRef}
            className={`flex-1 relative overflow-hidden bg-slate-100 ${tool === 'pan' || isPanning || gestures.isPanModeActive ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
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
        >
                <div style={{ transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`, transformOrigin: '0 0', width: '100%', height: '100%' }}>
                    <svg className="absolute inset-0 overflow-visible pointer-events-none z-10" style={{ width: '10000px', height: '10000px' }}>
                        {connections.map(c => {
                            const start = getCenter(c.fromId), end = getCenter(c.toId);
                            const isSelected = selectedConnectionId === c.id;
                            return (
                                <g key={c.id} className="pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedConnectionId(c.id); setActiveId(null); }}>
                                    <line 
                                        x1={start.x} y1={start.y} x2={end.x} y2={end.y} 
                                        stroke={isSelected ? "#005596" : "#3b82f6"} 
                                        strokeWidth={isSelected ? "5" : "2.5"} 
                                        strokeDasharray={isSelected ? "none" : "6,4"} 
                                    />
                                    {c.label && <text x={(start.x + end.x)/2} y={(start.y + end.y)/2 - 10} textAnchor="middle" className="text-[10px] font-black uppercase fill-slate-700 bg-white">{c.label}</text>}
                                </g>
                            );
                        })}
                        {connectingStart && (
                            <line 
                                x1={getCenter(connectingStart).x} y1={getCenter(connectingStart).y} 
                                x2={mousePos.x} y2={mousePos.y} 
                                stroke="#3b82f6" strokeWidth="2" strokeDasharray="4,4" 
                            />
                        )}
                    </svg>

                    {items.map(it => (
                        <div 
                            key={it.id} 
                            onMouseDown={(e) => handleItemDown(e, it.id)}
                            onMouseUp={() => handleItemUp(it.id)}
                            className={`absolute bg-white shadow-2xl rounded-2xl overflow-hidden group select-none transition-shadow ${activeId === it.id ? 'ring-4 ring-iiif-blue/20 border-iiif-blue' : 'border-slate-200'} border-2 z-20 ${it.isNote ? 'bg-yellow-50 border-yellow-200' : ''}`} 
                            style={{ left: it.x, top: it.y, width: it.w, height: it.h }}
                        >
                            {it.isNote ? (
                                <div className="h-full flex flex-col p-4 bg-yellow-50">
                                    <textarea 
                                        value={it.annotation} 
                                        onChange={(e) => updateBoard(prev => ({...prev, items: prev.items.map(x => x.id === it.id ? {...x, annotation: e.target.value} : x)}))}
                                        className="w-full h-full bg-transparent border-none outline-none resize-none font-handwriting text-slate-800 text-sm"
                                        placeholder="Type note..."
                                        onMouseDown={e => e.stopPropagation()} // Allow typing
                                    />
                                </div>
                            ) : (
                                <div className="h-full flex flex-col relative">
                                    <div className="flex-1 bg-slate-900 flex items-center justify-center relative overflow-hidden">
                                        {it.blobUrl ? (
                                            <img src={it.blobUrl} className="w-full h-full object-contain pointer-events-none" alt="Pin" />
                                        ) : (
                                            <Icon name="description" className="text-5xl text-slate-700 opacity-50"/>
                                        )}
                                        <div className="absolute top-2 left-2 bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest">
                                            {it.resourceType}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white border-t border-slate-100">
                                        <div className="text-[10px] font-black text-slate-800 truncate uppercase tracking-tighter">{it.label}</div>
                                    </div>
                                </div>
                            )}

                            {/* Annotations Overlay */}
                            {it.annotations && it.annotations.map((anno, idx) => {
                                const svgString = (anno.target as any).selector?.value;
                                if (!svgString) return null;
                                return (
                                    <div 
                                        key={idx} 
                                        className="absolute inset-0 pointer-events-auto group/anno"
                                        title={getIIIFValue(anno.body as any)}
                                    >
                                        <div 
                                            className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                                            dangerouslySetInnerHTML={{ __html: svgString }} 
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
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 z-30"
                            >
                                <Icon name="close" className="text-xs"/>
                            </button>
                        </div>
                    ))}
                </div>
        </div>

        {/* Inspector Panel */}
        {(activeItem || activeConn) && (
            <div className="w-80 bg-white border-l shadow-xl z-30 flex flex-col">
                <div className="h-12 border-b flex items-center px-4 justify-between bg-slate-50">
                    <div className="flex gap-4">
                        <button onClick={() => setInspectorTab('properties')} className={`text-[10px] font-black uppercase tracking-widest py-3 border-b-2 transition-all ${inspectorTab === 'properties' ? 'text-iiif-blue border-iiif-blue' : 'text-slate-400 border-transparent'}`}>Properties</button>
                        <button onClick={() => setInspectorTab('design')} className={`text-[10px] font-black uppercase tracking-widest py-3 border-b-2 transition-all ${inspectorTab === 'design' ? 'text-iiif-blue border-iiif-blue' : 'text-slate-400 border-transparent'}`}>Design</button>
                    </div>
                    <button onClick={() => { setActiveId(null); setSelectedConnectionId(null); }}><Icon name="close" className="text-slate-300 text-sm"/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {inspectorTab === 'properties' ? (
                        <>
                            {activeItem && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Item Label</label>
                                        <input 
                                            value={activeItem.label || ''} 
                                            onChange={(e) => updateBoard(prev => ({...prev, items: prev.items.map(it => it.id === activeId ? {...it, label: e.target.value} : it)}))}
                                            className="w-full text-xs p-2 rounded-lg border outline-none font-bold"
                                        />
                                    </div>
                                    {!activeItem.isNote && (
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Annotation</label>
                                            <textarea 
                                                value={activeItem.annotation || ''} 
                                                onChange={(e) => updateBoard(prev => ({...prev, items: prev.items.map(it => it.id === activeId ? {...it, annotation: e.target.value} : it)}))}
                                                placeholder="Add scholarly notes..."
                                                className="w-full text-xs p-3 rounded-lg border outline-none min-h-[100px]"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeConn && (
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <label className="block text-[10px] font-black text-blue-700 uppercase mb-2">Relationship</label>
                                    <input 
                                        value={activeConn.label || ''}
                                        onChange={(e) => updateBoard(prev => ({...prev, connections: prev.connections.map(c => c.id === selectedConnectionId ? {...c, label: e.target.value} : c)}))}
                                        className="w-full text-xs font-bold p-3 rounded-lg border-2 border-blue-100 outline-none uppercase tracking-widest"
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-6">
                            {activeItem && (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Alignment</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => alignItem(activeItem.id, 'center-h')} className="p-2 bg-slate-50 hover:bg-slate-100 rounded text-xs flex items-center justify-center gap-2"><Icon name="align_horizontal_center"/> Center H</button>
                                            <button onClick={() => alignItem(activeItem.id, 'center-v')} className="p-2 bg-slate-50 hover:bg-slate-100 rounded text-xs flex items-center justify-center gap-2"><Icon name="align_vertical_center"/> Center V</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Order</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => reorderItem(activeItem.id, 'forward')} className="p-2 bg-slate-50 hover:bg-slate-100 rounded text-xs flex items-center justify-center gap-2"><Icon name="flip_to_front"/> Forward</button>
                                            <button onClick={() => reorderItem(activeItem.id, 'backward')} className="p-2 bg-slate-50 hover:bg-slate-100 rounded text-xs flex items-center justify-center gap-2"><Icon name="flip_to_back"/> Backward</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Actions</label>
                                        <button onClick={() => duplicateItem(activeItem.id)} className="w-full p-2 bg-slate-50 hover:bg-slate-100 rounded text-xs flex items-center justify-center gap-2 mb-2"><Icon name="content_copy"/> Duplicate</button>
                                        <button onClick={() => deleteItem(activeItem.id)} className="w-full p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs flex items-center justify-center gap-2"><Icon name="delete"/> Delete</button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      {/* Modals */}
      {showAnnotationTool && activeItem && activeItem.blobUrl && (
          <PolygonAnnotationTool
            canvas={{ id: activeItem.resourceId, width: 2000, height: 2000, type: 'Canvas', items: [] }}
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
                width: 2000, 
                height: 2000, 
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
                          <div className="flex justify-between"><span>Pan</span> <kbd className="bg-slate-100 px-1.5 rounded font-mono">H / Space</kbd></div>
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
