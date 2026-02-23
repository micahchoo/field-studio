<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    label: string;
    itemCount: number;
    onMenuClick?: () => void;
    cx: ContextualClassNames;
  }

  let { label, itemCount, onMenuClick, cx }: Props = $props();
</script>

<div class="flex items-center justify-between px-3 py-2">
  <div class="flex items-center gap-2 min-w-0 flex-1">
    <span class={cn('text-xs font-bold uppercase font-mono truncate', cx.text)}>{label}</span>
    <span class={cn('text-[10px] font-mono shrink-0', cx.textMuted || 'text-nb-black/50')}>{itemCount}</span>
  </div>

  {#if onMenuClick}
    <button
      type="button"
      class="p-0.5 cursor-pointer border-0 bg-transparent opacity-60 hover:opacity-100 shrink-0"
      onclick={onMenuClick}
      aria-label="Collection menu"
    >
      <Icon name="more_vert" class="text-base" />
    </button>
  {/if}
</div>
