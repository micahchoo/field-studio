<!--
  PolygonAnnotationTool.svelte — SVG polygon drawing tool for canvas annotation

  LAYER: organism (FSD features/viewer/ui/organisms)

  Full-container SVG overlay. Click to add polygon points; drag for rectangle.
  Escape cancels, Enter / click on first point closes the polygon.
  Emits createSvgSelector-based IIIFAnnotation on shape completion.
-->
<script lang="ts">
   
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFAnnotation, IIIFCanvas } from '@/src/shared/types';
  import {
    createSvgSelector,
    pointsToSvgPath,
    type Point,
  } from '@/src/features/viewer/model/annotation';
  import * as GeoPoint from '@/src/shared/lib/geometry/point';
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    canvas: IIIFCanvas;
    containerEl: HTMLElement | null;
    existingAnnotations: IIIFAnnotation[];
    mode: 'polygon' | 'rectangle';
    onAnnotationCreate: (annotation: IIIFAnnotation) => void;
    fieldMode: boolean;
    cx: ContextualClassNames;
  }

  let {
    canvas,
    containerEl,
    existingAnnotations,
    mode,
    onAnnotationCreate,
    fieldMode,
    cx,
  }: Props = $props();

  // Drawing state
  let points = $state<Point[]>([]);
  let cursorPoint = $state<Point | null>(null);
  let isDrawing = $state(false);
  let svgEl: SVGSVGElement | undefined = $state(undefined);

  // Rectangle drag
  let rectStart = $state<Point | null>(null);
  let rectEnd = $state<Point | null>(null);

  let strokeColor = $derived(fieldMode ? '#FFE500' : '#0055FF');
  let fillColor = $derived(fieldMode ? 'rgba(255,229,0,0.15)' : 'rgba(0,85,255,0.15)');
  let closeRadius = 8; // pixels to snap to first point

  // Derived path for in-progress polygon
  let inProgressPath = $derived.by(() => {
    if (points.length < 1) return '';
    const allPts = cursorPoint ? [...points, cursorPoint] : points;
    return pointsToSvgPath(allPts, false);
  });

  // Derived rectangle preview
  let rectPreview = $derived.by(() => {
    if (mode !== 'rectangle' || !rectStart || !rectEnd) return null;
    return {
      x: Math.min(rectStart.x, rectEnd.x),
      y: Math.min(rectStart.y, rectEnd.y),
      width: Math.abs(rectEnd.x - rectStart.x),
      height: Math.abs(rectEnd.y - rectStart.y),
    };
  });

  function getSvgCoords(e: MouseEvent): Point | null {
    if (!svgEl) return null;
    const rect = svgEl.getBoundingClientRect();
    const canvasW = canvas.width ?? rect.width;
    const canvasH = canvas.height ?? rect.height;
    // Scale from container coords to canvas coords
    const x = ((e.clientX - rect.left) / rect.width) * canvasW;
    const y = ((e.clientY - rect.top) / rect.height) * canvasH;
    return { x, y };
  }

  function isNearFirstPoint(pt: Point): boolean {
    if (points.length < 3) return false;
    // Convert closeRadius from pixels to canvas coords
    const rect = svgEl?.getBoundingClientRect();
    if (!rect) return false;
    const canvasW = canvas.width ?? rect.width;
    const thresholdCanvas = (closeRadius / rect.width) * canvasW;
    return GeoPoint.distance(pt, points[0]) < thresholdCanvas;
  }

  function closePolygon() {
    if (points.length < 3) return;
    const canvasW = canvas.width ?? 1;
    const canvasH = canvas.height ?? 1;
    const svgValue = createSvgSelector(points, canvasW, canvasH);
    const annotation: IIIFAnnotation = {
      id: `${canvas.id}/annotation/polygon-${Date.now()}`,
      type: 'Annotation',
      motivation: 'commenting',
      body: { type: 'TextualBody', value: '', format: 'text/plain' } as any,
      target: {
        type: 'SpecificResource',
        source: canvas.id,
        selector: { type: 'SvgSelector', value: svgValue },
      } as any,
    };
    onAnnotationCreate(annotation);
    points = [];
    cursorPoint = null;
    isDrawing = false;
  }

  function finishRectangle() {
    if (!rectStart || !rectEnd) return;
    const x = Math.min(rectStart.x, rectEnd.x);
    const y = Math.min(rectStart.y, rectEnd.y);
    const w = Math.abs(rectEnd.x - rectStart.x);
    const h = Math.abs(rectEnd.y - rectStart.y);
    if (w < 2 || h < 2) {
      rectStart = null;
      rectEnd = null;
      return;
    }
    const rectPoints: Point[] = [
      { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h },
    ];
    const canvasW = canvas.width ?? 1;
    const canvasH = canvas.height ?? 1;
    const svgValue = createSvgSelector(rectPoints, canvasW, canvasH);
    const annotation: IIIFAnnotation = {
      id: `${canvas.id}/annotation/rect-${Date.now()}`,
      type: 'Annotation',
      motivation: 'commenting',
      body: { type: 'TextualBody', value: '', format: 'text/plain' } as any,
      target: {
        type: 'SpecificResource',
        source: canvas.id,
        selector: { type: 'SvgSelector', value: svgValue },
      } as any,
    };
    onAnnotationCreate(annotation);
    rectStart = null;
    rectEnd = null;
    isDrawing = false;
  }

  function handleMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    const pt = getSvgCoords(e);
    if (!pt) return;

    if (mode === 'rectangle') {
      rectStart = pt;
      rectEnd = pt;
      isDrawing = true;
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const pt = getSvgCoords(e);
    if (!pt) return;
    cursorPoint = pt;

    if (mode === 'rectangle' && rectStart && isDrawing) {
      rectEnd = pt;
    }
  }

  function handleMouseUp(e: MouseEvent) {
    if (mode === 'rectangle' && isDrawing) {
      finishRectangle();
    }
  }

  function handleClick(e: MouseEvent) {
    if (mode !== 'polygon') return;
    const pt = getSvgCoords(e);
    if (!pt) return;

    // Check if clicking near first point to close
    if (points.length >= 3 && isNearFirstPoint(pt)) {
      closePolygon();
      return;
    }

    points = [...points, pt];
    isDrawing = true;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      points = [];
      cursorPoint = null;
      isDrawing = false;
      rectStart = null;
      rectEnd = null;
    } else if (e.key === 'Enter' && mode === 'polygon' && points.length >= 3) {
      closePolygon();
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_no_noninteractive_tabindex -->
<svg
  bind:this={svgEl}
  class={cn(
    'absolute inset-0 w-full h-full',
    mode === 'polygon' ? 'cursor-crosshair' : 'cursor-crosshair'
  )}
  viewBox="0 0 {canvas.width ?? 1000} {canvas.height ?? 1000}"
  preserveAspectRatio="xMidYMid meet"
  onmousedown={handleMouseDown}
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  onclick={handleClick}
  onkeydown={handleKeyDown}
  role="application"
  aria-label="Drawing overlay. Press Escape to cancel, Enter to close polygon."
>
  <!-- Existing annotations (read-only) -->
  {#each existingAnnotations as anno (anno.id)}
    {@const target = anno.target as any}
    {#if target?.selector?.type === 'SvgSelector' && target.selector.value}
      {@html `<g opacity="0.5" pointer-events="none">${target.selector.value.replace(/<svg[^>]*>/, '').replace('</svg>', '')}</g>`}
    {/if}
  {/each}

  <!-- In-progress polygon path -->
  {#if mode === 'polygon' && inProgressPath}
    <path
      d={inProgressPath}
      fill={fillColor}
      stroke={strokeColor}
      stroke-width="2"
      stroke-dasharray="6,3"
      pointer-events="none"
    />
  {/if}

  <!-- Polygon point handles -->
  {#if mode === 'polygon'}
    {#each points as pt, idx}
      <circle
        cx={pt.x}
        cy={pt.y}
        r={idx === 0 ? closeRadius : 4}
        fill={idx === 0 && points.length >= 3 ? strokeColor : fieldMode ? '#FFE500' : '#0055FF'}
        stroke={fieldMode ? '#000' : '#fff'}
        stroke-width="1.5"
        pointer-events="none"
        opacity={idx === 0 && points.length >= 3 ? 0.8 : 1}
      />
    {/each}
  {/if}

  <!-- Rectangle preview -->
  {#if mode === 'rectangle' && rectPreview}
    <rect
      x={rectPreview.x}
      y={rectPreview.y}
      width={rectPreview.width}
      height={rectPreview.height}
      fill={fillColor}
      stroke={strokeColor}
      stroke-width="2"
      stroke-dasharray="6,3"
      pointer-events="none"
    />
  {/if}
</svg>

<!-- Status bar -->
{#if isDrawing || points.length > 0}
  <div class={cn(
    'absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 text-xs font-mono border pointer-events-none',
    fieldMode
      ? 'bg-nb-black/95 text-nb-yellow border-nb-yellow/50'
      : 'bg-nb-white text-nb-black/70 border-nb-black/20'
  )}>
    {#if mode === 'polygon'}
      {points.length} point{points.length !== 1 ? 's' : ''}
      {points.length >= 3 ? '&mdash; Enter or click first point to close' : ''}
      &bull; Esc to cancel
    {:else}
      Click and drag to draw rectangle &bull; Esc to cancel
    {/if}
  </div>
{/if}
