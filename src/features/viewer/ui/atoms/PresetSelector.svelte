<!--
  PresetSelector — Dropdown select with description support for presets

  ORIGINAL: src/features/viewer/ui/atoms/PresetSelector.tsx (65 lines)
  LAYER: atom (presentation-only, zero state)
  FSD: features/viewer/ui/atoms

  Wraps the shared DropdownSelect molecule with showDescriptions enabled.
  Used in export and image processing panels where preset options have
  both a label and a description (e.g., "High Quality — 300 DPI, lossless").

  cx/fieldMode optional per Rule 5.D (atom).
-->

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import DropdownSelect from '@/src/shared/ui/molecules/DropdownSelect.svelte';
  import { LIGHT_CLASSES, FIELD_CLASSES } from '@/src/shared/lib/contextual-styles';

  export interface PresetOption {
    value: string;
    label: string;
    description?: string;
  }

  interface Props {
    /** Available preset options (with optional descriptions) */
    options: PresetOption[];
    /** Currently selected preset value */
    value: string;
    /** Callback when selection changes */
    onChange: (v: string) => void;
    /** Placeholder text when nothing is selected */
    placeholder?: string;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
    class?: string;
  }

  let {
    options,
    value,
    onChange,
    placeholder = 'Select a preset...',
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
  let boundValue = $state(value);
  // eslint-disable-next-line @field-studio/no-effect-for-derived
  $effect(() => { boundValue = value; });
  $effect(() => { if (boundValue !== value) onChange(boundValue); });
</script>

<!-- PSEUDO: Labeled dropdown with description-enabled options for preset selection -->
<div class={cn('flex flex-col gap-1', className)}>
  <!-- PSEUDO: Label in micro-label style -->
  <span
    class={cn(
      'text-[10px] font-mono font-bold uppercase tracking-wider',
      cx?.label ?? 'text-nb-black/70',
      fieldMode && 'text-nb-yellow/80'
    )}
  >
    Preset
  </span>

  <!-- PSEUDO: DropdownSelect with showDescriptions to render option.description beneath label -->
  <DropdownSelect
    {options}
    bind:value={boundValue}
    {placeholder}
    showDescriptions={true}
    cx={resolvedCx}
    class="w-full"
  />
</div>
