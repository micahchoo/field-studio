<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    count: number;
    label?: string;
    cx: ContextualClassNames;
    fieldMode?: boolean;
  }

  let { count, label = 'selected', cx, fieldMode = false }: Props = $props();
</script>

<div class={cn('px-3 py-2 text-xs font-mono uppercase opacity-80 border-b', cx.border || 'border-nb-black/20')}>
  {count} {label}
</div>
