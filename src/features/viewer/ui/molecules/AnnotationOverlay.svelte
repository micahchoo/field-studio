<!--
  AnnotationOverlay.svelte — SVG overlay rendering existing IIIF annotations as visual shapes

  LAYER: molecule (receives fieldMode props)
  FSD: features/viewer/ui/molecules

  Scales annotation coordinates from canvas space to container space and
  renders SvgSelector annotations as polygon/rect SVG shapes. Individual
  shapes are interactive (pointer-events: all); the SVG root is passive.
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { IIIFAnnotation } from '@/src/shared/types';
  import { parseSvgSelector } from '@/src/features/viewer/model/annotation';

  interface Props {
    annotations: IIIFAnnotation[];
    canvasWidth: number;
    canvasHeight: number;
    containerWidth: number;
    containerHeight: number;
    selectedId?: string;
    onSelect?: (id: string) => void;
    fieldMode: boolean;
  }

  let {
    annotations,
    canvasWidth,
    canvasHeight,
    containerWidth,
    containerHeight,
    selectedId,
    onSelect,
    fieldMode,
  }: Props = $props();

  // Scale factors from canvas space to container space
  let scaleX = $derived(canvasWidth > 0 ? containerWidth / canvasWidth : 1);
  let scaleY = $derived(canvasHeight > 0 ? containerHeight / canvasHeight : 1);

  type ShapeData =
    | { type: 'polygon'; points: string; id: string }
    | { type: 'rect'; x: number; y: number; width: number; height: number; id: string }
    | null;

  function extractShape(anno: IIIFAnnotation): ShapeData {
    const target = anno.target as any;
    const selector = target?.selector;
    if (!selector) return null;

    const selectorType = selector.type;
    const selectorValue = selector.value;

    if (selectorType === 'SvgSelector' && selectorValue) {
      const pts = parseSvgSelector(selectorValue);
      if (pts.length < 2) return null;
      const scaled = pts.map(p => `${(p.x * scaleX).toFixed(1)},${(p.y * scaleY).toFixed(1)}`).join(' ');
      return { type: 'polygon', points: scaled, id: anno.id };
    }

    // FragmentSelector with xywh=
    if (selectorType === 'FragmentSelector' && selectorValue) {
      const match = String(selectorValue).match(/xywh=(\d+),(\d+),(\d+),(\d+)/);
      if (match) {
        return {
          type: 'rect',
          x: parseInt(match[1]) * scaleX,
          y: parseInt(match[2]) * scaleY,
          width: parseInt(match[3]) * scaleX,
          height: parseInt(match[4]) * scaleY,
          id: anno.id,
        };
      }
    }

    return null;
  }

  let shapes = $derived(
    annotations.map(a => ({ anno: a, shape: extractShape(a) })).filter(s => s.shape !== null)
  );

  let strokeColor = $derived(fieldMode ? '#FFE500' : '#0055FF');
  let selectedStrokeColor = $derived(fieldMode ? '#FF6B00' : '#FF4444');
</script>

<svg
  class="absolute inset-0 w-full h-full"
  style:pointer-events="none"
  aria-label="Annotation overlay"
  role="img"
>
  {#each shapes as { anno, shape }}
    {#if shape}
      {@const isSelected = selectedId === anno.id}
      {@const stroke = isSelected ? selectedStrokeColor : strokeColor}
      {@const fill = isSelected ? `${stroke}33` : `${stroke}1A`}

      {#if shape.type === 'polygon'}
        <polygon
          points={shape.points}
          fill={fill}
          stroke={stroke}
          stroke-width={isSelected ? 3 : 2}
          style:pointer-events="all"
          style:cursor="pointer"
          role="button"
          tabindex="0"
          aria-label="Annotation"
          aria-pressed={isSelected}
          onclick={() => onSelect?.(anno.id)}
          onkeydown={(e) => e.key === 'Enter' && onSelect?.(anno.id)}
        />
      {:else if shape.type === 'rect'}
        <rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={fill}
          stroke={stroke}
          stroke-width={isSelected ? 3 : 2}
          style:pointer-events="all"
          style:cursor="pointer"
          role="button"
          tabindex="0"
          aria-label="Annotation"
          aria-pressed={isSelected}
          onclick={() => onSelect?.(anno.id)}
          onkeydown={(e) => e.key === 'Enter' && onSelect?.(anno.id)}
        />
      {/if}
    {/if}
  {/each}
</svg>
