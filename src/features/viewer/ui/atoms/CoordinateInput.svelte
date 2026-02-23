<!--
  CoordinateInput — X/Y/W/H input grid for region parameters

  ORIGINAL: src/features/viewer/ui/atoms/CoordinateInput.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Grid layout with labeled number inputs for IIIF region/size parameters.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';

  interface CoordinateField {
    key: string;
    label: string;
    value: number;
  }

  interface Props {
    /** Coordinate fields to display */
    fields: CoordinateField[];
    /** Callback when any coordinate changes */
    onChange: (key: string, value: number) => void;
    /** Number of columns in grid */
    columns?: 1 | 2;
    /** Field mode flag */
    fieldMode?: boolean;
  }

  let {
    fields,
    onChange,
    columns = 2,
    fieldMode = false,
  }: Props = $props();

  let mutedTextClass = $derived(fieldMode ? 'text-nb-black/40' : 'text-nb-black/50');
  let inputClass = $derived(
    cn(
      'w-full text-xs border px-2 py-1 font-mono',
      fieldMode
        ? 'bg-nb-black border-nb-black/80 text-white'
        : 'bg-nb-white border-nb-black/20 text-nb-black'
    )
  );
  let gridClass = $derived(columns === 1 ? 'grid-cols-1' : 'grid-cols-2');
</script>

<div class="grid {gridClass} gap-2">
  {#each fields as field (field.key)}
    <div class="space-y-1">
      <label
        for="coord-{field.key}"
        class="text-[9px] {mutedTextClass} uppercase font-bold"
      >
        {field.label}
      </label>
      <input
        id="coord-{field.key}"
        type="number"
        value={field.value}
        class={inputClass}
        oninput={(e) => onChange(field.key, Number((e.target as HTMLInputElement).value))}
        aria-label={field.label}
      />
    </div>
  {/each}
</div>
