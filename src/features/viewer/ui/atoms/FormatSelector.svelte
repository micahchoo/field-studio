<!--
  FormatSelector — Dropdown select for IIIF image format options

  ORIGINAL: src/features/viewer/ui/atoms/FormatSelector.tsx (60 lines)
  LAYER: atom (presentation-only, zero state)
  FSD: features/viewer/ui/atoms

  Wraps the shared DropdownSelect molecule to present IIIF image format
  choices (jpg, png, webp, gif, etc.). Used in export dialogs and the
  IIIF image API URL builder.

  cx/fieldMode optional per Rule 5.D (atom).
-->

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import DropdownSelect from '@/src/shared/ui/molecules/DropdownSelect.svelte';
  import { LIGHT_CLASSES, FIELD_CLASSES } from '@/src/shared/lib/contextual-styles';

  export interface FormatOption {
    value: string;
    label: string;
  }

  interface Props {
    /** Available format options */
    options: FormatOption[];
    /** Currently selected format value */
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
   * PSEUDO: Resolve full cx for DropdownSelect.
   * DropdownSelect expects a full ContextualClassNames (molecule rule 5.D).
   * Atoms receive partial cx, so we merge with defaults here.
   */
  let resolvedCx = $derived(
    fieldMode
      ? { ...FIELD_CLASSES, ...cx } as ContextualClassNames
      : { ...LIGHT_CLASSES, ...cx } as ContextualClassNames
  );

  /** Sync two-way binding → callback bridge */
  let boundValue = $state(value);
  $effect(() => { boundValue = value; });
  $effect(() => { if (boundValue !== value) onChange(boundValue); });
</script>

<!-- PSEUDO: Labeled dropdown for image format selection -->
<div class={cn('flex flex-col gap-1', className)}>
  <!-- PSEUDO: Label in micro-label style -->
  <span
    class={cn(
      'text-[10px] font-mono font-bold uppercase tracking-wider',
      cx?.label ?? 'text-nb-black/70',
      fieldMode && 'text-nb-yellow/80'
    )}
  >
    Format
  </span>

  <!-- PSEUDO: Wraps shared DropdownSelect with format options -->
  <DropdownSelect
    {options}
    bind:value={boundValue}
    cx={resolvedCx}
    class="w-full"
  />
</div>
