<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import { fade, fly } from 'svelte/transition';
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    open?: boolean;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    closable?: boolean;
    onClose?: () => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
    header?: Snippet;
    footer?: Snippet;
    children: Snippet;
  }

  const SIZE_CLASSES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  let {
    open = $bindable(false),
    title,
    size = 'md',
    closable = true,
    onClose,
    cx = {},
    fieldMode = false,
    header,
    footer,
    children
  }: Props = $props();

  let dialogRef: HTMLDivElement | undefined = $state();

  // Escape key
  $effect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closable) { open = false; onClose?.(); }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  });

  // Scroll lock
  $effect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  });

  // Focus trap
  $effect(() => {
    if (!open || !dialogRef) return;
    const focusable = dialogRef.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length > 0) (focusable[0] as HTMLElement).focus();
  });

  function handleBackdropClick(e: MouseEvent) {
    if (closable && e.target === e.currentTarget) { open = false; onClose?.(); }
  }

  function handleClose() {
    open = false;
    onClose?.();
  }
</script>

{#if open}
  <div
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onclick={handleBackdropClick}
    onkeydown={(e) => { if (e.key === "Escape" && closable) { open = false; onClose?.(); } }}
    transition:fade={{ duration: 200 }}
    role="presentation"
  >
    <div
      bind:this={dialogRef}
      class={cn(SIZE_CLASSES[size], 'w-full', cx.surface || 'bg-nb-white border-2 border-nb-black', 'shadow-brutal')}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      transition:fly={{ y: -20, duration: 200 }}
      onclick={(e: MouseEvent) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      tabindex="0"
    >
      {#if header || title}
        <div class={cn('flex items-center justify-between p-4 border-b-2', cx.border || 'border-nb-black')}>
          {#if header}
            {@render header()}
          {:else if title}
            <h2 id="modal-title" class={cn('text-lg font-mono uppercase font-bold', cx.text)}>{title}</h2>
          {/if}

          {#if closable}
            <button type="button" onclick={handleClose} class="p-1 hover:bg-nb-black/5 cursor-pointer border-0 bg-transparent" aria-label="Close">
              <Icon name="close" />
            </button>
          {/if}
        </div>
      {/if}

      <div class="p-4">
        {@render children()}
      </div>

      {#if footer}
        <div class={cn('p-4 border-t-2', cx.border || 'border-nb-black')}>
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}
