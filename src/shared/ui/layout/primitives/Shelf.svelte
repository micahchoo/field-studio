<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ShelfHeight, ShelfWidth } from '../types';
  import { shelfHeightClasses, shelfWidthClasses } from '../types';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    h?: ShelfHeight;
    w?: ShelfWidth | number;
    shrink?: boolean;
    class?: string;
    children: Snippet;
  }

  let { h = 'auto', w, shrink, class: className = '', children }: Props = $props();

  let classes = $derived(cn(
    !shrink && 'shrink-0',
    shelfHeightClasses[h],
    typeof w === 'string' ? shelfWidthClasses[w] : undefined,
    className
  ));
  let widthStyle = $derived(typeof w === 'number' ? `${w}px` : undefined);
</script>

<div class={classes} style:width={widthStyle}>
  {@render children()}
</div>
