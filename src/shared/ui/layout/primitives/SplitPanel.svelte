<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@/src/shared/lib/cn';
  import { getSplitDirectionContext } from '@/src/shared/stores/contexts';
  import { resizable, type ResizableParams } from '../actions/resizable';

  interface Props {
    id: string;
    size: number;
    min?: number;
    max?: number;
    resizable?: boolean;
    collapsible?: boolean | number;
    visible?: boolean;
    onVisibilityChange?: (visible: boolean) => void;
    handleSide?: 'before' | 'after';
    class?: string;
    children: Snippet;
  }

  let {
    id,
    size,
    min = 0,
    max,
    resizable: isResizable = true,
    collapsible,
    visible = true,
    onVisibilityChange,
    handleSide = 'after',
    class: className = '',
    children,
  }: Props = $props();

  const directionCtx = getSplitDirectionContext();
  let direction = $derived(directionCtx.value);

  let resizableParams = $derived<ResizableParams>({
    id,
    size,
    min,
    max,
    collapsible,
    direction,
    onVisibilityChange,
  });

  let handleClasses = $derived(
    direction === 'horizontal'
      ? 'w-1 hover:w-1.5 hover:bg-nb-black/10 active:bg-nb-black/20 transition-all shrink-0 cursor-col-resize'
      : 'h-1 hover:h-1.5 hover:bg-nb-black/10 active:bg-nb-black/20 transition-all shrink-0 cursor-row-resize'
  );
</script>

{#if visible}
  <div
    class={cn('shrink-0 overflow-hidden', className)}
    use:resizable={isResizable ? resizableParams : undefined}
  >
    {#if isResizable && handleSide === 'before'}
      <div class={handleClasses} data-resize-handle="true"></div>
    {/if}
    {@render children()}
    {#if isResizable && handleSide === 'after'}
      <div class={handleClasses} data-resize-handle="true"></div>
    {/if}
  </div>
{/if}
