<!--
  ViewRouter.svelte — Mode-Based View Switcher
  ==============================================
  React source: src/app/routes/ViewRouter.tsx (774 lines)

  ARCHITECTURE (per §6.C View Page Convention):
  - Thin glue connecting stores to view organisms
  - Routes to feature views based on appMode store
  - Manages annotation state shared between Viewer and Inspector
  - Owns board state ref for persistence

  ROUTING MODEL:
  Unlike SvelteKit file-based routing, this uses a reactive mode switcher.
  The appMode store determines which view organism to render.
  All views share the same URL — mode is state, not a route.
  (SvelteKit file routing is a future migration step)

  LAYOUT STRUCTURE:
  mode='archive'  -> ArchiveView (filmstrip | full) + ViewerView + Inspector
  mode='viewer'   -> ViewerView with filmstrip navigation
  mode='boards'   -> BoardView + optional Inspector
  mode='metadata' -> MetadataView
  mode='search'   -> SearchView
  mode='map'      -> MapView
  mode='timeline' -> TimelineView

  STATE FLOW:
  - appMode.mode -> determines which view to render
  - vault.state -> entity lookups, denormalization, parent traversal
  - getAnnotationContext() -> shared annotation state (from App.svelte provider)
  - Content State URL sync debounced at 500ms via $effect + setTimeout
-->

