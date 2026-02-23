<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import { scale } from 'svelte/transition';

  interface Props {
    open?: boolean;
    x: number;
    y: number;
    cx: ContextualClassNames;
    children: Snippet;
  }

  let {
    open = $bindable(false),
    x,
    y,
    cx,
    children
  }: Props = $props();

  let menuRef: HTMLDivElement | undefined = $state();
  let adjustedX = $state(x);
  let adjustedY = $state(y);

  // Update position when x/y change
  $effect(() => { adjustedX = x; adjustedY = y; });

  // Click-outside + Escape + keyboard nav
  $effect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef && !menuRef.contains(e.target as Node)) open = false;
    };
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { open = false; return; }
      if (!menuRef) return;
      const items = menuRef.querySelectorAll('[role="menuitem"]:not([disabled])');
      const current = Array.from(items).indexOf(document.activeElement as Element);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        (items[(current + 1) % items.length] as HTMLElement)?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        (items[(current - 1 + items.length) % items.length] as HTMLElement)?.focus();
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    };
  });

  // Viewport boundary detection — DOM measurement, not an external service
  /* eslint-disable @field-studio/lifecycle-restrictions */
  $effect(() => {
    if (!menuRef || !open) return;
    const rect = menuRef.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (x + rect.width > vw) adjustedX = vw - rect.width - 8;
    if (y + rect.height > vh) adjustedY = vh - rect.height - 8;
  });
  /* eslint-enable @field-studio/lifecycle-restrictions */
</script>

{#if open}
  <div class="fixed inset-0 z-[100]">
    <div
      bind:this={menuRef}
      transition:scale={{ duration: 150, start: 0.95 }}
      style="left: {adjustedX}px; top: {adjustedY}px;"
      class={cn('absolute min-w-48 shadow-xl overflow-hidden', cx.surface || 'bg-nb-white border-2 border-nb-black')}
      role="menu"
      tabindex="-1"
    >
      {@render children()}
    </div>
  </div>
{/if}
