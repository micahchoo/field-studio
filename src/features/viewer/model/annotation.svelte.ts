/**
 * Annotation Tool Stores -- Svelte 5 reactive classes (Category 2)
 *
 * Converts React useAnnotation + useTimeAnnotation hooks into
 * Svelte 5 reactive classes per architecture doc S4 Cat 2.
 *
 * SOURCE: React codebase src/features/viewer/model/annotation.ts
 *         (useAnnotation hook at line 288, useTimeAnnotation at line 575)
 *
 * MIGRATION RULES APPLIED:
 * - Rule 2.B: $derived for computed values (canClose, canSave, existingSvgAnnotations)
 * - Rule 2.C: $state() for UI state (mode, points, etc. are small/mutable)
 * - Cat 2: useState + useCallback -> class with $state fields + methods
 * - DOM refs (containerRef, imageRef) NOT stored here -- live in component via bind:this
 * - Keyboard effect (useEffect for keydown) NOT here -- use $effect in component or use:action
 *
 * USAGE IN SVELTE COMPONENT:
 *   <script>
 *     import { AnnotationToolStore } from '../model/annotation.svelte.ts';
 *     const tool = new AnnotationToolStore(canvas, existingAnnotations, onCreate, onClose);
 *     // Component manages DOM refs:
 *     let containerEl: HTMLDivElement;
 *     // Keyboard shortcut: use $effect or onMount to add window listener
 *   </script>
 */

import type { IIIFAnnotation, IIIFCanvas } from '@/src/shared/types';
import type { Point, DrawingMode, TimeRange } from './annotation';
import {
  simplifyPath,
  createSvgSelector,
  createTimeAnnotation,
  isTimeBasedAnnotation,
} from './annotation';
import * as GeoPoint from '@/src/shared/lib/geometry/point';

// ============================================================================
// AnnotationToolStore -- spatial annotation tool state
// ============================================================================

/**
 * Manages the full lifecycle of spatial annotation drawing:
 * polygon, rectangle, and freehand modes.
 *
 * ARCHITECTURE NOTES:
 * - This class holds only LOGICAL state. DOM elements (container, image)
 *   are passed to methods that need them or accessed via bind:this in the component.
 * - The React version used containerRef/imageRef stored in the hook.
 *   In Svelte, the component owns DOM refs and passes them to methods like
 *   getCanvasCoords() and updateScale().
 * - The React version had a useEffect for keyboard shortcuts.
 *   In Svelte, the component should use $effect() or a window keydown handler
 *   in onMount/onDestroy. The store provides handleKeyboardShortcut() for this.
 *
 * LIFECYCLE:
 * 1. Constructed with canvas, existing annotations, and callbacks
 * 2. Component calls updateScale(canvas, containerEl) after mount/resize
 * 3. Mouse events forwarded from component: handleClick, handleMouseMove, etc.
 * 4. handleSave() creates annotation and calls onCreateAnnotation callback
 * 5. No explicit destroy needed (no subscriptions or timers)
 */
export class AnnotationToolStore {
  // ---- Reactive state ($state) ----
  #mode = $state<DrawingMode>('polygon');
  #points = $state<Point[]>([]);
  #isDrawing = $state(false);
  #annotationText = $state('');
  #motivation = $state<'commenting' | 'tagging' | 'describing'>('commenting');
  #showExisting = $state(true);
  #freehandPoints = $state<Point[]>([]);
  #cursorPoint = $state<Point | null>(null);
  #scale = $state(1);
  #offset = $state({ x: 0, y: 0 });

  // ---- Non-reactive constructor args ----
  readonly #canvas: IIIFCanvas;
  readonly #existingAnnotations: IIIFAnnotation[];
  readonly #onCreateAnnotation: (annotation: IIIFAnnotation) => void;
  readonly #onClose: () => void;

  // ---- Derived state ($derived) ----

  /**
   * Whether the polygon can be closed (cursor is near first point).
   * React version computed this inline in the return statement.
   */
  readonly canClose = $derived.by(() => {
    if (this.#points.length < 3 || !this.#cursorPoint) return false;
    return GeoPoint.distance(this.#cursorPoint, this.#points[0]) < 15;
  });

  /**
   * Whether the annotation can be saved (enough points + text).
   */
  readonly canSave = $derived(
    this.#points.length >= 3 && this.#annotationText.trim().length > 0,
  );

  /**
   * Filter existing annotations to only those with SvgSelector targets.
   * These are the spatial annotations that should be displayed as overlays.
   */
  readonly existingSvgAnnotations = $derived.by(() => {
    return this.#existingAnnotations.filter((anno) => {
      const selector = (anno.target as unknown as Record<string, unknown>)?.selector as
        | { type?: string }
        | undefined;
      return selector?.type === 'SvgSelector';
    });
  });

