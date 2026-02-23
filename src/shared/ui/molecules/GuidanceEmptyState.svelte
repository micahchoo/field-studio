<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '../atoms/Icon.svelte';
  import StepIndicator from '../atoms/StepIndicator.svelte';
  import StepConnector from '../atoms/StepConnector.svelte';

  interface Props {
    icon?: string;
    title: string;
    description?: string;
    steps: Array<{ icon: string; text: string }>;
    cx: ContextualClassNames;
    action?: Snippet;
  }

  let { icon, title, description, steps, cx, action }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center text-center py-12 px-6 gap-6">
  {#if icon}
    <div class={cn('text-6xl opacity-50', cx.textMuted || 'text-nb-black/40')}>
      <Icon name={icon} />
    </div>
  {/if}

  <h3 class={cn('text-lg font-mono uppercase font-bold', cx.text)}>{title}</h3>

  {#if description}
    <p class={cn('text-sm max-w-md', cx.textMuted || 'text-nb-black/50')}>{description}</p>
  {/if}

  <div class="flex flex-col gap-4 max-w-lg w-full mt-4">
    {#each steps as step, index}
      <div class="flex items-start gap-4 text-left">
        <StepIndicator step={index + 1} label={step.text} active={false} completed={false} />
        <div class="flex-1 pt-1">
          <div class="flex items-center gap-2">
            {#if step.icon}
              <Icon name={step.icon} class={cn('text-lg', cx.textMuted || 'text-nb-black/40')} />
            {/if}
            <p class={cn('text-sm', cx.text)}>{step.text}</p>
          </div>
        </div>
      </div>

      {#if index < steps.length - 1}
        <div class="ml-5">
          <StepConnector completed={false} />
        </div>
      {/if}
    {/each}
  </div>

  {#if action}
    <div class="mt-4">
      {@render action()}
    </div>
  {/if}
</div>
