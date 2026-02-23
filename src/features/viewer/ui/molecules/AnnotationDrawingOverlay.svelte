<!--
  AnnotationDrawingOverlay — Annotorious adapter for OSD annotation drawing

  ORIGINAL: src/features/viewer/ui/molecules/AnnotationDrawingOverlay.tsx (270 lines)
  LAYER: molecule (receives cx + fieldMode props)
  FSD: features/viewer/ui/molecules

  Bridges between the OSD viewer and Annotorious drawing tools to create
  W3C Web Annotation compliant spatial annotations on IIIF canvases.

  Annotorious handles all viewport sync, drawing tools, and annotation
  rendering natively via OSD's overlay API. This component renders only
  a hover tooltip and a drawing status bar.
-->

<script lang="ts" module>
  import type { SpatialDrawingMode } from '../../model/annotation';

  /** Map Field Studio drawing modes to Annotorious tools */
  type AnnotoriousDrawingTool = 'rectangle' | 'polygon';

  function toAnnotoriousTool(mode: SpatialDrawingMode): AnnotoriousDrawingTool | null {
    if (mode === 'polygon') return 'polygon';
    if (mode === 'rectangle') return 'rectangle';
    // 'freehand' and 'select' have no direct Annotorious equivalent
    return null;
  }

  /** Extract text from annotation body for tooltip */
  function getAnnotationText(anno: any): string {
    const body = Array.isArray(anno.body) ? anno.body[0] : anno.body;
    if (body && typeof body === 'object' && 'value' in body) {
      return (body as { value: string }).value || '';
    }
    return '';
  }
</script>