  // ---- Read-only accessors ----
  get mode(): DrawingMode { return this.#mode; }
  get points(): readonly Point[] { return this.#points; }
  get isDrawing(): boolean { return this.#isDrawing; }
  get annotationText(): string { return this.#annotationText; }
  get motivation(): 'commenting' | 'tagging' | 'describing' { return this.#motivation; }
  get showExisting(): boolean { return this.#showExisting; }
  get freehandPoints(): readonly Point[] { return this.#freehandPoints; }
  get cursorPoint(): Point | null { return this.#cursorPoint; }
  get scale(): number { return this.#scale; }
  get offset(): { x: number; y: number } { return this.#offset; }

  // ---- Constructor ----

  constructor(
    canvas: IIIFCanvas,
    existingAnnotations: IIIFAnnotation[],
    onCreateAnnotation: (annotation: IIIFAnnotation) => void,
    onClose: () => void,
  ) {
    this.#canvas = canvas;
    this.#existingAnnotations = existingAnnotations;
    this.#onCreateAnnotation = onCreateAnnotation;
    this.#onClose = onClose;
  }

  // ---- Setters ----

  setMode(newMode: DrawingMode): void {
    this.#mode = newMode;
    this.handleClear();
  }

  setAnnotationText(text: string): void {
    this.#annotationText = text;
  }

  setMotivation(mot: 'commenting' | 'tagging' | 'describing'): void {
    this.#motivation = mot;
  }

  setShowExisting(show: boolean): void {
    this.#showExisting = show;
  }

  // ---- Scale / coordinate conversion ----

  /**
   * Calculate fit-to-screen scale and offset for the annotation overlay.
   *
   * In the React version this used containerRef.current to get dimensions.
   * In Svelte, the component passes the container element directly.
   *
   * @param canvas      - IIIF canvas with width/height
   * @param containerEl - DOM element of the annotation overlay container
   */
  updateScale(canvas: IIIFCanvas, containerEl: HTMLElement): void {
    const containerRect = containerEl.getBoundingClientRect();
    const padding = 48;
    const scaleX = (containerRect.width - padding) / canvas.width;
    const scaleY = (containerRect.height - padding) / canvas.height;
    const fitScale = Math.min(scaleX, scaleY, 1);

    this.#scale = fitScale;
    this.#offset = {
      x: (containerRect.width - canvas.width * fitScale) / 2,
      y: (containerRect.height - canvas.height * fitScale) / 2,
    };
  }

  /**
   * Convert a mouse event's client coordinates to canvas coordinates.
   *
   * @param clientX     - MouseEvent.clientX
   * @param clientY     - MouseEvent.clientY
   * @param containerEl - DOM element of the annotation overlay container
   * @returns Point in canvas coordinate space
   */
  getCanvasCoords(clientX: number, clientY: number, containerEl: HTMLElement): Point {
    const rect = containerEl.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    return {
      x: (mouseX - this.#offset.x) / this.#scale,
      y: (mouseY - this.#offset.y) / this.#scale,
    };
  }

  // ---- Mouse event handlers ----
  // NOTE: In React these received React.MouseEvent. In Svelte they receive
  // raw MouseEvent coordinates. The component extracts clientX/clientY
  // and calls these with the canvas-space point.

  /**
   * Handle mouse move over the annotation overlay.
   * Updates cursor point and extends freehand path when drawing.
   */
  handleMouseMove(point: Point): void {
    this.#cursorPoint = point;

    if (this.#mode === 'freehand' && this.#isDrawing) {
      this.#freehandPoints = [...this.#freehandPoints, point];
    }
  }

  /**
   * Handle click on the annotation overlay.
   * Adds polygon vertices or completes rectangle corners.
   */
  handleClick(point: Point): void {
    if (this.#mode === 'select') return;

    if (this.#mode === 'polygon') {
      // Check if clicking near first point to close polygon
      if (this.#points.length >= 3) {
        if (GeoPoint.distance(point, this.#points[0]) < 15) {
          this.#isDrawing = false;
          return;
        }
      }
      this.#points = [...this.#points, point];
      this.#isDrawing = true;
    } else if (this.#mode === 'rectangle') {
      if (this.#points.length === 0) {
        this.#points = [point];
        this.#isDrawing = true;
      } else if (this.#points.length === 1) {
        const start = this.#points[0];
        this.#points = [
          start,
          { x: point.x, y: start.y },
          point,
          { x: start.x, y: point.y },
        ];
        this.#isDrawing = false;
      }
    }
  }

  /**
   * Handle mouse down (starts freehand drawing).
   */
  handleMouseDown(point: Point): void {
    if (this.#mode === 'freehand') {
      this.#freehandPoints = [point];
      this.#isDrawing = true;
    }
  }

  /**
   * Handle mouse up (completes freehand drawing with path simplification).
   */
  handleMouseUp(): void {
    if (this.#mode === 'freehand' && this.#isDrawing) {
      if (this.#freehandPoints.length > 2) {
        const simplified = simplifyPath(this.#freehandPoints, 3);
        this.#points = simplified;
      }
      this.#freehandPoints = [];
      this.#isDrawing = false;
    }
  }

  // ---- Editing actions ----

  /** Remove the last point (undo last vertex). */
  handleUndo(): void {
    const newPoints = this.#points.slice(0, -1);
    if (newPoints.length < 2) this.#isDrawing = false;
    this.#points = newPoints;
  }

  /** Clear all points and reset drawing state. */
  handleClear(): void {
    this.#points = [];
    this.#freehandPoints = [];
    this.#isDrawing = false;
  }

  /**
   * Save the current annotation.
   * Creates an IIIFAnnotation with an SvgSelector target and
   * calls the onCreateAnnotation callback. Clears drawing state after save.
   *
   * @returns The created annotation, or null if not saveable
   */
  handleSave(): IIIFAnnotation | null {
    if (this.#points.length < 3) return null;
    if (!this.#annotationText.trim()) return null;

    const annotation: IIIFAnnotation = {
      id: `${this.#canvas.id}/annotation/${Date.now()}`,
      type: 'Annotation',
      motivation: this.#motivation,
      body: {
        type: 'TextualBody',
        value: this.#annotationText.trim(),
        format: 'text/plain',
      },
      target: {
        type: 'SpecificResource',
        source: this.#canvas.id,
        selector: {
          type: 'SvgSelector',
          value: createSvgSelector(this.#points, this.#canvas.width, this.#canvas.height),
        },
      },
    };

    this.#onCreateAnnotation(annotation);
    this.handleClear();
    this.#annotationText = '';
    return annotation;
  }

  // ---- Keyboard shortcut handler ----

  /**
   * Handle keyboard shortcuts for the annotation tool.
   * Call from a component-level keydown handler or $effect.
   *
   * React version: useEffect() added window keydown listener.
   * Svelte version: Component calls this from its own listener.
   *
   * Shortcuts:
   * - Escape: Clear drawing or close tool
   * - Ctrl/Cmd+Z: Undo last point
   * - Enter: Close polygon (when >= 3 points)
   *
   * @returns true if the key was handled (caller should preventDefault)
   */
  handleKeyboardShortcut(e: KeyboardEvent): boolean {
    if (e.key === 'Escape') {
      if (this.#isDrawing) {
        this.handleClear();
      } else {
        this.#onClose();
      }
      return true;
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      this.handleUndo();
      return true;
    } else if (e.key === 'Enter' && this.#points.length >= 3) {
      this.#isDrawing = false;
      return true;
    }
    return false;
  }
}

// ============================================================================
// TimeAnnotationStore -- time-based annotation tool state
// ============================================================================

/**
 * Manages the lifecycle of time-based annotation creation
 * for audio/video content.
 *
 * ARCHITECTURE NOTES:
 * - Converted from useTimeAnnotation React hook (line 575 in source)
 * - Cat 2: useState -> $state fields, useCallback -> class methods
 * - No DOM refs needed (time-based annotations don't have spatial overlay)
 * - The waveform/timeline component forwards time values to this store
 *
 * LIFECYCLE:
 * 1. Constructed with canvasId, duration, existing annotations, and callback
 * 2. startSelecting() activates annotation mode
 * 3. setStartTime() / setEndTime() called from waveform/progress bar
 * 4. handleSave() creates annotation and calls onCreateAnnotation callback
 * 5. cancelSelecting() / handleClear() resets state
 */
export class TimeAnnotationStore {
  // ---- Reactive state ($state) ----
  #isActive = $state(false);
  #timeRange = $state<TimeRange | null>(null);
  #isSelecting = $state(false);
  #hasStart = $state(false);
  #annotationText = $state('');
  #motivation = $state<'commenting' | 'tagging' | 'describing'>('commenting');

  // ---- Non-reactive constructor args ----
  readonly #canvasId: string;
  readonly #duration: number;
  readonly #existingAnnotations: IIIFAnnotation[];
  readonly #onCreateAnnotation: (annotation: IIIFAnnotation) => void;

  // ---- Derived state ($derived) ----

  /** Can save: has a time range and non-empty text */
  readonly canSave = $derived(
    this.#timeRange !== null && this.#annotationText.trim().length > 0,
  );

  /** Filter existing annotations to only time-based ones */
  readonly existingTimeAnnotations = $derived.by(() => {
    return this.#existingAnnotations.filter(isTimeBasedAnnotation);
  });

  // ---- Read-only accessors ----
  get isActive(): boolean { return this.#isActive; }
  get timeRange(): TimeRange | null { return this.#timeRange; }
  get isSelecting(): boolean { return this.#isSelecting; }
  get hasStart(): boolean { return this.#hasStart; }
  get annotationText(): string { return this.#annotationText; }
  get motivation(): 'commenting' | 'tagging' | 'describing' { return this.#motivation; }

  // ---- Constructor ----

  constructor(
    canvasId: string,
    duration: number,
    existingAnnotations: IIIFAnnotation[],
    onCreateAnnotation: (annotation: IIIFAnnotation) => void,
  ) {
    this.#canvasId = canvasId;
    this.#duration = duration;
    this.#existingAnnotations = existingAnnotations;
    this.#onCreateAnnotation = onCreateAnnotation;
  }

  // ---- Time range manipulation ----

  /** Set the time range directly. */
  setTimeRange(range: TimeRange | null): void {
    this.#timeRange = range;
    if (range) {
      this.#hasStart = true;
    }
  }

  /** Set the start time. Clamps to [0, duration]. Begins selection. */
  setStartTime(time: number): void {
    const clampedTime = Math.max(0, Math.min(time, this.#duration));
    this.#timeRange = {
      start: clampedTime,
      end: this.#timeRange?.end !== undefined && this.#timeRange.end > clampedTime
        ? this.#timeRange.end
        : undefined,
    };
    this.#hasStart = true;
    this.#isSelecting = true;
  }

  /** Set the end time. Ensures end >= start. Clamps to duration. */
  setEndTime(time: number): void {
    if (!this.#hasStart) return;

    const clampedTime = Math.max(0, Math.min(time, this.#duration));
    if (!this.#timeRange) return;

    // Ensure end is after start (auto-swap if needed)
    const start = Math.min(this.#timeRange.start, clampedTime);
    const end = Math.max(this.#timeRange.start, clampedTime);
    this.#timeRange = { start, end };
    this.#isSelecting = false;
  }

  // ---- Text and motivation ----

  setAnnotationText(text: string): void {
    this.#annotationText = text;
  }

  setMotivation(mot: 'commenting' | 'tagging' | 'describing'): void {
    this.#motivation = mot;
  }

  // ---- Lifecycle actions ----

  /** Clear the current selection and reset all input state. */
  handleClear(): void {
    this.#timeRange = null;
    this.#isSelecting = false;
    this.#hasStart = false;
    this.#annotationText = '';
  }

  /** Enter annotation selection mode. */
  startSelecting(): void {
    this.#isActive = true;
    this.#isSelecting = true;
    this.handleClear();
  }

  /** Cancel selection and deactivate. */
  cancelSelecting(): void {
    this.#isActive = false;
    this.handleClear();
  }

  /**
   * Save the current time annotation.
   * Creates an IIIFAnnotation with a FragmentSelector and
   * calls the onCreateAnnotation callback. Clears state after save.
   *
   * @returns The created annotation, or null if not saveable
   */
  handleSave(): IIIFAnnotation | null {
    if (!this.#timeRange || !this.#annotationText.trim()) return null;

    const annotation = createTimeAnnotation(
      this.#canvasId,
      this.#timeRange,
      this.#annotationText,
      this.#motivation,
    );

    this.#onCreateAnnotation(annotation);
    this.handleClear();
    return annotation;
  }
}
