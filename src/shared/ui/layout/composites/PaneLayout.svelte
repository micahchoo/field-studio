<script lang="ts">
  import type { Snippet } from 'svelte';
  import { setContext } from 'svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    variant?: 'default' | 'canvas';
    class?: string;
    header?: Snippet;
    subbar?: Snippet;
    subbarVisible?: boolean;
    body: Snippet;
    footer?: Snippet;
    bodyScroll?: boolean;
    bodyClass?: string;
  }

  let {
    variant = 'default',
    class: className = '',
    header,
    subbar,
    subbarVisible = true,
    body,
    footer,
    bodyScroll,
    bodyClass = '',
  }: Props = $props();

  setContext('pane-variant', { get value() { return variant; } });

  let shouldScroll = $derived(bodyScroll !== undefined ? bodyScroll : variant === 'default');
</script>

<div class={cn('flex flex-col h-full', className)}>
  {#if header}<div class="shrink-0">{@render header()}</div>{/if}
  {#if subbar && subbarVisible}<div class="shrink-0">{@render subbar()}</div>{/if}
  <div class={cn('flex-1 min-h-0', shouldScroll ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden', bodyClass)}>
    {@render body()}
  </div>
  {#if footer}<div class="shrink-0">{@render footer()}</div>{/if}
</div>
