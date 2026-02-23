<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    class?: string;
    rail?: Snippet;
    sidebar?: Snippet;
    statusbar?: Snippet;
    children: Snippet;
  }

  let { class: className = '', rail, sidebar, statusbar, children }: Props = $props();
</script>

<div class={cn('flex flex-col h-dvh', className)}>
  {#if rail}{@render rail()}{/if}
  <div class="flex flex-1 min-h-0">
    {#if sidebar}{@render sidebar()}{/if}
    <div class="flex-1 min-w-0 min-h-0 overflow-hidden">
      {@render children()}
    </div>
  </div>
  {#if statusbar}{@render statusbar()}{/if}
</div>
