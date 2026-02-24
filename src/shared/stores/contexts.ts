/**
 * Typed Context Keys — Svelte 5
 *
 * Typed context accessors for scoped state using Symbol keys.
 * Per architecture doc §3.C: never use bare string keys.
 *
 * These contexts are for SCOPED state that varies per subtree.
 * Global singletons (theme, toast, vault, appMode, appSettings)
 * are module stores — NOT contexts.
 */

import { setContext, getContext } from 'svelte';

// ────────────────────────────────────────────────────────────────
// Annotation Context (viewer-scoped)
// Replaces React AnnotationStateProvider
// ────────────────────────────────────────────────────────────────

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

export interface AnnotationContext {
  // State (reactive reads via getters on the context object)
  readonly showAnnotationTool: boolean;
  readonly annotationText: string;
  readonly annotationMotivation: AnnotationMotivation;
  readonly annotationDrawingState: AnnotationDrawingState;
  readonly forceAnnotationsTab: boolean;
  readonly timeRange: TimeRange | null;
  readonly currentPlaybackTime: number;

  // Setters
  setAnnotationText: (text: string) => void;
  setAnnotationMotivation: (motivation: AnnotationMotivation) => void;
  setAnnotationDrawingState: (state: AnnotationDrawingState) => void;
  setTimeRange: (range: TimeRange | null) => void;
  handleAnnotationToolToggle: (active: boolean) => void;
  handlePlaybackTimeChange: (time: number) => void;

  // Imperative triggers — registered by the viewer overlay (Annotorious)
  // null until a viewer mounts and registers its own handler
  triggerSave: (() => void) | null;
  triggerClear: (() => void) | null;
  registerSave: (fn: () => void) => void;
  registerClear: (fn: () => void) => void;
}

const ANNOTATION_KEY = Symbol('annotation-state');

export function setAnnotationContext(value: AnnotationContext): void {
  setContext(ANNOTATION_KEY, value);
}

/** No-op fallback used when context is missing (e.g. unit tests outside App provider) */
const NULL_ANNOTATION_CONTEXT: AnnotationContext = {
  get showAnnotationTool() { return false; },
  get annotationText() { return ''; },
  get annotationMotivation(): AnnotationMotivation { return 'commenting'; },
  get annotationDrawingState(): AnnotationDrawingState { return { pointCount: 0, isDrawing: false, canSave: false }; },
  get forceAnnotationsTab() { return false; },
  get timeRange() { return null; },
  get currentPlaybackTime() { return 0; },
  setAnnotationText: () => {},
  setAnnotationMotivation: () => {},
  setAnnotationDrawingState: () => {},
  setTimeRange: () => {},
  handleAnnotationToolToggle: () => {},
  handlePlaybackTimeChange: () => {},
  triggerSave: null,
  triggerClear: null,
  registerSave: () => {},
  registerClear: () => {},
};

export function getAnnotationContext(): AnnotationContext {
  return getContext<AnnotationContext>(ANNOTATION_KEY) ?? NULL_ANNOTATION_CONTEXT;
}

// ────────────────────────────────────────────────────────────────
// Resource Context (route-scoped)
// Replaces React ResourceContextProvider
// ────────────────────────────────────────────────────────────────

export interface ResourceContext {
  // State
  readonly resource: unknown | null; // IIIFItem when typed
  readonly type: string | null;
  readonly selectedAt: number;

  // Actions
  setResource: (resource: unknown | null) => void;
  clearResource: () => void;
}

const RESOURCE_KEY = Symbol('resource-context');

export function setResourceContext(value: ResourceContext): void {
  setContext(RESOURCE_KEY, value);
}

export function getResourceContext(): ResourceContext {
  return getContext<ResourceContext>(RESOURCE_KEY);
}

// ────────────────────────────────────────────────────────────────
// User Intent Context (route-scoped)
// Replaces React UserIntentProvider — simplified for MVP
// ────────────────────────────────────────────────────────────────

export type UserIntent =
  | 'viewing'
  | 'editing'
  | 'selecting'
  | 'dragging'
  | 'exporting'
  | 'importing'
  | 'validating'
  | 'searching'
  | 'navigating'
  | 'annotating'
  | 'designing'
  | 'fieldMode'
  | 'idle';

export interface UserIntentContext {
  readonly intent: UserIntent;
  readonly resourceId: string | undefined;
  readonly area: string | undefined;
  setIntent: (intent: UserIntent, options?: { resourceId?: string; area?: string }) => void;
  clearIntent: () => void;
}

const USER_INTENT_KEY = Symbol('user-intent');

export function setUserIntentContext(value: UserIntentContext): void {
  setContext(USER_INTENT_KEY, value);
}

export function getUserIntentContext(): UserIntentContext {
  return getContext<UserIntentContext>(USER_INTENT_KEY);
}

// ────────────────────────────────────────────────────────────────
// Layout Contexts (component-scoped)
// Used by PaneLayout, Split, SplitPanel
// ────────────────────────────────────────────────────────────────

export type PaneVariant = 'default' | 'canvas';

export interface ReactiveValue<T> {
  readonly value: T;
}

const PANE_VARIANT_KEY = Symbol('pane-variant');

export function setPaneVariantContext(value: ReactiveValue<PaneVariant>): void {
  setContext(PANE_VARIANT_KEY, value);
}

export function getPaneVariantContext(): ReactiveValue<PaneVariant> | undefined {
  return getContext<ReactiveValue<PaneVariant>>(PANE_VARIANT_KEY);
}

export type SplitDirection = 'horizontal' | 'vertical';

const SPLIT_DIRECTION_KEY = Symbol('split-direction');

export function setSplitDirectionContext(value: ReactiveValue<SplitDirection>): void {
  setContext(SPLIT_DIRECTION_KEY, value);
}

export function getSplitDirectionContext(): ReactiveValue<SplitDirection> {
  return getContext<ReactiveValue<SplitDirection>>(SPLIT_DIRECTION_KEY);
}
