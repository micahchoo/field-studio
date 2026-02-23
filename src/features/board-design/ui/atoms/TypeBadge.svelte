<!--
  TypeBadge.svelte — Resource Type Pill Badge
  ============================================
  React source: src/features/board-design/ui/atoms/TypeBadge.tsx (36 lines)

  Purpose: Small pill showing IIIF resource type (Collection, Manifest,
  Canvas, Range) with type-specific icon and color. Rendered on board
  node cards in the top-left corner.

  Architecture notes:
  - Arch 5.D: Receives cx and fieldMode props
  - Arch 2.D: Full static Tailwind class strings in TYPE_CONFIG map
  - Arch 2.F: TYPE_CONFIG in <script module> block
  - Composes: Icon atom from shared/ui/atoms

  Svelte 5 patterns:
  - $derived for config lookup and color selection
-->
<script module lang="ts">
  // Arch 2.F / 2.D: Static type configuration map
  const TYPE_CONFIG: Record<string, { icon: string; color: string; fieldColor: string }> = {
    Collection: { icon: 'folder', color: 'bg-nb-purple/20 text-nb-purple', fieldColor: 'bg-nb-purple/30 text-nb-purple' },
    Manifest: { icon: 'description', color: 'bg-nb-blue/20 text-nb-blue', fieldColor: 'bg-nb-blue/30 text-nb-blue' },
    Canvas: { icon: 'image', color: 'bg-nb-green/20 text-nb-green', fieldColor: 'bg-nb-green/30 text-nb-green' },
    Range: { icon: 'folder_special', color: 'bg-cyan-100 text-cyan-700', fieldColor: 'bg-cyan-900/30 text-cyan-400' },
  };
</script>

<script lang="ts">
  interface Props {
    resourceType: string;
    cx: { surface: string; text: string };
    fieldMode: boolean;
  }

  let {
    resourceType,
    cx: _cx,
    fieldMode,
  }: Props = $props();

  const config = $derived(TYPE_CONFIG[resourceType] || TYPE_CONFIG.Canvas);
  const colorClass = $derived(fieldMode ? config.fieldColor : config.color);
</script>

<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide {colorClass}">
  <span class="material-symbols-outlined text-[10px]" aria-hidden="true">
    {config.icon}
  </span>
  {resourceType}
</span>
