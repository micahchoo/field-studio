/**
 * Canvas Composer Model
 *
 * Domain-specific logic for the canvas composition feature.
 * Manages layers, history (undo/redo), and canvas state.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Pure business logic, no UI concerns
 * - Reactive hooks for composer state
 * - History management via useLayerHistory
 */

import React, { useCallback, useRef, useState } from 'react';
import type { IIIFCanvas, IIIFItem } from '@/types';
import { DEFAULT_INGEST_PREFS } from '@/constants';
import { usePanZoomGestures, useViewport, useViewportKeyboard } from '@/hooks';
import { buildCanvasFromLayers, PlacedResource, useLayerHistory } from '@/hooks/useLayerHistory';

// ============================================================================
// Types
// ============================================================================

export type BackgroundMode = 'grid' | 'dark' | 'light';
export type SidebarTab = 'layers' | 'library';

export interface ComposerDimensions {
  w: number;
  h: number;
}

export interface ComposerState {
  dimensions: ComposerDimensions;
  activeId: string | null;
  bgMode: BackgroundMode;
  sidebarTab: SidebarTab;
  isResizing: boolean;
  resizeHandle: string | null;
}

export interface UseComposerReturn extends ComposerState {
  // Layer state from useLayerHistory
  layers: PlacedResource[];
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  updateLayers: (updater: (prev: PlacedResource[]) => PlacedResource[]) => void;
  
  // Viewport state
  viewport: ReturnType<typeof useViewport>;
  scale: number;
  containerRef: React.RefObject<HTMLDivElement>;
  
  // Actions
  setDimensions: (dims: ComposerDimensions) => void;
  setActiveId: (id: string | null) => void;
  setBgMode: (mode: BackgroundMode) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  addResourceLayer: (item: IIIFItem) => void;
  addTextLayer: () => void;
  moveLayer: (idx: number, dir: 'up' | 'down') => void;
  removeLayer: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  updateLayerOpacity: (id: string, opacity: number) => void;
  alignActive: (type: 'center' | 'top' | 'left' | 'fill') => void;
  handleSave: () => IIIFCanvas;
  
  // Resize state
  startResize: (handle: string, e: React.MouseEvent, layer: PlacedResource) => void;
  endResize: () => void;
  updateResize: (dx: number, dy: number) => void;
  
  // Gesture handlers
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
}

// ============================================================================
// Hook
// ============================================================================

