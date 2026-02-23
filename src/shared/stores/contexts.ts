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
}

const ANNOTATION_KEY = Symbol('annotation-state');

export function setAnnotationContext(value: AnnotationContext): void {
  setContext(ANNOTATION_KEY, value);
}

export function getAnnotationContext(): AnnotationContext {
  return getContext<AnnotationContext>(ANNOTATION_KEY);
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
