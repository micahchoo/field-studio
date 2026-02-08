/**
 * useAnnotorious Hook
 *
 * Imperative bridge between an existing OpenSeadragon viewer and Annotorious.
 * Uses createOSDAnnotator() directly (no React wrapper) since Field Studio
 * manages its own OSD lifecycle via useViewer.
 *
 * @module features/viewer/model/useAnnotorious
 */

import { useCallback, useEffect, useRef, useState } from 'react';
// Patch Pixi.js ShaderSystem to avoid `new Function()` — must be imported
// BEFORE @annotorious/openseadragon so the patch is applied before any
// WebGL renderer is created. Without this, CSP blocks `unsafe-eval`.
import '@pixi/unsafe-eval';
import {
  createOSDAnnotator,
  W3CImageFormat,
  type DrawingStyle,
  type ImageAnnotation,
  type W3CImageAnnotation,
  type OpenSeadragonAnnotator,
} from '@annotorious/openseadragon';
import type { IIIFAnnotation, IIIFCanvas } from '@/src/shared/types';

import '@annotorious/openseadragon/annotorious-openseadragon.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnnotoriousDrawingTool = 'rectangle' | 'polygon';

export interface UseAnnotoriousOptions {
  drawingEnabled?: boolean;
  drawingTool?: AnnotoriousDrawingTool;
  fieldMode?: boolean;
  /** State counter that increments when OSD viewer is ready. Triggers initialization. */
  osdReady?: number;
  onCreated?: (annotation: IIIFAnnotation) => void;
  onUpdated?: (annotation: IIIFAnnotation) => void;
  onDeleted?: (annotation: IIIFAnnotation) => void;
  onSelectionChanged?: (annotations: IIIFAnnotation[]) => void;
}

export interface UseAnnotoriousReturn {
  annoRef: React.MutableRefObject<OpenSeadragonAnnotator<ImageAnnotation, W3CImageAnnotation> | null>;
  selectedAnnotation: IIIFAnnotation | null;
  setDrawingTool: (tool: AnnotoriousDrawingTool) => void;
  setDrawingEnabled: (enabled: boolean) => void;
  cancelDrawing: () => void;
  clearSelection: () => void;
}

// ---------------------------------------------------------------------------
// Format conversion: W3C ↔ IIIF
// ---------------------------------------------------------------------------

/** Convert a Field Studio IIIFAnnotation to W3C format Annotorious expects */
function iiifToW3C(annotation: IIIFAnnotation, canvasId: string): W3CImageAnnotation {
  const body = Array.isArray(annotation.body) ? annotation.body[0] : annotation.body;
  const target = typeof annotation.target === 'string'
    ? annotation.target
    : Array.isArray(annotation.target) ? annotation.target[0] : annotation.target;

  // Build W3C body
  const w3cBody = {
    type: body?.type || 'TextualBody',
    value: body && 'value' in body ? body.value : '',
    format: body && 'format' in body ? body.format : 'text/plain',
    purpose: Array.isArray(annotation.motivation) ? annotation.motivation[0] : annotation.motivation,
  };

  // Build W3C target
  let w3cTarget: W3CImageAnnotation['target'];
  if (typeof target === 'string') {
    w3cTarget = target;
  } else if (target && 'selector' in target && target.selector) {
    const selector = Array.isArray(target.selector) ? target.selector[0] : target.selector;
    const source = typeof target.source === 'string' ? target.source : canvasId;
    w3cTarget = { source, selector } as W3CImageAnnotation['target'];
  } else {
    w3cTarget = canvasId;
  }

  return {
    '@context': 'http://www.w3.org/ns/anno.jsonld',
    type: 'Annotation',
    id: annotation.id,
    body: w3cBody,
    target: w3cTarget,
  };
}

