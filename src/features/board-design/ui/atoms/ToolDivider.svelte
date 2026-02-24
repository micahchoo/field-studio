<!--
  ToolDivider.svelte — Toolbar Visual Separator
  ===============================================
  React source: src/features/board-design/ui/atoms/ToolDivider.tsx (34 lines)

  Purpose: Horizontal line separator between tool groups in the board toolbar.
  Purely decorative — aria-hidden="true".

  Architecture notes:
  - Arch 5.D: Receives cx and fieldMode props
  - Arch 2.D: Static class strings (no interpolation)
  - aria-hidden="true" since purely decorative

  Svelte 5 patterns:
  - $derived for bg class selection
-->
<script module lang="ts">
  // Arch 2.D / 2.F: Static class strings
  const BG_CLASSES = {
    field: 'bg-nb-black/80',
    default: 'bg-nb-cream',
  } as const;
</script>

<script lang="ts">
  interface Props {
    cx: { surface: string; text: string };
    fieldMode: boolean;
  }

  let { cx: _cx, fieldMode }: Props = $props();

  const bgClass = $derived(fieldMode ? BG_CLASSES.field : BG_CLASSES.default);
</script>

<div
  class="w-8 h-px my-2 {bgClass}"
  aria-hidden="true"
></div>
