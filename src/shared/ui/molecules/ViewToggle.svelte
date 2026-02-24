<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '../atoms/Button.svelte';
  import Icon from '../atoms/Icon.svelte';

  type Option = { id: string; icon: string; label: string };

  interface Props {
    options: Option[];
    value?: string;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    class?: string;
  }

  let {
    options,
    value = $bindable(''),
    cx,
    fieldMode = false,
    class: className = ''
  }: Props = $props();
</script>

<div
  role="radiogroup"
  class={cn('inline-flex gap-1 p-1', cx.subtleBg || 'bg-nb-cream', className)}
>
  {#each options as option (option.id)}
    <Button
      variant="ghost"
      size="bare"
      onclick={() => value = option.id}
      class={cn(
        'flex items-center gap-2 px-3 py-2',
        value === option.id && (cx.active || 'bg-nb-black text-nb-white font-bold')
      )}
      aria-label={option.label}
    >
      {#snippet children()}
        <Icon name={option.icon} class="text-base" />
        <span class="text-xs font-mono uppercase">{option.label}</span>
      {/snippet}
    </Button>
  {/each}
</div>
