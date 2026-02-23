<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    flex?: boolean;
    shrink?: boolean;
    class?: string;
    children: Snippet;
  }

  let { flex, shrink, class: className = '', children }: Props = $props();

  let shrinkValue = $derived(shrink !== undefined ? shrink : !flex);
  let classes = $derived(cn(flex && 'flex-1 min-w-0', shrinkValue && 'shrink-0', className));
</script>

<div class={classes}>
  {@render children()}
</div>
