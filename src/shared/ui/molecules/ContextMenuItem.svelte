<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    label: string;
    icon?: string;
    shortcut?: string;
    destructive?: boolean;
    disabled?: boolean;
    onclick: () => void;
    cx: ContextualClassNames;
    fieldMode?: boolean;
  }

  let {
    label,
    icon,
    shortcut,
    destructive = false,
    disabled = false,
    onclick,
    cx,
    fieldMode = false
  }: Props = $props();
</script>

<button
  type="button"
  role="menuitem"
  {disabled}
  {onclick}
  class={cn(
    'w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors border-0 bg-transparent',
    destructive
      ? 'text-red-600 hover:bg-red-50'
      : cn(cx.text, 'hover:bg-nb-cream'),
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
  )}
>
  <div class="flex items-center gap-2">
    {#if icon}
      <Icon name={icon} class="text-base" />
    {/if}
    <span>{label}</span>
  </div>

  {#if shortcut}
    <span class="text-xs font-mono uppercase opacity-60">{shortcut}</span>
  {/if}
</button>
