<!--
  BehaviorTag — Pill/tag for IIIF behavior with category-based styling.
  React source: src/features/metadata-edit/ui/atoms/BehaviorTag.tsx (92 lines)
  Architecture: Atom (zero state, props-only, Rule 5.D: cx + fieldMode)
-->
<script module lang="ts">
  const CATEGORY_COLORS: Record<string, string> = {
    time: 'bg-nb-purple/10 text-nb-purple',
    layout: 'bg-nb-orange/20 text-nb-orange',
    browsing: 'bg-nb-green/20 text-nb-green',
    page: 'bg-nb-blue/20 text-nb-blue',
    navigation: 'bg-nb-blue/20 text-nb-blue',
  } as const;
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import { BEHAVIOR_DEFINITIONS } from '@/src/shared/constants/iiif';

  interface Props {
    behavior: string;
    active?: boolean;
    showCategory?: boolean;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
    class?: string;
    onclick?: () => void;
  }

  let {
    behavior,
    active = true,
    showCategory = false,
    cx = {},
    fieldMode = false,
    class: className = '',
    onclick,
  }: Props = $props();

  let definition = $derived(BEHAVIOR_DEFINITIONS[behavior]);
  let displayLabel = $derived(definition?.label ?? behavior);
  let category = $derived(definition?.category);

  let categoryColor = $derived(
    category
      ? CATEGORY_COLORS[category] ?? (fieldMode ? 'bg-nb-black text-nb-black/50' : 'bg-nb-cream text-nb-black/60')
      : ''
  );

  let tagClass = $derived(
    cn(
      'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 font-semibold',
      onclick && 'cursor-pointer hover:opacity-80 transition-nb',
      active
        ? 'bg-nb-blue text-white'
        : fieldMode
          ? 'bg-nb-black text-nb-black/40'
          : 'bg-nb-cream text-nb-black/60',
      className
    )
  );
</script>

<div
  class={tagClass}
  {onclick}
  onkeydown={onclick ? (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onclick(); } } : undefined}
  role="button"
  tabindex="0"
  title={definition?.description ?? behavior}
>
  <span>{displayLabel}</span>
  {#if showCategory && category}
    <span class={cn('text-[8px] px-1 uppercase', categoryColor)}>
      {category}
    </span>
  {/if}
</div>
