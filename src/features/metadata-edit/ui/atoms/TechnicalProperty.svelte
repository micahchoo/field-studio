<!--
  TechnicalProperty — Read-only property display with badge or stacked layout.
  React source: src/features/metadata-edit/ui/atoms/TechnicalProperty.tsx (73 lines)
  Architecture: Atom (zero state, props-only, Rule 5.D: cx + fieldMode)
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    label: string;
    value: string;
    badge?: boolean;
    fieldMode?: boolean;
    cx?: Partial<ContextualClassNames>;
    class?: string;
  }

  let {
    label,
    value,
    badge = false,
    fieldMode = false,
    cx = {},
    class: className = '',
  }: Props = $props();

  let labelClasses = $derived(
    cn(
      'text-[10px] font-bold uppercase',
      fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'
    )
  );

  let badgeValueClasses = $derived(
    cn(
      'text-xs font-mono px-2 py-0.5',
      fieldMode
        ? 'bg-nb-black text-nb-black/40'
        : 'bg-nb-cream text-nb-black/60'
    )
  );

  let stackedValueClasses = $derived(
    cn(
      'text-xs font-mono break-all',
      fieldMode ? 'text-nb-black/30' : 'text-nb-black/80'
    )
  );
</script>

{#if badge}
  <div class={cn('flex justify-between items-center', className)}>
    <span class={labelClasses}>{label}</span>
    <span class={badgeValueClasses}>{value}</span>
  </div>
{:else}
  <div class={cn('space-y-1', className)}>
    <div class={labelClasses}>{label}</div>
    <div class={stackedValueClasses} title={value}>{value}</div>
  </div>
{/if}
