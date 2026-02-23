<!--
  WorkbenchFooter — Bottom bar with Apply / Reset action buttons

  ORIGINAL: src/features/viewer/ui/atoms/WorkbenchFooter.tsx (53 lines)
  LAYER: atom (presentation-only, zero state)
  FSD: features/viewer/ui/atoms

  Renders a sticky footer strip with two ActionButton components:
  a primary "Apply" and a secondary "Reset". Used at the bottom of
  image filter panels, measurement tools, and comparison workbenches.

  cx/fieldMode optional per Rule 5.D (atom).
-->

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import ActionButton from '@/src/shared/ui/molecules/ActionButton.svelte';

  interface Props {
    /** Label for the primary action button */
    applyLabel?: string;
    /** Label for the secondary reset button */
    resetLabel?: string;
    /** Callback when primary action is triggered */
    onApply: () => void;
    /** Callback when reset is triggered */
    onReset: () => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
    class?: string;
  }

  let {
    applyLabel = 'Apply',
    resetLabel = 'Reset',
    onApply,
    onReset,
    cx = {},
    fieldMode = false,
    class: className = ''
  }: Props = $props();
</script>

<!-- PSEUDO: Horizontal footer bar with border-top, two buttons aligned right -->
<footer
  class={cn(
    'flex items-center justify-end gap-2 px-3 py-2 border-t-2',
    cx?.border ?? 'border-nb-black',
    cx?.surface ?? 'bg-nb-white',
    fieldMode && 'border-nb-yellow bg-nb-black',
    className
  )}
>
  <!-- PSEUDO: Secondary reset button (ghost variant) -->
  <ActionButton
    label={resetLabel}
    icon="restart_alt"
    onclick={onReset}
    cx={cx}
  />

  <!-- PSEUDO: Primary apply button (active/accent variant) -->
  <ActionButton
    label={applyLabel}
    icon="check"
    onclick={onApply}
    active={true}
    cx={cx}
  />
</footer>
