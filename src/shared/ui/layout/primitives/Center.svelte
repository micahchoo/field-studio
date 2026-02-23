<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    flex?: boolean;
    class?: string;
    children: Snippet;
  }

  let { flex, class: className = '', children }: Props = $props();

  let classes = $derived(cn('flex items-center justify-center', flex && 'flex-1', className));
</script>

<div class={classes}>
  {@render children()}
</div>
