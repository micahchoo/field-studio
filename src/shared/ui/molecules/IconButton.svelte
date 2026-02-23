<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '../atoms/Button.svelte';
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    icon: string;
    onclick: () => void;
    label: string;
    active?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    cx?: Partial<ContextualClassNames>;
    class?: string;
  }

  let {
    icon,
    onclick,
    label,
    active = false,
    disabled = false,
    size = 'md',
    cx = {},
    class: className = ''
  }: Props = $props();

  const iconSize = { sm: 'text-base', md: 'text-xl', lg: 'text-2xl' };
</script>

<Button
  variant="ghost"
  size="bare"
  {disabled}
  {onclick}
  class={cn(
    cx.iconButton || 'text-nb-black hover:bg-nb-black hover:text-nb-white transition-nb nb-press',
    active && (cx.active || 'bg-nb-black text-nb-white'),
    'p-1.5',
    className
  )}
  title={label}
  aria-label={label}
>
  {#snippet children()}
    <Icon name={icon} class={iconSize[size]} />
  {/snippet}
</Button>
