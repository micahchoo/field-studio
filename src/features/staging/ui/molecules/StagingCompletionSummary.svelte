<!--
  StagingCompletionSummary Molecule
  ==================================
  Summary modal shown after a successful ingest operation.
  Displays stats and undo/navigate actions.
  Extracted from StagingWorkbench organism.
-->
<script lang="ts">
  import type { IngestUndoRecord } from '../../model/stagingWorkbenchHelpers';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    summary: IngestUndoRecord;
    onUndo: () => void;
    onNavigate: () => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let { summary, onUndo, onNavigate }: Props = $props();
</script>

<div class="space-y-4">
  <div class="flex items-center gap-4 mb-6">
    <div class="w-16 h-16 bg-nb-green/10 flex items-center justify-center">
      <Icon name="check_circle" class="text-4xl text-nb-green" />
    </div>
    <div>
      <h3 class="text-lg font-bold text-nb-black/80">Import Successful</h3>
      <p class="text-sm text-nb-black/50">Your files have been imported into the archive</p>
    </div>
  </div>

  <div class="grid grid-cols-2 gap-3">
    <div class="p-3 bg-nb-cream">
      <p class="text-2xl font-bold text-nb-black/70">{summary.manifestsCreated}</p>
      <p class="text-xs text-nb-black/50">Manifests created</p>
    </div>
    <div class="p-3 bg-nb-cream">
      <p class="text-2xl font-bold text-nb-black/70">{summary.collectionsCreated}</p>
      <p class="text-xs text-nb-black/50">Collections created</p>
    </div>
    <div class="p-3 bg-nb-cream">
      <p class="text-2xl font-bold text-nb-black/70">{summary.canvasesCreated}</p>
      <p class="text-xs text-nb-black/50">Canvases created</p>
    </div>
    <div class="p-3 bg-nb-cream">
      <p class="text-2xl font-bold text-nb-black/70">{summary.filesProcessed}</p>
      <p class="text-xs text-nb-black/50">Files processed</p>
    </div>
  </div>

  <div class="flex items-center justify-between pt-4 border-t border-nb-black/10">
    <Button variant="danger" size="sm" onclick={onUndo}>
      <Icon name="undo" class="text-sm" /> Undo Import
    </Button>
    <Button variant="primary" size="base" onclick={onNavigate}>
      <Icon name="archive" class="text-sm" /> Navigate to Archive
    </Button>
  </div>
</div>
