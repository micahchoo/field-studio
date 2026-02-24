<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import Icon from '../atoms/Icon.svelte';
  import Button from '../atoms/Button.svelte';

  interface Props {
    onError?: (error: Error) => void;
    fallback?: Snippet<[Error, () => void]>;
    children: Snippet;
    cx?: ContextualClassNames;
    fieldMode?: boolean;
  }

  let { onError, fallback, children, cx = {} as ContextualClassNames, fieldMode = false }: Props = $props();
</script>

<svelte:boundary>
  {@render children()}

  {#snippet failed(error, reset)}
    {#if fallback}
      {@render fallback(error instanceof Error ? error : new Error(String(error)), reset)}
    {:else}
      <div class="flex flex-col items-center justify-center p-8 gap-4 min-h-[200px]">
        <div class="text-6xl text-red-600">
          <Icon name="error" />
        </div>

        <div class="text-center max-w-md">
          <h3 class="text-lg font-mono uppercase mb-2 font-bold">Something went wrong</h3>
          <p class="text-sm text-gray-700 font-mono">{error instanceof Error ? error.message : String(error)}</p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onclick={() => { reset(); onError?.(error instanceof Error ? error : new Error(String(error))); }}
        >
          {#snippet children()}<span>Try Again</span>{/snippet}
        </Button>
      </div>
    {/if}
  {/snippet}
</svelte:boundary>
