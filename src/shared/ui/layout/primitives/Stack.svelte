<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { GapSize, Alignment } from '../types';
  import { gapClasses, alignClasses } from '../types';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    gap?: GapSize;
    stretch?: boolean;
    align?: Alignment;
    class?: string;
    children: Snippet;
  }

  let { gap = 'none', stretch, align, class: className = '', children }: Props = $props();

  let classes = $derived(cn('flex flex-col', stretch && 'h-full', gapClasses[gap], align && alignClasses[align], className));
</script>

<div class={classes}>
  {@render children()}
</div>
