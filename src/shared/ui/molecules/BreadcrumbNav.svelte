<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { BreadcrumbItem } from './breadcrumbTypes';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    crumbs: BreadcrumbItem[];
    onNavigate: (id: string) => void;
    cx: ContextualClassNames;
    class?: string;
  }

  let { crumbs, onNavigate, cx, class: className = '' }: Props = $props();
</script>

<nav aria-label="Breadcrumb" class={className}>
  <ol class="flex items-center gap-1 text-xs font-mono" role="list">
    {#each crumbs as crumb, i}
      {#if i > 0}
        <li class={cn('shrink-0', cx.textMuted || 'text-nb-black/40')} aria-hidden="true">/</li>
      {/if}
      <li class="min-w-0">
        {#if i === crumbs.length - 1}
          <span class={cn('font-bold truncate block', cx.text || 'text-nb-black')} aria-current="page">{crumb.label}</span>
        {:else}
          <button
            type="button"
            class={cn('truncate block max-w-32 cursor-pointer border-0 bg-transparent hover:underline', cx.textMuted || 'text-nb-black/60')}
            onclick={() => onNavigate(crumb.id)}
          >{crumb.label}</button>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
