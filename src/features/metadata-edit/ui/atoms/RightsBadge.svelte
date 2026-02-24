<!--
  RightsBadge — Badge displaying a rights statement with appropriate styling.
  React source: src/features/metadata-edit/ui/atoms/RightsBadge.tsx (85 lines)
  Architecture: Atom (zero state, props-only, Rule 5.D: cx + fieldMode)
-->
<script module lang="ts">
  export interface RightsBadgeProps {
    value: string;
    interactive?: boolean;
    onclick?: () => void;
    cx?: Partial<import('@/src/shared/lib/contextual-styles').ContextualClassNames>;
    fieldMode?: boolean;
    class?: string;
  }
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import { RIGHTS_OPTIONS } from '@/src/shared/constants/metadata';

  let {
    value,
    interactive = false,
    onclick,
    cx = {},
    fieldMode = false,
    class: className = '',
  }: RightsBadgeProps = $props();

  let option = $derived(RIGHTS_OPTIONS.find((opt: { value: string }) => opt.value === value));
  let displayLabel = $derived(option?.label ?? value);

  let colorStyle = $derived.by(() => {
    if (!value) {
      return fieldMode ? 'bg-nb-black text-nb-black/50' : 'bg-nb-cream text-nb-black/50';
    }
    if (value.includes('creativecommons.org')) {
      if (value.includes('zero')) {
        return fieldMode ? 'bg-nb-green/30 text-nb-green' : 'bg-nb-green/20 text-nb-green';
      }
      return fieldMode ? 'bg-nb-blue/30 text-nb-blue' : 'bg-nb-blue/20 text-nb-blue';
    }
    if (value.includes('rightsstatements.org')) {
      if (value.includes('InC')) {
        return fieldMode ? 'bg-nb-red/30 text-nb-red' : 'bg-nb-red/20 text-nb-red';
      }
      return fieldMode ? 'bg-nb-orange/10 text-nb-orange' : 'bg-nb-orange/20 text-nb-orange';
    }
    return fieldMode ? 'bg-nb-black text-nb-black/40' : 'bg-nb-cream text-nb-black/80';
  });

  let badgeClass = $derived(
    cn(
      'text-[10px] px-2 py-0.5 font-semibold',
      colorStyle,
      interactive && 'cursor-pointer hover:opacity-80 transition-nb',
      className
    )
  );
</script>

{#if !value}
  <span
    class={cn(
      'text-[10px] px-2 py-0.5 font-semibold',
      fieldMode ? 'bg-nb-black text-nb-black/50' : 'bg-nb-cream text-nb-black/50',
      className
    )}
  >
    No rights statement
  </span>
{:else if onclick}
  <button type="button" class={badgeClass} {onclick} title={value}>
    {displayLabel}
  </button>
{:else}
  <span class={badgeClass} title={value}>
    {displayLabel}
  </span>
{/if}
