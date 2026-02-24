<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@/src/shared/lib/cn';
  import { setSplitDirectionContext } from '@/src/shared/stores/contexts';

  interface Props {
    direction?: 'horizontal' | 'vertical';
    class?: string;
    children: Snippet;
  }

  let { direction = 'horizontal', class: className = '', children }: Props = $props();

  setSplitDirectionContext({ get value() { return direction; } });

  let classes = $derived(cn('flex h-full', direction === 'horizontal' ? 'flex-row' : 'flex-col', className));
</script>

<div class={classes}>
  {@render children()}
</div>
