<!--
  ConnectionTypeBadge.svelte — Connection Type Indicator Pill
  ===========================================================
  React source: src/features/board-design/ui/atoms/ConnectionTypeBadge.tsx (97 lines)

  Purpose: Colored badge pill showing connection type (Associated, Part Of,
  Similar, References, Requires, Sequence). Used in connection detail panels
  and the connection edit UI.

  Architecture notes:
  - Arch 5.D: Receives cx and fieldMode props
  - Arch 2.D: No Tailwind interpolation — all classes in static lookup maps
  - Arch 2.F: typeLabels, typeColors, fieldModeColors in <script module>
  - Arch 2.G: Uses native <span> (or <button> when clickable) — not ARIA reconstruction
  - Zero state — purely presentational

  Svelte 5 patterns:
  - $derived for selected color lookup
  - onclick (lowercase) on the outer element
-->
<script module lang="ts">
  import type { ConnectionType } from '../../model';

  // Arch 2.F / 2.D: Static label and color maps

  const TYPE_LABELS: Record<ConnectionType, string> = {
    associated: 'Associated',
    partOf: 'Part Of',
    similarTo: 'Similar',
    references: 'References',
    requires: 'Requires',
    sequence: 'Sequence',
  };

  const TYPE_COLORS: Record<ConnectionType, { bg: string; text: string }> = {
    associated: { bg: 'bg-nb-blue/20', text: 'text-nb-blue' },
    partOf: { bg: 'bg-nb-green/20', text: 'text-nb-green' },
    similarTo: { bg: 'bg-nb-purple/10', text: 'text-nb-purple' },
    references: { bg: 'bg-nb-yellow/20', text: 'text-nb-yellow' },
    requires: { bg: 'bg-nb-red/20', text: 'text-nb-red' },
    sequence: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  };

  const FIELD_MODE_COLORS: Record<ConnectionType, { bg: string; text: string }> = {
    associated: { bg: 'bg-nb-blue/20', text: 'text-nb-blue' },
    partOf: { bg: 'bg-nb-green/20', text: 'text-nb-green' },
    similarTo: { bg: 'bg-nb-purple/20', text: 'text-nb-purple' },
    references: { bg: 'bg-nb-yellow/20', text: 'text-nb-yellow' },
    requires: { bg: 'bg-nb-red/20', text: 'text-nb-red' },
    sequence: { bg: 'bg-cyan-900', text: 'text-cyan-200' },
  };
</script>

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    type: ConnectionType;
    selected?: boolean;
    clickable?: boolean;
    onClick?: () => void;
    cx: { surface: string; text: string; accent: string };
    fieldMode: boolean;
  }

  let {
    type,
    selected = false,
    clickable = false,
    onClick,
    cx: _cx,
    fieldMode,
  }: Props = $props();

  const colors = $derived(fieldMode ? FIELD_MODE_COLORS[type] : TYPE_COLORS[type]);
  const label = $derived(TYPE_LABELS[type]);

  function handleClick() {
    if (clickable && onClick) {
      onClick();
    }
  }
</script>

<span
  onclick={handleClick}
  class={cn(
    'inline-flex items-center px-2 py-1 text-xs font-medium transition-nb',
    colors.bg,
    colors.text,
    selected && 'ring-2 ring-offset-1 ring-nb-yellow',
    clickable ? 'cursor-pointer hover:opacity-90' : 'cursor-default',
  )}
  title="Connection type: {label}"
  aria-label="{label} connection"
  role="button"
  tabindex={clickable ? 0 : undefined}
  onkeydown={(e) => { if (e.key==="Enter"||e.key===" ") { e.preventDefault(); handleClick(); } }}
>
  {label}
</span>
