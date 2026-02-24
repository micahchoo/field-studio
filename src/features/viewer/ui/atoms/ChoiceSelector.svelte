<!--
  ChoiceSelector — IIIF Choice body selector

  ORIGINAL: src/features/viewer/ui/atoms/ChoiceSelector.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Floating pill panel for selecting between IIIF Choice body options.
  Supports keyboard shortcuts 1-9 for fast switching.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';

  interface ChoiceItem {
    label: string;
  }

  interface Props {
    /** Available choice options */
    items: ChoiceItem[];
    /** Currently active index */
    activeIndex: number;
    /** Called when user selects a choice */
    onSelect: (index: number) => void;
    /** Field mode styling */
    fieldMode?: boolean;
  }

  let {
    items,
    activeIndex,
    onSelect,
    fieldMode = false,
  }: Props = $props();

  function handleKeyDown(e: KeyboardEvent) {
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= Math.min(items.length, 9)) {
      e.preventDefault();
      onSelect(num - 1);
    }
  }

  $effect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });
</script>

{#if items.length > 1}
  <div
    class={cn(
      'absolute top-3 right-3 z-20 shadow-brutal backdrop-blur-sm border',
      fieldMode
        ? 'bg-nb-black/90 border-nb-black/80'
        : 'bg-nb-white/90 border-nb-black/20'
    )}
    role="radiogroup"
    aria-label="Image choice selection"
  >
    <div class={cn(
      'px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b',
      fieldMode
        ? 'text-nb-black/40 border-nb-black/80'
        : 'text-nb-black/50 border-nb-black/20'
    )}>
      <span class="material-icons text-sm mr-1 align-text-bottom">layers</span>
      Choice
    </div>
    <div class="py-1">
      {#each items as item, index}
        {@const isActive = index === activeIndex}
        <button
          role="radio"
          aria-checked={isActive}
          aria-label={item.label}
          onclick={() => onSelect(index)}
          class={cn(
            'w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-nb',
            isActive
              ? fieldMode
                ? 'bg-nb-yellow/20 text-nb-yellow'
                : 'bg-nb-blue/10 text-nb-blue'
              : fieldMode
                ? 'text-nb-black/30 hover:bg-nb-black'
                : 'text-nb-black/60 hover:bg-nb-white'
          )}
        >
          <span class={cn(
            'w-3.5 h-3.5 border-2 flex items-center justify-center shrink-0',
            isActive
              ? fieldMode ? 'border-nb-yellow' : 'border-nb-blue'
              : fieldMode ? 'border-nb-black/60' : 'border-nb-black/20'
          )}>
            {#if isActive}
              <span class={cn('w-1.5 h-1.5', fieldMode ? 'bg-nb-yellow' : 'bg-nb-blue')}></span>
            {/if}
          </span>
          <span class="truncate flex-1 text-left">{item.label}</span>
          <span class={cn('text-[10px] tabular-nums', fieldMode ? 'text-nb-black/60' : 'text-nb-black/40')}>
            {index + 1}
          </span>
        </button>
      {/each}
    </div>
  </div>
{/if}
