<!--
  AnnotationToolPanel.svelte — Inspector panel for annotation creation

  LAYER: organism (FSD features/viewer/ui/organisms)

  Combines AnnotationToolbar + AnnotationForm molecules in a panel-style
  layout with a "Draw Annotation" header and canvas info.
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFCanvas } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';
  import AnnotationToolbar from '../molecules/AnnotationToolbar.svelte';
  import AnnotationForm from '../molecules/AnnotationForm.svelte';

  type DrawingMode = 'polygon' | 'rectangle' | 'freehand' | 'select';
  type Motivation = 'commenting' | 'tagging' | 'describing';

  interface Props {
    canvas: IIIFCanvas | null;
    drawingMode: DrawingMode;
    isDrawing: boolean;
    pointCount: number;
    canSave: boolean;
    text: string;
    motivation: Motivation;
    fieldMode: boolean;
    cx: ContextualClassNames;
    onModeChange: (mode: DrawingMode) => void;
    onTextChange: (text: string) => void;
    onMotivationChange: (m: Motivation) => void;
    onSave: () => void;
    onUndo: () => void;
    onClear: () => void;
  }

  let {
    canvas,
    drawingMode,
    isDrawing,
    pointCount,
    canSave,
    text,
    motivation,
    fieldMode,
    cx,
    onModeChange,
    onTextChange,
    onMotivationChange,
    onSave,
    onUndo,
    onClear,
  }: Props = $props();

  let canvasLabel = $derived(canvas ? getIIIFValue(canvas.label) ?? 'Canvas' : null);

  function handleModeChange(mode: string) {
    onModeChange(mode as DrawingMode);
  }

  function handleMotivationChange(m: string) {
    onMotivationChange(m as Motivation);
  }
</script>

<div
  class={cn(
    'flex flex-col h-full overflow-hidden',
    fieldMode ? 'bg-nb-black' : 'bg-nb-white'
  )}
  role="region"
  aria-label="Annotation tool panel"
>
  <!-- Panel header -->
  <div class={cn(
    'flex items-center justify-between px-3 py-2 border-b-4 shrink-0',
    cx.headerBg,
    cx.text
  )}>
    <span class="text-xs font-mono font-bold uppercase tracking-wider">
      Draw Annotation
    </span>
    {#if isDrawing}
      <span class={cn(
        'text-[10px] font-mono animate-pulse',
        fieldMode ? 'text-nb-yellow' : 'text-nb-blue'
      )}>
        Drawing...
      </span>
    {/if}
  </div>

  <!-- Canvas info -->
  {#if canvasLabel}
    <div class={cn(
      'px-3 py-1.5 border-b text-xs font-mono truncate',
      fieldMode ? 'border-nb-yellow/20 text-nb-yellow/60' : 'border-nb-black/10 text-nb-black/50'
    )}>
      {canvasLabel}
    </div>
  {/if}

  <!-- Toolbar -->
  <div class={cn(
    'px-3 py-2 border-b shrink-0',
    fieldMode ? 'border-nb-yellow/20' : 'border-nb-black/10'
  )}>
    <AnnotationToolbar
      activeMode={drawingMode}
      onModeChange={handleModeChange}
      {fieldMode}
      {cx}
    />
  </div>

  <!-- Form (scrollable) -->
  <div class="flex-1 overflow-y-auto">
    <AnnotationForm
      {text}
      {motivation}
      {pointCount}
      {canSave}
      onTextChange={onTextChange}
      onMotivationChange={handleMotivationChange}
      {onSave}
      {onUndo}
      {onClear}
      {fieldMode}
      {cx}
    />
  </div>

  <!-- Help text -->
  <div class={cn(
    'px-3 py-2 border-t text-[10px] font-mono shrink-0',
    fieldMode ? 'border-nb-yellow/20 text-nb-yellow/40' : 'border-nb-black/10 text-nb-black/30'
  )}>
    P=polygon &bull; R=rect &bull; F=freehand &bull; S=select &bull; Esc=cancel
  </div>
</div>