<script lang="ts">
  /* eslint-disable @field-studio/lifecycle-restrictions -- Annotorious OSD integration requires $effect lifecycle hooks to init/sync external library */
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFAnnotation, IIIFCanvas } from '@/src/shared/types';

  interface AnnotationStyleOptions {
    color?: string;
    strokeWidth?: number;
    fillOpacity?: number;
  }

  interface Props {
    canvas: IIIFCanvas;
    viewerRef: any;
    isActive: boolean;
    drawingMode: SpatialDrawingMode;
    onDrawingModeChange?: (mode: SpatialDrawingMode) => void;
    onCreateAnnotation: (annotation: IIIFAnnotation) => void;
    onClose: () => void;
    existingAnnotations: IIIFAnnotation[];
    onUndoRef?: (fn: () => void) => void;
    onRedoRef?: (fn: () => void) => void;
    onClearRef?: (fn: () => void) => void;
    onSaveRef?: (fn: () => void) => void;
    onDrawingStateChange?: (state: { pointCount: number; isDrawing: boolean; canSave: boolean }) => void;
    annotationText?: string;
    annotationMotivation?: 'commenting' | 'tagging' | 'describing';
    annotationStyle?: AnnotationStyleOptions;
    osdReady?: number;
    onAnnotationSelected?: (annotation: IIIFAnnotation | null) => void;
    cx: ContextualClassNames;
    fieldMode: boolean;
  }

  let {
    canvas,
    viewerRef,
    isActive,
    drawingMode,
    onDrawingModeChange,
    onCreateAnnotation,
    onClose,
    existingAnnotations,
    onUndoRef,
    onRedoRef,
    onClearRef,
    onSaveRef,
    onDrawingStateChange,
    annotationText = '',
    annotationMotivation = 'commenting',
    annotationStyle,
    osdReady = 0,
    onAnnotationSelected,
    cx,
    fieldMode,
  }: Props = $props();

  // --- Internal state ---

  // Pending annotation geometry from Annotorious (not yet saved)
  let pendingAnnotation: IIIFAnnotation | null = null;

  // Hover tooltip state
  let hoveredAnnotation = $state<IIIFAnnotation | null>(null);

  // Annotorious instance (non-reactive to avoid proxy overhead on complex lib object)
  let anno: any = null;

  // Stable ref for onAnnotationSelected to avoid re-init loops
  let onAnnotationSelectedCurrent = onAnnotationSelected;
  $effect(() => { onAnnotationSelectedCurrent = onAnnotationSelected; });

  // --- Derived ---

  let tooltipText = $derived(hoveredAnnotation ? getAnnotationText(hoveredAnnotation) : '');

  let statusMessage = $derived.by(() => {
    if (pendingAnnotation) return 'Shape ready \u2014 enter text in Inspector and save';
    if (drawingMode === 'polygon') return 'Click to add points, close shape to finish';
    if (drawingMode === 'rectangle') return 'Click and drag to draw a rectangle';
    return 'Select a drawing tool';
  });

  // --- Annotorious init ---

  $effect(() => {
    const viewer = viewerRef;
    const ready = osdReady;
    if (!viewer || !ready) return;

    // Dynamic import of Annotorious OSD
    let destroyed = false;

    (async () => {
      try {
        // Import pixi unsafe-eval patch first (CSP)
        await import('@pixi/unsafe-eval');
        const { createOSDAnnotator, W3CImageFormat, UserSelectAction } = await import('@annotorious/openseadragon');

        if (destroyed) return;

        const instance = createOSDAnnotator(viewer, {
          adapter: W3CImageFormat(canvas.id),
          drawingEnabled: isActive,
          userSelectAction: isActive ? UserSelectAction.EDIT : UserSelectAction.SELECT,
          style: annotationStyle ? ({
            stroke: annotationStyle.color,
            strokeWidth: annotationStyle.strokeWidth,
            fillOpacity: annotationStyle.fillOpacity,
          } as unknown as import('@annotorious/openseadragon').DrawingStyleExpression<import('@annotorious/openseadragon').ImageAnnotation>) : undefined,
        });

        anno = instance;

        // Set initial tool
        const tool = toAnnotoriousTool(drawingMode);
        if (tool) {
          anno.setDrawingTool(tool);
        }

        // Load existing annotations as read-only overlays
        for (const existing of existingAnnotations) {
          try {
            anno.addAnnotation(existing as any);
          } catch { /* ignore invalid annotations */ }
        }

        // Event: annotation created (shape completed)
        anno.on('createAnnotation', (annotation: any) => {
          pendingAnnotation = annotation as IIIFAnnotation;
          onDrawingStateChange?.({ pointCount: 3, isDrawing: false, canSave: true });
        });

        // Event: selection changed
        anno.on('selectionChanged', (annotations: any[]) => {
          onAnnotationSelectedCurrent?.(annotations[0] ?? null);
        });

        // Event: mouse enter/leave for tooltip
        anno.on('mouseEnterAnnotation', (annotation: any) => {
          hoveredAnnotation = annotation as IIIFAnnotation;
        });

        anno.on('mouseLeaveAnnotation', () => {
          hoveredAnnotation = null;
        });
      } catch (e) {
        console.warn('Annotorious init failed:', e);
      }
    })();

    return () => {
      destroyed = true;
      if (anno) {
        try { anno.destroy(); } catch { /* ignore */ }
        anno = null;
      }
    };
  });

  // Sync isActive -> drawingEnabled
  $effect(() => {
    if (!anno) return;
    anno.setDrawingEnabled(isActive);
    if (!isActive) {
      pendingAnnotation = null;
      onDrawingStateChange?.({ pointCount: 0, isDrawing: false, canSave: false });
    }
  });

  // Sync drawingMode -> Annotorious tool
  $effect(() => {
    if (!anno) return;
    const tool = toAnnotoriousTool(drawingMode);
    if (tool) {
      anno.setDrawingTool(tool);
    }
  });

  // Sync annotationStyle -> Annotorious
  $effect(() => {
    if (!anno || !annotationStyle) return;
    try {
      anno.setStyle({
        stroke: annotationStyle.color,
        strokeWidth: annotationStyle.strokeWidth,
        fillOpacity: annotationStyle.fillOpacity,
      });
    } catch { /* ignore */ }
  });

  // Sync existingAnnotations -> Annotorious
  $effect(() => {
    if (!anno) return;
    const annos = existingAnnotations;

    // Clear and reload (simple approach)
    try {
      anno.clearAnnotations();
      for (const existing of annos) {
        try {
          anno.addAnnotation(existing as any);
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  });

  // --- Expose refs for parent toolbar ---

  $effect(() => {
    onUndoRef?.(() => {
      anno?.undo();
    });
  });

  $effect(() => {
    onRedoRef?.(() => {
      (anno as any)?.redo?.();
    });
  });

  $effect(() => {
    onClearRef?.(() => {
      if (anno) {
        try { anno.cancelDrawing?.(); } catch { /* ignore */ }
        try { anno.clearSelection?.(); } catch { /* ignore */ }
      }
      pendingAnnotation = null;
      onDrawingStateChange?.({ pointCount: 0, isDrawing: false, canSave: false });
    });
  });

  // Expose save ref -- combines stored geometry + text/motivation from Inspector
  $effect(() => {
    // Track annotationText and annotationMotivation as dependencies
    const text = annotationText;
    const motivation = annotationMotivation;
    const canvasId = canvas.id;

    onSaveRef?.(() => {
      const pending = pendingAnnotation;
      if (!pending) return;
      if (!text.trim()) return;

      // Build the final annotation with text from Inspector
      const finalAnnotation: IIIFAnnotation = {
        ...pending,
        id: `${canvasId}/annotation/${Date.now()}`,
        motivation: motivation,
        body: {
          type: 'TextualBody',
          value: text.trim(),
          format: 'text/plain',
        },
      };

      onCreateAnnotation(finalAnnotation);

      // Clean up Annotorious state -- remove the draft shape
      if (anno && pending.id) {
        try { anno.removeAnnotation(pending.id as any); } catch { /* ignore */ }
      }

      pendingAnnotation = null;
      onDrawingStateChange?.({ pointCount: 0, isDrawing: false, canSave: false });
    });
  });

  // --- Keyboard shortcuts ---

  $effect(() => {
    if (!isActive) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingAnnotation) {
          try { anno?.cancelDrawing?.(); } catch { /* ignore */ }
          try { anno?.clearSelection?.(); } catch { /* ignore */ }
          pendingAnnotation = null;
          onDrawingStateChange?.({ pointCount: 0, isDrawing: false, canSave: false });
        } else {
          onClose();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        (anno as any)?.redo?.();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        (anno as any)?.redo?.();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        anno?.undo();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });
</script>

<!-- Hover tooltip -- shown when hovering any annotation, regardless of mode -->
{#if hoveredAnnotation && tooltipText}
  <div class={cn(
    'absolute top-3 left-3 z-30 px-3 py-2 text-xs font-medium',
    'max-w-[280px] truncate pointer-events-none',
    fieldMode
      ? 'bg-nb-black/95 text-nb-yellow border-nb-yellow/50'
      : 'bg-nb-white text-nb-black/80 border-nb-black/20',
    'border backdrop-blur-sm shadow-brutal'
  )}>
    {tooltipText}
  </div>
{/if}

<!-- Drawing status bar -- only shown when annotation tool is active -->
{#if isActive}
  <div class={cn(
    'absolute bottom-4 left-4 z-20 px-3 py-2 text-xs font-medium',
    fieldMode
      ? 'bg-nb-black/95 text-nb-black/20'
      : 'bg-nb-white text-nb-black/60',
    'border backdrop-blur-sm shadow-brutal',
    fieldMode ? 'border-nb-yellow/50' : 'border-nb-black/20'
  )}>
    {statusMessage}
  </div>
{/if}
