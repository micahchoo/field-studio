<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  interface ReferenceItem {
    key: string;
    description: string;
  }

  interface Props {
    title: string;
    items: ReferenceItem[];
    cx: ContextualClassNames;
    class?: string;
  }

  let { title, items, cx, class: className = '' }: Props = $props();
</script>

<div class={cn('p-4', cx.surface || 'bg-nb-white border-2 border-nb-black', className)}>
  <h4 class={cn('font-mono text-xs font-bold uppercase tracking-wider mb-3', cx.text || 'text-nb-black')}>{title}</h4>
  <dl class="flex flex-col gap-2">
    {#each items as item}
      <div class="flex items-start gap-3">
        <dt class={cn('shrink-0 px-1.5 py-0.5 text-[10px] font-mono font-bold', cx.kbd || 'bg-nb-cream border-2 border-nb-black')}>{item.key}</dt>
        <dd class={cn('text-sm', cx.text || 'text-nb-black')}>{item.description}</dd>
      </div>
    {/each}
  </dl>
</div>
