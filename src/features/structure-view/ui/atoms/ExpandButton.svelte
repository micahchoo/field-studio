<!--
  ExpandButton.svelte — Chevron toggle for tree nodes
  React source: ExpandButton.tsx (52L)
  Pure presentational: expand/collapse chevron
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';

  interface Props {
    isExpanded: boolean;
    onclick: (e: MouseEvent) => void;
    hasChildren: boolean;
    class?: string;
    fieldMode?: boolean;
  }

  let { isExpanded, onclick, hasChildren, class: className = '', fieldMode = false }: Props = $props();
</script>

{#if !hasChildren}
  <span class="w-5 h-5 inline-block"></span>
{:else}
  <Button variant="ghost" size="bare"
    type="button"
    {onclick}
    class={cn('w-5 h-5 inline-flex items-center justify-center transition-nb', fieldMode ? 'hover:bg-nb-yellow/20' : 'hover:bg-nb-black/10', className)}
    aria-label={isExpanded ? 'Collapse' : 'Expand'}
  >
    <svg
      class={cn('w-3 h-3 transition-transform', isExpanded && 'rotate-90')}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  </Button>
{/if}
