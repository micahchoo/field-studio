<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '../atoms/Button.svelte';
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    label?: string;
    icon?: string;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    class?: string;
    menu: Snippet;
    children?: Snippet;
  }

  let {
    label,
    icon,
    cx,
    fieldMode = false,
    class: className = '',
    menu,
    children
  }: Props = $props();

  let isOpen = $state(false);
  let buttonRef: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef && !buttonRef.contains(e.target as Node)) isOpen = false;
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') isOpen = false;
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  });
</script>

<div class="relative inline-block" bind:this={buttonRef}>
  <Button
    variant="ghost"
    class={className}
    onclick={() => isOpen = !isOpen}
    aria-haspopup="menu"
    aria-expanded={isOpen}
  >
    {#snippet children()}
      {#if icon}<Icon name={icon} class="text-base" />{/if}
      {#if label}<span class="text-xs font-mono uppercase">{label}</span>{/if}
      <Icon name="expand_more" class="text-base" />
    {/snippet}
  </Button>

  {#if isOpen}
    <div class={cn('absolute top-full mt-1 z-50 min-w-48 shadow-lg overflow-hidden', cx.surface || 'bg-nb-white border-2 border-nb-black')}>
      {@render menu()}
    </div>
  {/if}
</div>
