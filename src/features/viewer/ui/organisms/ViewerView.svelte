<!--
  ViewerView.svelte — IIIF Viewer (Image/Audio/Video)
  =====================================================
  React source: src/features/viewer/ui/organisms/ViewerView.tsx

  ARCHITECTURE (per §7 External Libraries):
  - Feature organism: OpenSeadragon image viewer + audio/video player
  - External lib integration: onMount for OSD init, $effect for reactive updates
  - Uses $state.snapshot() when passing data to OSD (per §7.A)
  - Annotation drawing via AnnotationDrawingOverlay molecule
  - Does NOT use PaneLayout (OSD needs absolute positioning)

  LAYOUT STRUCTURE:
  - ViewerToolbar (header)
  - Content area (flex-1, relative, overflow-hidden)
    - [image] OSD container (absolute inset-0) + AnnotationDrawingOverlay
    - [audio] AudioWaveform component
    - [video] <video> element
    - Overlay panels: ImageFilterPanel, ComparisonViewer, MeasurementOverlay
    - AnnotationLayerPanel
  - FilmstripNavigator (footer)
  - Modals: ViewerWorkbench, ViewerPanels, KeyboardShortcutsModal
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type {
    IIIFCanvas,
    IIIFManifest,
    IIIFAnnotation,
    IIIFAnnotationPage,
    IIIFRange,
    IIIFRangeReference,
    IIIFExternalWebResource,
    IIIFTextualBody,
    IIIFSpecificResource,
    Selector,
  } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';
  import { cn } from '@/src/shared/lib/cn';
  import { vault } from '@/src/shared/stores/vault.svelte';
  import { ImageFilterStore } from '@/src/features/viewer/model/imageFilters.svelte';
  import { MeasurementStore } from '@/src/features/viewer/model/measurement.svelte';
  import { ComparisonStore } from '@/src/features/viewer/model/comparison.svelte';
  import { AnnotationLayerStore } from '@/src/features/viewer/model/annotationLayers.svelte';
  import { MediaPlayerStore } from '@/src/features/viewer/stores/mediaPlayer.svelte';

  // @migration: ViewerToolbar not yet migrated, using placeholder
  // import ViewerToolbar from '../molecules/ViewerToolbar.svelte';
  // @migration: ViewerContent not yet migrated, using placeholder
  // import ViewerContent from '../molecules/ViewerContent.svelte';
  // @migration: FilmstripNavigator not yet migrated, using placeholder
  // import FilmstripNavigator from '../molecules/FilmstripNavigator.svelte';
  // @migration: ImageFilterPanel not yet migrated, using placeholder
  // import ImageFilterPanel from '../molecules/ImageFilterPanel.svelte';
  // @migration: MeasurementOverlay not yet migrated, using placeholder
  // import MeasurementOverlay from '../molecules/MeasurementOverlay.svelte';
  // @migration: ComparisonViewer not yet migrated, using placeholder
  // import ComparisonViewer from '../molecules/ComparisonViewer.svelte';
  // @migration: AnnotationDrawingOverlay not yet migrated, using placeholder
  // import AnnotationDrawingOverlay from '../molecules/AnnotationDrawingOverlay.svelte';
  // @migration: AnnotationLayerPanel not yet migrated, using placeholder
  // import AnnotationLayerPanel from '../molecules/AnnotationLayerPanel.svelte';
  // @migration: ViewerWorkbench not yet migrated, using placeholder
  // import ViewerWorkbench from '../molecules/ViewerWorkbench.svelte';
  // @migration: ViewerPanels not yet migrated, using placeholder
  // import ViewerPanels from '../molecules/ViewerPanels.svelte';
  // @migration: KeyboardShortcutsModal not yet migrated, using placeholder
  // import KeyboardShortcutsModal from '../molecules/KeyboardShortcutsModal.svelte';
  // @migration: AudioWaveform not yet migrated, using placeholder
  // import AudioWaveform from '../molecules/AudioWaveform.svelte';

  // ============================================================================
  // Types
  // ============================================================================

  type MediaType = 'image' | 'video' | 'audio' | 'other';
  type SpatialDrawingMode = 'polygon' | 'rectangle' | 'freehand';
  type ScreenshotFormat = 'image/png' | 'image/jpeg' | 'image/webp';

  interface AnnotationStyleOptions {
    color: string;
    strokeWidth: number;
    fillOpacity: number;
  }

  interface ChapterMarker {
    label: string;
    start: number;
    end: number;
    color: string;
  }

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
    // Controlled annotation mode
    annotationToolActive?: boolean;
    onAnnotationToolToggle?: (active: boolean) => void;
    annotationText?: string;
    annotationMotivation?: 'commenting' | 'tagging' | 'describing';
    onAnnotationDrawingStateChange?: (state: { pointCount: number; isDrawing: boolean; canSave: boolean }) => void;
    onAnnotationSaveRef?: (fn: () => void) => void;
    onAnnotationClearRef?: (fn: () => void) => void;
    // Controlled time range
    timeRange?: { start: number; end?: number } | null;
    onTimeRangeChange?: (range: { start: number; end?: number } | null) => void;
    currentPlaybackTime?: number;
    onPlaybackTimeChange?: (time: number) => void;
    onTimeAnnotationCreateRef?: (fn: (text: string, motivation: 'commenting' | 'tagging' | 'describing') => void) => void;
    onAnnotationSelected?: (annotationId: string | null) => void;
  }

  let {
    item,
    manifest,
    manifestItems,
    cx,
    fieldMode,
    t,
    isAdvanced: _isAdvanced,
    onUpdate,
    onPageChange,
    onSwitchView,
    onAddToBoard,
    // Controlled annotation props
    annotationToolActive,
    onAnnotationToolToggle,
    annotationText: annotationTextProp,
    annotationMotivation: annotationMotivationProp,
    onAnnotationDrawingStateChange,
    onAnnotationSaveRef,
    onAnnotationClearRef,
    // Controlled time range props
    timeRange: timeRangeProp,
    onTimeRangeChange: onTimeRangeChangeProp,
    currentPlaybackTime: currentPlaybackTimeProp,
    onPlaybackTimeChange,
    onTimeAnnotationCreateRef: _onTimeAnnotationCreateRef,
    onAnnotationSelected,
  }: Props = $props();

  // ============================================================================
  // Feature Stores (scoped instances)
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

  // UI panels
  let showWorkbench = $state(false);
  let showSearchPanel = $state(false);
  let showLayerPanel = $state(false);
  let showFilmstrip = $state(true);
  let showNavigator = $state(true);
  let showKeyboardHelp = $state(false);
  let isFullscreen = $state(false);
  let showFilterPanel = $state(false);

  // Annotation state -- controlled or internal
  let internalAnnotationToolActive = $state(false);
  let internalAnnotationText = $state('');
  let internalAnnotationMotivation = $state<'commenting' | 'tagging' | 'describing'>('commenting');

  // Annotation drawing
  let annotationDrawingMode = $state<SpatialDrawingMode>('polygon');
  let annotationStyle = $state<AnnotationStyleOptions>({
    color: '#22c55e',
    strokeWidth: 2,
    fillOpacity: 0.1,
  });

  // Time-based annotation state -- controlled or internal
  let internalTimeRange = $state<{ start: number; end?: number } | null>(null);
  let internalPlaybackTime = $state(0);

  // OSD state
  let zoomLevel = $state(100);
  let rotation = $state(0);
  let isFlipped = $state(false);
  let osdReady = $state(0);

  // OSD viewer instance -- stored outside $state per §7 (external lib)
  let osdViewer: any;
  let objectUrl: string | null = null;

  // Annotation undo/redo/clear/save function refs
  let annotationUndoFn: (() => void) | null = null;
  let annotationRedoFn: (() => void) | null = null;
  let annotationClearFn: (() => void) | null = null;
  let annotationSaveFn: (() => void) | null = null;

  // ============================================================================
  // Controlled vs Internal State Resolution
  // ============================================================================

  const isControlledAnnotation = $derived(annotationToolActive !== undefined);
  const showAnnotationTool = $derived(
    isControlledAnnotation ? annotationToolActive! : internalAnnotationToolActive
  );
  const annotationText = $derived(
    isControlledAnnotation ? (annotationTextProp ?? '') : internalAnnotationText
  );
  const annotationMotivation = $derived(
    isControlledAnnotation ? (annotationMotivationProp ?? 'commenting') : internalAnnotationMotivation
  );

  function setShowAnnotationTool(active: boolean): void {
    if (isControlledAnnotation) {
      onAnnotationToolToggle?.(active);
    } else {
      internalAnnotationToolActive = active;
    }
  }

  const isControlledTimeRange = $derived(timeRangeProp !== undefined);
  const timeRange = $derived(isControlledTimeRange ? timeRangeProp : internalTimeRange);
  const currentPlaybackTime = $derived(
    currentPlaybackTimeProp !== undefined ? currentPlaybackTimeProp : internalPlaybackTime
  );

  function setTimeRange(range: { start: number; end?: number } | null): void {
    if (isControlledTimeRange) {
      onTimeRangeChangeProp?.(range);
    } else {
      internalTimeRange = range;
    }
  }

  function handlePlaybackTimeUpdate(time: number): void {
    if (onPlaybackTimeChange) {
      onPlaybackTimeChange(time);
    } else {
      internalPlaybackTime = time;
    }
  }

  // ============================================================================
  // Derived State
  // ============================================================================

  /** Detect media type from the painting body type hint */
  function detectMediaType(typeHint: string): MediaType {
    if (typeHint === 'Image') return 'image';
    if (typeHint === 'Video') return 'video';
    if (typeHint === 'Sound' || typeHint === 'Audio') return 'audio';
    if (typeHint.startsWith('video/')) return 'video';
    if (typeHint.startsWith('audio/')) return 'audio';
    if (typeHint.startsWith('image/')) return 'image';
    return 'other';
  }

  const paintingBody = $derived.by(() => {
    if (!item?.items?.[0]?.items?.[0]) return null;
    return item.items[0].items[0].body as any;
  });

  const mediaType = $derived.by((): MediaType => {
    if (!paintingBody) return 'other';
    const typeHint = paintingBody.type || paintingBody.format || '';
    return detectMediaType(typeHint);
  });

  /** Extract non-painting annotations from canvas.annotations */
  const annotations = $derived.by((): IIIFAnnotation[] => {
    if (!item?.annotations) return [];
    const result: IIIFAnnotation[] = [];
    for (const page of item.annotations) {
      if (page.items) {
        result.push(...page.items);
      }
    }
    return result;
  });

  /** Resolve the media URL from the painting body */
  const resolvedImageUrl = $derived.by((): string | null => {
    if (!item) return null;
    // Blob URL takes priority
    if (item._blobUrl) return item._blobUrl;
    // Direct body URL
    if (paintingBody?.id) return paintingBody.id;
    return null;
  });

  /** Extract IIIF Range structures as chapter markers */
  const CHAPTER_COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4'];

  const chapters = $derived.by((): ChapterMarker[] => {
    if (!manifest?.structures || !item?.id) return [];
    const markers: ChapterMarker[] = [];

    const extractFromRange = (range: IIIFRange, colorIdx: number) => {
      for (const ref of range.items) {
        const refId = (ref as IIIFRangeReference).id || '';
        if (!refId.includes(item!.id)) continue;
        const hashIdx = refId.indexOf('#t=');
        if (hashIdx === -1) continue;
        const fragment = refId.substring(hashIdx + 3);
        const parts = fragment.split(',');
        const start = parseFloat(parts[0]);
        const end = parts.length > 1 ? parseFloat(parts[1]) : start;
        if (isNaN(start)) continue;
        markers.push({
          label: getIIIFValue(range.label) || `Chapter ${markers.length + 1}`,
          start,
          end: isNaN(end) ? start : end,
          color: CHAPTER_COLORS[colorIdx % CHAPTER_COLORS.length],
        });
      }
    };

    manifest.structures.forEach((range, idx) => extractFromRange(range, idx));
    return markers.sort((a, b) => a.start - b.start);
  });

  /** Canvas label for toolbar and aria */
  const label = $derived(item ? getIIIFValue(item.label) : '');

  /** Current index in manifest items */
  const currentIndex = $derived(
    manifestItems ? manifestItems.findIndex(c => c.id === item?.id) : -1
  );
  const totalItems = $derived(manifestItems?.length ?? 1);

  /** Whether the toolbar has search service */
  const hasSearchService = $derived.by((): boolean => {
    if (!manifest?.service) return false;
    const services = Array.isArray(manifest.service) ? manifest.service : [manifest.service];
    return services.some((svc: any) => {
      if (!svc) return false;
      return svc.type === 'SearchService2' ||
        (Array.isArray(svc.profile) ? svc.profile.some((p: string) => p.includes('search')) : svc.profile?.includes('search'));
    });
  });

  const canDownload = $derived(!!resolvedImageUrl && mediaType === 'image');

  /** Filter annotations by visible layers when layers exist */
  const effectiveAnnotations = $derived.by((): IIIFAnnotation[] => {
    if (layers.layers.length > 0) {
      const visibleIds = new Set(layers.visibleLayerIds);
      // Filter annotations that belong to a visible layer (annotation page)
      return annotations.filter(anno => {
        // If we can't determine the layer, include it
        return true;
      });
    }
    return annotations;
  });

  /** Second canvas for comparison mode */
  const secondComparisonCanvas = $derived.by((): IIIFCanvas | null => {
    if (!comparison.isActive || !comparison.leftCanvasId) return null;
    return manifestItems?.find(c => c.id === comparison.rightCanvasId) ?? null;
  });

  const hasMultipleCanvases = $derived(!!manifestItems && manifestItems.length > 1);

  // ============================================================================
  // OSD Lifecycle (per §7 External Libraries)
  // ============================================================================

  onMount(() => {
    return () => {
      // Cleanup OSD on unmount
      if (osdViewer) {
        try {
          osdViewer.removeAllHandlers();
          osdViewer.destroy();
        } catch {
          // Ignore cleanup errors
        }
        osdViewer = undefined;
      }
      // Cleanup object URL
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
      // Cleanup measurement
      measurement.reset();
      // Cleanup comparison
      comparison.reset();
      // Detach media player
      player.detach();
    };
  });

  /** Initialize or reinitialize OSD when item/media type changes */
  $effect(() => {
    // Track dependencies
    const currentItem = item;
    const currentMediaType = mediaType;
    const currentUrl = resolvedImageUrl;

    if (!currentItem || currentMediaType !== 'image' || !currentUrl || !osdContainerRef) {
      // Destroy existing OSD if media type changed away from image
      if (osdViewer) {
        try {
          osdViewer.removeAllHandlers();
          osdViewer.destroy();
        } catch {
          // Ignore
        }
        osdViewer = undefined;
      }
      return;
    }

    // Check for OpenSeadragon global
    if (typeof (globalThis as any).OpenSeadragon === 'undefined') {
      console.error('[ViewerView] OpenSeadragon is not loaded');
      return;
    }

    const OSD = (globalThis as any).OpenSeadragon;

    // Destroy existing viewer before creating new one
    if (osdViewer) {
      try {
        osdViewer.removeAllHandlers();
        osdViewer.destroy();
      } catch {
        // Ignore
      }
      osdViewer = undefined;
    }

    // Use $state.snapshot() when passing data to external lib per §7.A
    const tileSource = { type: 'image', url: $state.snapshot(currentUrl) };

    // Ensure container has dimensions
    const rect = osdContainerRef.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      // Set up a ResizeObserver to retry when container gets dimensions
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            observer.disconnect();
            initializeOsd(OSD, osdContainerRef!, tileSource);
          }
        }
      });
      observer.observe(osdContainerRef);
      return () => { observer.disconnect(); };
    }

    initializeOsd(OSD, osdContainerRef, tileSource);

    return () => {
      // Cleanup handled by onMount return or next $effect run
    };
  });

  function initializeOsd(OSD: any, container: HTMLDivElement, tileSource: any): void {
    try {
      osdViewer = OSD({
        element: container,
        prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
        tileSources: tileSource,
        gestureSettingsMouse: {
          clickToZoom: false,
          dblClickToZoom: true,
          pinchToZoom: true,
          flickEnabled: true,
        },
        gestureSettingsTouch: {
          pinchToZoom: true,
          flickEnabled: true,
        },
        showNavigationControl: false,
        showNavigator: true,
        navigatorPosition: 'BOTTOM_RIGHT',
        navigatorSizeRatio: 0.15,
        navigatorAutoFade: true,
        navigatorRotate: true,
        blendTime: 0.1,
        immediateRender: true,
        imageLoaderLimit: 4,
        maxImageCacheCount: 100,
        minZoomLevel: 0.1,
        maxZoomLevel: 20,
        visibilityRatio: 0.5,
        constrainDuringPan: true,
        animationTime: 0.5,
        springStiffness: 10,
        degrees: 0,
        debugMode: false,
        crossOriginPolicy: 'Anonymous',
      });

      osdReady = osdReady + 1;

      // Track zoom level changes
      osdViewer.addHandler('zoom', () => {
        if (osdViewer) {
          const z = osdViewer.viewport.getZoom();
          zoomLevel = Math.round(z * 100);
        }
      });

      // Retry on open-failed
      let retryCount = 0;
      osdViewer.addHandler('open-failed', async () => {
        if (retryCount >= 2 || !osdViewer) return;
        retryCount++;
        await new Promise(r => setTimeout(r, 300 * retryCount));
        if (osdViewer) {
          osdViewer.open(tileSource);
        }
      });
    } catch (e) {
      console.error('[ViewerView] Error initializing OSD:', e);
    }
  }

  /** Attach media player when audio/video element appears */
  $effect(() => {
    if (videoRef && (mediaType === 'video' || mediaType === 'audio')) {
      player.attach(videoRef as HTMLVideoElement);
    }
  });

  /** Initialize annotation layers when item annotations change */
  $effect(() => {
    if (item?.annotations && item.annotations.length > 0) {
      const pages = item.annotations.map((page: IIIFAnnotationPage) => ({
        id: page.id,
        label: getIIIFValue(page.label) || '',
      }));
      layers.setLayers(pages);
    } else {
      layers.reset();
    }
  });

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /** OSD viewport zoom in */
  function handleZoomIn(): void {
    osdViewer?.viewport?.zoomBy(1.2);
  }

  /** OSD viewport zoom out */
  function handleZoomOut(): void {
    osdViewer?.viewport?.zoomBy(0.8);
  }

  /** Reset OSD viewport to home */
  function handleResetView(): void {
    if (!osdViewer) return;
    osdViewer.viewport.goHome();
    osdViewer.viewport.setRotation(0);
    osdViewer.viewport.setFlip(false);
    rotation = 0;
    isFlipped = false;
    zoomLevel = 100;
  }

  /** Rotate clockwise */
  function handleRotateCW(): void {
    const newRotation = (rotation + 90) % 360;
    if (osdViewer) {
      osdViewer.viewport.setRotation(newRotation);
    }
    rotation = newRotation;
  }

  /** Rotate counter-clockwise */
  function handleRotateCCW(): void {
    const newRotation = (rotation - 90 + 360) % 360;
    if (osdViewer) {
      osdViewer.viewport.setRotation(newRotation);
    }
    rotation = newRotation;
  }

  /** Flip horizontally */
  function handleFlipHorizontal(): void {
    if (osdViewer) {
      const current = osdViewer.viewport.getFlip();
      osdViewer.viewport.setFlip(!current);
      isFlipped = !current;
    } else {
      isFlipped = !isFlipped;
    }
  }

  /** Toggle fullscreen */
  function handleToggleFullscreen(): void {
    if (!containerRef) return;
    if (!document.fullscreenElement) {
      containerRef.requestFullscreen().then(() => { isFullscreen = true; });
    } else {
      document.exitFullscreen().then(() => { isFullscreen = false; });
    }
  }

  /** Toggle navigator overlay */
  function handleToggleNavigator(): void {
    if (osdViewer?.navigator) {
      showNavigator = !showNavigator;
      osdViewer.navigator.element.style.display = showNavigator ? 'block' : 'none';
    } else {
      showNavigator = !showNavigator;
    }
  }

  /** Screenshot: capture OSD canvas to blob, then download or copy to clipboard */
  async function handleScreenshot(
    format: ScreenshotFormat = 'image/png',
    action: 'download' | 'clipboard' = 'download'
  ): Promise<void> {
    if (!osdViewer?.drawer?.canvas) return;

    const canvas = osdViewer.drawer.canvas as HTMLCanvasElement;
    const quality = format === 'image/jpeg' ? 0.92 : format === 'image/webp' ? 0.9 : undefined;

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), format, quality);
    });

    if (!blob) return;

    if (action === 'clipboard') {
      try {
        // Clipboard API requires PNG; convert if needed
        let clipBlob = blob;
        if (format !== 'image/png') {
          clipBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), 'image/png');
          }) || blob;
        }
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': clipBlob })]);
        return;
      } catch {
        // Fallback to download
      }
    }

    // Download
    const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screenshot-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Create annotation and persist to vault */
  function handleCreateAnnotation(annotation: IIIFAnnotation): void {
    if (!item?.id) {
      console.warn('[ViewerView] Cannot create annotation: no canvas selected');
      return;
    }

    // Add annotation via vault store
    vault.add(annotation as any, item.id);

    // Persist to storage asynchronously
    const updatedRoot = vault.export();
    if (updatedRoot) {
      // @migration: storage.saveProject not yet wired
      // storage.saveProject(updatedRoot);
    }
  }

  /** Handle spatial annotation on video -- combine SVG region + time fragment */
  function handleSpatialAnnotation(region: { x: number; y: number; w: number; h: number }): void {
    if (!item?.id) return;

    const canvasW = item.width || 1920;
    const canvasH = item.height || 1080;
    const x = Math.round(region.x * canvasW);
    const y = Math.round(region.y * canvasH);
    const w = Math.round(region.w * canvasW);
    const h = Math.round(region.h * canvasH);
    const svgValue = `<svg xmlns="http://www.w3.org/2000/svg"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></svg>`;

    const svgSelector: Selector = { type: 'SvgSelector', value: svgValue };
    let targetSelector: IIIFAnnotation['target'];

    if (timeRange) {
      const tFrag = timeRange.end != null
        ? `t=${timeRange.start},${timeRange.end}`
        : `t=${timeRange.start}`;
      const fragSelector: Selector = {
        type: 'FragmentSelector',
        value: tFrag,
        conformsTo: 'http://www.w3.org/TR/media-frags/',
      };
      targetSelector = {
        type: 'SpecificResource' as const,
        source: item.id,
        selector: [svgSelector, fragSelector],
      };
    } else {
      targetSelector = {
        type: 'SpecificResource' as const,
        source: item.id,
        selector: svgSelector,
      };
    }

    const annotation: IIIFAnnotation = {
      id: `anno-spatial-${Date.now()}`,
      type: 'Annotation',
      motivation: 'commenting',
      body: { type: 'TextualBody', value: '', format: 'text/plain' } as any,
      target: targetSelector,
    };

    handleCreateAnnotation(annotation);
  }

  /** Forward annotation selection as ID to parent */
  function handleAnnotationSelected(annotation: IIIFAnnotation | null): void {
    onAnnotationSelected?.(annotation?.id ?? null);
  }

  /** Add current canvas to Board */
  function handleAddToBoard(): void {
    if (item && onAddToBoard) {
      onAddToBoard(item.id);
    }
  }

  /** Toggle comparison mode with next canvas */
  function handleToggleComparison(): void {
    if (comparison.isActive) {
      comparison.reset();
    } else if (manifestItems && manifestItems.length > 1 && item) {
      const currentIdx = manifestItems.findIndex(c => c.id === item.id);
      const nextIdx = (currentIdx + 1) % manifestItems.length;
      comparison.setCanvases(item.id, manifestItems[nextIdx].id);
      comparison.setMode('side-by-side');
    }
  }

  /** Copy IIIF Content State link to clipboard */
  function handleShareLink(): void {
    if (!item?.id || !manifest?.id) return;
    // @migration: contentStateService not yet wired
    // contentStateService.copyLink({ manifestId: manifest.id, canvasId: item.id });
  }

  /** Keyboard shortcuts for image viewer */
  function handleKeyDown(e: KeyboardEvent): void {
    // Don't handle when typing in inputs
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return;
    }

    if (mediaType === 'image') {
      handleImageKeyDown(e);
    } else if (mediaType === 'audio' || mediaType === 'video') {
      player.handleKeyboard(e);
    }
  }

  /** Image-specific keyboard shortcuts */
  function handleImageKeyDown(e: KeyboardEvent): void {
    const key = e.key;
    switch (key) {
      case 'r':
        e.preventDefault();
        if (e.shiftKey) handleRotateCCW();
        else handleRotateCW();
        break;
      case 'R':
        e.preventDefault();
        handleRotateCCW();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        handleFlipHorizontal();
        break;
      case 'n':
      case 'N':
        e.preventDefault();
        handleToggleNavigator();
        break;
      case '?':
        e.preventDefault();
        showKeyboardHelp = !showKeyboardHelp;
        break;
      case '+':
      case '=':
        e.preventDefault();
        handleZoomIn();
        break;
      case '-':
      case '_':
        e.preventDefault();
        handleZoomOut();
        break;
      case '0':
        e.preventDefault();
        handleResetView();
        break;
      case 'a':
      case 'A':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          setShowAnnotationTool(!showAnnotationTool);
        }
        break;
      case 'm':
      case 'M':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          if (measurement.active) measurement.deactivate();
          else measurement.activate();
        }
        break;
      case 'Escape':
        if (isFullscreen) {
          document.exitFullscreen();
        }
        break;
    }
  }

  /** Handle window resize for OSD viewer */
  function handleWindowResize(): void {
    if (!osdViewer?.viewport || !osdViewer?.element) return;
    const el = osdViewer.element;
    if (!el.offsetWidth || !el.offsetHeight) return;
    try {
      osdViewer.viewport.resize();
    } catch {
      // Silently ignore
    }
  }

  // Listen for window resize
  $effect(() => {
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  });

  // Listen for fullscreen changes from browser
  $effect(() => {
    function onFullscreenChange() {
      isFullscreen = !!document.fullscreenElement;
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  });
</script>

<!-- ======================================================================== -->
<!-- TEMPLATE                                                                  -->
<!-- ======================================================================== -->

{#if !item}
  <!-- Empty state when no canvas selected -->
  <div
    class={cn(
      'flex-1 flex flex-col items-center justify-center gap-4',
      fieldMode ? 'bg-nb-black text-nb-yellow' : 'bg-nb-cream text-nb-black'
    )}
    role="region"
    aria-label="Viewer"
  >
    <div class="text-center">
      <div class="text-4xl mb-2" aria-hidden="true">&#128444;</div>
      <p class="font-mono text-sm uppercase tracking-wider opacity-60">
        {t('Select a canvas to view')}
      </p>
    </div>
  </div>
{:else}
  <div
    bind:this={containerRef}
    class={cn(
      'flex-1 flex flex-col overflow-hidden relative',
      fieldMode ? 'bg-nb-black' : 'bg-nb-cream'
    )}
    tabindex={0}
    onkeydown={handleKeyDown}
    role="region"
    aria-label={label || 'Canvas viewer'}
  >
    <!-- ================================================================== -->
    <!-- Toolbar                                                             -->
    <!-- @migration: ViewerToolbar not yet migrated, using inline placeholder -->
    <!-- ================================================================== -->
    <div
      class={cn(
        'flex items-center gap-2 px-3 h-12 border-b-4 shrink-0 font-mono text-xs uppercase tracking-wider',
        cx.headerBg,
        cx.text
      )}
      role="toolbar"
      aria-label="Viewer tools"
    >
      <!-- Label -->
      <span class="truncate font-bold mr-2" title={label}>
        {label || t('Canvas')}
      </span>

      <!-- Zoom controls -->
      {#if mediaType === 'image'}
        <button
          class={cn('p-1 rounded', cx.iconButton)}
          onclick={handleZoomOut}
          title={t('Zoom out') + ' (-)'}
          aria-label="Zoom out"
        >&#8722;</button>
        <span class="text-xs tabular-nums min-w-[3rem] text-center" aria-live="polite">
          {zoomLevel}%
        </span>
        <button
          class={cn('p-1 rounded', cx.iconButton)}
          onclick={handleZoomIn}
          title={t('Zoom in') + ' (+)'}
          aria-label="Zoom in"
        >&#43;</button>

        <span class={cn('w-px h-5 mx-1', cx.separator)} aria-hidden="true"></span>

        <!-- Rotate / Flip -->
        <button
          class={cn('p-1 rounded', cx.iconButton)}
          onclick={handleRotateCW}
          title={t('Rotate clockwise') + ' (R)'}
          aria-label="Rotate clockwise"
        >&#8635;</button>
        <button
          class={cn('p-1 rounded', cx.iconButton)}
          onclick={handleFlipHorizontal}
          title={t('Flip horizontal') + ' (F)'}
          aria-label="Flip horizontal"
        >&#8596;</button>

        <span class={cn('w-px h-5 mx-1', cx.separator)} aria-hidden="true"></span>

        <!-- Annotation tool toggle -->
        <button
          class={cn(
            'p-1 rounded',
            showAnnotationTool ? cx.active : cx.iconButton
          )}
          onclick={() => setShowAnnotationTool(!showAnnotationTool)}
          title={t('Annotation tool') + ' (A)'}
          aria-label="Toggle annotation tool"
          aria-pressed={showAnnotationTool}
        >&#9998;</button>

        <!-- Measurement toggle -->
        <button
          class={cn(
            'p-1 rounded',
            measurement.active ? cx.active : cx.iconButton
          )}
          onclick={() => measurement.active ? measurement.deactivate() : measurement.activate()}
          title={t('Measurement tool') + ' (M)'}
          aria-label="Toggle measurement tool"
          aria-pressed={measurement.active}
        >&#128207;</button>

        <!-- Image filters toggle -->
        <button
          class={cn(
            'p-1 rounded',
            showFilterPanel ? cx.active : cx.iconButton
          )}
          onclick={() => showFilterPanel = !showFilterPanel}
          title={t('Image filters')}
          aria-label="Toggle image filters"
          aria-pressed={showFilterPanel}
        >&#9788;</button>

        <!-- Comparison toggle -->
        {#if hasMultipleCanvases}
          <button
            class={cn(
              'p-1 rounded',
              comparison.isActive ? cx.active : cx.iconButton
            )}
            onclick={handleToggleComparison}
            title={t('Compare canvases')}
            aria-label="Toggle comparison mode"
            aria-pressed={comparison.isActive}
          >&#9881;</button>
        {/if}

        <!-- Layers toggle -->
        {#if layers.layers.length > 0}
          <button
            class={cn(
              'p-1 rounded',
              showLayerPanel ? cx.active : cx.iconButton
            )}
            onclick={() => showLayerPanel = !showLayerPanel}
            title={t('Annotation layers') + ` (${layers.layers.length})`}
            aria-label="Toggle annotation layers"
            aria-pressed={showLayerPanel}
          >&#9776;</button>
        {/if}
      {/if}

      <!-- Spacer -->
      <div class="flex-1"></div>

      <!-- Right actions -->
      {#if mediaType === 'image'}
        <button
          class={cn('p-1 rounded', cx.iconButton)}
          onclick={() => handleScreenshot('image/png', 'download')}
          title={t('Screenshot')}
          aria-label="Take screenshot"
        >&#128247;</button>
      {/if}

      {#if manifest}
        <button
          class={cn('p-1 rounded', cx.iconButton)}
          onclick={handleShareLink}
          title={t('Share link')}
          aria-label="Copy share link"
        >&#128279;</button>
      {/if}

      <button
        class={cn('p-1 rounded', cx.iconButton)}
        onclick={() => showKeyboardHelp = !showKeyboardHelp}
        title={t('Keyboard shortcuts') + ' (?)'}
        aria-label="Show keyboard shortcuts"
      >&#9000;</button>

      <button
        class={cn('p-1 rounded', cx.iconButton)}
        onclick={handleToggleFullscreen}
        title={t('Fullscreen')}
        aria-label="Toggle fullscreen"
      >{isFullscreen ? '&#10006;' : '&#9974;'}</button>

      <button
        class={cn('p-1 rounded', cx.iconButton)}
        onclick={() => showFilmstrip = !showFilmstrip}
        title={t('Toggle filmstrip')}
        aria-label="Toggle filmstrip navigator"
        aria-pressed={showFilmstrip}
      >&#9783;</button>
    </div>

    <!-- ================================================================== -->
    <!-- Content Area                                                        -->
    <!-- ================================================================== -->
    <div class="flex-1 flex min-h-0 relative">
      <!-- Image viewer: OSD container -->
      {#if mediaType === 'image'}
        <div
          bind:this={osdContainerRef}
          class="absolute inset-0"
          style={filters.cssFilter !== 'none' ? `filter: ${filters.cssFilter}` : undefined}
          role="img"
          aria-label={label || 'Canvas viewer'}
        ></div>

        <!-- @migration: AnnotationDrawingOverlay not yet migrated -->
        <!-- Placeholder: annotation drawing overlay would render here when showAnnotationTool is true -->

        <!-- @migration: MeasurementOverlay not yet migrated -->
        {#if measurement.active}
          <div
            class="absolute inset-0 pointer-events-auto z-10"
            aria-label="Measurement overlay"
          >
            <!-- MeasurementOverlay placeholder -->
            <div class={cn(
              'absolute top-2 right-2 px-2 py-1 rounded text-xs font-mono',
              fieldMode ? 'bg-nb-yellow text-nb-black' : 'bg-nb-black text-nb-white'
            )}>
              Measurement: {measurement.isDrawing ? 'Drawing...' : `${measurement.measurements.length} measurements`}
            </div>
          </div>
        {/if}

      <!-- Audio viewer -->
      {:else if mediaType === 'audio'}
        <div class="flex-1 flex items-center justify-center p-4">
          {#if resolvedImageUrl}
            <!-- @migration: AudioWaveform not yet migrated, using native audio -->
            <div class="w-full max-w-2xl">
              <audio
                bind:this={videoRef}
                src={resolvedImageUrl}
                class="w-full"
                controls
                preload="metadata"
              >
                <track kind="captions" />
              </audio>

              <!-- Chapter markers -->
              {#if chapters.length > 0}
                <div class={cn('mt-3 space-y-1', cx.text)}>
                  <p class="text-xs font-mono uppercase tracking-wider opacity-60">
                    {t('Chapters')}
                  </p>
                  {#each chapters as chapter}
                    <button
                      class={cn(
                        'block w-full text-left px-2 py-1 rounded text-sm font-mono hover:opacity-80',
                        cx.iconButton
                      )}
                      onclick={() => player.seek(chapter.start)}
                    >
                      <span
                        class="inline-block w-2 h-2 rounded-full mr-2"
                        style:background-color={chapter.color}
                      ></span>
                      {chapter.label}
                      <span class="opacity-50 ml-2">
                        {player.formatTime(chapter.start)}
                        {#if chapter.end !== chapter.start}
                          - {player.formatTime(chapter.end)}
                        {/if}
                      </span>
                    </button>
                  {/each}
                </div>
              {/if}

              <!-- Playback info -->
              <div class={cn('mt-2 text-xs font-mono text-center', cx.textMuted)}>
                {player.formatTime()} / {player.formatTime(player.duration)}
              </div>
            </div>
          {:else}
            <p class={cn('text-sm font-mono', cx.textMuted)}>
              {t('No audio source available')}
            </p>
          {/if}
        </div>

      <!-- Video viewer -->
      {:else if mediaType === 'video'}
        <div class="flex-1 flex items-center justify-center bg-black">
          {#if resolvedImageUrl}
            <video
              bind:this={videoRef}
              src={resolvedImageUrl}
              class="w-full h-full object-contain"
              controls
              preload="metadata"
            >
              <track kind="captions" />
            </video>
          {:else}
            <p class="text-sm font-mono text-white/50">
              {t('No video source available')}
            </p>
          {/if}
        </div>

      <!-- Unknown media type -->
      {:else}
        <div class={cn(
          'flex-1 flex items-center justify-center',
          cx.text
        )}>
          <div class="text-center">
            <p class="text-sm font-mono opacity-60">
              {t('Unsupported media type')}
            </p>
          </div>
        </div>
      {/if}

      <!-- ================================================================ -->
      <!-- Overlay Panels                                                    -->
      <!-- ================================================================ -->

      <!-- Image filter panel (side overlay) -->
      {#if mediaType === 'image' && showFilterPanel}
        <!-- @migration: ImageFilterPanel not yet migrated, using inline placeholder -->
        <div
          class={cn(
            'absolute top-0 right-0 w-64 h-full border-l-4 p-3 z-20 overflow-y-auto',
            fieldMode ? 'bg-nb-black border-nb-yellow' : 'bg-nb-white border-nb-black'
          )}
          role="region"
          aria-label="Image filters"
        >
          <div class="flex items-center justify-between mb-3">
            <h3 class={cn('font-mono text-xs uppercase tracking-wider font-bold', cx.text)}>
              {t('Filters')}
            </h3>
            <button
              class={cn('p-1 rounded', cx.iconButton)}
              onclick={() => showFilterPanel = false}
              aria-label="Close filters"
            >&#10005;</button>
          </div>

          <!-- Brightness -->
          <label class={cn('block mb-2', cx.text)}>
            <span class="text-xs font-mono uppercase tracking-wider">{t('Brightness')}</span>
            <input
              type="range"
              min="0"
              max="200"
              value={filters.brightness}
              oninput={(e) => filters.setBrightness(parseInt((e.target as HTMLInputElement).value))}
              class="w-full mt-1"
            />
          </label>

          <!-- Contrast -->
          <label class={cn('block mb-2', cx.text)}>
            <span class="text-xs font-mono uppercase tracking-wider">{t('Contrast')}</span>
            <input
              type="range"
              min="0"
              max="200"
              value={filters.contrast}
              oninput={(e) => filters.setContrast(parseInt((e.target as HTMLInputElement).value))}
              class="w-full mt-1"
            />
          </label>

          <!-- Saturation -->
          <label class={cn('block mb-2', cx.text)}>
            <span class="text-xs font-mono uppercase tracking-wider">{t('Saturation')}</span>
            <input
              type="range"
              min="0"
              max="200"
              value={filters.saturation}
              oninput={(e) => filters.setSaturation(parseInt((e.target as HTMLInputElement).value))}
              class="w-full mt-1"
            />
          </label>

          <!-- Invert / Grayscale toggles -->
          <div class="flex gap-2 mt-2">
            <button
              class={cn(
                'flex-1 px-2 py-1 rounded text-xs font-mono uppercase border-2',
                filters.invert ? cx.active : cx.iconButton,
                fieldMode ? 'border-nb-yellow' : 'border-nb-black'
              )}
              onclick={() => filters.toggleInvert()}
            >
              {t('Invert')}
            </button>
            <button
              class={cn(
                'flex-1 px-2 py-1 rounded text-xs font-mono uppercase border-2',
                filters.grayscale ? cx.active : cx.iconButton,
                fieldMode ? 'border-nb-yellow' : 'border-nb-black'
              )}
              onclick={() => filters.toggleGrayscale()}
            >
              {t('Grayscale')}
            </button>
          </div>

          <!-- Reset -->
          {#if !filters.isDefault}
            <button
              class={cn(
                'w-full mt-3 px-2 py-1 rounded text-xs font-mono uppercase border-2',
                cx.iconButton,
                fieldMode ? 'border-nb-yellow' : 'border-nb-black'
              )}
              onclick={() => filters.reset()}
            >
              {t('Reset filters')}
            </button>
          {/if}
        </div>
      {/if}

      <!-- Comparison viewer overlay -->
      {#if mediaType === 'image' && comparison.isActive && secondComparisonCanvas}
        <!-- @migration: ComparisonViewer not yet migrated, using placeholder -->
        <div
          class={cn(
            'absolute inset-0 z-15',
            fieldMode ? 'bg-nb-black/80' : 'bg-nb-cream/80'
          )}
          role="region"
          aria-label="Comparison viewer"
        >
          <div class={cn('absolute top-2 left-2 px-2 py-1 rounded text-xs font-mono', cx.active)}>
            {t('Comparing')}: {getIIIFValue(secondComparisonCanvas.label)}
            <button
              class="ml-2 underline"
              onclick={() => comparison.reset()}
            >{t('Close')}</button>
          </div>
        </div>
      {/if}

      <!-- Annotation layer panel -->
      {#if layers.layers.length > 0 && showLayerPanel}
        <!-- @migration: AnnotationLayerPanel not yet migrated, using placeholder -->
        <div
          class={cn(
            'absolute top-0 left-0 w-56 h-full border-r-4 p-3 z-20 overflow-y-auto',
            fieldMode ? 'bg-nb-black border-nb-yellow' : 'bg-nb-white border-nb-black'
          )}
          role="region"
          aria-label="Annotation layers"
        >
          <div class="flex items-center justify-between mb-3">
            <h3 class={cn('font-mono text-xs uppercase tracking-wider font-bold', cx.text)}>
              {t('Layers')}
            </h3>
            <div class="flex gap-1">
              <button
                class={cn('p-1 rounded text-xs', cx.iconButton)}
                onclick={() => layers.toggleAll()}
                title={t('Toggle all')}
              >&#128065;</button>
              <button
                class={cn('p-1 rounded', cx.iconButton)}
                onclick={() => showLayerPanel = false}
                aria-label="Close layers panel"
              >&#10005;</button>
            </div>
          </div>

          {#each layers.layers as layer}
            <div class="flex items-center gap-2 mb-1">
              <button
                class={cn('p-0.5 rounded', cx.iconButton)}
                onclick={() => layers.toggleVisibility(layer.id)}
                title={layer.visible ? t('Hide layer') : t('Show layer')}
                aria-label={`${layer.visible ? 'Hide' : 'Show'} ${layer.label}`}
              >
                {layer.visible ? '&#128065;' : '&#128064;'}
              </button>
              <span
                class="w-3 h-3 rounded-full border shrink-0"
                style:background-color={layer.color}
                style:opacity={layer.opacity}
              ></span>
              <span class={cn('text-xs font-mono truncate', cx.text)}>
                {layer.label}
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- ================================================================== -->
    <!-- Filmstrip Navigator (footer)                                        -->
    <!-- @migration: FilmstripNavigator not yet migrated, using placeholder  -->
    <!-- ================================================================== -->
    {#if showFilmstrip}
      <div
        class={cn(
          'shrink-0 flex items-center justify-between px-3 h-8 border-t-2 font-mono text-xs',
          cx.headerBg,
          cx.text
        )}
        role="navigation"
        aria-label="Canvas navigation"
      >
        <span class="uppercase tracking-wider opacity-60">
          {t('Canvas')}
        </span>

        <div class="flex items-center gap-2">
          {#if currentIndex >= 0}
            <button
              class={cn('p-0.5 rounded', cx.iconButton)}
              onclick={() => onPageChange?.(currentIndex)}
              disabled={currentIndex <= 0}
              aria-label="Previous canvas"
            >&#9664;</button>

            <span class="tabular-nums">
              {currentIndex + 1} / {totalItems}
            </span>

            <button
              class={cn('p-0.5 rounded', cx.iconButton)}
              onclick={() => onPageChange?.(currentIndex + 2)}
              disabled={currentIndex >= totalItems - 1}
              aria-label="Next canvas"
            >&#9654;</button>
          {:else}
            <span class="tabular-nums opacity-50">1 / {totalItems}</span>
          {/if}
        </div>

        <span class="text-xs opacity-50">
          {resolvedImageUrl ? t('Loaded') : t('Loading...')}
        </span>
      </div>
    {/if}

    <!-- ================================================================== -->
    <!-- Modals                                                              -->
    <!-- ================================================================== -->

    <!-- Workbench modal -->
    {#if showWorkbench}
      <!-- @migration: ViewerWorkbench not yet migrated, using placeholder -->
      <div
        class="absolute inset-0 z-50 flex items-center justify-center bg-black/50"
        role="dialog"
        aria-label="Viewer workbench"
      >
        <div class={cn(
          'w-96 max-h-[80vh] rounded-lg border-4 p-4 overflow-y-auto',
          fieldMode ? 'bg-nb-black border-nb-yellow text-nb-yellow' : 'bg-nb-white border-nb-black text-nb-black'
        )}>
          <h2 class="font-mono text-sm uppercase tracking-wider font-bold mb-4">
            {t('Workbench')}
          </h2>
          <p class="text-xs font-mono opacity-60">
            {t('IIIF URL configuration panel')}
          </p>
          <button
            class={cn('mt-4 px-3 py-1 rounded border-2 text-xs font-mono uppercase', cx.iconButton)}
            onclick={() => showWorkbench = false}
          >
            {t('Close')}
          </button>
        </div>
      </div>
    {/if}

    <!-- Search panel -->
    {#if showSearchPanel}
      <!-- @migration: ViewerPanels not yet migrated, using placeholder -->
      <div
        class="absolute inset-0 z-50 flex items-center justify-center bg-black/50"
        role="dialog"
        aria-label="Search panel"
      >
        <div class={cn(
          'w-96 max-h-[80vh] rounded-lg border-4 p-4 overflow-y-auto',
          fieldMode ? 'bg-nb-black border-nb-yellow text-nb-yellow' : 'bg-nb-white border-nb-black text-nb-black'
        )}>
          <h2 class="font-mono text-sm uppercase tracking-wider font-bold mb-4">
            {t('Search')}
          </h2>
          <p class="text-xs font-mono opacity-60">
            {t('Content search panel')}
          </p>
          <button
            class={cn('mt-4 px-3 py-1 rounded border-2 text-xs font-mono uppercase', cx.iconButton)}
            onclick={() => showSearchPanel = false}
          >
            {t('Close')}
          </button>
        </div>
      </div>
    {/if}

    <!-- Keyboard shortcuts modal -->
    {#if showKeyboardHelp}
      <!-- @migration: KeyboardShortcutsModal not yet migrated, using placeholder -->
      <div
        class="absolute inset-0 z-50 flex items-center justify-center bg-black/50"
        role="dialog"
        aria-label="Keyboard shortcuts"
        aria-modal="true"
      >
        <div class={cn(
          'w-80 rounded-lg border-4 p-4',
          fieldMode ? 'bg-nb-black border-nb-yellow text-nb-yellow' : 'bg-nb-white border-nb-black text-nb-black'
        )}>
          <h2 class="font-mono text-sm uppercase tracking-wider font-bold mb-4">
            {t('Keyboard Shortcuts')}
          </h2>

          {#if mediaType === 'image'}
            <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs font-mono">
              <dt class={cn('font-bold px-1 rounded', cx.kbd)}>+/-</dt>
              <dd>{t('Zoom in/out')}</dd>
              <dt class={cn('font-bold px-1 rounded', cx.kbd)}>0</dt>
              <dd>{t('Reset view')}</dd>
              <dt class={cn('font-bold px-1 rounded', cx.kbd)}>R</dt>
              <dd>{t('Rotate CW (Shift+R CCW)')}</dd>
              <dt class={cn('font-bold px-1 rounded', cx.kbd)}>F</dt>
              <dd>{t('Flip horizontal')}</dd>
              <dt class={cn('font-bold px-1 rounded', cx.kbd)}>N</dt>
              <dd>{t('Toggle navigator')}</dd>
              <dt class={cn('font-bold px-1 rounded', cx.kbd)}>A</dt>
              <dd>{t('Toggle annotation tool')}</dd>
              <dt class={cn('font-bold px-1 rounded', cx.kbd)}>M</dt>
              <dd>{t('Toggle measurement')}</dd>
              <dt class={cn('font-bold px-1 rounded', cx.kbd)}>?</dt>
              <dd>{t('This help')}</dd>
              <dt class={cn('font-bold px-1 rounded', cx.kbd)}>Esc</dt>
              <dd>{t('Exit fullscreen')}</dd>
            </dl>
          {:else}
            <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs font-mono">
              <dt class={cn('font-bold px-1 rounded', cx.kbd)}>Space/K</dt>
              <dd>{t('Play/Pause')}</dd>
              <dt class={cn('font-bold px-1 rounded', cx.kbd)}>J/L</dt>
              <dd>{t('Seek -/+ 5s')}</dd>
              <dt class={cn('font-bold px-1 rounded', cx.kbd)}>&#8593;/&#8595;</dt>
              <dd>{t('Volume up/down')}</dd>
              <dt class={cn('font-bold px-1 rounded', cx.kbd)}>M</dt>
              <dd>{t('Toggle mute')}</dd>
              <dt class={cn('font-bold px-1 rounded', cx.kbd)}>0-9</dt>
              <dd>{t('Seek to %')}</dd>
              <dt class={cn('font-bold px-1 rounded', cx.kbd)}>&#60;/&#62;</dt>
              <dd>{t('Speed -/+')}</dd>
            </dl>
          {/if}

          <button
            class={cn(
              'mt-4 w-full px-3 py-1 rounded border-2 text-xs font-mono uppercase',
              cx.iconButton,
              fieldMode ? 'border-nb-yellow' : 'border-nb-black'
            )}
            onclick={() => showKeyboardHelp = false}
          >
            {t('Close')}
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}
