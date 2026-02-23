<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    flex?: boolean;
    class?: string;
    children: Snippet;
  }

  let { flex, class: className = '', children }: Props = $props();

  let classes = $derived(cn(flex ? 'flex-1 min-h-0 min-w-0' : 'absolute inset-0', className));
</script>

<div class={classes}>
  {@render children()}
</div>
