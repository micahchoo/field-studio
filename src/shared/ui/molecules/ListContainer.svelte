<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import EmptyState from './EmptyState.svelte';

  interface Props {
    items: unknown[];
    emptyMessage?: string;
    emptyIcon?: string;
    maxHeight?: string;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    children: Snippet;
  }

  let {
    items,
    emptyMessage = 'No items',
    emptyIcon = 'inbox',
    maxHeight,
    cx,
    fieldMode = false,
    children
  }: Props = $props();

  const isEmpty = $derived(items.length === 0);
</script>

{#if isEmpty}
  <EmptyState icon={emptyIcon} title={emptyMessage} {cx} />
{:else}
  <div
    class={cn('overflow-y-auto', maxHeight ? `max-h-[${maxHeight}]` : 'flex-1')}
    role="list"
  >
    {@render children()}
  </div>
{/if}
