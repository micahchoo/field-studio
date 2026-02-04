/**
 * useLayerHistory
 *
 * Manages the placed-layer state for CanvasComposer:
 * - Initialises layers by parsing existing painting annotations on the canvas
 * - Provides an updateLayers fn that automatically records history
 * - Exposes undo / redo with a 50-entry stack
 * - Binds Cmd/Ctrl+Z keyboard shortcut for undo/redo
 *
 * Companion utility: `buildCanvasFromLayers` serialises layers back to
 * IIIF painting annotations for saving.
 */

import { useState, useCallback, useEffect } from 'react';
import { IIIFCanvas, IIIFAnnotation, IIIFAnnotationPage } from '../types';
import { DEFAULT_INGEST_PREFS } from '../constants';

// ---------------------------------------------------------------------------
// Types (exported so CanvasComposer can reference PlacedResource directly)
// ---------------------------------------------------------------------------

export interface PlacedResource {
  id: string;
  resource: {
    id: string;
    type: string;
    label?: Record<string, string[]>;
    _text?: string;
    _blobUrl?: string;
    [key: string]: unknown;
  };
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  locked: boolean;
}

interface HistoryState {
  past: PlacedResource[][];
  present: PlacedResource[];
  future: PlacedResource[][];
}

const MAX_HISTORY = 50;

// ---------------------------------------------------------------------------
// Canvas → PlacedResource parser
// ---------------------------------------------------------------------------

function parseCanvasLayers(canvas: IIIFCanvas): PlacedResource[] {
  const canvasW = canvas.width || DEFAULT_INGEST_PREFS.defaultCanvasWidth;
  const canvasH = canvas.height || DEFAULT_INGEST_PREFS.defaultCanvasHeight;
  const layers: PlacedResource[] = [];

  if (canvas.items?.[0]?.items) {
    (canvas.items[0].items as IIIFAnnotation[]).forEach(anno => {
      const targetString = typeof anno.target === 'string'
        ? anno.target
        : (anno.target as any).source;
      const fragment = targetString?.includes?.('#xywh=')
        ? targetString.split('#xywh=')[1]
        : null;
      let [x, y, w, h] = [0, 0, canvasW, canvasH];
      if (fragment) [x, y, w, h] = fragment.split(',').map(Number);

      layers.push({
        id: anno.id,
        resource: {
          id: (anno.body as any).id || '',
          type: (anno.body as any).type || 'Image',
          _blobUrl: (anno.body as any).id?.includes?.('blob:') ? (anno.body as any).id : undefined,
          label: (anno.body as any).label || { none: ['Archive Layer'] },
        },
        x, y, w, h,
        opacity: 1,
        locked: false,
      });
    });
  }

  return layers;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLayerHistory(canvas: IIIFCanvas) {
  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: parseCanvasLayers(canvas),
    future: [],
  }));

  // Re-initialise when the canvas identity changes (e.g. user navigates to another canvas)
  useEffect(() => {
    setHistory({ past: [], present: parseCanvasLayers(canvas), future: [] });
  }, [canvas.id]);

  const layers = history.present;

  /** Update layers with automatic history recording. Accepts a value or updater fn. */
  const updateLayers = useCallback(
    (updater: PlacedResource[] | ((prev: PlacedResource[]) => PlacedResource[])) => {
      setHistory(prev => {
        const newPresent = typeof updater === 'function' ? updater(prev.present) : updater;
        if (JSON.stringify(newPresent) === JSON.stringify(prev.present)) return prev;
        return {
          past: [...prev.past.slice(-MAX_HISTORY + 1), prev.present],
          present: newPresent,
          future: [],
        };
      });
    },
    []
  );

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      const newPast = [...prev.past];
      const newPresent = newPast.pop()!;
      return { past: newPast, present: newPresent, future: [prev.present, ...prev.future] };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      const newFuture = [...prev.future];
      const newPresent = newFuture.shift()!;
      return { past: [...prev.past, prev.present], present: newPresent, future: newFuture };
    });
  }, []);

  // Keyboard binding: Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return { layers, updateLayers, canUndo, canRedo, undo, redo };
}

// ---------------------------------------------------------------------------
// Save utility — pure function, no hooks
// ---------------------------------------------------------------------------

/**
 * Serialise the current layer state back into a valid IIIFCanvas with
 * painting annotations.  Non-painting annotations that already exist on
 * the canvas are preserved.
 */
export function buildCanvasFromLayers(
  canvas: IIIFCanvas,
  layers: PlacedResource[],
  dimensions: { w: number; h: number }
): IIIFCanvas {
  const paintingAnnotations: IIIFAnnotation[] = layers.map(l => {
    let body: any;
    if (l.resource.type === 'Text' || l.resource._text) {
      body = { type: 'TextualBody', value: l.resource._text || 'New Text Layer', format: 'text/plain' };
    } else {
      const format =
        l.resource.type === 'Video' ? 'video/mp4' :
        l.resource.type === 'Sound' ? 'audio/mpeg' :
        'image/jpeg';
      body = { id: l.resource._blobUrl || l.resource.id, type: l.resource.type, format };
    }

    return {
      id: l.id,
      type: 'Annotation' as const,
      motivation: 'painting' as const,
      body,
      target: `${canvas.id}#xywh=${Math.round(l.x)},${Math.round(l.y)},${Math.round(l.w)},${Math.round(l.h)}`,
    };
  });

  // Keep any non-painting annotations that were already on the canvas
  const existingNonPainting: IIIFAnnotation[] = [];
  if (canvas.items) {
    (canvas.items as IIIFAnnotationPage[]).forEach(page => {
      if (page.items) {
        (page.items as IIIFAnnotation[]).forEach(anno => {
          const isPainting =
            anno.motivation === 'painting' ||
            (Array.isArray(anno.motivation) && anno.motivation.includes('painting'));
          const isOurLayer = layers.some(l => l.id === anno.id);
          if (!isPainting || !isOurLayer) existingNonPainting.push(anno);
        });
      }
    });
  }

  const newItems: IIIFAnnotationPage[] = [
    { id: `${canvas.id}/page/painting`, type: 'AnnotationPage', items: paintingAnnotations },
  ];

  if (existingNonPainting.length > 0) {
    newItems.push({ id: `${canvas.id}/page/annotations`, type: 'AnnotationPage', items: existingNonPainting });
  }

  return { ...canvas, width: dimensions.w, height: dimensions.h, items: newItems };
}