/** Convert W3C annotation from Annotorious back to Field Studio IIIFAnnotation */
function w3cToIIIF(w3c: W3CImageAnnotation, canvasId: string): IIIFAnnotation {
  const body = Array.isArray(w3c.body) ? w3c.body[0] : w3c.body;
  const motivation = body?.purpose || 'commenting';

  const iiifBody = {
    type: (body?.type || 'TextualBody') as 'TextualBody',
    value: body?.value || '',
    format: body?.format || 'text/plain',
  };

  // Convert target back to IIIF SpecificResource
  let iiifTarget: IIIFAnnotation['target'];
  if (typeof w3c.target === 'string') {
    iiifTarget = w3c.target;
  } else {
    const target = Array.isArray(w3c.target) ? w3c.target[0] : w3c.target;
    if (target && typeof target === 'object' && 'selector' in target) {
      const selector = Array.isArray(target.selector) ? target.selector[0] : target.selector;
      iiifTarget = {
        type: 'SpecificResource' as const,
        source: ('source' in target ? target.source as string : canvasId),
        selector,
      };
    } else {
      iiifTarget = canvasId;
    }
  }

  return {
    id: w3c.id,
    type: 'Annotation',
    motivation,
    body: iiifBody,
    target: iiifTarget,
  };
}

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

