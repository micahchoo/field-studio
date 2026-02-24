<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    message?: string;
    size?: 'sm' | 'md' | 'lg';
    inline?: boolean;
    cx: ContextualClassNames;
    fieldMode?: boolean;
  }

  const SIZE_CLASSES = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  const TEXT_SIZE = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };

  let { message, size = 'md', inline = false, cx, fieldMode = false }: Props = $props();
</script>

<div class={cn(inline ? 'inline-flex' : 'flex', 'flex-col items-center justify-center gap-3', !inline && 'py-12')}>
  <div
    class={cn(SIZE_CLASSES[size], 'border-2 border-transparent border-t-current rounded-full animate-spin', cx.text)}
    role="status"
    aria-label={message || 'Loading'}
  ></div>

  {#if message}
    <p class={cn(TEXT_SIZE[size], 'font-mono', cx.textMuted || 'text-nb-black/50')}>{message}</p>
  {/if}
</div>
