<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    title: string;
    icon?: string;
    open?: boolean;
    badge?: Snippet;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    children: Snippet;
  }

  let {
    title,
    icon,
    open = $bindable(true),
    badge,
    cx,
    fieldMode = false,
    children
  }: Props = $props();

  const sectionId = `fs-${Math.random().toString(36).slice(2, 8)}`;

  function handleToggle() {
    open = !open;
  }

  const arrowClasses = $derived(
    cn('transition-transform duration-200', open ? 'rotate-90' : 'rotate-0')
  );
</script>

<section class={cn(cx.surface || 'border-2 border-nb-black', 'overflow-hidden')}>
  <button
    type="button"
    class={cn(
      'w-full flex items-center gap-2 px-4 py-3 cursor-pointer border-0',
      cx.subtleBg || 'bg-nb-cream',
      'hover:opacity-80 transition-opacity'
    )}
    onclick={handleToggle}
    aria-expanded={open}
    aria-controls={sectionId}
  >
    {#if icon}
      <Icon name={icon} class="text-lg" />
    {/if}

    <span class={cn('flex-1 text-left font-mono uppercase text-xs font-bold tracking-wider', cx.text)}>
      {title}
    </span>

    {#if badge}
      {@render badge()}
    {/if}

    <Icon name="chevron_right" class={arrowClasses} />
  </button>

  {#if open}
    <div id={sectionId} class={cn('px-4 py-3 border-t-2', cx.border || 'border-nb-black')}>
      {@render children()}
    </div>
  {/if}
</section>
