<!--
  ViewerFilmstrip -- Canvas navigation footer with prev/next controls

  LAYER: atom
  FSD: features/viewer/ui/atoms

  Renders a compact footer bar showing current canvas position and
  prev/next navigation buttons. Shows loading state indicator.
-->

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    currentIndex: number;
    totalItems: number;
    isLoaded: boolean;
    onPageChange: (page: number) => void;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    t: (key: string) => string;
  }

  let {
    currentIndex, totalItems, isLoaded, onPageChange,
    cx, fieldMode = false, t,
  }: Props = $props();
</script>

<div
  class={cn(
    'shrink-0 flex items-center justify-between px-3 h-8 border-t-2 font-mono text-xs',
    cx.headerBg, cx.text
  )}
  role="navigation"
  aria-label="Canvas navigation"
>
  <span class="uppercase tracking-wider opacity-60">{t('Canvas')}</span>

  <div class="flex items-center gap-2">
    {#if currentIndex >= 0}
      <button
        class={cn('p-0.5 rounded', cx.iconButton)}
        onclick={() => onPageChange(currentIndex)}
        disabled={currentIndex <= 0}
        aria-label="Previous canvas"
      >&#9664;</button>

      <span class="tabular-nums">{currentIndex + 1} / {totalItems}</span>

      <button
        class={cn('p-0.5 rounded', cx.iconButton)}
        onclick={() => onPageChange(currentIndex + 2)}
        disabled={currentIndex >= totalItems - 1}
        aria-label="Next canvas"
      >&#9654;</button>
    {:else}
      <span class="tabular-nums opacity-50">1 / {totalItems}</span>
    {/if}
  </div>

  <span class="text-xs opacity-50">{isLoaded ? t('Loaded') : t('Loading...')}</span>
</div>
