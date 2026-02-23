<!--
  CanvasComposer.svelte — Full canvas composition editor organism

  LAYER: organism (FSD features/viewer/ui/organisms)

  Manages layers array, active layer, and undo/redo history stack.
  Integrates ComposerCanvas (display), ComposerSidebar (layer list), and
  ComposerToolbar (save/undo/redo/close).
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFCanvas, IIIFManifest, IIIFCollection } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';
  import ComposerCanvas from '../molecules/ComposerCanvas.svelte';
  import ComposerSidebar from '../molecules/ComposerSidebar.svelte';
  import ComposerToolbar from '../molecules/ComposerToolbar.svelte';

  interface Layer {
    id: string;
    type: string;
    label: string;
    content: any;
    visible: boolean;
    zIndex: number;
  }

  interface Props {
    canvas: IIIFCanvas;
    root: IIIFManifest | IIIFCollection | null;
    onUpdate: (canvas: IIIFCanvas) => void;
    onClose: () => void;
    fieldMode: boolean;
    cx: ContextualClassNames;
  }

  let {
    canvas,
    root,
    onUpdate,
    onClose,
    fieldMode,
    cx,
  }: Props = $props();

  // Layer state
  let layers = $state<Layer[]>([]);
  let activeLayerId = $state<string | undefined>(undefined);

  // History stack for undo/redo
  type Snapshot = Layer[];
  let history = $state<Snapshot[]>([]);
  let historyIndex = $state(-1);

  let canUndo = $derived(historyIndex > 0);
  let canRedo = $derived(historyIndex < history.length - 1);
  let isDirty = $derived(history.length > 1 || (history.length === 1 && historyIndex >= 0));

  function pushHistory(snapshot: Layer[]) {
    // Truncate future when pushing new state
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    history = newHistory;
    historyIndex = newHistory.length - 1;
  }

  function handleLayerSelect(id: string) {
    activeLayerId = id;
  }

  function handleLayerUpdate(id: string, changes: Partial<Layer>) {
    const prev = layers;
    layers = layers.map(l => l.id === id ? { ...l, ...changes } : l);
    pushHistory([...layers]);
  }

  function handleLayerToggle(id: string) {
    handleLayerUpdate(id, { visible: !layers.find(l => l.id === id)?.visible });
  }

  function handleLayerReorder(from: number, to: number) {
    const newLayers = [...layers];
    const [moved] = newLayers.splice(from, 1);
    newLayers.splice(to, 0, moved);
    // Reassign z-indexes
    const reindexed = newLayers.map((l, i) => ({ ...l, zIndex: i }));
    layers = reindexed;
    pushHistory([...layers]);
  }

  function handleUndo() {
    if (!canUndo) return;
    historyIndex -= 1;
    layers = [...history[historyIndex]];
  }

  function handleRedo() {
    if (!canRedo) return;
    historyIndex += 1;
    layers = [...history[historyIndex]];
  }

  function handleSave() {
    // Build updated canvas with annotations derived from layers
    const updatedCanvas: IIIFCanvas = {
      ...canvas,
      // Store layer data as metadata (real implementation would use IIIF structures)
      _composerLayers: layers,
    } as any;
    onUpdate(updatedCanvas);
  }

  // Initialize from canvas data if available (only re-run when canvas.id changes)
  $effect(() => {
    const _canvasId = canvas.id; // Track canvas identity only
    const existingLayers = (canvas as any)._composerLayers as Layer[] | undefined;
    const initialLayers = (existingLayers && existingLayers.length > 0) ? existingLayers : [];
    // Assign both in one synchronous block to avoid intermediate state reads
    const snapshot = initialLayers.slice();
    layers = initialLayers;
    history = [snapshot];
    historyIndex = 0;
  });
</script>

<div
  class={cn(
    'flex flex-col w-full h-full overflow-hidden',
    fieldMode ? 'bg-nb-black' : 'bg-nb-cream'
  )}
  role="region"
  aria-label="Canvas composer"
>
  <!-- Toolbar -->
  <ComposerToolbar
    {canUndo}
    {canRedo}
    {isDirty}
    onSave={handleSave}
    onUndo={handleUndo}
    onRedo={handleRedo}
    {onClose}
    {fieldMode}
    {cx}
  />

  <!-- Main content: sidebar + canvas -->
  <div class="flex-1 flex min-h-0">
    <!-- Sidebar -->
    <div class="w-56 shrink-0 overflow-hidden">
      <ComposerSidebar
        {layers}
        {activeLayerId}
        onLayerSelect={handleLayerSelect}
        onLayerToggle={handleLayerToggle}
        onLayerReorder={handleLayerReorder}
        {fieldMode}
        {cx}
      />
    </div>

    <!-- Canvas area -->
    <div class="flex-1 overflow-hidden">
      <ComposerCanvas
        {layers}
        {activeLayerId}
        onLayerSelect={handleLayerSelect}
        onLayerUpdate={handleLayerUpdate}
        {fieldMode}
        {cx}
      />
    </div>
  </div>
</div>
