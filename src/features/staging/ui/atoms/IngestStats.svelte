<!--
  IngestStats Atom
  ==================
  Stats grid displaying file counts, speed, ETA, and error counts
  for the full variant of IngestProgressPanel.
  Extracted from IngestProgressPanel molecule.
-->
<script lang="ts">
  import type { IngestProgress } from '@/src/shared/types';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { formatETA, formatSpeed } from '@/src/shared/lib/hooks/useIngestProgress';

  interface Props {
    progress: IngestProgress;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let { progress }: Props = $props();
</script>

<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-b border-nb-black/20 bg-nb-cream">
  <div class="text-center">
    <p class="text-2xl font-bold text-nb-black/70">
      {progress.filesCompleted}<span class="text-sm font-normal text-nb-black/40">/{progress.filesTotal}</span>
    </p>
    <p class="text-xs text-nb-black/50 uppercase tracking-wide">Files</p>
  </div>
  <div class="text-center">
    <p class="text-2xl font-bold text-nb-black/70">{formatSpeed(progress.speed)}</p>
    <p class="text-xs text-nb-black/50 uppercase tracking-wide">Speed</p>
  </div>
  <div class="text-center">
    <p class="text-2xl font-bold text-nb-black/70">{formatETA(progress.etaSeconds)}</p>
    <p class="text-xs text-nb-black/50 uppercase tracking-wide">ETA</p>
  </div>
  <div class="text-center">
    <p class="text-2xl font-bold text-nb-black/70">
      {#if progress.filesError > 0}
        <span class="text-nb-red">{progress.filesError}</span>
      {:else}
        0
      {/if}
    </p>
    <p class="text-xs text-nb-black/50 uppercase tracking-wide">Errors</p>
  </div>
</div>
