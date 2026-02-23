/**
 * Viewer Store -- Svelte 5 reactive class (Category 2 + Category 4)
 *
 * The CENTRAL viewer state management. Converts the React useViewer hook
 * into a Svelte 5 reactive class.
 *
 * SOURCE: React codebase src/features/viewer/model/index.ts
 *         (useViewer hook at line 224, ~750 lines)
 *
 * MIGRATION RULES APPLIED:
 * - Rule 2.B: $derived for computed values (hasChoice, choiceItems, hasSearchService, canDownload)
 * - Rule 2.C: $state() for UI toggles (small mutable state); $state.raw() NOT needed
 *   here because none of the state is large/deep data
 * - Cat 2: useState + useCallback -> class with $state fields + methods
 * - Cat 4: useEffect with async (OSD init, URL resolution) -> $effect in COMPONENT, not store
 *
 * CRITICAL ARCHITECTURE DECISION:
 * The React useViewer hook mixed three concerns:
 *   1. Viewer STATE (rotation, zoom, panel visibility, annotations)
 *   2. OSD LIFECYCLE (init, destroy, resize, retry logic)
 *   3. MEDIA RESOLUTION (URL resolution, blob URLs, IndexedDB fallback)
 *
 * In the Svelte migration, we SEPARATE these:
 *   - ViewerStore (this file): Concern 1 -- pure reactive state + actions
 *   - ViewerView.svelte component: Concern 2 -- OSD lifecycle via $effect
 *   - Component-level $effect: Concern 3 -- media resolution on canvas change
 *
 * DOM refs (viewerRef, osdContainerRef, containerRef) live in the component
 * via bind:this. OSD initialization runs in a $effect in ViewerView.svelte.
 * Object URL cleanup runs in the effect's return (teardown) function.
 *
 * USAGE IN SVELTE COMPONENT:
 *   <script>
 *     import { ViewerStore } from '../model/viewer.svelte.ts';
 *     const viewer = new ViewerStore();
 *     $effect(() => {
 *       viewer.load(currentCanvas, currentManifest);
 *       // ... resolve URL, init OSD, etc.
 *     });
 *   </script>
 *
 * EXTERNAL DEPENDENCIES (for final implementation):
 * - contentSearchService from @/src/entities/annotation/model (not yet migrated)
 * - resolveImageSource from @/src/entities/canvas/model (not yet migrated)
 * - getFile from @/src/shared/services/storage (already migrated)
 * - uiLog from @/src/shared/services/logger (already migrated as shared/lib/logger)
 */

import type {
  IIIFAnnotation,
  IIIFAnnotationBody,
  IIIFCanvas,
  IIIFExternalWebResource,
  IIIFManifest,
  IIIFTextualBody,
  IIIFChoice,
} from '@/src/shared/types';
import { getIIIFValue } from '@/src/shared/types';

// ============================================================================
// Types
// ============================================================================

/** Detected media type of the canvas content */
export type MediaType = 'image' | 'video' | 'audio' | 'other';

/** A single option within a Choice body (for multi-image canvases) */
export interface ChoiceItem {
  label: string;
  body: IIIFExternalWebResource | IIIFTextualBody;
}

/** Screenshot export format */
export type ScreenshotFormat = 'image/png' | 'image/jpeg' | 'image/webp';

// ============================================================================
// Helper Functions (pure, top-level)
// Rule 2.F: Static data / pure functions at module level
// ============================================================================

/**
 * Detect the media type from a IIIF type string or MIME type.
 *
 * Handles both IIIF resource types ("Image", "Video", "Sound")
 * and standard MIME types ("image/jpeg", "video/mp4", "audio/mpeg").
 *
 * @param mimeTypeOrType - IIIF type or MIME type string
 * @returns Detected MediaType
 */
export function detectMediaType(mimeTypeOrType: string): MediaType {
  // IIIF types
  if (mimeTypeOrType === 'Image') return 'image';
  if (mimeTypeOrType === 'Video') return 'video';
  if (mimeTypeOrType === 'Sound' || mimeTypeOrType === 'Audio') return 'audio';
  // MIME types
  if (mimeTypeOrType.startsWith('video/')) return 'video';
  if (mimeTypeOrType.startsWith('audio/')) return 'audio';
  if (mimeTypeOrType.startsWith('image/')) return 'image';
  return 'other';
}

/**
 * Extract non-painting annotations from a canvas's annotation pages.
 *
 * @param item - IIIF canvas (or null)
 * @returns Array of annotations from `canvas.annotations` pages
 */
