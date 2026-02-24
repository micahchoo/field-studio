<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { BreadcrumbItem } from './breadcrumbTypes';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    siblings: Array<{ id: string; label: string; type?: string }>;
    currentId: string;
    onNavigate: (id: string) => void;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    class?: string;
  }

  let { siblings, currentId, onNavigate, cx, fieldMode = false, class: className = '' }: Props = $props();

  let isOpen = $state(false);
  let ref: HTMLDivElement | undefined;

  $effect(() => {
    if (!isOpen) return;
    function close(e: MouseEvent) {
      if (ref && !ref.contains(e.target as Node)) isOpen = false;
    }
    document.addEventListener('click', close, true);
    return () => document.removeEventListener('click', close, true);
  });
</script>

<div class={cn('relative', className)} bind:this={ref}>
  <button type="button" class="p-0.5 cursor-pointer border-0 bg-transparent opacity-60 hover:opacity-100" onclick={() => isOpen = !isOpen} aria-label="Show siblings">
    <Icon name="chevron-down" class="text-[10px]" />
  </button>
  {#if isOpen}
    <div class={cn('absolute z-50 mt-1 min-w-40 max-h-48 overflow-y-auto shadow-brutal border-2 py-1', cx.surface || 'bg-nb-white border-nb-black')}>
      {#each siblings as sib}
        <button
          type="button"
          class={cn(
            'w-full px-3 py-1.5 text-xs text-left cursor-pointer border-0 bg-transparent',
            sib.id === currentId ? (cx.active || 'bg-nb-black text-nb-white font-bold') : 'hover:bg-nb-cream'
          )}
          onclick={() => { onNavigate(sib.id); isOpen = false; }}
        >{sib.label}</button>
      {/each}
    </div>
  {/if}
</div>
