<script module lang="ts">
  type InlineGap = 'none' | 'xs' | 'sm' | 'md' | 'lg';
  type InlineAlign = 'start' | 'center' | 'end' | 'baseline' | 'stretch';

  const inlineGapClasses: Record<InlineGap, string> = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
  };

  const inlineAlignClasses: Record<InlineAlign, string> = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    baseline: 'items-baseline',
    stretch: 'items-stretch',
  };
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    class?: string;
    gap?: InlineGap;
    align?: InlineAlign;
    children: Snippet;
  }

  let { class: className = '', gap = 'xs', align = 'center', children }: Props = $props();
</script>

<div class={cn('inline-flex', inlineGapClasses[gap], inlineAlignClasses[align], className)}>
  {@render children()}
</div>
