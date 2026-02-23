/**
 * Annotation State Store — Svelte 5 Runes
 *
 * Replaces React AnnotationStateProvider context.
 * Architecture doc §4 Cat 2: Reactive class in .svelte.ts
 *
 * Centralises annotation-related state that was previously prop-drilled
 * through ViewRouter → ViewerView and ViewRouter → Inspector.
 *
 * State managed:
 * - showAnnotationTool / toggle
 * - annotationText / setter
 * - annotationMotivation / setter
 * - annotationDrawingState / setter
 * - forceAnnotationsTab
 * - timeRange / setter
 * - currentPlaybackTime (throttled to 500ms updates)
 *
 * The save/clear refs from the React version are replaced by callback props
 * passed directly between ViewerView and App-level store consumers.
 *
 * WARNING: Do NOT destructure — breaks reactivity.
 */

export type AnnotationMotivation = 'commenting' | 'tagging' | 'describing';

export interface AnnotationDrawingState {
  pointCount: number;
  isDrawing: boolean;
  canSave: boolean;
}

export interface TimeRange {
  start: number;
  end?: number;
}

class AnnotationStateStore {
  // ── Reactive state ──
  #showAnnotationTool = $state(false);
  #annotationText = $state('');
  #annotationMotivation = $state<AnnotationMotivation>('commenting');
  #annotationDrawingState = $state<AnnotationDrawingState>({
    pointCount: 0,
    isDrawing: false,
    canSave: false,
  });
  #forceAnnotationsTab = $state(false);
  #timeRange = $state<TimeRange | null>(null);
  #currentPlaybackTime = $state(0);

  // ── Non-reactive internals ──
  #lastPlaybackUpdateMs = 0;

  // ── Reactive getters ──

  get showAnnotationTool(): boolean { return this.#showAnnotationTool; }
  get annotationText(): string { return this.#annotationText; }
  get annotationMotivation(): AnnotationMotivation { return this.#annotationMotivation; }
  get annotationDrawingState(): AnnotationDrawingState { return this.#annotationDrawingState; }
  get forceAnnotationsTab(): boolean { return this.#forceAnnotationsTab; }
  get timeRange(): TimeRange | null { return this.#timeRange; }
  get currentPlaybackTime(): number { return this.#currentPlaybackTime; }

  /** Whether an annotation can currently be saved */
  get canSave(): boolean { return this.#annotationDrawingState.canSave; }

  /** Whether annotation mode is fully active with a drawing in progress */
  get isDrawing(): boolean { return this.#annotationDrawingState.isDrawing; }

  // ── Setters ──

  setAnnotationText(text: string): void {
    this.#annotationText = text;
  }

  setAnnotationMotivation(motivation: AnnotationMotivation): void {
    this.#annotationMotivation = motivation;
  }

  setAnnotationDrawingState(state: AnnotationDrawingState): void {
    this.#annotationDrawingState = state;
  }

  setTimeRange(range: TimeRange | null): void {
    this.#timeRange = range;
  }

  // ── Handlers ──

  /**
   * Toggle annotation tool active state.
   * Auto-shows inspector annotations tab when activated.
   * Clears annotation text and time range when deactivated.
   */
  handleAnnotationToolToggle(active: boolean): void {
    this.#showAnnotationTool = active;
    if (active) {
      this.#forceAnnotationsTab = true;
    } else {
      this.#forceAnnotationsTab = false;
      this.#annotationText = '';
      this.#timeRange = null;
    }
  }

  /**
   * Throttled playback time update (max 2 updates/sec).
   * Prevents excessive re-renders during media playback.
   */
  handlePlaybackTimeChange(time: number): void {
    const now = Date.now();
    if (now - this.#lastPlaybackUpdateMs > 500) {
      this.#lastPlaybackUpdateMs = now;
      this.#currentPlaybackTime = time;
    }
  }

  /**
   * Reset all annotation state to defaults.
   * Call when navigating away from viewer or clearing a canvas selection.
   */
  reset(): void {
    this.#showAnnotationTool = false;
    this.#annotationText = '';
    this.#annotationMotivation = 'commenting';
    this.#annotationDrawingState = { pointCount: 0, isDrawing: false, canSave: false };
    this.#forceAnnotationsTab = false;
    this.#timeRange = null;
    this.#currentPlaybackTime = 0;
    this.#lastPlaybackUpdateMs = 0;
  }
}

/** Global singleton */
export const annotationState = new AnnotationStateStore();
