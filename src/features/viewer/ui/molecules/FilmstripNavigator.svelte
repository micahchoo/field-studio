<!--
  FilmstripNavigator.svelte -- Footer bar with page counter for canvas navigation
  React source: src/features/viewer/ui/molecules/FilmstripNavigator.tsx
  Layer: molecule (FSD features/viewer/ui/molecules)

  Compact footer bar showing current canvas position (e.g. "3 / 12") with
  prev/next navigation. Respects IIIF viewingDirection for RTL manifests.
  Only renders when totalItems > 1.
-->
<script module lang="ts">
  export type ViewingDirection = 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';

  interface Props {
    currentIndex: number;
    totalItems: number;
    label?: string;
    loadingStatus?: string;
    viewingDirection?: ViewingDirection;
    onPageChange?: (newIndex: number) => void;
    cx: ContextualClassNames;
    fieldMode: boolean;
  }

  let {
    currentIndex,
    totalItems,
    label = 'Canvas',
    loadingStatus = 'Loading...',
    viewingDirection = 'left-to-right',
    onPageChange,
    cx,
    fieldMode,
  }: Props = $props();

  let isRTL = $derived(viewingDirection === 'right-to-left');
  let hasPrevious = $derived(currentIndex > 0);
  let hasNext = $derived(currentIndex < totalItems - 1);
  let displayIndex = $derived(currentIndex + 1);

  let directionLabel = $derived.by(() => {
    if (viewingDirection === 'left-to-right') return '';
    if (isRTL) return '\u2190 RTL';
    if (viewingDirection === 'top-to-bottom') return '\u2193 TTB';
    return '\u2191 BTT';
  });

  function handlePrevious() {
    if (hasPrevious) onPageChange?.(currentIndex - 1);
  }

  function handleNext() {
    if (hasNext) onPageChange?.(currentIndex + 1);
  }

  function handleKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        isRTL ? handleNext() : handlePrevious();
        break;
      case 'ArrowRight':
        e.preventDefault();
        isRTL ? handlePrevious() : handleNext();
        break;
      case 'Home':
        e.preventDefault();
        onPageChange?.(0);
        break;
      case 'End':
        e.preventDefault();
        onPageChange?.(totalItems - 1);
        break;
    }
  }
</script>

{#if totalItems > 1}
  <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
  <footer
    class={cn(
      'shrink-0 flex items-center justify-between px-3 h-8 border-t-2',
      'font-mono text-xs',
      cx.headerBg,
      cx.text
    )}
    style:direction={isRTL ? 'rtl' : 'ltr'}
    role="toolbar"
    tabindex="0"
    aria-label="Canvas navigation"
    onkeydown={handleKeyDown}
  >
    <!-- LEFT: Section label -->
    <span class="uppercase tracking-wider opacity-60">
      {label}
    </span>

    <!-- CENTER: Page counter with prev/next -->
    <div class="flex items-center gap-2" style:direction="ltr">
      <Button
        variant="ghost"
        size="bare"
        onclick={handlePrevious}
        disabled={!hasPrevious}
        aria-label={isRTL ? 'Next canvas' : 'Previous canvas'}
      >
        {#snippet children()}
          <span class="text-xs">{isRTL ? '\u25B6' : '\u25C0'}</span>
        {/snippet}
      </Button>

      <span class="tabular-nums" aria-live="polite" aria-atomic="true">
        {displayIndex} / {totalItems}
      </span>

      <Button
        variant="ghost"
        size="bare"
        onclick={handleNext}
        disabled={!hasNext}
        aria-label={isRTL ? 'Previous canvas' : 'Next canvas'}
      >
        {#snippet children()}
          <span class="text-xs">{isRTL ? '\u25C0' : '\u25B6'}</span>
        {/snippet}
      </Button>
    </div>

    <!-- RIGHT: Loading status + direction indicator -->
    <span class="text-xs opacity-50" style:direction="ltr">
      {loadingStatus}
      {#if directionLabel}
        <span class={cn(
          'ml-2 text-[9px] font-bold uppercase',
          fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/60'
        )}>
          {directionLabel}
        </span>
      {/if}
    </span>
  </footer>
{/if}
