<!--
  MultiSelectFilmstrip.svelte — Filmstrip of selected items
  ==========================================================
  Horizontal or vertical strip showing selected canvases with
  thumbnails, annotation/geo badges, and auto-scroll to the
  focused item. Includes a clear-all button.
  React source: src/features/archive/ui/molecules/MultiSelectFilmstrip.tsx
-->
<script lang="ts">
  import type { IIIFCanvas } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import { cn } from '@/src/shared/lib/cn';

  type Orientation = 'horizontal' | 'vertical';

  interface Props {
    items: IIIFCanvas[];
    focusedId: string | null;
    onFocus: (id: string) => void;
    onClear: () => void;
    fieldMode: boolean;
    orientation?: Orientation;
    resolveThumbs?: (canvas: IIIFCanvas) => { low: string; high: string };
    cx: Record<string, string | undefined>;
    validationIssues?: Map<string, unknown[]>;
    annotationCounts?: Map<string, number>;
    geotagged?: Set<string>;
    class?: string;
  }

  let {
    items,
    focusedId,
    onFocus,
    onClear,
    fieldMode,
    orientation = 'horizontal',
    resolveThumbs,
    cx,
    validationIssues,
    annotationCounts,
    geotagged,
    class: className = '',
  }: Props = $props();

  let containerEl: HTMLDivElement | undefined = $state();

  /** Map of item ID to its DOM element for scroll-into-view */
  const itemElMap = new Map<string, HTMLElement>();

  /**
   * Svelte action: registers the element in itemElMap keyed by id.
   * Automatically removes on destroy.
   */
  function trackItem(node: HTMLElement, id: string) {
    itemElMap.set(id, node);
    return {
      update(newId: string) {
        // Remove old key if id changed
        for (const [k, v] of itemElMap) {
          if (v === node && k !== newId) itemElMap.delete(k);
        }
        itemElMap.set(newId, node);
      },
      destroy() {
        for (const [k, v] of itemElMap) {
          if (v === node) itemElMap.delete(k);
        }
      },
    };
  }

  /** Auto-scroll to the focused item */
  $effect(() => {
    if (!focusedId || !containerEl) return;

    // Use a microtask to ensure DOM is updated after each render
    queueMicrotask(() => {
      // eslint-disable-next-line @field-studio/lifecycle-restrictions -- Map.get() is not a service call
      const el = itemElMap.get(focusedId!);
      if (el) {
        el.scrollIntoView({
          behavior: 'smooth',
          block: orientation === 'vertical' ? 'nearest' : 'center',
          inline: orientation === 'horizontal' ? 'nearest' : 'center',
        });
      }
    });
  });

  const isHorizontal = $derived(orientation === 'horizontal');

  /** Get thumbnail URL for a canvas */
  function getThumbUrl(canvas: IIIFCanvas): string {
    if (resolveThumbs) {
      return resolveThumbs(canvas).high;
    }
    return canvas.thumbnail?.[0]?.id || '';
  }

  /** Get label for a canvas */
  function getLabel(canvas: IIIFCanvas): string {
    return getIIIFValue(canvas.label) || canvas._filename || 'Untitled';
  }

  /** Check if canvas has validation issues */
  function hasIssues(id: string): boolean {
    return validationIssues?.has(id) ?? false;
  }

  /** Get annotation count badge value */
  function getAnnotationCount(id: string): number {
    return annotationCounts?.get(id) ?? 0;
  }

  /** Check if canvas is geotagged */
  function isGeotagged(id: string): boolean {
    return geotagged?.has(id) ?? false;
  }
</script>

