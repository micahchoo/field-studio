<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    icon?: string;
    title: string;
    description?: string;
    cx: ContextualClassNames;
    action?: Snippet;
  }

  let { icon, title, description, cx, action }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center text-center py-12 px-6 gap-4">
  {#if icon}
    <div class={cn('text-6xl opacity-50', cx.textMuted || 'text-nb-black/40')}>
      <Icon name={icon} />
    </div>
  {/if}

  <h3 class={cn('text-lg font-mono uppercase font-bold', cx.text)}>{title}</h3>

  {#if description}
    <p class={cn('text-sm max-w-md', cx.textMuted || 'text-nb-black/50')}>{description}</p>
  {/if}

  {#if action}
    <div class="mt-2">
      {@render action()}
    </div>
  {/if}
</div>