export function extractAnnotations(item: IIIFCanvas | null): IIIFAnnotation[] {
  if (!item?.annotations) return [];

  const annotations: IIIFAnnotation[] = [];
  item.annotations.forEach(page => {
    if (page.items) {
      annotations.push(...page.items);
    }
  });
  return annotations;
}

/**
 * Type guard for IIIFChoice body.
 * Checks if an annotation body is a Choice (multiple alternatives).
 *
 * NOTE: The React codebase imports isChoice from @/src/shared/types.
 * It is not yet exported from the migrated types. Inline implementation here.
 */
function isChoice(body: IIIFAnnotationBody | IIIFAnnotationBody[]): body is IIIFChoice {
  if (Array.isArray(body)) return false;
  return (body as unknown as Record<string, unknown>).type === 'Choice';
}

// ============================================================================
// ViewerStore
// ============================================================================

/**
 * Central viewer state store.
 *
 * Manages all viewer UI state: media type, annotations, rotation, zoom,
 * panel visibility, choice selection, fullscreen, etc.
 *
 * DOES NOT MANAGE:
 * - OSD instance lifecycle (component $effect responsibility)
 * - DOM element refs (component bind:this responsibility)
 * - Media URL resolution (component $effect or separate service)
 * - Object URL cleanup (component $effect teardown)
 *
 * This separation means the store is testable without a DOM environment.
 */
export class ViewerStore {
  // ------------------------------------------------------------------
  // Reactive state ($state) -- UI toggles and viewer state
  // ------------------------------------------------------------------

  #mediaType = $state<MediaType>('other');
  // Rule 2.C: $state.raw for large domain data (annotations replaced wholesale, never mutated in-place)
  #annotations = $state.raw<IIIFAnnotation[]>([]);
  #resolvedImageUrl = $state<string | null>(null);
  #rotation = $state(0);
  #zoomLevel = $state(100);
  #isFlipped = $state(false);
  #showNavigator = $state(true);
  #isFullscreen = $state(false);
  #showTranscriptionPanel = $state(false);
  #showSearchPanel = $state(false);
  #showMetadataPanel = $state(false);
  #showWorkbench = $state(false);
  #showAnnotationTool = $state(false);
  #showFilmstrip = $state(true);
  #showKeyboardHelp = $state(false);
  #selectedAnnotationId = $state<string | null>(null);
  #isOcring = $state(false);
  #osdReady = $state(0);
  #activeChoiceIndex = $state(0);

  // ------------------------------------------------------------------
  // Canvas/manifest tracking (for derived computations)
  // ------------------------------------------------------------------

  #currentCanvasId = $state<string | null>(null);
  // Rule 2.C: $state.raw for large IIIF domain objects
  #currentCanvas = $state.raw<IIIFCanvas | null>(null);
  #currentManifest = $state.raw<IIIFManifest | null>(null);

  // ------------------------------------------------------------------
  // Derived state ($derived)
  // Rule 2.B: Computed values use $derived
  // ------------------------------------------------------------------

  /**
   * Detect Choice bodies on the painting annotation.
   * A Choice allows the viewer to switch between alternative images
   * (e.g., different wavelengths, enhanced vs. original).
   *
   * React version: useMemo based on [item?.id]
   * Svelte version: $derived.by based on #currentCanvas
   */
  readonly choiceData = $derived.by(() => {
    const canvas = this.#currentCanvas;
    if (!canvas?.items?.[0]?.items?.[0]) {
      return { hasChoice: false, choiceItems: [] as ChoiceItem[] };
    }

    const body = canvas.items[0].items[0].body as IIIFAnnotationBody;
    if (!body || !isChoice(body)) {
      return { hasChoice: false, choiceItems: [] as ChoiceItem[] };
    }

    const items: ChoiceItem[] = body.items.map((b) => ({
      label: getIIIFValue((b as { label?: Record<string, string[]> }).label) ||
        ('format' in b ? b.format : '') ||
        ('type' in b ? b.type : 'Option'),
      body: b,
    }));

    return { hasChoice: items.length > 0, choiceItems: items };
  });

  /** Whether the current canvas has a Choice body */
  readonly hasChoice = $derived(this.choiceData.hasChoice);

  /** Individual choice options (labels + bodies) */
  readonly choiceItems = $derived(this.choiceData.choiceItems);

