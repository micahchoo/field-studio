<script module lang="ts">
  export const POSITION_STYLES = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  } as const;
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { fade } from 'svelte/transition';

  interface Props {
    text: string;
    position?: keyof typeof POSITION_STYLES;
    delay?: number;
    class?: string;
    cx?: ContextualClassNames;
    fieldMode?: boolean;
    children: Snippet;
  }

  let {
    text,
    position = 'top',
    delay = 300,
    class: className = '',
    cx = {} as ContextualClassNames,
    fieldMode = false,
    children
  }: Props = $props();

  let visible = $state(false);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let wrapperRef: HTMLElement | undefined = $state();

  function show() {
    timeoutId = setTimeout(() => { visible = true; }, delay);
  }

  function hide() {
    if (timeoutId) clearTimeout(timeoutId);
    visible = false;
  }

  $effect(() => {
    if (!wrapperRef) return;
    wrapperRef.addEventListener('mouseenter', show);
    wrapperRef.addEventListener('mouseleave', hide);
    wrapperRef.addEventListener('focus', show, true);
    wrapperRef.addEventListener('blur', hide, true);
    return () => {
      wrapperRef!.removeEventListener('mouseenter', show);
      wrapperRef!.removeEventListener('mouseleave', hide);
      wrapperRef!.removeEventListener('focus', show, true);
      wrapperRef!.removeEventListener('blur', hide, true);
    };
  });
</script>

<div class="relative inline-block {className}" bind:this={wrapperRef}>
  {@render children()}

  {#if visible}
    <div
      transition:fade={{ duration: 150 }}
      class="absolute {POSITION_STYLES[position]} px-2 py-1 text-xs bg-gray-900 text-white rounded shadow-lg z-50 whitespace-nowrap pointer-events-none"
    >
      {text}
    </div>
  {/if}
</div>
