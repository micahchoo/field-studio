<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    active: boolean;
    cx: ContextualClassNames;
    fieldMode?: boolean;
  }

  let { active, cx, fieldMode = false }: Props = $props();
</script>

{#if active}
  <div class={cn(
    'absolute inset-0 z-10 flex flex-col items-center justify-center gap-2',
    'bg-nb-black/80 border-2 border-dashed',
    cx.accent ? `border-${cx.accent}` : 'border-nb-blue',
    'transition-opacity'
  )}>
    <Icon name="add_circle" class="text-3xl text-nb-white" />
    <span class="text-xs font-bold uppercase font-mono text-nb-white">Drop to add</span>
  </div>
{/if}
