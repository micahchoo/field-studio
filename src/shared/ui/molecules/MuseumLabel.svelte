<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    title: string;
    date?: string;
    description?: string;
    attribution?: string;
    class?: string;
    type?: string;
    children?: Snippet;
  }

  let { title, date, description, attribution, class: className = '', type: _type, children }: Props = $props();
</script>

<div class={cn('bg-nb-cream border-4 border-nb-black shadow-brutal p-6', className)}>
  <h3 class="text-lg font-bold uppercase font-mono tracking-wide mb-1">{title}</h3>

  {#if date}
    <p class="text-xs font-mono text-nb-black/60 mb-3">{date}</p>
  {/if}

  {#if description}
    <p class="text-sm leading-relaxed mb-3 font-serif">{description}</p>
  {/if}

  {#if attribution}
    <p class="text-xs font-mono text-nb-black/50 border-t-2 border-nb-black/20 pt-2 mt-2">{attribution}</p>
  {/if}

  {#if children}
    <div class="mt-2">{@render children()}</div>
  {/if}
</div>
