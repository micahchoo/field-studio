/**
 * Layer History — State container (Category 2)
 *
 * Replaces useLayerHistory React hook.
 * Architecture doc §4 Cat 2: Reactive class in .svelte.ts.
 *
 * Manages canvas layer composition state for CanvasComposer
 * with full undo/redo support. Each layer represents a placed
 * resource (image, video, etc.) on a canvas with position, size, and opacity.
 *
 * Usage in Svelte:
 *   let layers = new LayerHistoryStore(initialState);
 *   layers.addLayer(resource);
 *   layers.undo();
 */

import type {
  NormalizedState,
  IIIFAnnotation,
  IIIFAnnotationPage,
  IIIFExternalWebResource,
} from '@/src/shared/types';
import { getIIIFValue } from '@/src/shared/types';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface PlacedResource {
  id: string;
  annotationId: string;
  sourceUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  label?: string;
}

export interface LayerState {
  layers: PlacedResource[];
  canvasWidth: number;
  canvasHeight: number;
}

// --------------------------------------------------------------------------
// Internal helpers
// --------------------------------------------------------------------------

/**
 * Parse the xywh fragment from an annotation target string.
 *
 * Pseudocode:
 *   1. Match "#xywh=x,y,w,h" in the target string
 *   2. Parse the four numeric values
 *   3. Return { x, y, width, height } or defaults if no match
 */
