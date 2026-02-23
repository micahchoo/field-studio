<script module lang="ts">
  import type { ViewHeaderHeight } from './types';

  const ROW_CLASSES: Record<ViewHeaderHeight, string> = {
    default: 'h-header-compact flex items-center justify-between px-3',
    compact: 'h-12 flex items-center justify-between px-3',
    fluid: 'flex items-center justify-between px-3',
  };
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from './types';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    cx: ContextualClassNames;
    height?: ViewHeaderHeight;
    zIndex?: string;
    class?: string;
    title?: Snippet;
    center?: Snippet;
    actions?: Snippet;
    subbar?: Snippet;
    subbarVisible?: boolean;
    body?: Snippet;
    children?: Snippet;
  }

  let {
    cx,
    height = 'default',
    zIndex,
    class: className = '',
    title,
    center,
    actions,
    subbar,
    subbarVisible = true,
    body,
    children,
  }: Props = $props();
</script>

<div class={cn(
  'transition-mode shrink-0',
  cx.headerBg || 'bg-nb-cream border-b-4 border-nb-black',
  zIndex,
  className
)}>
  <!-- Main row -->
  <div class={ROW_CLASSES[height]}>
    {#if title}
      <div class="flex items-center min-w-0 gap-2 flex-shrink">
        {@render title()}
      </div>
    {/if}
    {#if center}
      <div class="hidden md:flex items-center gap-3">
        {@render center()}
      </div>
    {/if}
    {#if children}{@render children()}{/if}
    {#if actions}
      <div class="flex items-center gap-3">
        {@render actions()}
      </div>
    {/if}
  </div>

  <!-- Sub-bar -->
  {#if subbar && subbarVisible}
    <div class={cn(
      'w-full px-3 py-1.5 border-b z-10 flex items-center gap-3 shrink-0',
      cx.pageBg || 'bg-nb-white',
      cx.divider || 'border-nb-black/20',
      cx.text || 'text-nb-black'
    )}>
      {@render subbar()}
    </div>
  {/if}

  <!-- Body -->
  {#if body}{@render body()}{/if}
</div>
