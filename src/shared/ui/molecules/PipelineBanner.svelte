<script module lang="ts">
  export const VARIANT_STYLES = {
    processing: { bg: 'bg-blue-50 border-blue-200', bar: 'bg-blue-500', text: 'text-blue-800' },
    success: { bg: 'bg-green-50 border-green-200', bar: 'bg-green-500', text: 'text-green-800' },
    error: { bg: 'bg-red-50 border-red-200', bar: 'bg-red-500', text: 'text-red-800' },
  } as const;
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '../atoms/Button.svelte';
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    progress: number;
    status: string;
    variant?: keyof typeof VARIANT_STYLES;
    onCancel?: () => void;
    cx: ContextualClassNames;
  }

  let {
    progress,
    status,
    variant = 'processing',
    onCancel,
    cx
  }: Props = $props();

  const style = $derived(VARIANT_STYLES[variant]);
  const clampedProgress = $derived(Math.min(100, Math.max(0, progress)));
</script>

<div class={cn('w-full border-2 p-3', style.bg)}>
  <div class="flex items-center justify-between gap-3 mb-2">
    <span class={cn('text-xs font-mono font-bold uppercase', style.text)}>{status}</span>
    <div class="flex items-center gap-2">
      <span class={cn('text-xs font-mono', style.text)}>{clampedProgress}%</span>
      {#if onCancel && variant === 'processing'}
        <Button variant="ghost" size="sm" onclick={onCancel}>
          {#snippet children()}
            <Icon name="close" class="text-sm" />
            <span>Cancel</span>
          {/snippet}
        </Button>
      {/if}
    </div>
  </div>

  <div class="w-full h-2 bg-black/10 overflow-hidden">
    <div
      class={cn('h-full transition-all duration-300', style.bar)}
      style="width: {clampedProgress}%"
    ></div>
  </div>
</div>
