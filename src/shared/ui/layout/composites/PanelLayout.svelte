<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    class?: string;
    header?: Snippet;
    body?: Snippet;
    footer?: Snippet;
    bodyScroll?: boolean;
    bodyClass?: string;
    children?: Snippet;
  }

  let {
    class: className = '',
    header,
    body,
    footer,
    bodyScroll = true,
    bodyClass = '',
  }: Props = $props();
</script>

<div class={cn('flex flex-col h-full', className)}>
  {#if header}<div class="shrink-0">{@render header()}</div>{/if}
  <div class={cn('flex-1 min-h-0', bodyScroll ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden', bodyClass)}>
    {#if body}{@render body()}{/if}
  </div>
  {#if footer}<div class="shrink-0">{@render footer()}</div>{/if}
</div>
