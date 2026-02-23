<!--
  CanvasComposerPanel.svelte — Panel wrapper around CanvasComposer organism

  LAYER: organism (FSD features/viewer/ui/organisms)

  Renders CanvasComposer inside a bordered panel with a header showing the
  canvas label and a close button.
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFCanvas, IIIFManifest, IIIFCollection } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';
  import CanvasComposer from './CanvasComposer.svelte';

  interface Props {
    canvas: IIIFCanvas;
    root: IIIFManifest | IIIFCollection | null;
    onUpdate: (canvas: IIIFCanvas) => void;
    onClose: () => void;
    fieldMode: boolean;
    cx: ContextualClassNames;
  }

  let {
    canvas,
    root,
    onUpdate,
    onClose,
    fieldMode,
    cx,
  }: Props = $props();

  let canvasLabel = $derived(getIIIFValue(canvas.label) ?? 'Canvas');
</script>

<div
  class={cn(
    'flex flex-col w-full h-full border-4 overflow-hidden',
    fieldMode ? 'bg-nb-black border-nb-yellow' : 'bg-nb-white border-nb-black'
  )}
  role="region"
  aria-label="Canvas composer panel"
>
  <!-- Panel header -->
  <div class={cn(
    'flex items-center justify-between px-3 py-2 border-b-4 shrink-0',
    cx.headerBg,
    cx.text
  )}>
    <div class="flex items-center gap-2 min-w-0">
      <span class="material-symbols-outlined text-sm shrink-0" aria-hidden="true">
        dashboard_customize
      </span>
      <span class="text-xs font-mono font-bold uppercase tracking-wider truncate">
        Composer
      </span>
      <span class={cn('text-xs font-mono truncate', cx.textMuted)}>
        &mdash; {canvasLabel}
      </span>
    </div>

    <button
      class={cn('shrink-0 p-1 border-2 transition-nb', cx.iconButton)}
      onclick={onClose}
      aria-label="Close composer panel"
      title="Close"
    >
      <span class="material-symbols-outlined text-sm leading-none">close</span>
    </button>
  </div>

  <!-- Composer content -->
  <div class="flex-1 min-h-0">
    <CanvasComposer
      {canvas}
      {root}
      {onUpdate}
      {onClose}
      {fieldMode}
      {cx}
    />
  </div>
</div>
