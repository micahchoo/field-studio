<!--
  ConnectionEditPanel.svelte -- Floating editor for connection properties (Molecule)
  ==================================================================================
  React source: src/features/board-design/ui/molecules/ConnectionEditPanel.tsx (154L)

  ARCHITECTURE NOTES:
  - Rule 2.F: CONNECTION_TYPES, STYLE_OPTIONS, COLOR_PRESETS in <script module>
  - Rule 2.G: native <input> for label (simple text field, no need for Input atom)
  - Rule 2.D: static Tailwind class maps for field/normal variants
  - Local state: label ($state synced from connection.label on mount)
  - onmousedown stopPropagation prevents canvas drag passthrough
  - Composes: ConnectionTypeBadge atom, Button, Icon atoms
  - Positioned absolutely via `style:left` / `style:top` from position prop
-->
<script module lang="ts">
  // Rule 2.F: static data in module scope (shared across instances)
  import type { ConnectionType } from '../../model';

  export const CONNECTION_TYPES: ConnectionType[] = [
    'associated', 'partOf', 'similarTo', 'references', 'requires', 'sequence'
  ];

  export const STYLE_OPTIONS: Array<{ value: 'straight' | 'elbow' | 'curved'; label: string; icon: string }> = [
    { value: 'straight', label: 'Straight', icon: 'horizontal_rule' },
    { value: 'elbow',    label: 'Elbow',    icon: 'turn_right' },
    { value: 'curved',   label: 'Curved',   icon: 'gesture' },
  ];

  export const COLOR_PRESETS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
  ] as const;
</script>

<script lang="ts">
  import type { Connection } from '../../model';
  import { cn } from '@/src/shared/lib/cn';
  import ConnectionTypeBadge from '../atoms/ConnectionTypeBadge.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    /** The connection being edited */
    connection: Connection;
    /** Screen position for the floating panel */
    position: { x: number; y: number };
    /** Callback to update connection fields */
    onUpdate: (connId: string, updates: Partial<Connection>) => void;
    /** Callback to delete the connection */
    onDelete: (connId: string) => void;
    /** Callback to close the panel */
    onClose: () => void;
    /** Contextual styles */
    cx: { surface: string; text: string; accent: string };
    /** Field mode flag */
    fieldMode: boolean;
  }

  let {
    connection,
    position,
    onUpdate,
    onDelete,
    onClose,
    cx,
    fieldMode,
  }: Props = $props();

  // ── Local State ──
  // Label is locally controlled, committed on blur (optimistic pattern)
  let label = $state(connection.label || '');

  // ── Derived ──
  // Static class map for field/normal (Rule 2.D)
  let bgClass = $derived(fieldMode
    ? 'bg-nb-black border-nb-yellow/30'
    : 'bg-nb-white border-nb-black/10');
  let textClass = $derived(fieldMode
    ? 'text-nb-black/20'
    : 'text-nb-black/80');
  let sublabelClass = $derived(fieldMode
    ? 'text-nb-black/40'
    : 'text-nb-black/50');
  let inputClass = $derived(fieldMode
    ? 'bg-nb-black/80 border-nb-yellow/30 text-nb-black/20 placeholder:text-nb-black/30'
    : 'bg-nb-white border-nb-black/10 text-nb-black/80 placeholder:text-nb-black/30');

  function handleStopPropagation(e: MouseEvent) {
    e.stopPropagation();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class={cn('absolute z-50 border shadow-brutal p-3 min-w-[240px] space-y-3', bgClass)}
  style:left="{position.x}px"
  style:top="{position.y}px"
  onmousedown={handleStopPropagation}
>
  <!-- Header: "Edit Connection" + close button -->
  <div class="flex items-center justify-between">
    <span class={cn('text-xs font-bold uppercase tracking-wide', textClass)}>Edit Connection</span>
    <Button variant="ghost" size="bare" onclick={onClose}>
      <Icon name="close" />
    </Button>
  </div>

  <!-- Connection type selector: 6 ConnectionTypeBadge atoms -->
  <div class="space-y-1">
    <span class={cn('text-[10px] font-bold uppercase tracking-wide block', sublabelClass)}>Type</span>
    <div class="flex flex-wrap gap-1">
      {#each CONNECTION_TYPES as t (t)}
        <ConnectionTypeBadge
          type={t}
          selected={connection.type === t}
          clickable
          onClick={() => onUpdate(connection.id, { type: t })}
          {cx}
          {fieldMode}
        />
      {/each}
    </div>
  </div>

  <!-- Label input (Rule 2.G: native <input>) -->
  <div class="space-y-1">
    <span class={cn('text-[10px] font-bold uppercase tracking-wide block', sublabelClass)}>Label</span>
    <input
      type="text"
      bind:value={label}
      onblur={() => onUpdate(connection.id, { label: label || undefined })}
      class={cn('w-full px-2 py-1 text-xs border focus:outline-none', inputClass)}
      placeholder="Connection label..."
    />
  </div>

  <!-- Style buttons: straight / elbow / curved -->
  <div class="space-y-1">
    <span class={cn('text-[10px] font-bold uppercase tracking-wide block', sublabelClass)}>Style</span>
    <div class="flex gap-1">
      {#each STYLE_OPTIONS as opt (opt.value)}
        <Button
          variant={connection.style === opt.value ? 'primary' : 'ghost'}
          size="sm"
          onclick={() => onUpdate(connection.id, { style: opt.value })}
        >
          {#snippet icon()}<Icon name={opt.icon} />{/snippet}
          {opt.label}
        </Button>
      {/each}
    </div>
  </div>

  <!-- Color swatches: 6 preset circles + reset -->
  <div class="space-y-1">
    <span class={cn('text-[10px] font-bold uppercase tracking-wide block', sublabelClass)}>Color</span>
    <div class="flex items-center gap-1.5">
      {#each COLOR_PRESETS as c (c)}
        <button
          type="button"
          onclick={() => onUpdate(connection.id, { color: c })}
          class={cn(
            'w-5 h-5 rounded-full border-2 cursor-pointer transition-transform hover:scale-110',
            connection.color === c ? 'border-nb-black ring-2 ring-offset-1 ring-nb-yellow' : 'border-transparent'
          )}
          style:background-color={c}
          title={c}
        ></button>
      {/each}
      <button
        type="button"
        onclick={() => onUpdate(connection.id, { color: undefined })}
        class="w-5 h-5 flex items-center justify-center cursor-pointer opacity-60 hover:opacity-100"
        title="Default"
      >
        <Icon name="format_color_reset" class="text-sm" />
      </button>
    </div>
  </div>

  <!-- Delete button -->
  <div class="pt-1 border-t border-nb-black/10">
    <Button variant="danger" size="sm" onclick={() => onDelete(connection.id)}>
      {#snippet icon()}<Icon name="delete" />{/snippet}
      Delete Connection
    </Button>
  </div>
</div>
