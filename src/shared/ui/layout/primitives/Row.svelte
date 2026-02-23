<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { GapSize, Alignment, Justify } from '../types';
  import { gapClasses, alignClasses, justifyClasses } from '../types';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    gap?: GapSize;
    align?: Alignment;
    justify?: Justify;
    wrap?: boolean;
    class?: string;
    children: Snippet;
  }

  let { gap = 'none', align, justify, wrap, class: className = '', children }: Props = $props();

  let classes = $derived(cn('flex', gapClasses[gap], align && alignClasses[align], justify && justifyClasses[justify], wrap && 'flex-wrap', className));
</script>

<div class={classes}>
  {@render children()}
</div>
