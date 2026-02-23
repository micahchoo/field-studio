<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    label?: string;
    cx: ContextualClassNames;
    children: Snippet;
  }

  let { label, cx, children }: Props = $props();
</script>

<div
  role="group"
  aria-label={label}
  class={cn('py-1 border-b last:border-0', cx.border || 'border-nb-black/20')}
>
  {#if label}
    <div class={cn('px-3 py-1 text-xs font-mono uppercase opacity-60', cx.textMuted)}>
      {label}
    </div>
  {/if}

  {@render children()}
</div>
