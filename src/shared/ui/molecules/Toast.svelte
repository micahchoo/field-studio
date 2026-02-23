<script module lang="ts">
  export const VARIANT_STYLES = {
    info: { container: 'bg-blue-50 border border-blue-200', icon: 'info', iconColor: 'text-blue-600' },
    success: { container: 'bg-green-50 border border-green-200', icon: 'check_circle', iconColor: 'text-green-600' },
    warning: { container: 'bg-yellow-50 border border-yellow-200', icon: 'warning', iconColor: 'text-yellow-600' },
    error: { container: 'bg-red-50 border-2 border-red-400', icon: 'error', iconColor: 'text-red-600' },
  } as const;
</script>

<script lang="ts">
  import { slide } from 'svelte/transition';
  import Button from '../atoms/Button.svelte';
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    id: string;
    variant: keyof typeof VARIANT_STYLES;
    message: string;
    action?: { label: string; onclick: () => void };
    duration?: number;
    onDismiss: () => void;
  }

  let { id, variant, message, action, duration = 5000, onDismiss }: Props = $props();

  const style = $derived(VARIANT_STYLES[variant]);

  $effect(() => {
    if (duration === 0) return;
    const timeoutId = setTimeout(() => onDismiss(), duration);
    return () => clearTimeout(timeoutId);
  });
</script>

<div
  transition:slide={{ axis: 'x', duration: 200 }}
  class="flex items-start gap-3 p-4 rounded shadow-lg min-w-80 max-w-md {style.container}"
  role="alert"
  aria-live="polite"
>
  <Icon name={style.icon} class="text-xl {style.iconColor}" />

  <div class="flex-1 flex flex-col gap-2">
    <p class="text-sm text-gray-900">{message}</p>

    {#if action}
      <Button variant="ghost" size="sm" onclick={action.onclick} class="self-start">
        {#snippet children()}<span>{action.label}</span>{/snippet}
      </Button>
    {/if}
  </div>

  <button
    type="button"
    class="p-1 cursor-pointer border-0 bg-transparent opacity-60 hover:opacity-100"
    onclick={onDismiss}
    aria-label="Close notification"
  >
    <Icon name="close" class="text-base" />
  </button>
</div>