function parseXYWH(
  target: string,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; width: number; height: number } {
  const match = target.match(/#xywh=(\d+),(\d+),(\d+),(\d+)/);
  if (match) {
    return {
      x: parseInt(match[1], 10),
      y: parseInt(match[2], 10),
      width: parseInt(match[3], 10),
      height: parseInt(match[4], 10),
    };
  }
  // Default: fill entire canvas
  return { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
}

/**
 * Extract a PlacedResource from a painting annotation.
 *
 * Pseudocode:
 *   1. Get the body (handle single or array)
 *   2. Extract source URL, dimensions from the body
 *   3. Parse target xywh for placement
 *   4. Return PlacedResource or null if not an image/media body
 */
function annotationToPlacedResource(
  annotation: IIIFAnnotation,
  canvasWidth: number,
  canvasHeight: number
): PlacedResource | null {
  // Get body — could be single or array
  const body = Array.isArray(annotation.body) ? annotation.body[0] : annotation.body;
  if (!body) return null;

  // Only handle external web resources (images, video, audio)
  if (!('id' in body)) return null;
  const resource = body as IIIFExternalWebResource;

  // Parse target for placement coordinates
  const targetStr =
    typeof annotation.target === 'string'
      ? annotation.target
      : typeof annotation.target === 'object' && 'source' in annotation.target
        ? typeof annotation.target.source === 'string'
          ? annotation.target.source
          : ''
        : '';

  const { x, y, width, height } = parseXYWH(targetStr, canvasWidth, canvasHeight);

  return {
    id: resource.id,
    annotationId: annotation.id,
    sourceUrl: resource.id,
    x,
    y,
    width: resource.width ?? width,
    height: resource.height ?? height,
    opacity: 1,
    label: annotation.label ? getIIIFValue(annotation.label) : undefined,
  };
}

// --------------------------------------------------------------------------
// LayerHistoryStore
// --------------------------------------------------------------------------

export class LayerHistoryStore {
  // Undo/redo stacks
  #past = $state<LayerState[]>([]);
  #present = $state<LayerState>({ layers: [], canvasWidth: 0, canvasHeight: 0 });
  #future = $state<LayerState[]>([]);
  #maxHistory = 50;

  // ---- Getters (reactive via $state) ----

  get present(): LayerState {
    return this.#present;
  }

  get layers(): PlacedResource[] {
    return this.#present.layers;
  }

  get canUndo(): boolean {
    return this.#past.length > 0;
  }

  get canRedo(): boolean {
    return this.#future.length > 0;
  }

  // ---- Constructor ----

  constructor(initial?: LayerState) {
    if (initial) {
      this.#present = initial;
    }
  }

  // --------------------------------------------------------------------------
  // #pushState — internal: snapshot current state before mutation
  // --------------------------------------------------------------------------

  /**
   * Pseudocode:
   *   1. Push a deep clone of present onto past (trim to maxHistory)
   *   2. Clear future stack (new branch)
   */
  #pushState(): void {
    const snapshot: LayerState = {
      layers: this.#present.layers.map((l) => ({ ...l })),
      canvasWidth: this.#present.canvasWidth,
      canvasHeight: this.#present.canvasHeight,
    };
    this.#past = [...this.#past.slice(-(this.#maxHistory - 1)), snapshot];
    this.#future = [];
  }

  // --------------------------------------------------------------------------
  // loadFromCanvas — parse layers from a canvas's painting annotations
  // --------------------------------------------------------------------------

  /**
   * Pseudocode:
   *   1. Look up the canvas entity from state
   *   2. Get its child annotation page IDs from references
   *   3. For each annotation page, iterate its annotation IDs
   *   4. For each annotation with motivation 'painting', extract PlacedResource
   *   5. Replace present state with the loaded layers (no undo entry)
   */
  loadFromCanvas(canvasId: string, state: NormalizedState): void {
    const canvas = state.entities.Canvas[canvasId];
    if (!canvas) return;

    const canvasWidth = canvas.width || 0;
    const canvasHeight = canvas.height || 0;

    const layers: PlacedResource[] = [];

    // Get child IDs of the canvas (annotation page IDs)
    const childIds = state.references[canvasId] || [];

    for (const pageId of childIds) {
      const page = state.entities.AnnotationPage[pageId] as IIIFAnnotationPage | undefined;
      if (!page) continue;

      // Get annotation IDs within this page
      const annotationIds = state.references[pageId] || [];

      for (const annotationId of annotationIds) {
        const annotation = state.entities.Annotation[annotationId] as IIIFAnnotation | undefined;
        if (!annotation) continue;

        // Check if this is a painting annotation
        const motivation = Array.isArray(annotation.motivation)
          ? annotation.motivation
          : [annotation.motivation];
        if (!motivation.includes('painting')) continue;

        const placed = annotationToPlacedResource(annotation, canvasWidth, canvasHeight);
        if (placed) layers.push(placed);
      }
    }

    // Reset state without adding undo entry
    this.#past = [];
    this.#future = [];
    this.#present = { layers, canvasWidth, canvasHeight };
  }

  // --------------------------------------------------------------------------
  // updateLayer — modify a single layer's properties
  // --------------------------------------------------------------------------

  /**
   * Pseudocode:
   *   1. Push current state to undo stack
   *   2. Find layer by id, apply partial updates
   *   3. Replace present with updated layers
   */
  updateLayer(id: string, updates: Partial<PlacedResource>): void {
    const idx = this.#present.layers.findIndex((l) => l.id === id);
    if (idx === -1) return;

    this.#pushState();
    const newLayers = this.#present.layers.map((l) =>
      l.id === id ? { ...l, ...updates, id: l.id } : l
    );
    this.#present = { ...this.#present, layers: newLayers };
  }

  // --------------------------------------------------------------------------
  // addLayer — append a new placed resource
  // --------------------------------------------------------------------------

  /**
   * Pseudocode:
   *   1. Push current state to undo stack
   *   2. Append resource to layers array
   */
  addLayer(resource: PlacedResource): void {
    this.#pushState();
    this.#present = {
      ...this.#present,
      layers: [...this.#present.layers, resource],
    };
  }

  // --------------------------------------------------------------------------
  // removeLayer — remove a layer by id
  // --------------------------------------------------------------------------

  /**
   * Pseudocode:
   *   1. Push current state to undo stack
   *   2. Filter out the layer with matching id
   */
  removeLayer(id: string): void {
    this.#pushState();
    this.#present = {
      ...this.#present,
      layers: this.#present.layers.filter((l) => l.id !== id),
    };
  }

  // --------------------------------------------------------------------------
  // reorderLayers — move a layer from one index to another
  // --------------------------------------------------------------------------

  /**
   * Pseudocode:
   *   1. Validate indices are within bounds
   *   2. Push current state to undo stack
   *   3. Remove element at fromIndex, insert at toIndex
   */
  reorderLayers(fromIndex: number, toIndex: number): void {
    const layers = this.#present.layers;
    if (
      fromIndex < 0 ||
      fromIndex >= layers.length ||
      toIndex < 0 ||
      toIndex >= layers.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    this.#pushState();
    const newLayers = [...layers];
    const [moved] = newLayers.splice(fromIndex, 1);
    newLayers.splice(toIndex, 0, moved);
    this.#present = { ...this.#present, layers: newLayers };
  }

  // --------------------------------------------------------------------------
  // undo — restore previous state
  // --------------------------------------------------------------------------

  /**
   * Pseudocode:
   *   1. Pop last entry from past stack
   *   2. Push current present onto future stack
   *   3. Set present to popped entry
   */
  undo(): void {
    if (this.#past.length === 0) return;
    const newPast = [...this.#past];
    const restored = newPast.pop()!;
    this.#future = [this.#present, ...this.#future];
    this.#past = newPast;
    this.#present = restored;
  }

  // --------------------------------------------------------------------------
  // redo — restore next state
  // --------------------------------------------------------------------------

  /**
   * Pseudocode:
   *   1. Shift first entry from future stack
   *   2. Push current present onto past stack
   *   3. Set present to shifted entry
   */
  redo(): void {
    if (this.#future.length === 0) return;
    const newFuture = [...this.#future];
    const restored = newFuture.shift()!;
    this.#past = [...this.#past, this.#present];
    this.#future = newFuture;
    this.#present = restored;
  }

  // --------------------------------------------------------------------------
  // buildCanvas — build IIIF canvas structure from current layers
  // --------------------------------------------------------------------------

  /**
   * Pseudocode:
   *   1. Map each PlacedResource to an IIIF Annotation with painting motivation
   *   2. Wrap annotations in an AnnotationPage
   *   3. Return { items: [annotationPage], width, height }
   */
  buildCanvas(): { items: IIIFAnnotationPage[]; width: number; height: number } {
    const annotations: IIIFAnnotation[] = this.#present.layers.map((layer) => ({
      id: layer.annotationId,
      type: 'Annotation' as const,
      motivation: 'painting' as const,
      body: {
        id: layer.sourceUrl,
        type: 'Image' as const,
        format: 'image/jpeg',
        width: layer.width,
        height: layer.height,
      },
      target: `canvas#xywh=${layer.x},${layer.y},${layer.width},${layer.height}`,
    }));

    const page: IIIFAnnotationPage = {
      id: 'composed-annotation-page',
      type: 'AnnotationPage',
      items: annotations,
    };

    return {
      items: [page],
      width: this.#present.canvasWidth,
      height: this.#present.canvasHeight,
    };
  }
}
