<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    cx: ContextualClassNames;
    class?: string;
    children: Snippet;
  }

  let { cx, class: className = '', children }: Props = $props();
</script>

<div
  class={cn('flex items-center gap-1', className)}
  role="toolbar"
  aria-label="Toolbar"
>
  {@render children()}
</div>
