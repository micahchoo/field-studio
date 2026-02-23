<!--
  ComposerSidebar.svelte — Layer list + resource library for board design

  LAYER: molecule (receives cx + fieldMode props)
  FSD: features/viewer/ui/molecules

  Sortable layer list with drag handles, up/down accessibility buttons,
  type icons, labels, and visibility toggles.
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  interface LayerItem {
    id: string;
    label: string;
    type: string;
    visible: boolean;
  }

  interface Props {
    layers: LayerItem[];
    activeLayerId?: string;
    onLayerSelect: (id: string) => void;
    onLayerToggle: (id: string) => void;
    onLayerReorder: (from: number, to: number) => void;
    fieldMode: boolean;
    cx: ContextualClassNames;
  }

  let {
    layers,
    activeLayerId,
    onLayerSelect,
    onLayerToggle,
    onLayerReorder,
    fieldMode,
    cx,
  }: Props = $props();

  // Drag state
  let dragFromIndex = $state<number | null>(null);
  let dragOverIndex = $state<number | null>(null);

  function getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      image: 'image',
      text: 'text_fields',
      shape: 'shapes',
      resource: 'folder',
      video: 'videocam',
      audio: 'audiotrack',
    };
    return icons[type] ?? 'layers';
  }

  function moveLayer(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= layers.length) return;
    onLayerReorder(fromIndex, toIndex);
  }

  function handleDragStart(e: DragEvent, index: number) {
    dragFromIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    dragOverIndex = index;
  }

  function handleDrop(e: DragEvent, toIndex: number) {
    e.preventDefault();
    if (dragFromIndex !== null && dragFromIndex !== toIndex) {
      onLayerReorder(dragFromIndex, toIndex);
    }
    dragFromIndex = null;
    dragOverIndex = null;
  }

  function handleDragEnd() {
    dragFromIndex = null;
    dragOverIndex = null;
  }
</script>

<div
  class={cn(
    'flex flex-col h-full',
    fieldMode ? 'bg-nb-black border-r border-nb-yellow/30' : 'bg-nb-white border-r border-nb-black/20'
  )}
  role="region"
  aria-label="Layer list"
>
  <!-- Header -->
  <div class={cn(
    'flex items-center justify-between px-3 py-2 border-b shrink-0',
    fieldMode ? 'border-nb-yellow/30' : 'border-nb-black/20'
  )}>
    <span class={cn('text-xs font-mono uppercase tracking-wider font-bold', cx.textMuted)}>
      Layers
    </span>
    <span class={cn('text-xs font-mono', cx.textMuted)}>
      {layers.length}
    </span>
  </div>

  <!-- Layer list (reversed: top layers first) -->
  <ol
    class="flex-1 overflow-y-auto py-1"
    aria-label="Layers"
  >
    {#if layers.length === 0}
      <li class={cn('px-3 py-6 text-xs font-mono text-center', cx.textMuted)}>
        No layers yet
      </li>
    {:else}
      {#each [...layers].reverse() as layer, reversedIndex (layer.id)}
        {@const originalIndex = layers.length - 1 - reversedIndex}
        {@const isActive = layer.id === activeLayerId}
        {@const isDragOver = dragOverIndex === originalIndex}

        <li
          class={cn(
            'flex items-center gap-2 px-2 py-1.5 border-b transition-colors',
            isActive
              ? fieldMode ? 'bg-nb-yellow/15 border-nb-yellow/30' : 'bg-nb-black/10 border-nb-black/20'
              : fieldMode ? 'border-nb-yellow/10 hover:bg-nb-yellow/10' : 'border-nb-black/5 hover:bg-nb-black/5',
            isDragOver && (fieldMode ? 'border-t-2 border-t-nb-yellow' : 'border-t-2 border-t-nb-blue'),
            !layer.visible && 'opacity-50'
          )}
          draggable="true"
          ondragstart={(e) => handleDragStart(e, originalIndex)}
          ondragover={(e) => handleDragOver(e, originalIndex)}
          ondrop={(e) => handleDrop(e, originalIndex)}
          ondragend={handleDragEnd}
        >
          <!-- Drag handle -->
          <span
            class={cn('text-xs cursor-grab active:cursor-grabbing select-none', cx.textMuted)}
            aria-hidden="true"
          >
            &#8942;&#8942;
          </span>

          <!-- Type icon -->
          <span
            class={cn(
              'material-symbols-outlined text-sm shrink-0',
              fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/50'
            )}
            aria-hidden="true"
          >
            {getTypeIcon(layer.type)}
          </span>

          <!-- Label -->
          <button
            class={cn(
              'flex-1 min-w-0 text-left text-xs font-mono truncate',
              isActive ? cx.text : cx.textMuted
            )}
            onclick={() => onLayerSelect(layer.id)}
            aria-current={isActive ? 'true' : undefined}
          >
            {layer.label || 'Untitled layer'}
          </button>

          <!-- Up/Down reorder buttons (accessibility) -->
          <div class="flex flex-col gap-0.5 shrink-0">
            <button
              class={cn('text-[9px] leading-none px-0.5', cx.iconButton)}
              onclick={() => moveLayer(originalIndex, originalIndex + 1)}
              disabled={originalIndex >= layers.length - 1}
              aria-label="Move layer up"
              title="Move up"
            >&#9650;</button>
            <button
              class={cn('text-[9px] leading-none px-0.5', cx.iconButton)}
              onclick={() => moveLayer(originalIndex, originalIndex - 1)}
              disabled={originalIndex <= 0}
              aria-label="Move layer down"
              title="Move down"
            >&#9660;</button>
          </div>

          <!-- Visibility toggle -->
          <button
            class={cn('shrink-0', cx.iconButton)}
            onclick={() => onLayerToggle(layer.id)}
            aria-label={layer.visible ? `Hide ${layer.label}` : `Show ${layer.label}`}
            aria-pressed={layer.visible}
            title={layer.visible ? 'Hide layer' : 'Show layer'}
          >
            <span class="material-symbols-outlined text-sm">
              {layer.visible ? 'visibility' : 'visibility_off'}
            </span>
          </button>
        </li>
      {/each}
    {/if}
  </ol>
</div>
