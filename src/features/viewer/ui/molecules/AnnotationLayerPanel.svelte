<!--
  AnnotationLayerPanel.svelte -- Floating panel for annotation layer management
  React source: src/features/viewer/ui/molecules/AnnotationLayerPanel.tsx
  Layer: molecule (FSD features/viewer/ui/molecules)

  Positioned absolute over the viewer canvas. Controls visibility, opacity,
  and creation of annotation layers. Each row shows a color dot, label,
  count, opacity slider (expandable), and visibility toggle.
-->
<script lang="ts">
  /* eslint-disable @field-studio/no-native-html-in-molecules -- Layer opacity slider requires native range input */
  import type { AnnotationLayer } from '../../model/annotationLayers.svelte';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    layers: AnnotationLayer[];
    onToggleLayer: (id: string) => void;
    onSetAllVisible: (visible: boolean) => void;
    onLayerOpacityChange?: (id: string, opacity: number) => void;
    onCreateLayer?: () => void;
    fieldMode?: boolean;
    visible?: boolean;
    onClose?: () => void;
  }

  let {
    layers,
    onToggleLayer,
    onSetAllVisible,
    onLayerOpacityChange,
    onCreateLayer,
    fieldMode = false,
    visible = true,
    onClose,
  }: Props = $props();

  let expandedLayerId: string | null = $state(null);

  let allVisible = $derived(layers.length > 0 && layers.every(l => l.visible));

  function handleToggle(id: string) {
    onToggleLayer(id);
  }

  function handleExpandOpacity(id: string) {
    expandedLayerId = expandedLayerId === id ? null : id;
  }

  function handleOpacityChange(id: string, e: Event) {
    const target = e.target as HTMLInputElement;
    const value = parseInt(target.value, 10) / 100;
    onLayerOpacityChange?.(id, value);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose?.();
    }
  }
</script>

{#if visible}
  <div
    class={cn(
      'absolute top-3 left-3 z-20 w-64 shadow-brutal backdrop-blur-sm border',
      fieldMode
        ? 'bg-nb-black/95 border-nb-yellow/80'
        : 'bg-nb-white border-nb-black/20'
    )}
    role="dialog"
    aria-label="Annotation layers"
    onkeydown={handleKeydown}
  >
    <!-- Header -->
    <div class={cn(
      'flex items-center justify-between px-3 py-2 border-b',
      fieldMode ? 'border-nb-yellow/80' : 'border-nb-black/20'
    )}>
      <span class={cn(
        'text-xs font-semibold uppercase tracking-wider flex items-center gap-1',
        fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/50'
      )}>
        <Icon name="layers" class="text-sm align-text-bottom" />
        Layers
      </span>
      <div class="flex items-center gap-1">
        <Button
          variant="ghost"
          size="bare"
          onclick={() => onSetAllVisible(!allVisible)}
          title={allVisible ? 'Hide all' : 'Show all'}
          aria-label={allVisible ? 'Hide all layers' : 'Show all layers'}
        >
          {#snippet children()}
            <span class={cn('text-[10px]', fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/50')}>
              {allVisible ? 'Hide All' : 'Show All'}
            </span>
          {/snippet}
        </Button>
        {#if onCreateLayer}
          <Button
            variant="ghost"
            size="bare"
            onclick={onCreateLayer}
            title="Create layer"
            aria-label="Create annotation layer"
          >
            {#snippet children()}
              <Icon name="add" class="text-sm" />
            {/snippet}
          </Button>
        {/if}
        {#if onClose}
          <Button
            variant="ghost"
            size="bare"
            onclick={onClose}
            title="Close"
            aria-label="Close layers panel"
          >
            {#snippet children()}
              <Icon name="close" class="text-sm" />
            {/snippet}
          </Button>
        {/if}
      </div>
    </div>

    <!-- Layer list -->
    <div class="py-1 max-h-60 overflow-y-auto overscroll-contain">
      {#if layers.length === 0}
        <div class={cn(
          'text-center py-4 text-xs',
          fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40'
        )}>
          No annotation layers
        </div>
      {:else}
        {#each layers as layer (layer.id)}
          <div class={cn(
            'group px-3 py-1.5 border-b transition-colors',
            fieldMode
              ? 'border-nb-yellow/20 hover:bg-nb-yellow/10'
              : 'border-nb-black/10 hover:bg-nb-black/5'
          )}>
            <div class="flex items-center gap-2">
              <!-- Color dot -->
              <div
                class="w-3 h-3 rounded-full shrink-0"
                style:background-color={layer.color}
                style:opacity={layer.visible ? layer.opacity : 0.3}
              ></div>

              <!-- Label -->
              <span class={cn(
                'flex-1 min-w-0 text-xs font-mono truncate',
                fieldMode ? 'text-nb-yellow' : 'text-nb-black'
              )}>
                {layer.label}
              </span>

              <!-- Opacity expand button (visible on hover) -->
              {#if onLayerOpacityChange}
                <Button
                  variant="ghost"
                  size="bare"
                  onclick={() => handleExpandOpacity(layer.id)}
                  title="Adjust opacity"
                  class="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {#snippet children()}
                    <Icon name="tune" class="text-xs" />
                  {/snippet}
                </Button>
              {/if}

              <!-- Visibility toggle -->
              <Button
                variant="ghost"
                size="bare"
                onclick={() => handleToggle(layer.id)}
                title={layer.visible ? 'Hide layer' : 'Show layer'}
                aria-label={layer.visible ? `Hide ${layer.label}` : `Show ${layer.label}`}
                aria-pressed={layer.visible}
              >
                {#snippet children()}
                  <Icon
                    name={layer.visible ? 'visibility' : 'visibility_off'}
                    class={cn(
                      'text-sm',
                      !layer.visible && (fieldMode ? 'text-nb-yellow/30' : 'text-nb-black/30')
                    )}
                  />
                {/snippet}
              </Button>
            </div>

            <!-- Expanded opacity slider -->
            {#if expandedLayerId === layer.id}
              <div class="flex items-center gap-2 mt-1 pl-5">
                <span class={cn(
                  'text-[10px] font-mono',
                  fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/40'
                )}>
                  Opacity
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(layer.opacity * 100)}
                  oninput={(e) => handleOpacityChange(layer.id, e)}
                  class="flex-1 h-1 accent-current"
                  aria-label="Layer opacity for {layer.label}"
                />
                <span class={cn(
                  'text-[10px] font-mono tabular-nums w-7 text-right',
                  fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/50'
                )}>
                  {Math.round(layer.opacity * 100)}%
                </span>
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </div>
{/if}
