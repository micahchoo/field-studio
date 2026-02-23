<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { OverflowAxis } from '../types';
  import { overflowClasses } from '../types';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    flex?: boolean;
    axis?: OverflowAxis;
    class?: string;
    children: Snippet;
  }

  let { flex, axis = 'y', class: className = '', children }: Props = $props();

  let classes = $derived(cn(overflowClasses[axis], flex && 'flex-1 min-h-0', className));
</script>

<div class={classes}>
  {@render children()}
</div>
