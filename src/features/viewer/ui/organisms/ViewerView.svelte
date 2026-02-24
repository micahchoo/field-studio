<!--
  ViewerView.svelte — IIIF Viewer (Image/Audio/Video)
  =====================================================

  ARCHITECTURE (per S7 External Libraries):
  - Feature organism: OpenSeadragon image viewer + audio/video player
  - External lib integration: onMount for OSD init, $effect for reactive updates
  - Uses $state.snapshot() when passing data to OSD (per S7.A)
  - Annotation drawing via AnnotationDrawingOverlay molecule
  - Does NOT use PaneLayout (OSD needs absolute positioning)

  LAYOUT STRUCTURE:
  - ViewerInlineToolbar (header)
  - ViewerContentArea + ViewerOverlayPanels (flex-1, relative)
  - ViewerFilmstrip (footer)
  - ViewerModals (absolute overlays)
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type {
    IIIFCanvas,
    IIIFManifest,
    IIIFAnnotation,
    IIIFAnnotationBody,
    IIIFAnnotationPage,
    Selector,
  } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';
  import { cn } from '@/src/shared/lib/cn';
  import { vault } from '@/src/shared/stores/vault.svelte';
  import { actions } from '@/src/entities/manifest/model/actions';
  import { ImageFilterStore } from '@/src/features/viewer/model/imageFilters.svelte';
  import { MeasurementStore } from '@/src/features/viewer/model/measurement.svelte';
  import { ComparisonStore } from '@/src/features/viewer/model/comparison.svelte';
  import { AnnotationLayerStore } from '@/src/features/viewer/model/annotationLayers.svelte';
  import { MediaPlayerStore } from '@/src/features/viewer/stores/mediaPlayer.svelte';
  import { storage } from '@/src/shared/services/storage';
  import { contentStateService } from '@/src/shared/services/contentState';

  import {
    type MediaType,
    type PaintingBody,
    type AnnotationStyleOptions,
    type SpatialDrawingMode,
    detectMediaType,
    initializeOsd,
    destroyOsdViewer,
    captureScreenshot,
    extractChapters,
    handleImageKeyDown,
  } from './viewerViewHelpers';

  import ViewerInlineToolbar from '../molecules/ViewerInlineToolbar.svelte';
  import ViewerContentArea from '../molecules/ViewerContentArea.svelte';
  import ViewerOverlayPanels from '../molecules/ViewerOverlayPanels.svelte';
  import ViewerModals from '../molecules/ViewerModals.svelte';
  import ViewerFilmstrip from '../atoms/ViewerFilmstrip.svelte';

  // ============================================================================
  // Props
  // ============================================================================

  interface Props {
    item: IIIFCanvas | null;
    manifest: IIIFManifest | null;
    manifestItems?: IIIFCanvas[];
    cx: ContextualClassNames;
    fieldMode: boolean;
    t: (key: string) => string;
    isAdvanced: boolean;
    onUpdate: (updates: Partial<IIIFCanvas>) => void;
    onPageChange?: (page: number) => void;
    onSwitchView?: (mode: string) => void;
    onAddToBoard?: (canvasId: string) => void;
    annotationToolActive?: boolean;
    onAnnotationToolToggle?: (active: boolean) => void;
    annotationText?: string;
    annotationMotivation?: 'commenting' | 'tagging' | 'describing';
    onAnnotationDrawingStateChange?: (state: { pointCount: number; isDrawing: boolean; canSave: boolean }) => void;
    onAnnotationSaveRef?: (fn: () => void) => void;
    onAnnotationClearRef?: (fn: () => void) => void;
    timeRange?: { start: number; end?: number } | null;
    onTimeRangeChange?: (range: { start: number; end?: number } | null) => void;
    currentPlaybackTime?: number;
    onPlaybackTimeChange?: (time: number) => void;
    onTimeAnnotationCreateRef?: (fn: (text: string, motivation: 'commenting' | 'tagging' | 'describing') => void) => void;
    onAnnotationSelected?: (annotationId: string | null) => void;
  }

  let {
    item, manifest, manifestItems, cx, fieldMode, t,
    isAdvanced: _isAdvanced, onUpdate, onPageChange, onSwitchView, onAddToBoard,
    annotationToolActive, onAnnotationToolToggle,
    annotationText: annotationTextProp,
    annotationMotivation: annotationMotivationProp,
    onAnnotationDrawingStateChange, onAnnotationSaveRef, onAnnotationClearRef,
    timeRange: timeRangeProp, onTimeRangeChange: onTimeRangeChangeProp,
    currentPlaybackTime: currentPlaybackTimeProp, onPlaybackTimeChange,
    onTimeAnnotationCreateRef: _onTimeAnnotationCreateRef,
    onAnnotationSelected,
  }: Props = $props();

  // ============================================================================
  // Feature Stores
  // ============================================================================

  const filters = new ImageFilterStore();
  const measurement = new MeasurementStore();
  const comparison = new ComparisonStore();
  const layers = new AnnotationLayerStore();
  const player = new MediaPlayerStore();

  // ============================================================================
  // Local State
  // ============================================================================

  let containerRef: HTMLDivElement | undefined = $state();
  let osdContainerRef: HTMLDivElement | undefined = $state();
  let videoRef: HTMLVideoElement | HTMLAudioElement | undefined = $state();

  let showWorkbench = $state(false);
  let showSearchPanel = $state(false);
  let showLayerPanel = $state(false);
  let showFilmstrip = $state(true);
  let showNavigator = $state(true);
  let showKeyboardHelp = $state(false);
  let isFullscreen = $state(false);
  let showFilterPanel = $state(false);

  let internalAnnotationToolActive = $state(false);
  let annotationDrawingMode = $state<SpatialDrawingMode>('polygon');
  let annotationStyle = $state<AnnotationStyleOptions>({
    color: '#22c55e', strokeWidth: 2, fillOpacity: 0.1,
  });

  let internalTimeRange = $state<{ start: number; end?: number } | null>(null);
  let internalPlaybackTime = $state(0);
  let zoomLevel = $state(100);
  let rotation = $state(0);
  let isFlipped = $state(false);

  let osdViewer: any;
  let objectUrl: string | null = null;

  // ============================================================================
  // Controlled vs Internal State
  // ============================================================================

  const isControlledAnnotation = $derived(annotationToolActive !== undefined);
  const showAnnotationTool = $derived(
    isControlledAnnotation ? annotationToolActive! : internalAnnotationToolActive
  );

  function setShowAnnotationTool(active: boolean): void {
    if (isControlledAnnotation) onAnnotationToolToggle?.(active);
    else internalAnnotationToolActive = active;
  }

  const isControlledTimeRange = $derived(timeRangeProp !== undefined);
  const timeRange = $derived(isControlledTimeRange ? timeRangeProp : internalTimeRange);

  // ============================================================================
  // Derived State
  // ============================================================================

  const paintingBody = $derived.by((): PaintingBody | null => {
    if (!item?.items?.[0]?.items?.[0]) return null;
    const body = item.items[0].items[0].body as IIIFAnnotationBody | IIIFAnnotationBody[];
    return (Array.isArray(body) ? body[0] : body) as PaintingBody;
  });

  const mediaType = $derived.by((): MediaType => {
    if (!paintingBody) return 'other';
    return detectMediaType(paintingBody.type || paintingBody.format || '');
  });

  const annotations = $derived.by((): IIIFAnnotation[] => {
    if (!item?.annotations) return [];
    const result: IIIFAnnotation[] = [];
    for (const page of item.annotations) {
      if (page.items) result.push(...page.items);
    }
    return result;
  });

  const resolvedImageUrl = $derived.by((): string | null => {
    if (!item) return null;
    if (item._blobUrl) return item._blobUrl;
    if (paintingBody?.id) return paintingBody.id;
    return null;
  });

  const chapters = $derived(extractChapters(manifest, item?.id ?? ''));
  const label = $derived(item ? getIIIFValue(item.label) : '');
  const currentIndex = $derived(manifestItems ? manifestItems.findIndex(c => c.id === item?.id) : -1);
  const totalItems = $derived(manifestItems?.length ?? 1);

  const hasSearchService = $derived.by((): boolean => {
    if (!manifest?.service) return false;
    const services = Array.isArray(manifest.service) ? manifest.service : [manifest.service];
    return services.some((svc: any) => {
      if (!svc) return false;
      return svc.type === 'SearchService2' ||
        (Array.isArray(svc.profile) ? svc.profile.some((p: string) => p.includes('search')) : svc.profile?.includes('search'));
    });
  });

  const hasMultipleCanvases = $derived(!!manifestItems && manifestItems.length > 1);

  const secondComparisonCanvas = $derived.by((): IIIFCanvas | null => {
    if (!comparison.isActive || !comparison.leftCanvasId) return null;
    return manifestItems?.find(c => c.id === comparison.rightCanvasId) ?? null;
  });

  // ============================================================================
  // OSD Lifecycle
  // ============================================================================

  onMount(() => {
    return () => {
      destroyOsdViewer(osdViewer);
      osdViewer = undefined;
      if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
      measurement.reset();
      comparison.reset();
      player.detach();
    };
  });

  $effect(() => {
    const currentItem = item;
    const currentMediaType = mediaType;
    const currentUrl = resolvedImageUrl;

    if (!currentItem || currentMediaType !== 'image' || !currentUrl || !osdContainerRef) {
      if (osdViewer) { destroyOsdViewer(osdViewer); osdViewer = undefined; }
      return;
    }

    if (typeof (globalThis as any).OpenSeadragon === 'undefined') {
      console.error('[ViewerView] OpenSeadragon is not loaded');
      return;
    }

    const OSD = (globalThis as any).OpenSeadragon;
    if (osdViewer) { destroyOsdViewer(osdViewer); osdViewer = undefined; }

    const tileSource = { type: 'image', url: $state.snapshot(currentUrl) };
    const rect = osdContainerRef.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            observer.disconnect();
            osdViewer = initializeOsd(OSD, {
              container: osdContainerRef!, tileSource,
              onZoomChange: (z) => { zoomLevel = z; },
            });
          }
        }
      });
      observer.observe(osdContainerRef);
      return () => { observer.disconnect(); };
    }

    osdViewer = initializeOsd(OSD, {
      container: osdContainerRef, tileSource,
      onZoomChange: (z) => { zoomLevel = z; },
    });
  });

  $effect(() => {
    if (videoRef && (mediaType === 'video' || mediaType === 'audio')) {
      player.attach(videoRef as HTMLVideoElement);
    }
  });

  $effect(() => {
    if (item?.annotations && item.annotations.length > 0) {
      layers.setLayers(item.annotations.map((page: IIIFAnnotationPage) => ({
        id: page.id, label: getIIIFValue(page.label) || '',
      })));
    } else {
      layers.reset();
    }
  });

  // ============================================================================
  // Event Handlers
  // ============================================================================

  function handleZoomIn(): void { osdViewer?.viewport?.zoomBy(1.2); }
  function handleZoomOut(): void { osdViewer?.viewport?.zoomBy(0.8); }

  function handleResetView(): void {
    if (!osdViewer) return;
    osdViewer.viewport.goHome();
    osdViewer.viewport.setRotation(0);
    osdViewer.viewport.setFlip(false);
    rotation = 0; isFlipped = false; zoomLevel = 100;
  }

  function handleRotateCW(): void {
    const r = (rotation + 90) % 360;
    osdViewer?.viewport?.setRotation(r);
    rotation = r;
  }

  function handleRotateCCW(): void {
    const r = (rotation - 90 + 360) % 360;
    osdViewer?.viewport?.setRotation(r);
    rotation = r;
  }

  function handleFlipHorizontal(): void {
    if (osdViewer) {
      const current = osdViewer.viewport.getFlip();
      osdViewer.viewport.setFlip(!current);
      isFlipped = !current;
    } else {
      isFlipped = !isFlipped;
    }
  }

  function handleToggleFullscreen(): void {
    if (!containerRef) return;
    if (!document.fullscreenElement) {
      containerRef.requestFullscreen().then(() => { isFullscreen = true; });
    } else {
      document.exitFullscreen().then(() => { isFullscreen = false; });
    }
  }

  function handleToggleNavigator(): void {
    showNavigator = !showNavigator;
    if (osdViewer?.navigator) {
      osdViewer.navigator.element.style.display = showNavigator ? 'block' : 'none';
    }
  }

  function handleToggleComparison(): void {
    if (comparison.isActive) {
      comparison.reset();
    } else if (manifestItems && manifestItems.length > 1 && item) {
      const idx = manifestItems.findIndex(c => c.id === item.id);
      comparison.setCanvases(item.id, manifestItems[(idx + 1) % manifestItems.length].id);
      comparison.setMode('side-by-side');
    }
  }

  function handleShareLink(): void {
    if (!item?.id || !manifest?.id) return;
    const encoded = contentStateService.encode({
      id: item.id, type: 'Canvas',
      partOf: [{ id: manifest.id, type: 'Manifest' }],
    });
    navigator.clipboard.writeText(encoded).catch(() => {
      console.warn('[ViewerView] Failed to copy content state to clipboard');
    });
  }

  function handleCreateAnnotation(annotation: IIIFAnnotation): void {
    if (!item?.id) return;
    vault.dispatch(actions.addAnnotation(item.id, annotation));
    const updatedRoot = vault.export();
    if (updatedRoot) storage.saveProject(updatedRoot);
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

    if (mediaType === 'image') {
      handleImageKeyDown(e, {
        zoomIn: handleZoomIn, zoomOut: handleZoomOut, resetView: handleResetView,
        rotateCW: handleRotateCW, rotateCCW: handleRotateCCW, flipHorizontal: handleFlipHorizontal,
        toggleNavigator: handleToggleNavigator,
        toggleAnnotationTool: () => setShowAnnotationTool(!showAnnotationTool),
        toggleMeasurement: () => measurement.active ? measurement.deactivate() : measurement.activate(),
        toggleKeyboardHelp: () => { showKeyboardHelp = !showKeyboardHelp; },
        exitFullscreen: () => document.exitFullscreen(),
        isFullscreen,
      });
    } else if (mediaType === 'audio' || mediaType === 'video') {
      player.handleKeyboard(e);
    }
  }

  // Window resize and fullscreen listeners
  $effect(() => {
    function onResize() {
      if (!osdViewer?.viewport || !osdViewer?.element) return;
      if (!osdViewer.element.offsetWidth || !osdViewer.element.offsetHeight) return;
      try { osdViewer.viewport.resize(); } catch { /* ignore */ }
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  $effect(() => {
    function onFsChange() { isFullscreen = !!document.fullscreenElement; }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  });
</script>

<!-- ======================================================================== -->
<!-- TEMPLATE                                                                  -->
<!-- ======================================================================== -->

{#if !item}
  <div
    class={cn('flex-1 flex flex-col items-center justify-center gap-4', fieldMode ? 'bg-nb-black text-nb-yellow' : 'bg-nb-cream text-nb-black')}
    role="region" aria-label="Viewer"
  >
    <div class="text-center">
      <div class="text-4xl mb-2" aria-hidden="true">&#128444;</div>
      <p class="font-mono text-sm uppercase tracking-wider opacity-60">{t('Select a canvas to view')}</p>
    </div>
  </div>
{:else}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_no_noninteractive_tabindex a11y_no_static_element_interactions -->
  <div
    bind:this={containerRef}
    class={cn('flex-1 flex flex-col overflow-hidden relative', fieldMode ? 'bg-nb-black' : 'bg-nb-cream')}
    onkeydown={handleKeyDown}
    role="application"
    aria-label={label || 'Canvas viewer'}
  >
    <ViewerInlineToolbar
      {label} {mediaType} {zoomLevel}
      {showAnnotationTool}
      measurementActive={measurement.active}
      {showFilterPanel}
      comparisonActive={comparison.isActive}
      {hasMultipleCanvases}
      layerCount={layers.layers.length}
      {showLayerPanel} {showFilmstrip} {isFullscreen}
      hasManifest={!!manifest}
      hasResolvedUrl={!!resolvedImageUrl}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      onRotateCW={handleRotateCW}
      onFlipHorizontal={handleFlipHorizontal}
      onToggleAnnotationTool={() => setShowAnnotationTool(!showAnnotationTool)}
      onToggleMeasurement={() => measurement.active ? measurement.deactivate() : measurement.activate()}
      onToggleFilterPanel={() => showFilterPanel = !showFilterPanel}
      onToggleComparison={handleToggleComparison}
      onToggleLayerPanel={() => showLayerPanel = !showLayerPanel}
      onScreenshot={() => captureScreenshot(osdViewer, 'image/png', 'download')}
      onShareLink={handleShareLink}
      onToggleKeyboardHelp={() => showKeyboardHelp = !showKeyboardHelp}
      onToggleFullscreen={handleToggleFullscreen}
      onToggleFilmstrip={() => showFilmstrip = !showFilmstrip}
      {cx} {fieldMode} {t}
    />

    <div class="flex-1 flex min-h-0 relative">
      <ViewerContentArea
        {mediaType} {label} {resolvedImageUrl} {chapters}
        {filters} {measurement} {player}
        bind:osdContainerRef
        bind:videoRef
        {cx} {fieldMode} {t}
      />

      {#if mediaType === 'image'}
        <ViewerOverlayPanels
          {filters} {layers} {comparison}
          {showFilterPanel} {showLayerPanel} {secondComparisonCanvas}
          onCloseFilterPanel={() => showFilterPanel = false}
          onCloseLayerPanel={() => showLayerPanel = false}
          {cx} {fieldMode} {t}
        />
      {/if}
    </div>

    {#if showFilmstrip && onPageChange}
      <ViewerFilmstrip
        {currentIndex} {totalItems}
        isLoaded={!!resolvedImageUrl}
        onPageChange={onPageChange}
        {cx} {fieldMode} {t}
      />
    {/if}

    <ViewerModals
      {showWorkbench} {showSearchPanel} {showKeyboardHelp} {mediaType}
      onCloseWorkbench={() => showWorkbench = false}
      onCloseSearchPanel={() => showSearchPanel = false}
      onCloseKeyboardHelp={() => showKeyboardHelp = false}
      {cx} {fieldMode} {t}
    />
  </div>
{/if}
