<!--
  ComposerCanvas.svelte — Board design canvas with layer support

  LAYER: molecule (receives cx + fieldMode props)
  FSD: features/viewer/ui/molecules

  Renders absolutely-positioned layers in z-index order inside a relative
  container. Container dimensions are tracked via ResizeObserver for accurate
  layer positioning.
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { onMount } from 'svelte';

  interface Layer {
    id: string;
    type: string;
    content: any;
    visible: boolean;
    zIndex: number;
  }

  interface Props {
    layers: Layer[];
    activeLayerId?: string;
    onLayerSelect?: (id: string) => void;
    onLayerUpdate?: (id: string, changes: Partial<Layer>) => void;
    fieldMode: boolean;
    cx: ContextualClassNames;
  }

  let {
    layers,
    activeLayerId,
    onLayerSelect,
    onLayerUpdate,
    fieldMode,
    cx,
  }: Props = $props();

  let containerEl: HTMLDivElement | undefined = $state(undefined);
  let containerWidth = $state(0);
  let containerHeight = $state(0);

  let sortedLayers = $derived(
    [...layers].filter(l => l.visible).sort((a, b) => a.zIndex - b.zIndex)
  );

  onMount(() => {
    if (!containerEl) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        containerWidth = entry.contentRect.width;
        containerHeight = entry.contentRect.height;
      }
    });
    observer.observe(containerEl);
    // ResizeObserver fires synchronously on observe for the initial size
    return () => observer.disconnect();
  });

  function getLayerTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      image: 'Image',
      text: 'Text',
      shape: 'Shape',
      resource: 'Resource',
    };
    return labels[type] ?? type;
  }
</script>

<div
  bind:this={containerEl}
  class={cn(
    'relative w-full h-full overflow-hidden',
    fieldMode ? 'bg-nb-black' : 'bg-nb-cream',
    cx.canvasBg
  )}
  role="region"
  aria-label="Composition canvas"
>
  <!-- Grid background -->
  <div
    class={cn(
      'absolute inset-0 pointer-events-none',
      fieldMode ? 'bg-nb-yellow/5' : 'bg-nb-black/5'
    )}
    style="
      background-image: linear-gradient(to right, {fieldMode ? 'rgba(255,229,0,0.1)' : 'rgba(0,0,0,0.05)'} 1px, transparent 1px),
                        linear-gradient(to bottom, {fieldMode ? 'rgba(255,229,0,0.1)' : 'rgba(0,0,0,0.05)'} 1px, transparent 1px);
      background-size: 24px 24px;
    "
    aria-hidden="true"
  ></div>

  <!-- Layers -->
  {#each sortedLayers as layer (layer.id)}
    {@const isActive = layer.id === activeLayerId}
    <div
      class={cn(
        'absolute transition-shadow',
        isActive && (fieldMode ? 'ring-2 ring-nb-yellow' : 'ring-2 ring-nb-blue')
      )}
      style:z-index={layer.zIndex}
      role="button"
      tabindex="0"
      aria-label="{getLayerTypeLabel(layer.type)} layer"
      aria-pressed={isActive}
      onclick={() => onLayerSelect?.(layer.id)}
      onkeydown={(e) => e.key === 'Enter' && onLayerSelect?.(layer.id)}
    >
      {#if layer.type === 'image' && layer.content?.src}
        <img
          src={layer.content.src}
          alt={layer.content.alt ?? 'Layer image'}
          class="max-w-full max-h-full object-contain select-none"
          draggable="false"
        />
      {:else if layer.type === 'text' && layer.content?.text}
        <p
          class={cn('p-2 font-mono text-sm select-none', fieldMode ? 'text-nb-yellow' : 'text-nb-black')}
          style:font-size={layer.content.fontSize ? `${layer.content.fontSize}px` : undefined}
        >
          {layer.content.text}
        </p>
      {:else}
        <div class={cn(
          'w-32 h-32 flex items-center justify-center border-2 border-dashed text-xs font-mono',
          fieldMode ? 'border-nb-yellow/50 text-nb-yellow/50' : 'border-nb-black/30 text-nb-black/30'
        )}>
          {getLayerTypeLabel(layer.type)}
        </div>
      {/if}
    </div>
  {/each}

  <!-- Empty state -->
  {#if sortedLayers.length === 0}
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <p class={cn('text-xs font-mono uppercase tracking-wider opacity-40', cx.textMuted)}>
        No layers — add content from the sidebar
      </p>
    </div>
  {/if}
</div>
