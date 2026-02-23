<!--
  AnnotationCanvas.svelte — Thin overlay that mounts Annotorious over an OSD viewer

  LAYER: molecule (receives cx + fieldMode props)
  FSD: features/viewer/ui/molecules

  Renders as a transparent absolutely-positioned div that Annotorious uses as
  its mounting target. The actual Annotorious lifecycle (init, sync, destroy)
  is managed via $effect blocks reacting to viewerRef and existingAnnotations.
-->
<script lang="ts">
  /* eslint-disable @field-studio/lifecycle-restrictions -- Annotorious integration requires $effect for external lib lifecycle */
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
    viewerRef: any | null;
    existingAnnotations: IIIFAnnotation[];
    annotationStyle?: AnnotationStyleOptions;
    fieldMode: boolean;
    cx: ContextualClassNames;
    onAnnotationCreate?: (a: IIIFAnnotation) => void;
    onAnnotationSelect?: (id: string) => void;
  }

  let {
    canvas,
    viewerRef,
    existingAnnotations,
    annotationStyle,
    fieldMode,
    cx,
    onAnnotationCreate,
    onAnnotationSelect,
  }: Props = $props();

  let containerEl: HTMLDivElement | undefined = $state(undefined);
  let anno: any = null;

  // Stable refs for callbacks to avoid re-init loops
  let onAnnotationCreateCurrent = onAnnotationCreate;
  let onAnnotationSelectCurrent = onAnnotationSelect;
  $effect(() => { onAnnotationCreateCurrent = onAnnotationCreate; });
  $effect(() => { onAnnotationSelectCurrent = onAnnotationSelect; });

  // Init Annotorious when viewer is ready
  $effect(() => {
    const viewer = viewerRef;
    if (!viewer || !containerEl) return;

    let destroyed = false;

    (async () => {
      try {
        await import('@pixi/unsafe-eval');
        const { createOSDAnnotator, W3CImageFormat, UserSelectAction } = await import('@annotorious/openseadragon');

        if (destroyed) return;

        const instance = createOSDAnnotator(viewer, {
          adapter: W3CImageFormat(canvas.id),
          drawingEnabled: false,
          userSelectAction: UserSelectAction.SELECT,
          style: annotationStyle ? ({
            stroke: annotationStyle.color,
            strokeWidth: annotationStyle.strokeWidth,
            fillOpacity: annotationStyle.fillOpacity,
          } as any) : undefined,
        });

        anno = instance;

        // Load existing annotations
        for (const existing of existingAnnotations) {
          try {
            anno.addAnnotation(existing as any);
          } catch { /* ignore invalid */ }
        }

        anno.on('createAnnotation', (annotation: any) => {
          onAnnotationCreateCurrent?.(annotation as IIIFAnnotation);
        });

        anno.on('selectionChanged', (annotations: any[]) => {
          if (annotations[0]?.id) {
            onAnnotationSelectCurrent?.(annotations[0].id);
          }
        });
      } catch (e) {
        console.warn('[AnnotationCanvas] Annotorious init failed:', e);
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

  // Sync existingAnnotations -> Annotorious
  $effect(() => {
    if (!anno) return;
    const annos = existingAnnotations;
    try {
      anno.clearAnnotations();
      for (const existing of annos) {
        try { anno.addAnnotation(existing as any); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
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
</script>

<div
  bind:this={containerEl}
  class={cn('absolute inset-0 pointer-events-none z-10')}
  aria-hidden="true"
  data-annotation-canvas
></div>
