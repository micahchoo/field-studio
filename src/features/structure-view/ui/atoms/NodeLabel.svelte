<!--
  NodeLabel.svelte — Styled tree node label
  React source: NodeLabel.tsx (47L)
  Pure presentational: label text with selection/drag styling
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';

  interface Props {
    label: string;
    type: string;
    isSelected: boolean;
    isDragging: boolean;
    class?: string;
    cx?: Partial<ContextualClassNames>;
  }

  let { label, type, isSelected, isDragging, class: className = '', cx }: Props = $props();

  const stateClasses = $derived(
    isSelected
      ? cn('font-semibold', cx?.accent ?? 'text-nb-blue')
      : cn(cx?.textMuted ?? 'text-nb-black/70')
  );
</script>

<span
  class={cn('truncate text-sm', stateClasses, isDragging && 'opacity-50', className)}
  title={label}
>
  {label}
</span>
