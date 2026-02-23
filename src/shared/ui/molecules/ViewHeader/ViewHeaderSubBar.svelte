<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from './types';

  interface Props {
    visible?: boolean;
    class?: string;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    children?: import('svelte').Snippet;
  }

  let { visible = true, class: className = '', cx, fieldMode = false, children }: Props = $props();
</script>

{#if visible}
  <div class={cn(
    'w-full px-3 py-1.5 border-b z-10 flex items-center gap-3 shrink-0',
    cx.pageBg ?? (fieldMode ? 'bg-nb-black/80' : 'bg-nb-white'),
    cx.divider ?? (fieldMode ? 'border-nb-yellow/30' : 'border-nb-black/20'),
    cx.text ?? (fieldMode ? 'text-nb-yellow' : 'text-nb-black'),
    className
  )}>
    {#if children}{@render children()}{/if}
  </div>
{/if}