<script lang="ts">
  import type {
    IIIFItem,
    IIIFCanvas,
    IIIFManifest,
    IIIFAnnotation,
    IIIFAnnotationPage,
    NormalizedState,
  } from '@/src/shared/types';
  import { isCanvas, isManifest } from '@/src/shared/types';
  // Both ViewHeader/types.ts and contextual-styles.ts define ContextualClassNames.
  // ViewHeader version has [key: string] index signature; contextual-styles requires surface/text/accent.
  // Import from contextual-styles (the stricter type) and cast to satisfy both consumers.
  import type { ContextualClassNames as StrictCx } from '@/src/shared/lib/contextual-styles';
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import type { AppSettings } from '@/src/shared/stores/appSettings.svelte';
  import type { TreeValidationIssue } from '@/src/shared/types';
  import type { AppMode } from '@/src/shared/stores/appMode.svelte';

  import { cn } from '@/src/shared/lib/cn';
  import { appMode } from '@/src/shared/stores/appMode.svelte';
  import { appSettings } from '@/src/shared/stores/appSettings.svelte';
  import { vault } from '@/src/shared/stores/vault.svelte';
  import { terminology } from '@/src/shared/stores/terminology.svelte';
  import { getAnnotationContext } from '@/src/shared/stores/contexts';
  import type { AnnotationContext, TimeRange } from '@/src/shared/stores/contexts';
  import { contentStateService } from '@/src/shared/services/contentState';
  import { viewRegistry } from '@/src/shared/stores/viewRegistry.svelte';
  import { ArchiveViewState } from '@/src/features/archive/stores/archiveViewState.svelte';
  import { appModeToViewId } from '@/src/shared/types/viewProtocol';

  import {
    getEntity as vaultGetEntity,
    getParentId,
    getEntityType,
    denormalizeCanvas,
  } from '@/src/entities/manifest/model/vault';

  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  // Feature views
  import ArchiveView from '@/src/features/archive/ui/organisms/ArchiveView.svelte';
  import ViewerView from '@/src/features/viewer/ui/organisms/ViewerView.svelte';
  import BoardView from '@/src/features/board-design/ui/organisms/BoardView.svelte';
  import MetadataView from '@/src/features/metadata-edit/ui/organisms/MetadataView.svelte';
  import SearchView from '@/src/features/search/ui/organisms/SearchView.svelte';
  import MapView from '@/src/features/map/ui/organisms/MapView.svelte';
  import TimelineView from '@/src/features/timeline/ui/organisms/TimelineView.svelte';
  import RequiredStatementBar from '@/src/widgets/RequiredStatementBar/ui/RequiredStatementBar.svelte';
  import Inspector from '@/src/features/metadata-edit/ui/organisms/Inspector.svelte';
  import { createTimeAnnotation } from '@/src/features/viewer/model/annotation';

  // ============================================================================
  // Contextual class constants — field mode vs normal
  // ============================================================================

  const FIELD_CX: StrictCx & ContextualClassNames = Object.freeze({
    surface: 'bg-nb-black border-2 border-nb-yellow',
    text: 'text-nb-yellow',
    accent: 'text-nb-yellow',
    border: 'border-nb-yellow',
    divider: 'border-nb-yellow/30',
    headerBg: 'bg-nb-black border-b-4 border-nb-yellow',
    textMuted: 'text-nb-yellow/60',
    input: 'bg-nb-black border-2 border-nb-yellow text-nb-yellow font-mono',
    label: 'text-nb-yellow/80 nb-label',
    active: 'text-nb-black bg-nb-yellow border-nb-yellow font-bold',
    inactive: 'text-nb-yellow/60 hover:text-nb-yellow',
    warningBg: 'bg-nb-orange/20 border-2 border-nb-orange',
    pageBg: 'bg-nb-black',
  });

  const NORMAL_CX: StrictCx & ContextualClassNames = Object.freeze({
    surface: 'bg-nb-white border-2 border-nb-black',
    text: 'text-nb-black',
    accent: 'text-nb-blue',
    border: 'border-nb-black',
    divider: 'border-nb-black/20',
    headerBg: 'bg-nb-cream border-b-4 border-nb-black',
    textMuted: 'text-nb-black/50',
    input: 'bg-nb-white border-2 border-nb-black font-mono',
    label: 'text-nb-black/70 nb-label',
    active: 'text-nb-white bg-nb-black border-nb-black font-bold',
    inactive: 'text-nb-black/50 hover:text-nb-black',
    warningBg: 'bg-nb-orange/10 border-2 border-nb-orange',
    pageBg: 'bg-nb-cream',
  });

  // ============================================================================
  // Props
  // ============================================================================

  interface Props {
    selectedId: string | null;
    selectedItem?: IIIFItem | null;
    onSelect?: (item: IIIFItem) => void;
    onSelectId?: (id: string | null) => void;
    validationIssuesMap?: Record<string, TreeValidationIssue[]>;
    onUpdateItem?: (updates: Partial<IIIFItem>) => void;
    onBatchEdit?: (ids: string[]) => void;
    onCatalogSelection?: (ids: string[]) => void;
    settings?: AppSettings;
    onOpenImport?: () => void;
    onOpenExternalImport?: () => void;
  }

  let {
    selectedId,
    selectedItem = null,
    onSelect,
    onSelectId,
    validationIssuesMap = {},
    onUpdateItem,
    onBatchEdit,
    onCatalogSelection,
    settings,
    onOpenImport,
    onOpenExternalImport,
  }: Props = $props();

  // ============================================================================
  // Helpers — pure functions for IIIF entity traversal
  // ============================================================================

  /** Flatten annotations from canvas.annotations pages into a single array */
  function getCanvasAnnotations(canvas: IIIFCanvas | null): IIIFAnnotation[] {
    if (!canvas?.annotations) return [];
    const annotations: IIIFAnnotation[] = [];
    for (const page of canvas.annotations) {
      if (page.items) {
        annotations.push(...page.items);
      }
    }
    return annotations;
  }

  /** Detect media type from painting annotations on a canvas */
  function getCanvasMediaType(canvas: IIIFCanvas | IIIFItem | null): 'image' | 'video' | 'audio' | 'other' {
    if (!canvas) return 'other';
    if (!isCanvas(canvas)) return 'other';
    const items = canvas.items;
    if (!items || items.length === 0) return 'other';

    for (const page of items) {
      if (page.items) {
        for (const anno of page.items) {
          const body = anno.body as { type?: string };
          if (body?.type === 'Image') return 'image';
          if (body?.type === 'Video') return 'video';
          if (body?.type === 'Sound') return 'audio';
        }
      }
    }
    return 'other';
  }

  // ============================================================================
  // Annotation Context (provided by App.svelte)
  // ============================================================================

  const annotation: AnnotationContext = getAnnotationContext();

  // ============================================================================
  // Local State
  // ============================================================================

  // Panel visibility for archive split view
  let showViewerPanel = $state(true);
  let showInspectorPanel = $state(false);

  // Annotation selected in viewer — drives Inspector highlight
  let selectedAnnotationId = $state<string | null>(null);

  // Board inspector state
  let boardSelectedId = $state<string | null>(null);

  // Content State URL sync timer
  let contentStateTimer: ReturnType<typeof setTimeout> | null = null;

  // ── ViewRegistry: Archive provider (§0.1) ──
  const archiveViewState = new ArchiveViewState();
  viewRegistry.register(archiveViewState);

  // ============================================================================
  // Vault Lookup — O(1) entity access with Canvas denormalization
  // ============================================================================

  function vaultLookup(id: string): IIIFItem | null {
    const state = vault.state;
    const type = getEntityType(state, id);
    if (type === 'Canvas') {
      return denormalizeCanvas(state, id);
    }
    return vaultGetEntity(state, id);
  }

  /** Walk up reverseRefs to find the parent Manifest of a canvas */
  function getParentManifest(canvasId: string): IIIFManifest | null {
    const state = vault.state;
    let currentId: string | null = getParentId(state, canvasId);
    while (currentId) {
      const type = getEntityType(state, currentId);
      if (type === 'Manifest') {
        const entity = vaultGetEntity(state, currentId);
        return isManifest(entity) ? entity : null;
      }
      currentId = getParentId(state, currentId);
    }
    return null;
  }

  // ============================================================================
  // Derived State
  // ============================================================================

  const mode = $derived(appMode.mode);
  const isFieldMode = $derived(settings?.fieldMode ?? false);
  const cx = $derived(isFieldMode ? FIELD_CX : NORMAL_CX);
  const t = $derived((key: string) => terminology.t(key));
  const isAdvanced = $derived(settings?.abstractionLevel === 'advanced');

  /** Resolve viewer data: canvas + parent manifest for current selection */
  const viewerData = $derived.by(() => {
    if (!vault.rootId) return { canvas: null as IIIFCanvas | null, manifest: null as IIIFManifest | null };

    let selectedCanvas: IIIFCanvas | null = null;
    let parentManifest: IIIFManifest | null = null;

    if (selectedId) {
      const found = vaultLookup(selectedId);
      if (isCanvas(found)) {
        selectedCanvas = found;
        parentManifest = getParentManifest(selectedId);
      }
    }

    if (!selectedCanvas) {
      // Find first canvas via vault queries instead of tree walk
      const canvases = vault.getEntitiesByType('Canvas' as import('@/src/shared/types').EntityType);
      if (canvases.length > 0) {
        selectedCanvas = canvases[0] as IIIFCanvas;
        const pId = vault.getParentId(canvases[0].id);
        if (pId) {
          const parent = vault.getEntity(pId);
          if (parent && isManifest(parent)) parentManifest = parent as IIIFManifest;
        }
      }
    }

    return { canvas: selectedCanvas, manifest: parentManifest };
  });

  /**
   * Annotations from the currently selected canvas.
   * Uses the denormalized canvas from viewerData so canvas.annotations is populated.
   * selectedItem (from vault.getEntity) has annotations:[] — the stripped normalized form.
   */
  const canvasAnnotations = $derived(
    viewerData.canvas ? getCanvasAnnotations(viewerData.canvas) : []
  );

  /**
   * Media type of the selected canvas.
   * Uses the denormalized canvas so items[0].items[0].body is accessible.
   */
  const selectedMediaType = $derived(
    viewerData.canvas ? getCanvasMediaType(viewerData.canvas) : 'other' as const
  );

  /** Cascaded requiredStatement: canvas -> manifest -> undefined */
  const activeRequiredStatement = $derived(
    selectedItem?.requiredStatement
      ?? viewerData.manifest?.requiredStatement
      ?? undefined
  );

  // Archive-specific derived state
  const hasSelectedItem = $derived(!!selectedId && !!selectedItem);
  const isCanvasSelected = $derived(selectedItem?.type === 'Canvas');
  const shouldShowViewer = $derived(hasSelectedItem && isCanvasSelected && showViewerPanel);

  // ============================================================================
  // Effects
  // ============================================================================

  // Clear annotation selection when selected canvas changes
  $effect(() => {
    // Track selectedId
    void selectedId;
    selectedAnnotationId = null;
  });

  // Structure mode redirect to archive (deprecated)
  $effect(() => {
    if (appMode.mode === 'structure') {
      appMode.setMode('archive');
    }
  });

  // Sync appMode → ViewRegistry active view (§0.1)
  $effect(() => {
    const viewId = appModeToViewId(appMode.mode);
    if (viewId) {
      viewRegistry.setActiveView(viewId);
    }
  });

  // Content State URL sync — debounced 500ms
  $effect(() => {
    if (contentStateTimer) clearTimeout(contentStateTimer);
    if (!selectedId) return;

    const state = vault.state;
    const entityType = getEntityType(state, selectedId);
    if (entityType !== 'Canvas') return;

    contentStateTimer = setTimeout(() => {
      const manifestId = getParentManifest(selectedId!)?.id;
      if (manifestId) {
        contentStateService.updateUrl({ manifestId, canvasId: selectedId! });
      }
    }, 500);

    return () => {
      if (contentStateTimer) clearTimeout(contentStateTimer);
    };
  });

  // ============================================================================
  // Annotation Handlers
  // ============================================================================

  /** Handle annotation selection from viewer — open inspector + highlight */
  function handleAnnotationSelected(annotationId: string | null) {
    selectedAnnotationId = annotationId;
    if (annotationId) {
      showInspectorPanel = true;
    }
  }

  /** Extend annotation toggle to also open inspector panel */
  function handleAnnotationToolToggle(active: boolean) {
    annotation.handleAnnotationToolToggle(active);
    if (active) {
      showInspectorPanel = true;
    }
  }

  /** Save annotation: temporal (audio/video) or spatial (image via ref) */
  function handleSaveAnnotation() {
    if (selectedMediaType === 'audio' || selectedMediaType === 'video') {
      // Time-based annotation — create directly via vault
      if (annotation.timeRange && annotation.annotationText.trim() && selectedItem?.id) {
        const anno = createTimeAnnotation(
          selectedItem.id,
          annotation.timeRange,
          annotation.annotationText,
          annotation.annotationMotivation as 'commenting' | 'tagging' | 'describing'
        );
        vault.dispatch({
          type: 'ADD_ANNOTATION',
          canvasId: selectedItem.id,
          annotation: anno as import('@/src/shared/types').IIIFAnnotation,
        });
      }
    } else {
      // Spatial annotation — commit via Annotorious overlay (registered in AnnotationContext)
      annotation.triggerSave?.();
    }
    annotation.setAnnotationText('');
    annotation.setTimeRange(null);
  }

  /** Clear current annotation drawing */
  function handleClearAnnotation() {
    annotation.triggerClear?.();
    annotation.setAnnotationText('');
    annotation.setTimeRange(null);
  }

  /** Delete an annotation by ID */
  function handleDeleteAnnotation(annotationId: string) {
    if (!selectedItem?.id) return;
    vault.dispatch({
      type: 'REMOVE_ANNOTATION',
      canvasId: selectedItem.id,
      annotationId,
    });
  }

  /** Edit an annotation's body text */
  function handleEditAnnotation(annotationId: string, newText: string) {
    vault.dispatch({
      type: 'UPDATE_ANNOTATION',
      annotationId,
      updates: { body: { type: 'TextualBody', value: newText, format: 'text/plain' } },
    });
  }

  // ============================================================================
  // Board Handlers
  // ============================================================================

  function handleBoardSave(boardState: unknown) {
    // Architecture: BoardView emits the full BoardState object, but vault board actions
    // are per-item (UPDATE_BOARD_ITEM_POSITION, REMOVE_BOARD_ITEM). A reconciliation
    // layer would diff the previous state against boardState and dispatch individual
    // actions. Deferred until BoardView stabilizes its save contract.
    console.warn('[ViewRouter] Board save — vault board actions pending type reconciliation', boardState);
  }

  // ============================================================================
  // View Error Handler
  // ============================================================================

  function handleViewError(error: unknown) {
    console.error('[ViewRouter] View rendering error:', error);
  }