function makeStyle(fieldMode: boolean) {
  return (_annotation: ImageAnnotation, state?: { selected?: boolean; hovered?: boolean }): DrawingStyle => ({
    fill: fieldMode ? '#eab308' : '#22c55e',
    fillOpacity: state?.selected ? 0.3 : state?.hovered ? 0.15 : 0.1,
    stroke: state?.selected
      ? (fieldMode ? '#fbbf24' : '#f59e0b')
      : (fieldMode ? '#eab308' : '#22c55e'),
    strokeWidth: state?.selected ? 3 : 2,
    strokeOpacity: 1,
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAnnotorious(
  viewerRef: React.MutableRefObject<any>,
  canvas: IIIFCanvas | null,
  annotations: IIIFAnnotation[],
  options: UseAnnotoriousOptions = {},
): UseAnnotoriousReturn {
  const {
    fieldMode = false,
    osdReady = 0,
    onCreated,
    onUpdated,
    onDeleted,
    onSelectionChanged,
  } = options;

  const annoRef = useRef<OpenSeadragonAnnotator<ImageAnnotation, W3CImageAnnotation> | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<IIIFAnnotation | null>(null);

  // Store desired drawing state so it can be applied when the annotator is created
  // (setDrawingEnabled/setDrawingTool may be called before the annotator exists)
  const desiredDrawingEnabledRef = useRef(false);
  const desiredDrawingToolRef = useRef<AnnotoriousDrawingTool>('rectangle');

  // Keep callbacks in refs so event handlers always see latest without re-subscribing
  const onCreatedRef = useRef(onCreated);
  const onUpdatedRef = useRef(onUpdated);
  const onDeletedRef = useRef(onDeleted);
  const onSelectionChangedRef = useRef(onSelectionChanged);
  onCreatedRef.current = onCreated;
  onUpdatedRef.current = onUpdated;
  onDeletedRef.current = onDeleted;
  onSelectionChangedRef.current = onSelectionChanged;

  const canvasId = canvas?.id ?? '';

  // Initialize Annotorious when OSD viewer is ready
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !canvasId) return;

    let anno: OpenSeadragonAnnotator<ImageAnnotation, W3CImageAnnotation> | null = null;

    const init = () => {
      if (anno) return; // already initialized

      anno = createOSDAnnotator<ImageAnnotation, W3CImageAnnotation>(viewer, {
        drawingEnabled: false,
        adapter: W3CImageFormat(canvasId),
      });

      annoRef.current = anno;

      // Style
      anno.setStyle(makeStyle(fieldMode));

      // Events
      anno.on('createAnnotation', (w3cAnnotation: W3CImageAnnotation) => {
        const iiif = w3cToIIIF(w3cAnnotation, canvasId);
        onCreatedRef.current?.(iiif);
      });

      anno.on('updateAnnotation', (w3cAnnotation: W3CImageAnnotation) => {
        const iiif = w3cToIIIF(w3cAnnotation, canvasId);
        onUpdatedRef.current?.(iiif);
      });

      anno.on('deleteAnnotation', (w3cAnnotation: W3CImageAnnotation) => {
        const iiif = w3cToIIIF(w3cAnnotation, canvasId);
        onDeletedRef.current?.(iiif);
      });

      anno.on('selectionChanged', (selected: W3CImageAnnotation[]) => {
        const iiifSelected = selected.map(a => w3cToIIIF(a, canvasId));
        setSelectedAnnotation(iiifSelected[0] ?? null);
        onSelectionChangedRef.current?.(iiifSelected);
      });

      // Load existing spatial annotations (skip time-based)
      const spatial = annotations.filter(a => {
        const target = a.target;
        if (typeof target === 'string') return false;
        const t = Array.isArray(target) ? target[0] : target;
        if (!t || typeof t === 'string') return false;
        const sel = Array.isArray(t.selector) ? t.selector[0] : t.selector;
        return sel?.type === 'SvgSelector' || sel?.type === 'FragmentSelector';
      });

      if (spatial.length > 0) {
        const w3c = spatial.map(a => iiifToW3C(a, canvasId));
        anno.setAnnotations(w3c);
      }

      // Apply deferred drawing state (may have been set before annotator existed)
      if (desiredDrawingEnabledRef.current) {
        anno.setDrawingEnabled(true);
      }
      anno.setDrawingTool(desiredDrawingToolRef.current);
    };

    // If OSD is already open, init immediately; otherwise wait for 'open'
    if (viewer.isOpen && viewer.isOpen()) {
      init();
    } else {
      viewer.addHandler('open', init);
    }

    return () => {
      viewer.removeHandler('open', init);
      if (anno) {
        anno.destroy();
        anno = null;
        annoRef.current = null;
      }
      setSelectedAnnotation(null);
    };
    // Re-initialize when canvas changes or OSD viewer becomes ready
  }, [osdReady, canvasId]);

  // Sync fieldMode style changes
  useEffect(() => {
    annoRef.current?.setStyle(makeStyle(fieldMode));
  }, [fieldMode]);

  // Sync external annotation changes (e.g. after save persists)
  useEffect(() => {
    const anno = annoRef.current;
    if (!anno || !canvasId) return;

    const spatial = annotations.filter(a => {
      const target = a.target;
      if (typeof target === 'string') return false;
      const t = Array.isArray(target) ? target[0] : target;
      if (!t || typeof t === 'string') return false;
      const sel = Array.isArray(t.selector) ? t.selector[0] : t.selector;
      return sel?.type === 'SvgSelector' || sel?.type === 'FragmentSelector';
    });

    const w3c = spatial.map(a => iiifToW3C(a, canvasId));
    anno.setAnnotations(w3c, true);
  }, [annotations, canvasId]);

  // Actions — always store desired state so init can apply it if annotator doesn't exist yet
  const setDrawingTool = useCallback((tool: AnnotoriousDrawingTool) => {
    desiredDrawingToolRef.current = tool;
    annoRef.current?.setDrawingTool(tool);
  }, []);

  const setDrawingEnabled = useCallback((enabled: boolean) => {
    desiredDrawingEnabledRef.current = enabled;
    annoRef.current?.setDrawingEnabled(enabled);
  }, []);

  const cancelDrawing = useCallback(() => {
    annoRef.current?.cancelDrawing();
  }, []);

  const clearSelection = useCallback(() => {
    annoRef.current?.cancelSelected();
  }, []);

  return {
    annoRef,
    selectedAnnotation,
    setDrawingTool,
    setDrawingEnabled,
    cancelDrawing,
    clearSelection,
  };
}
