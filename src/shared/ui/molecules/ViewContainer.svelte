<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '../atoms/Icon.svelte';
  import Button from '../atoms/Button.svelte';
  import LoadingState from './LoadingState.svelte';
  import EmptyState from './EmptyState.svelte';
  import ErrorBoundary from './ErrorBoundary.svelte';

  interface Props {
    loading?: boolean;
    error?: Error | string | null;
    empty?: boolean;
    emptyMessage?: string;
    emptyIcon?: string;
    onRetry?: () => void;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    children: Snippet;
  }

  let {
    loading = false,
    error = null,
    empty = false,
    emptyMessage = 'No content',
    emptyIcon = 'inbox',
    onRetry,
    cx,
    fieldMode = false,
    children
  }: Props = $props();

  const errorMessage = $derived(
    typeof error === 'string' ? error : (error as Error)?.message || 'An error occurred'
  );
</script>

<div class={cn('flex-1 overflow-hidden', cx.pageBg || 'bg-nb-cream')}>
  {#if loading}
    <div class="flex items-center justify-center h-full">
      <LoadingState message="Loading..." size="lg" {cx} />
    </div>

  {:else if error}
    <div class="flex flex-col items-center justify-center h-full p-8 gap-4">
      <div class="text-6xl text-red-600">
        <Icon name="error" />
      </div>
      <div class="text-center max-w-md">
        <h3 class={cn('text-lg font-mono uppercase mb-2 font-bold', cx.text)}>Error</h3>
        <p class={cn('text-sm font-mono', cx.textMuted || 'text-nb-black/50')}>{errorMessage}</p>
      </div>
      {#if onRetry}
        <Button variant="secondary" size="sm" onclick={onRetry}>
          {#snippet children()}<span>Try Again</span>{/snippet}
        </Button>
      {/if}
    </div>

  {:else if empty}
    <div class="flex items-center justify-center h-full">
      <EmptyState icon={emptyIcon} title={emptyMessage} {cx} />
    </div>

  {:else}
    <ErrorBoundary {children} />
  {/if}
</div>