</script>

<!-- ======================================================================== -->
<!-- Template: Mode-Based View Routing                                        -->
<!-- ======================================================================== -->

{#if mode === 'archive'}
  <!-- ================================================================== -->
  <!-- ARCHIVE: Split layout — filmstrip | viewer | inspector             -->
  <!-- ================================================================== -->
  <div class="view-enter flex-1 flex flex-col min-h-0">
    <!-- RequiredStatementBar — cascaded from canvas/manifest -->
    <RequiredStatementBar
      requiredStatement={activeRequiredStatement}
      {cx}
      fieldMode={isFieldMode}
    />
    <div class="flex-1 flex min-h-0">
      <!-- Left: Archive — filmstrip when viewer shown, full grid otherwise -->
      <div class={cn(
        'flex flex-col transition-nb filmstrip-panel',
        shouldShowViewer
          ? cn(
              'w-filmstrip shrink-0',
              isFieldMode ? 'bg-nb-black border-r-2 border-nb-yellow' : 'bg-nb-cream border-r-2 border-nb-black'
            )
          : 'flex-1'
      )}>
        <svelte:boundary onerror={handleViewError}>
          {#if vault.rootId}
            <ArchiveView
              onSelect={(item) => {
                onSelect?.(item);
                onSelectId?.(item.id);
              }}
              onOpen={(item) => {
                onSelect?.(item);
                onSelectId?.(item.id);
                showViewerPanel = true;
              }}
              onBatchEdit={(ids) => onBatchEdit?.(ids)}
              filmstripMode={shouldShowViewer}
              onOpenImport={() => onOpenImport?.()}
              onOpenExternalImport={() => onOpenExternalImport?.()}
              {cx}
              fieldMode={isFieldMode}
              {t}
              {showViewerPanel}
              {showInspectorPanel}
              onToggleViewerPanel={() => showViewerPanel = !showViewerPanel}
              onToggleInspectorPanel={() => showInspectorPanel = !showInspectorPanel}
            />
          {/if}
        </svelte:boundary>
      </div>

      <!-- Right: Viewer Panel — when canvas selected AND panel open -->
      {#if shouldShowViewer}
        <div class={cn('flex-1 flex flex-col min-h-0', isFieldMode ? 'bg-nb-black' : 'bg-nb-cream')}>
          <!-- Viewer header: inspector toggle + close -->
          <div class={cn(
            'shrink-0 px-4 py-2 border-b-2 flex items-center justify-end gap-2',
            isFieldMode ? 'bg-nb-black border-nb-yellow' : 'bg-nb-cream border-nb-black'
          )}>
            <Button
              variant="ghost"
              size="bare"
              onclick={() => showInspectorPanel = !showInspectorPanel}
              class={cn(
                'p-1.5 transition-nb',
                showInspectorPanel
                  ? isFieldMode ? 'bg-nb-yellow text-nb-black font-bold' : 'bg-nb-black text-nb-white font-bold'
                  : isFieldMode ? 'text-nb-yellow hover:bg-nb-yellow/20' : 'text-nb-black/50 hover:bg-nb-black/10'
              )}
              title={showInspectorPanel ? 'Hide Inspector' : 'Show Inspector'}
            >
              <Icon name="info" class="text-lg" />
            </Button>
            <Button
              variant="ghost"
              size="bare"
              onclick={() => showViewerPanel = false}
              class={cn(
                'p-1.5 transition-nb',
                isFieldMode ? 'text-nb-yellow hover:bg-nb-yellow/20' : 'text-nb-black/50 hover:bg-nb-black/10'
              )}
              title="Close Viewer"
            >
              <Icon name="close" class="text-lg" />
            </Button>
          </div>

          <!-- Viewer + Inspector panels -->
          <div class="flex-1 flex min-h-0 overflow-hidden">
            <div class={cn('flex flex-col min-h-0 min-w-0', showInspectorPanel ? 'flex-1' : 'w-full')}>
              <svelte:boundary onerror={handleViewError}>
                <ViewerView
                  item={viewerData.canvas}
                  manifest={viewerData.manifest}
                  onUpdate={(updates) => onUpdateItem?.(updates)}
                  {cx}
                  fieldMode={isFieldMode}
                  {t}
                  {isAdvanced}
                />
              </svelte:boundary>
            </div>

            <!-- Inspector Panel — archive-specific mount point -->
            {#if showInspectorPanel && settings}
              <div class="w-inspector shrink-0 min-h-0 overflow-hidden">
                <Inspector
                  resource={selectedItem}
                  onUpdateResource={(updates) => onUpdateItem?.(updates)}
                  {cx}
                  fieldMode={isFieldMode}
                  visible={showInspectorPanel}
                  onClose={() => { showInspectorPanel = false; }}
                  abstractionLevel={settings.abstractionLevel}
                  annotations={canvasAnnotations}
                  annotationModeActive={annotation.showAnnotationTool}
                  annotationDrawingState={annotation.annotationDrawingState}
                  annotationText={annotation.annotationText}
                  onAnnotationTextChange={annotation.setAnnotationText}
                  annotationMotivation={annotation.annotationMotivation as 'commenting' | 'tagging' | 'describing'}
                  onAnnotationMotivationChange={annotation.setAnnotationMotivation}
                  onSaveAnnotation={handleSaveAnnotation}
                  onClearAnnotation={handleClearAnnotation}
                  mediaType={selectedMediaType}
                  timeRange={annotation.timeRange}
                  currentPlaybackTime={annotation.currentPlaybackTime}
                  forceTab={annotation.forceAnnotationsTab ? 'annotations' : undefined}
                  onDeleteAnnotation={handleDeleteAnnotation}
                  onEditAnnotation={handleEditAnnotation}
                  selectedAnnotationId={selectedAnnotationId}
                />
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>

{:else if mode === 'viewer'}
  <!-- ================================================================== -->
  <!-- VIEWER: Full viewer with optional filmstrip                        -->
  <!-- ================================================================== -->
  <div class="view-enter flex-1 flex flex-col min-h-0">
    <!-- RequiredStatementBar — cascaded from canvas/manifest -->
    <RequiredStatementBar
      requiredStatement={activeRequiredStatement}
      {cx}
      fieldMode={isFieldMode}
    />
    <svelte:boundary onerror={handleViewError}>
      <ViewerView
        item={viewerData.canvas}
        manifest={viewerData.manifest}
        manifestItems={viewerData.manifest?.items ?? []}
        onUpdate={(updates) => onUpdateItem?.(updates)}
        onPageChange={(page) => {
          const idx = page - 1;
          const manifestCanvases = viewerData.manifest?.items ?? [];
          if (manifestCanvases[idx]) {
            onSelectId?.(manifestCanvases[idx].id);
          }
        }}
        onSwitchView={(m) => appMode.setMode(m as AppMode)}
        {cx}
        fieldMode={isFieldMode}
        {t}
        {isAdvanced}
      />
    </svelte:boundary>
  </div>

{:else if mode === 'boards'}
  <!-- ================================================================== -->
  <!-- BOARDS: Board view + optional inspector                            -->
  <!-- ================================================================== -->
  {@const boardSelectedItem = boardSelectedId ? (vaultLookup(boardSelectedId) ?? null) : null}
  <div class="view-enter flex-1 flex flex-col min-h-0">
    <div class="flex-1 flex min-h-0">
      <div class="flex-1 min-h-0">
        <svelte:boundary onerror={handleViewError}>
          {#if vault.rootId}
            <BoardView
              {cx}
              fieldMode={isFieldMode}
              {t}
              {isAdvanced}
              onSwitchView={(m) => appMode.setMode(m as AppMode)}
              onSelectId={(id) => {
                boardSelectedId = id;
                onSelectId?.(id);
              }}
              onSelect={onSelect}
              onSaveBoard={(state) => handleBoardSave(state)}
            />
          {/if}
        </svelte:boundary>
      </div>

      <!-- Board Inspector — shown when a board item is selected -->
      {#if boardSelectedItem && settings}
        <div class="w-[320px] shrink-0 min-h-0 overflow-hidden">
          <Inspector
            resource={boardSelectedItem}
            onUpdateResource={(updates) => onUpdateItem?.(updates)}
            {cx}
            fieldMode={isFieldMode}
            visible={!!boardSelectedItem}
            onClose={() => { boardSelectedId = null; onSelectId?.(null); }}
            abstractionLevel={settings.abstractionLevel}
          />
        </div>
      {/if}
    </div>
  </div>

{:else if mode === 'metadata'}
  <!-- ================================================================== -->
  <!-- METADATA: Full-width metadata editor                               -->
  <!-- ================================================================== -->
  <div class="view-enter flex-1 flex flex-col min-h-0">
    <svelte:boundary onerror={handleViewError}>
      <MetadataView
        {cx}
        fieldMode={isFieldMode}
        abstractionLevel={settings?.abstractionLevel}
      />
    </svelte:boundary>
  </div>

{:else if mode === 'search'}
  <!-- ================================================================== -->
  <!-- SEARCH: Search across all entities                                 -->
  <!-- ================================================================== -->
  <div class="view-enter flex-1 flex flex-col min-h-0">
    <svelte:boundary onerror={handleViewError}>
      <SearchView
        onSelect={(id) => {
          onSelectId?.(id);
          appMode.setMode('archive');
        }}
        onRevealMap={(id) => {
          onSelectId?.(id);
          appMode.setMode('map');
        }}
        {cx}
        fieldMode={isFieldMode}
        {t}
      />
    </svelte:boundary>
  </div>

{:else if mode === 'map'}
  <!-- ================================================================== -->
  <!-- MAP: Geographic view of geotagged canvases                         -->
  <!-- ================================================================== -->
  <div class="view-enter flex-1 flex flex-col min-h-0">
    <svelte:boundary onerror={handleViewError}>
      {#if vault.rootId}
        <MapView
          onSelect={(item) => onSelectId?.(item.id)}
          {cx}
          fieldMode={isFieldMode}
          {t}
          {isAdvanced}
          onSwitchView={(m) => appMode.setMode(m as AppMode)}
        />
      {/if}
    </svelte:boundary>
  </div>

{:else if mode === 'timeline'}
  <!-- ================================================================== -->
  <!-- TIMELINE: Chronological view of dated items                        -->
  <!-- ================================================================== -->
  <div class="view-enter flex-1 flex flex-col min-h-0">
    <svelte:boundary onerror={handleViewError}>
      {#if vault.rootId}
        <TimelineView
          onSelect={(item) => onSelectId?.(item.id)}
          {cx}
          fieldMode={isFieldMode}
          {t}
          onSwitchView={(m) => appMode.setMode(m as AppMode)}
        />
      {/if}
    </svelte:boundary>
  </div>

{:else if mode === 'admin-deps'}
  <!-- ================================================================== -->
  <!-- ADMIN: Dependency explorer (lazy, debug only)                      -->
  <!-- ================================================================== -->
  <div class="view-enter flex-1 flex flex-col min-h-0">
    <div class="h-full bg-nb-cream p-6">
      <div class="text-nb-black/50 text-sm font-mono">
        Dependency Explorer — not yet migrated
      </div>
    </div>
  </div>
{/if}

<style>
  /* View transition: 150ms fade-in, respects prefers-reduced-motion */
  .view-enter {
    animation: viewFadeIn 150ms ease-out;
  }

  @keyframes viewFadeIn {
    from {
      opacity: 0;
      transform: translateY(2px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .view-enter {
      animation: none;
    }
  }

  /* Filmstrip panel width for archive split view */
  :global(.w-filmstrip) {
    width: 280px;
  }

  /* Inspector panel width */
  :global(.w-inspector) {
    width: 360px;
  }
</style>
