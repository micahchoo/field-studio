<script module lang="ts">
  type SectionGap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  const sectionGapClasses: Record<SectionGap, string> = {
    none: '',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    class?: string;
    title?: Snippet;
    body: Snippet;
    bodyGap?: SectionGap;
  }

  let { class: className = '', title, body, bodyGap = 'md' }: Props = $props();
</script>

<div class={cn('flex flex-col', className)}>
  {#if title}<div class="shrink-0">{@render title()}</div>{/if}
  <div class={cn('flex-1', sectionGapClasses[bodyGap])}>
    {@render body()}
  </div>
</div>
