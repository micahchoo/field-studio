<!--
  AlignmentGuideLine.svelte — SVG Alignment Guide Overlay
  ========================================================
  React source: src/features/board-design/ui/atoms/AlignmentGuideLine.tsx (52 lines)

  Purpose: Renders horizontal and vertical SVG guide lines during item drag
  to show alignment with other board items.

  Architecture notes:
  - Pure SVG rendering, no cx/fieldMode props (no theming needed)
  - No state — fully controlled via props
  - Uses kebab-case SVG attributes (stroke-width, stroke-dasharray) per arch 2.G
  - viewBox is the one camelCase SVG exception per arch rules
  - AlignmentGuide type imported from hooks (when available) or defined inline

  Svelte 5 patterns:
  - {#if} for conditional rendering (replaces React's early return null)
  - {#each} for list rendering (replaces .map())
-->
<script lang="ts">
  // @migration: AlignmentGuide type comes from useAlignmentGuides hook
  // When the hook is migrated, import from there instead
  interface AlignmentGuide {
    type: 'horizontal' | 'vertical';
    position: number;
  }

  interface Props {
    guides: AlignmentGuide[];
    canvasSize: { width: number; height: number };
  }

  let { guides, canvasSize }: Props = $props();
</script>

{#if guides.length > 0}
  <svg
    class="absolute inset-0 pointer-events-none"
    style:width="100%"
    style:height="100%"
  >
    {#each guides as guide, i}
      {#if guide.type === 'vertical'}
        <line
          x1={guide.position}
          x2={guide.position}
          y1={0}
          y2={canvasSize.height}
          stroke="#e879f9"
          stroke-width="1"
          stroke-dasharray="4,4"
          opacity="0.6"
        />
      {:else}
        <line
          x1={0}
          x2={canvasSize.width}
          y1={guide.position}
          y2={guide.position}
          stroke="#22d3ee"
          stroke-width="1"
          stroke-dasharray="4,4"
          opacity="0.6"
        />
      {/if}
    {/each}
  </svg>
{/if}