export const useComposer = (
  canvas: IIIFCanvas,
  onUpdate: (canvas: IIIFCanvas) => void
): UseComposerReturn => {
  // Layer history
  const { layers, updateLayers, canUndo, canRedo, undo, redo } = useLayerHistory(canvas);
  
  // Canvas dimensions
  const [dimensions, setDimensions] = useState<ComposerDimensions>({
    w: canvas.width || DEFAULT_INGEST_PREFS.defaultCanvasWidth,
    h: canvas.height || DEFAULT_INGEST_PREFS.defaultCanvasHeight,
  });
  
  // UI state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [bgMode, setBgMode] = useState<BackgroundMode>('grid');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('layers');
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  
  // Resize tracking
  const resizeStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    layerX: number;
    layerY: number;
    layerW: number;
    layerH: number;
  } | null>(null);
  
  // Viewport
  const containerRef = useRef<HTMLDivElement>(null);
  const viewport = useViewport({ minScale: 0.1, maxScale: 2, initialScale: 0.25 });
  const {scale} = viewport.viewport;
  
  // Pan/zoom gestures
  const gestures = usePanZoomGestures(containerRef, viewport, {
    enabled: !isResizing,
    panButton: 'middle',
    requireCtrlForZoom: false,
  });
  
  useViewportKeyboard(containerRef, viewport, gestures, {
    enabled: true,
    enableZoom: true,
    enablePan: true,
    enableRotation: false,
    enableReset: true,
    enableSpacePan: true,
  });

  // Layer actions
  const addResourceLayer = useCallback((item: IIIFItem) => {
    const id = crypto.randomUUID();
    const newLayer: PlacedResource = {
      id,
      resource: item as any,
      x: 100,
      y: 100,
      w: 400,
      h: 300,
      opacity: 1,
      locked: false,
    };
    updateLayers(prev => [...prev, newLayer]);
    setActiveId(id);
  }, [updateLayers]);

  const addTextLayer = useCallback(() => {
    const id = crypto.randomUUID();
    const newLayer: PlacedResource = {
      id,
      resource: {
        id: `urn:text:${id}`,
        type: 'Text',
        label: { none: ['Text Layer'] },
        _text: 'Double click to edit text...',
      },
      x: 100,
      y: 100,
      w: 400,
      h: 100,
      opacity: 1,
      locked: false,
    };
    updateLayers(prev => [...prev, newLayer]);
    setActiveId(id);
  }, [updateLayers]);

  const moveLayer = useCallback((idx: number, dir: 'up' | 'down') => {
    updateLayers(prev => {
      const newLayers = [...prev];
      const target = idx + (dir === 'up' ? -1 : 1);
      if (target >= 0 && target < newLayers.length) {
        [newLayers[idx], newLayers[target]] = [newLayers[target], newLayers[idx]];
      }
      return newLayers;
    });
  }, [updateLayers]);

  const removeLayer = useCallback((id: string) => {
    updateLayers(prev => prev.filter(l => l.id !== id));
    if (activeId === id) setActiveId(null);
  }, [updateLayers, activeId]);

  const toggleLayerLock = useCallback((id: string) => {
    updateLayers(prev =>
      prev.map(l => (l.id === id ? { ...l, locked: !l.locked } : l))
    );
  }, [updateLayers]);

  const updateLayerOpacity = useCallback((id: string, opacity: number) => {
    updateLayers(prev =>
      prev.map(l => (l.id === id ? { ...l, opacity } : l))
    );
  }, [updateLayers]);

  const alignActive = useCallback(
    (type: 'center' | 'top' | 'left' | 'fill') => {
      if (!activeId) return;
      updateLayers(prev =>
        prev.map(l => {
          if (l.id !== activeId) return l;
          switch (type) {
            case 'center':
              return {
                ...l,
                x: (dimensions.w - l.w) / 2,
                y: (dimensions.h - l.h) / 2,
              };
            case 'top':
              return { ...l, y: 0 };
            case 'left':
              return { ...l, x: 0 };
            case 'fill':
              return { ...l, x: 0, y: 0, w: dimensions.w, h: dimensions.h };
            default:
              return l;
          }
        })
      );
    },
    [activeId, dimensions, updateLayers]
  );

  // Resize handling
  const startResize = useCallback(
    (handle: string, e: React.MouseEvent, layer: PlacedResource) => {
      resizeStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        layerX: layer.x,
        layerY: layer.y,
        layerW: layer.w,
        layerH: layer.h,
      };
      setIsResizing(true);
      setResizeHandle(handle);
    },
    []
  );

  const endResize = useCallback(() => {
    setIsResizing(false);
    setResizeHandle(null);
    resizeStartRef.current = null;
  }, []);

  const updateResize = useCallback(
    (dx: number, dy: number) => {
      if (!activeId || !resizeHandle || !resizeStartRef.current) return;
      
      const start = resizeStartRef.current;
      updateLayers(prev =>
        prev.map(l => {
          if (l.id !== activeId) return l;
          
          let { x, y, w, h } = {
            x: start.layerX,
            y: start.layerY,
            w: start.layerW,
            h: start.layerH,
          };
          
          if (resizeHandle.includes('e')) w = Math.max(10, start.layerW + dx / scale);
          if (resizeHandle.includes('w')) {
            const newW = Math.max(10, start.layerW - dx / scale);
            x = start.layerX + (start.layerW - newW);
            w = newW;
          }
          if (resizeHandle.includes('s')) h = Math.max(10, start.layerH + dy / scale);
          if (resizeHandle.includes('n')) {
            const newH = Math.max(10, start.layerH - dy / scale);
            y = start.layerY + (start.layerH - newH);
            h = newH;
          }
          
          return { ...l, x, y, w, h };
        })
      );
    },
    [activeId, resizeHandle, scale, updateLayers]
  );

  // Save handler
  const handleSave = useCallback(() => {
    const updated = buildCanvasFromLayers(canvas, layers, dimensions);
    onUpdate(updated);
    return updated;
  }, [canvas, layers, dimensions, onUpdate]);

  return {
    // State
    dimensions,
    activeId,
    bgMode,
    sidebarTab,
    isResizing,
    resizeHandle,
    layers,
    canUndo,
    canRedo,
    viewport,
    scale,
    containerRef,
    
    // Actions
    setDimensions,
    setActiveId,
    setBgMode,
    setSidebarTab,
    updateLayers,
    undo,
    redo,
    addResourceLayer,
    addTextLayer,
    moveLayer,
    removeLayer,
    toggleLayerLock,
    updateLayerOpacity,
    alignActive,
    handleSave,
    startResize,
    endResize,
    updateResize,
    // Gesture handlers from usePanZoomGestures (via handlers object)
    onMouseDown: gestures.handlers.onMouseDown,
    onMouseUp: gestures.handlers.onMouseUp,
    onMouseLeave: gestures.handlers.onMouseLeave,
  };
};
