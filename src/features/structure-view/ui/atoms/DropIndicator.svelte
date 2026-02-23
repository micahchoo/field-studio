<!--
  DropIndicator.svelte — Visual drop zone indicator
  React source: DropIndicator.tsx (76L)
  Pure presentational: position line with arrow
-->
<script lang="ts">
  import type { DropPosition } from './types';

  interface Props {
    position: DropPosition;
    isValid: boolean;
    class?: string;
    fieldMode?: boolean;
  }

  let { position, isValid, class: className = '', fieldMode = false }: Props = $props();

  const baseClasses = 'absolute left-0 right-0 h-0.5 z-10 pointer-events-none';

  const colorClasses = $derived(
    isValid
      ? fieldMode
        ? 'bg-nb-yellow shadow-[0_0_4px_rgba(234,179,8,0.5)]'
        : 'bg-nb-blue shadow-[0_0_4px_rgba(59,130,246,0.5)]'
      : 'bg-nb-red shadow-[0_0_4px_rgba(239,68,68,0.5)]'
  );

  const positionMap: Record<DropPosition, string> = {
    before: '-top-0.5',
    after: '-bottom-0.5',
    inside: 'top-1/2 -translate-y-1/2',
  };

  const positionClass = $derived(positionMap[position]);
</script>

<div
  class="{baseClasses} {colorClasses} {positionClass} {className}"
  role="presentation"
  aria-hidden="true"
>
  {#if position === 'before' || position === 'after'}
    <div
      class="absolute left-1 w-2 h-2 -top-[3px] {isValid ? (fieldMode ? 'bg-nb-yellow' : 'bg-nb-blue') : 'bg-nb-red'}"
    ></div>
  {/if}
</div>
