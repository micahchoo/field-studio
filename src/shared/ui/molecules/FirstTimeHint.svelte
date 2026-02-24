<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    id: string;
    message: string;
    icon?: string;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    class?: string;
  }

  let { id, message, icon = 'lightbulb', cx, fieldMode = false, class: className = '' }: Props = $props();

  let dismissed = $state(false);

  // localStorage is a browser API, not an external service
  /* eslint-disable @field-studio/lifecycle-restrictions */
  $effect(() => {
    try {
      dismissed = localStorage.getItem(`hint-dismissed-${id}`) === 'true';
    } catch { /* ignore */ }
  });
  /* eslint-enable @field-studio/lifecycle-restrictions */

  function dismiss() {
    dismissed = true;
    try { localStorage.setItem(`hint-dismissed-${id}`, 'true'); } catch { /* ignore */ }
  }
</script>

{#if !dismissed}
  <div class={cn('flex items-start gap-3 p-3 border-2', cx.warningBg || 'bg-nb-orange/10 border-nb-orange', className)}>
    <Icon name={icon} class="text-lg shrink-0 text-nb-orange" />
    <p class={cn('text-sm flex-1', cx.text || 'text-nb-black')}>{message}</p>
    <button type="button" class="p-0.5 cursor-pointer border-0 bg-transparent opacity-60 hover:opacity-100 shrink-0" onclick={dismiss} aria-label="Dismiss hint">
      <Icon name="x" class="text-xs" />
    </button>
  </div>
{/if}
