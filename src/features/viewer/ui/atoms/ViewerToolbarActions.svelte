<!--
  ViewerToolbarActions -- Annotation drawing mode and style controls for the viewer toolbar

  LAYER: atom
  FSD: features/viewer/ui/atoms

  Drawing mode buttons (polygon, rectangle, freehand), color picker,
  stroke width selector, and undo/redo/clear actions.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import Divider from '@/src/shared/ui/atoms/Divider.svelte';
  import AnnotationColorPicker from './AnnotationColorPicker.svelte';
  import StrokeWidthSelect from './StrokeWidthSelect.svelte';
  import type { AnnotationDrawingMode, AnnotationStyleOptions } from '../molecules/ViewerToolbar.svelte';
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';

  interface Props {
    annotationDrawingMode?: AnnotationDrawingMode;
    annotationStyle?: AnnotationStyleOptions;
    onAnnotationModeChange: (mode: AnnotationDrawingMode) => void;
    onAnnotationStyleChange?: (style: AnnotationStyleOptions) => void;
    onAnnotationUndo?: () => void;
    onAnnotationRedo?: () => void;
    onAnnotationClear?: () => void;
    cx: ContextualClassNames;
    fieldMode?: boolean;
  }

  let {
    annotationDrawingMode,
    annotationStyle,
    onAnnotationModeChange,
    onAnnotationStyleChange,
    onAnnotationUndo,
    onAnnotationRedo,
    onAnnotationClear,
    cx,
    fieldMode = false,
  }: Props = $props();

  function ibClass(active: boolean): string {
    return cn(
      'p-1.5 transition-nb',
      active
        ? fieldMode ? 'bg-nb-yellow text-black' : 'bg-nb-blue text-white'
        : fieldMode ? 'text-nb-yellow/70 hover:bg-nb-yellow/10' : 'text-nb-black/60 hover:bg-nb-black/5'
    );
  }
</script>

{#snippet iconBtn(icon: string, ariaLabel: string, onclick: (() => void) | undefined, active: boolean)}
  <button type="button" class={ibClass(active)} {onclick} aria-label={ariaLabel} aria-pressed={active || undefined} title={ariaLabel}>
    <Icon name={icon} class="text-base" />
  </button>
{/snippet}

<Divider direction="vertical" cx={cx} class="h-6 mx-1" />
<div class="flex items-center gap-0.5" role="group" aria-label="Drawing mode">
  {@render iconBtn('pentagon', 'Polygon', () => onAnnotationModeChange('polygon'), annotationDrawingMode === 'polygon')}
  {@render iconBtn('crop_square', 'Rectangle', () => onAnnotationModeChange('rectangle'), annotationDrawingMode === 'rectangle')}
  {@render iconBtn('draw', 'Freehand', () => onAnnotationModeChange('freehand'), annotationDrawingMode === 'freehand')}
</div>
{#if onAnnotationStyleChange && annotationStyle}
  <Divider direction="vertical" cx={cx} class="h-6 mx-1" />
  <AnnotationColorPicker
    value={annotationStyle.color || '#22c55e'}
    onChange={(color) => onAnnotationStyleChange({ ...annotationStyle, color })}
    {fieldMode}
  />
  <StrokeWidthSelect
    value={annotationStyle.strokeWidth ?? 2}
    onChange={(strokeWidth) => onAnnotationStyleChange({ ...annotationStyle, strokeWidth })}
    color={annotationStyle.color || '#22c55e'}
    {fieldMode}
  />
{/if}
<div class="flex items-center gap-0.5" role="group" aria-label="Annotation actions">
  {#if onAnnotationUndo}
    {@render iconBtn('undo', 'Undo', onAnnotationUndo, false)}
  {/if}
  {#if onAnnotationRedo}
    {@render iconBtn('redo', 'Redo', onAnnotationRedo, false)}
  {/if}
  {#if onAnnotationClear}
    {@render iconBtn('delete_outline', 'Clear', onAnnotationClear, false)}
  {/if}
</div>