  /**
   * Whether the manifest has a content search service.
   *
   * PSEUDO: In the final implementation, this should check
   * manifest.service for a SearchService using contentSearchService.
   * For now, returns false as a stub.
   *
   * React version: useMemo checking contentSearchService.extractSearchService
   */
  readonly hasSearchService = $derived.by(() => {
    // PSEUDO: contentSearchService not yet migrated
    // Final implementation:
    //   if (!this.#currentManifest?.service) return false;
    //   const services = Array.isArray(this.#currentManifest.service)
    //     ? this.#currentManifest.service : [this.#currentManifest.service];
    //   return services.some(svc => contentSearchService.extractSearchService(svc) !== null);
    return false;
  });

  /** Whether the current image can be downloaded */
  readonly canDownload = $derived(
    !!this.#resolvedImageUrl && this.#mediaType === 'image',
  );

  // ------------------------------------------------------------------
  // Read-only accessors
  // ------------------------------------------------------------------

  get mediaType(): MediaType { return this.#mediaType; }
  get annotations(): readonly IIIFAnnotation[] { return this.#annotations; }
  get resolvedImageUrl(): string | null { return this.#resolvedImageUrl; }
  get rotation(): number { return this.#rotation; }
  get zoomLevel(): number { return this.#zoomLevel; }
  get isFlipped(): boolean { return this.#isFlipped; }
  get showNavigator(): boolean { return this.#showNavigator; }
  get isFullscreen(): boolean { return this.#isFullscreen; }
  get showTranscriptionPanel(): boolean { return this.#showTranscriptionPanel; }
  get showSearchPanel(): boolean { return this.#showSearchPanel; }
  get showMetadataPanel(): boolean { return this.#showMetadataPanel; }
  get showWorkbench(): boolean { return this.#showWorkbench; }
  get showAnnotationTool(): boolean { return this.#showAnnotationTool; }
  get showFilmstrip(): boolean { return this.#showFilmstrip; }
  get showKeyboardHelp(): boolean { return this.#showKeyboardHelp; }
  get selectedAnnotationId(): string | null { return this.#selectedAnnotationId; }
  get isOcring(): boolean { return this.#isOcring; }
  get osdReady(): number { return this.#osdReady; }
  get activeChoiceIndex(): number { return this.#activeChoiceIndex; }
  get currentCanvasId(): string | null { return this.#currentCanvasId; }

  // ------------------------------------------------------------------
  // Load / Reset
  // ------------------------------------------------------------------

  /**
   * Load a new canvas into the viewer.
   *
   * Detects media type, extracts annotations, and resets choice index.
   * Does NOT resolve the image URL -- that is the component's responsibility
   * (via $effect using resolveImageSource or direct extraction).
   *
   * React version: Three separate useEffect hooks based on [item?.id]
   * Svelte version: Single method call from component $effect
   *
   * @param canvas   - IIIF canvas to display (null to clear)
   * @param manifest - Parent manifest (for search service detection)
   */
  load(canvas: IIIFCanvas | null, manifest: IIIFManifest | null): void {
    this.#currentCanvas = canvas;
    this.#currentManifest = manifest;
    this.#currentCanvasId = canvas?.id ?? null;

    // Reset choice index on canvas change
    this.#activeChoiceIndex = 0;

    if (!canvas) {
      this.#mediaType = 'other';
      this.#annotations = [];
      this.#resolvedImageUrl = null;
      return;
    }

    // Detect media type from painting body
    const paintingBody = canvas.items?.[0]?.items?.[0]?.body as unknown as
      | Record<string, unknown>
      | undefined;
    const typeHint = (paintingBody?.type as string) || (paintingBody?.format as string) || '';
    this.#mediaType = detectMediaType(typeHint);

    // Extract non-painting annotations
    this.#annotations = extractAnnotations(canvas);
  }

  /**
   * Set the resolved media URL.
   * Called by the component after URL resolution completes.
   *
   * The React version resolved URLs inside useEffect hooks.
   * In Svelte, the component runs URL resolution in $effect and
   * sets the result here.
   */
  setResolvedImageUrl(url: string | null): void {
    this.#resolvedImageUrl = url;
  }

  /**
   * Signal that OSD has initialized successfully.
   * Increments a counter that derived values can depend on.
   */
  signalOsdReady(): void {
    this.#osdReady = this.#osdReady + 1;
  }

  // ------------------------------------------------------------------
  // OSD Actions
  // NOTE: These methods update the STORE state only. The component
  // is responsible for calling the corresponding OSD viewport methods.
  // The component reads store state and syncs it to OSD.
  //
  // Alternative: Some actions (zoomIn, zoomOut, resetView) could call
  // OSD directly if the component passes a reference. That decision
  // is deferred to the ViewerView.svelte implementation.
  // ------------------------------------------------------------------

  /**
   * Zoom in by a factor.
   *
   * PSEUDO: In the component, the viewer should call:
   *   osdViewer.viewport.zoomBy(1.2)
   *   viewer.setZoomLevel(Math.round(osdViewer.viewport.getZoom() * 100))
   *
   * Or the store can hold an osdRef and call it directly.
   * Decision deferred to component implementation.
   */
  zoomIn(): void {
    // PSEUDO: Store-only version updates zoom level optimistically
    this.#zoomLevel = Math.round(this.#zoomLevel * 1.2);
  }

  /** Zoom out by a factor. */
  zoomOut(): void {
    // PSEUDO: Store-only version
    this.#zoomLevel = Math.round(this.#zoomLevel * 0.8);
  }

  /** Reset view to home position. */
  resetView(): void {
    this.#rotation = 0;
    this.#isFlipped = false;
    this.#zoomLevel = 100;
  }

  /** Rotate clockwise by 90 degrees. */
  rotateCW(): void {
    this.#rotation = (this.#rotation + 90) % 360;
  }

  /** Rotate counter-clockwise by 90 degrees. */
  rotateCCW(): void {
    this.#rotation = (this.#rotation - 90 + 360) % 360;
  }

  /** Set rotation to an arbitrary angle. */
  setRotation(degrees: number): void {
    this.#rotation = ((degrees % 360) + 360) % 360;
  }

  /** Toggle horizontal flip. */
  flipHorizontal(): void {
    this.#isFlipped = !this.#isFlipped;
  }

  /** Set zoom level directly (from OSD zoom event callback). */
  setZoomLevel(percent: number): void {
    this.#zoomLevel = percent;
  }

  /**
   * Take a screenshot of the current OSD canvas.
   *
   * PSEUDO: This requires access to the OSD viewer's drawer.canvas.
   * In the Svelte version, the component passes the canvas element:
   *   const blob = await viewer.takeScreenshot(osdViewer.drawer.canvas, format);
   *
   * The store provides the method signature; the component provides the DOM ref.
   *
   * @param canvasEl - The OSD drawer canvas element
   * @param format   - Image format (default: 'image/png')
   * @param quality  - JPEG/WebP quality (0-1)
   * @returns Blob of the screenshot, or null on failure
   */
  async takeScreenshot(
    canvasEl: HTMLCanvasElement | null,
    format: ScreenshotFormat = 'image/png',
    quality?: number,
  ): Promise<Blob | null> {
    if (!canvasEl) return null;

    try {
      return new Promise((resolve) => {
        canvasEl.toBlob((blob) => {
          resolve(blob);
        }, format, quality);
      });
    } catch {
      return null;
    }
  }

  // ------------------------------------------------------------------
  // Panel Toggles
  // ------------------------------------------------------------------

  toggleFullscreen(): void {
    this.#isFullscreen = !this.#isFullscreen;
    // NOTE: Actual fullscreen API calls happen in the component:
    //   if (!document.fullscreenElement) containerRef.requestFullscreen();
    //   else document.exitFullscreen();
  }

  toggleNavigator(): void {
    this.#showNavigator = !this.#showNavigator;
    // NOTE: Component syncs to OSD:
    //   osdViewer.navigator.element.style.display = showNavigator ? 'block' : 'none';
  }

  toggleTranscriptionPanel(): void {
    this.#showTranscriptionPanel = !this.#showTranscriptionPanel;
  }

  toggleSearchPanel(): void {
    this.#showSearchPanel = !this.#showSearchPanel;
  }

  toggleMetadataPanel(): void {
    this.#showMetadataPanel = !this.#showMetadataPanel;
  }

  toggleWorkbench(): void {
    this.#showWorkbench = !this.#showWorkbench;
  }

  /**
   * Canvas Composer was phased out in favor of Board View.
   * Kept as a no-op for backward compatibility.
   */
  toggleComposer(): void {
    // No-op: Use Board View instead
  }

  toggleAnnotationTool(): void {
    this.#showAnnotationTool = !this.#showAnnotationTool;
  }

  toggleFilmstrip(): void {
    this.#showFilmstrip = !this.#showFilmstrip;
  }

  toggleKeyboardHelp(): void {
    this.#showKeyboardHelp = !this.#showKeyboardHelp;
  }

  // ------------------------------------------------------------------
  // Annotation Actions
  // ------------------------------------------------------------------

  /** Select an annotation by ID (or null to deselect). */
  selectAnnotation(id: string | null): void {
    this.#selectedAnnotationId = id;
  }

  /** Add an annotation to the local annotations array. */
  addAnnotation(annotation: IIIFAnnotation): void {
    this.#annotations = [...this.#annotations, annotation];
  }

  /** Remove an annotation by ID from the local annotations array. */
  removeAnnotation(id: string): void {
    this.#annotations = this.#annotations.filter(a => a.id !== id);
  }

  // ------------------------------------------------------------------
  // Choice Actions
  // ------------------------------------------------------------------

  /** Set the active choice index for multi-image canvases. */
  setActiveChoiceIndex(index: number): void {
    this.#activeChoiceIndex = index;
  }

  // ------------------------------------------------------------------
  // Keyboard Handler
  // ------------------------------------------------------------------

  /**
   * Handle keyboard shortcuts for the image viewer.
   *
   * React version: useCallback returning a handler function.
   * Svelte version: Component calls this from a keydown handler or use:action.
   *
   * Shortcuts:
   * - r/R: Rotate CW/CCW
   * - f/F: Flip horizontal
   * - n/N: Toggle navigator
   * - ?: Toggle keyboard help
   * - +/=: Zoom in
   * - -/_: Zoom out
   * - 0: Reset view
   * - a/A: Toggle annotation tool (via callback)
   * - m/M: Toggle measurement (via callback)
   * - Escape: Exit fullscreen
   *
   * @param e    - KeyboardEvent from the window or container
   * @param opts - Optional callbacks for annotation/measurement toggle
   * @returns true if the key was handled
   */
  handleImageKeyDown(
    e: KeyboardEvent,
    opts?: {
      annotationToolActive?: boolean;
      onAnnotationToolToggle?: (active: boolean) => void;
      onMeasurementToggle?: () => void;
    },
  ): boolean {
    // Don't handle when typing in inputs
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return false;
    }

    const key = e.key;
    switch (key) {
      case 'r':
        if (e.shiftKey) {
          e.preventDefault();
          this.rotateCCW();
        } else {
          e.preventDefault();
          this.rotateCW();
        }
        return true;
      case 'R':
        e.preventDefault();
        this.rotateCCW();
        return true;
      case 'f':
      case 'F':
        e.preventDefault();
        this.flipHorizontal();
        return true;
      case 'n':
      case 'N':
        e.preventDefault();
        this.toggleNavigator();
        return true;
      case '?':
        e.preventDefault();
        this.toggleKeyboardHelp();
        return true;
      case '+':
      case '=':
        e.preventDefault();
        this.zoomIn();
        return true;
      case '-':
      case '_':
        e.preventDefault();
        this.zoomOut();
        return true;
      case '0':
        e.preventDefault();
        this.resetView();
        return true;
      case 'a':
      case 'A':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          opts?.onAnnotationToolToggle?.(!opts.annotationToolActive);
        }
        return true;
      case 'm':
      case 'M':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          opts?.onMeasurementToggle?.();
        }
        return true;
      case 'Escape':
        if (this.#isFullscreen) {
          // NOTE: Component handles actual document.exitFullscreen()
          this.#isFullscreen = false;
        }
        return true;
    }

    return false;
  }

  // ------------------------------------------------------------------
  // Full state reset
  // ------------------------------------------------------------------

  /**
   * Reset all viewer state to defaults.
   * Called when navigating away from the viewer or loading a new project.
   */
  reset(): void {
    this.#mediaType = 'other';
    this.#annotations = [];
    this.#resolvedImageUrl = null;
    this.#rotation = 0;
    this.#zoomLevel = 100;
    this.#isFlipped = false;
    this.#showNavigator = true;
    this.#isFullscreen = false;
    this.#showTranscriptionPanel = false;
    this.#showSearchPanel = false;
    this.#showMetadataPanel = false;
    this.#showWorkbench = false;
    this.#showAnnotationTool = false;
    this.#showFilmstrip = true;
    this.#showKeyboardHelp = false;
    this.#selectedAnnotationId = null;
    this.#isOcring = false;
    this.#osdReady = 0;
    this.#activeChoiceIndex = 0;
    this.#currentCanvas = null;
    this.#currentManifest = null;
    this.#currentCanvasId = null;
  }
}
