<script lang="ts">
  import type { Snippet } from 'svelte';
  import { setContext } from 'svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    direction?: 'horizontal' | 'vertical';
    class?: string;
    children: Snippet;
  }

  let { direction = 'horizontal', class: className = '', children }: Props = $props();

  setContext('split-direction', { get value() { return direction; } });

  let classes = $derived(cn('flex h-full', direction === 'horizontal' ? 'flex-row' : 'flex-col', className));
</script>

<div class={classes}>
  {@render children()}
</div>
