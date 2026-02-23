<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    class?: string;
    children: Snippet;
  }

  let { class: className = '', children }: Props = $props();

  let classes = $derived(cn('flex-1 min-w-0 min-h-0 overflow-hidden', className));
</script>

<div class={classes}>
  {@render children()}
</div>
