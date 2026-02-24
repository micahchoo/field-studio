<!--
  ExportProgressDisplay.svelte — Export progress indicator
  =========================================================
  Extracted from ExportDialog organism. Renders a circular progress
  indicator with percentage and status text during the export step.

  FSD Layer: features/export/ui/molecules
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  interface Props {
    progress: { status: string; percent: number };
    cx?: ContextualClassNames;
    fieldMode?: boolean;
  }

  let { progress, cx, fieldMode = false }: Props = $props();
</script>

<div class="text-center py-12 space-y-6">
  <div class="relative w-24 h-24 mx-auto" aria-live="polite">
    <div class="absolute inset-0 border-8 border-nb-black/10"></div>
    <div
      class="absolute inset-0 border-8 border-iiif-blue transition-nb"
      style:clip-path="polygon(50% 50%, -50% -50%, {progress.percent}% -50%, {progress.percent}% 150%, -50% 150%)"
      style:transform="rotate(-90deg)"
    ></div>
    <div class="absolute inset-0 flex items-center justify-center font-black text-iiif-blue">
      {Math.round(progress.percent)}%
    </div>
  </div>
  <div>
    <h3 class="text-lg font-bold text-nb-black">{progress.status}</h3>
    <p class="text-xs text-nb-black/50 mt-1 uppercase tracking-widest font-black">Archive Compression Engine</p>
  </div>
</div>
