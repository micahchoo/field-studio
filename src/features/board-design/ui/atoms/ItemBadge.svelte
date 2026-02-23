<!--
  ItemBadge.svelte — Count/Duration Value Pill
  =============================================
  React source: src/features/board-design/ui/atoms/ItemBadge.tsx (35 lines)

  Purpose: Small pill badge showing a value (e.g. "5 canvases", "1:23")
  with an optional leading icon. Used on board node cards.

  Architecture notes:
  - Arch 5.D: Receives cx and fieldMode props
  - Arch 2.D: Static bg class lookup (no interpolation)
  - Arch 2.F: BG_CLASSES in <script module>
  - Composes: Icon atom from shared/ui/atoms

  Svelte 5 patterns:
  - {#if} for optional icon rendering
  - $derived for bg class selection
-->
<script module lang="ts">
  // Arch 2.D / 2.F: Static class strings
  const BG_CLASSES = {
    field: 'bg-nb-black/80 text-nb-yellow',
    default: 'bg-nb-black/70 text-nb-white',
  } as const;
</script>

<script lang="ts">
  interface Props {
    value: string;
    icon?: string;
    cx: { surface: string; text: string };
    fieldMode: boolean;
  }

  let {
    value,
    icon,
    cx: _cx,
    fieldMode,
  }: Props = $props();

  const bgClass = $derived(fieldMode ? BG_CLASSES.field : BG_CLASSES.default);
</script>

<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium {bgClass}">
  {#if icon}
    <span class="material-symbols-outlined text-[10px]" aria-hidden="true">
      {icon}
    </span>
  {/if}
  {value}
</span>
