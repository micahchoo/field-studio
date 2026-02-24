<!--
  QualitySelector — Dropdown select for IIIF image quality options

  ORIGINAL: src/features/viewer/ui/atoms/QualitySelector.tsx (62 lines)
  LAYER: atom (presentation-only, zero state)
  FSD: features/viewer/ui/atoms

  Wraps the shared DropdownSelect molecule to present IIIF image quality
  choices (default, color, gray, bitonal). Used in export dialogs and the
  IIIF image API URL builder alongside FormatSelector.

  cx/fieldMode optional per Rule 5.D (atom).
-->

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import DropdownSelect from '@/src/shared/ui/molecules/DropdownSelect.svelte';
  import { LIGHT_CLASSES, FIELD_CLASSES } from '@/src/shared/lib/contextual-styles';

  export interface QualityOption {
    value: string;
    label: string;
  }

  interface Props {
    /** Available quality options */
    options: QualityOption[];
    /** Currently selected quality value */
    value: string;
    /** Callback when selection changes */
    onChange: (v: string) => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
    class?: string;
  }

  let {
    options,
    value,
    onChange,
    cx,
    fieldMode = false,
    class: className = ''
  }: Props = $props();

  /**
   * PSEUDO: Resolve full cx for DropdownSelect (molecule requires full cx).
   */
  let resolvedCx = $derived(
    fieldMode
      ? { ...FIELD_CLASSES, ...cx } as ContextualClassNames
      : { ...LIGHT_CLASSES, ...cx } as ContextualClassNames
  );

  /** Sync two-way binding → callback bridge.
   * Cannot be $derived: boundValue is bound to <select> (bind:value) and must be writable. */
  // svelte-ignore state_referenced_locally -- intentional: two-way bridge between prop and bound select value
  let boundValue = $state(value);
  // eslint-disable-next-line @field-studio/no-effect-for-derived
  $effect(() => { boundValue = value; });
  $effect(() => { if (boundValue !== value) onChange(boundValue); });
</script>

<!-- PSEUDO: Labeled dropdown for image quality selection -->
<div class={cn('flex flex-col gap-1', className)}>
  <!-- PSEUDO: Label in micro-label style -->
  <span
    class={cn(
      'text-[10px] font-mono font-bold uppercase tracking-wider',
      cx?.label ?? 'text-nb-black/70',
      fieldMode && 'text-nb-yellow/80'
    )}
  >
    Quality
  </span>

  <!-- PSEUDO: Wraps shared DropdownSelect with quality options -->
  <DropdownSelect
    {options}
    bind:value={boundValue}
    cx={resolvedCx}
    class="w-full"
  />
</div>
