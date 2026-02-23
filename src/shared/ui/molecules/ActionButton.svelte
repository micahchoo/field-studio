<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '../atoms/Button.svelte';
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    label: string;
    icon: string;
    onclick: () => void;
    active?: boolean;
    disabled?: boolean;
    loading?: boolean;
    direction?: 'vertical' | 'horizontal';
    cx?: Partial<ContextualClassNames>;
    class?: string;
  }

  let {
    label,
    icon,
    onclick,
    active = false,
    disabled = false,
    loading = false,
    direction = 'vertical',
    cx = {},
    class: className = ''
  }: Props = $props();
</script>

<Button
  variant="ghost"
  {disabled}
  {loading}
  {onclick}
  class={cn(
    'flex',
    direction === 'vertical' ? 'flex-col items-center gap-1' : 'flex-row items-center gap-2',
    active && (cx.active || 'bg-nb-black text-nb-white'),
    className
  )}
>
  {#snippet children()}
    <Icon name={icon} class={direction === 'vertical' ? 'text-xl' : 'text-base'} />
    <span class={cn('text-xs font-mono uppercase font-bold', direction === 'vertical' && 'text-center')}>{label}</span>
  {/snippet}
</Button>