{#if items.length > 0}
  <div
    class={cn(
      'relative flex',
      isHorizontal ? 'flex-row items-stretch' : 'flex-col',
      fieldMode
        ? 'bg-nb-black border-nb-yellow/30'
        : 'bg-nb-cream border-nb-black/10',
      isHorizontal ? 'border-t' : 'border-l',
      className
    )}
    role="listbox"
    aria-label="Selected items filmstrip"
    aria-orientation={orientation}
  >
    <!-- Header: count + clear button -->
    <div class={cn(
      'flex items-center gap-2 shrink-0',
      isHorizontal ? 'px-3 py-1.5' : 'px-2 py-2',
      fieldMode
        ? 'border-r border-nb-yellow/20'
        : 'border-r border-nb-black/10',
      !isHorizontal && 'border-b border-r-0',
      !isHorizontal && (fieldMode ? 'border-b-nb-yellow/20' : 'border-b-nb-black/10')
    )}>
      <span class={cn(
        'text-[10px] font-bold uppercase tracking-wider font-mono whitespace-nowrap',
        fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40'
      )}>
        {items.length} selected
      </span>
      <Button
        variant="ghost"
        size="bare"
        onclick={onClear}
        class={cn(
          'p-0.5 transition-nb',
          fieldMode ? 'text-nb-yellow/40 hover:text-nb-yellow' : 'text-nb-black/30 hover:text-nb-black'
        )}
        title="Clear selection"
        aria-label="Clear selection"
      >
        <Icon name="close" class="text-sm" />
      </Button>
    </div>

    <!-- Scrollable item container -->
    <div
      bind:this={containerEl}
      class={cn(
        'flex flex-1 min-w-0 min-h-0 overflow-auto',
        isHorizontal ? 'flex-row items-stretch gap-0.5' : 'flex-col gap-0.5',
        isHorizontal ? 'overflow-x-auto overflow-y-hidden' : 'overflow-y-auto overflow-x-hidden',
        'scrollbar-thin',
        fieldMode ? 'scrollbar-thumb-nb-yellow/20' : 'scrollbar-thumb-nb-black/10'
      )}
    >
      {#each items as item, index (item.id)}
        {@const isFocused = item.id === focusedId}
        {@const thumbUrl = getThumbUrl(item)}
        {@const label = getLabel(item)}
        {@const annCount = getAnnotationCount(item.id)}
        {@const geo = isGeotagged(item.id)}
        {@const issues = hasIssues(item.id)}
        <button
          type="button"
          role="option"
          aria-selected={isFocused}
          aria-label="{label}{isFocused ? ' (focused)' : ''}"
          class={cn(
            'relative shrink-0 cursor-pointer transition-nb group',
            isHorizontal ? 'w-16' : 'w-full flex items-center gap-2 px-2 py-1.5',
            isFocused
              ? (fieldMode
                  ? 'bg-nb-yellow/20 border-nb-yellow'
                  : 'bg-nb-blue/10 border-nb-blue')
              : (fieldMode
                  ? 'hover:bg-nb-yellow/10 border-transparent'
                  : 'hover:bg-nb-black/5 border-transparent'),
            isHorizontal
              ? 'border-b-2'
              : 'border-l-2'
          )}
          onclick={() => onFocus(item.id)}
          use:trackItem={item.id}
        >
          <!-- Thumbnail -->
          <div class={cn(
            'overflow-hidden shrink-0',
            isHorizontal ? 'w-full aspect-square' : 'w-10 h-10',
            fieldMode ? 'bg-nb-black' : 'bg-nb-cream'
          )}>
            {#if thumbUrl}
              <img
                src={thumbUrl}
                alt=""
                class="w-full h-full object-cover"
                loading="lazy"
              />
            {:else}
              <div class="w-full h-full flex items-center justify-center">
                <Icon
                  name="image"
                  class={cn(
                    isHorizontal ? 'text-lg' : 'text-sm',
                    'opacity-30',
                    cx.textMuted || 'text-nb-black/30'
                  )}
                />
              </div>
            {/if}
          </div>

          <!-- Label (vertical mode only) -->
          {#if !isHorizontal}
            <div class="flex-1 min-w-0">
              <span class={cn(
                'text-xs truncate block',
                isFocused
                  ? (fieldMode ? 'text-nb-yellow' : 'text-nb-blue')
                  : (cx.text || 'text-nb-black')
              )}>
                {label}
              </span>
            </div>
          {/if}

          <!-- Badges overlay -->
          <div class={cn(
            'flex items-center gap-0.5',
            isHorizontal
              ? 'absolute bottom-0 left-0 right-0 justify-center pb-0.5'
              : 'shrink-0'
          )}>
            {#if annCount > 0}
              <span class={cn(
                'flex items-center justify-center text-[9px] font-bold rounded-full min-w-[14px] h-[14px] px-0.5',
                fieldMode ? 'bg-nb-yellow text-nb-black' : 'bg-nb-blue text-nb-white'
              )}>
                {annCount}
              </span>
            {/if}
            {#if geo}
              <Icon
                name="explore"
                class={cn(
                  'text-[10px]',
                  fieldMode ? 'text-nb-yellow' : 'text-nb-green'
                )}
              />
            {/if}
            {#if issues}
              <span class="w-1.5 h-1.5 rounded-full bg-nb-red"></span>
            {/if}
          </div>

          <!-- Horizontal mode label tooltip on hover -->
          {#if isHorizontal}
            <div class={cn(
              'absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap',
              'text-[10px] px-1.5 py-0.5 pointer-events-none',
              'opacity-0 group-hover:opacity-100 transition-opacity z-10',
              fieldMode
                ? 'bg-nb-black border border-nb-yellow/40 text-nb-yellow'
                : 'bg-nb-white border border-nb-black/20 text-nb-black shadow-sm'
            )}>
              {label}
            </div>
          {/if}
        </button>
      {/each}
    </div>
  </div>
{/if}
