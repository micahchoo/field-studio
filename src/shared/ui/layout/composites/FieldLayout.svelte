<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    class?: string;
    label?: Snippet;
    control: Snippet;
    hint?: Snippet;
  }

  let { class: className = '', label, control, hint }: Props = $props();
</script>

<div class={cn('flex flex-col gap-1', className)}>
  {#if label}<div class="shrink-0">{@render label()}</div>{/if}
  <div class="shrink-0">{@render control()}</div>
  {#if hint}<div class="shrink-0 text-xs text-neutral-500">{@render hint()}</div>{/if}
</div>
