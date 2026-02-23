/**
 * Annotorious -- DOM behavior action (Category 3)
 *
 * Replaces useAnnotorious React hook.
 * Architecture doc S4 Cat 3: Svelte action (use:annotorious)
 *
 * Imperative bridge between OpenSeadragon and Annotorious annotation
 * library. Manages annotation drawing, format conversion (W3C <-> IIIF),
 * and tool state.
 *
 * NOTE: This is a stub action since Annotorious is an external library.
 * The real integration requires @annotorious/openseadragon at runtime.
 * This provides the typed interface and format conversion utilities
 * that are fully implemented.
 *
 * Usage in a Svelte component:
 *   <div use:annotorious={{
 *     osdViewer: viewer,
 *     drawingEnabled: true,
 *     drawingTool: 'rectangle',
 *     annotations: iiifAnnotations,
 *     onAnnotationCreate: handleCreate,
 *   }} />
 */

import type { Action } from 'svelte/action';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnnotoriousDrawingTool = 'rectangle' | 'polygon';

export interface AnnotationStyleOptions {
  color?: string;
  strokeWidth?: number;
  fillOpacity?: number;
}

/** Minimal IIIF annotation shape for format conversion */
export interface IIIFAnnotationLike {
  id: string;
  type: string;
  motivation?: string | string[];
  body?: any;
  target?: any;
}

/** Minimal W3C annotation shape for format conversion */
export interface W3CAnnotationLike {
  '@context'?: string;
  type: string;
  id: string;
  body?: any;
  target?: any;
}

export interface AnnotoriousParams {
  /** OpenSeadragon.Viewer instance */
  osdViewer: any;
  /** Canvas ID for annotation target resolution */
  canvasId?: string;
  /** Whether drawing is enabled */
  drawingEnabled?: boolean;
  /** Active drawing tool */
  drawingTool?: AnnotoriousDrawingTool;
  /** Field mode styling (yellow theme) */
  fieldMode?: boolean;
  /** Custom style overrides */
  style?: AnnotationStyleOptions;
  /** IIIF annotations to display */
  annotations?: IIIFAnnotationLike[];
  /** Callback when an annotation is created */
  onAnnotationCreate?: (annotation: IIIFAnnotationLike) => void;
  /** Callback when an annotation is updated (moved/resized) */
  onAnnotationUpdate?: (annotation: IIIFAnnotationLike) => void;
  /** Callback when an annotation is deleted */
  onAnnotationDelete?: (id: string) => void;
  /** Callback when annotation selection changes */
  onAnnotationSelect?: (annotation: IIIFAnnotationLike | null) => void;
  /** Callback when mouse enters an annotation */
  onMouseEnter?: (annotation: IIIFAnnotationLike) => void;
  /** Callback when mouse leaves an annotation */
  onMouseLeave?: (annotation: IIIFAnnotationLike) => void;
}

// ---------------------------------------------------------------------------
// Format conversion: IIIF <-> W3C
// ---------------------------------------------------------------------------

/**
 * Convert a Field Studio IIIF annotation to W3C Web Annotation format
 * that Annotorious expects.
 *
 * Pseudocode:
 * 1. Extract the first body (IIIF can have array or single body)
 * 2. Map body to W3C TextualBody with purpose from motivation
 * 3. Convert target: string target stays as-is, SpecificResource
 *    with selector becomes { source, selector }
 * 4. Wrap in W3C annotation envelope with @context
 */
export function iiifToW3C(
  iiifAnnotation: IIIFAnnotationLike,
  canvasId: string,
): W3CAnnotationLike {
  // Extract body (handle array or single)
  const body = Array.isArray(iiifAnnotation.body)
    ? iiifAnnotation.body[0]
    : iiifAnnotation.body;

  // Extract target (handle array or single)
  const target = typeof iiifAnnotation.target === 'string'
    ? iiifAnnotation.target
    : Array.isArray(iiifAnnotation.target)
      ? iiifAnnotation.target[0]
      : iiifAnnotation.target;

  // Build W3C body
  const w3cBody: Record<string, any> = {
    type: body?.type || 'TextualBody',
    value: body && 'value' in body ? body.value : '',
    format: body && 'format' in body ? body.format : 'text/plain',
    purpose: Array.isArray(iiifAnnotation.motivation)
      ? iiifAnnotation.motivation[0]
      : iiifAnnotation.motivation,
  };

  // Build W3C target
  let w3cTarget: any;
  if (typeof target === 'string') {
    // Simple string target (full canvas)
    w3cTarget = target;
  } else if (target && 'selector' in target && target.selector) {
    // SpecificResource with selector -> W3C { source, selector }
    const selector = Array.isArray(target.selector)
      ? target.selector[0]
      : target.selector;
    const source = typeof target.source === 'string'
      ? target.source
      : canvasId;
    w3cTarget = { source, selector };
  } else {
    // Fallback: target the canvas
    w3cTarget = canvasId;
  }

  return {
    '@context': 'http://www.w3.org/ns/anno.jsonld',
    type: 'Annotation',
    id: iiifAnnotation.id,
    body: w3cBody,
    target: w3cTarget,
  };
}

/**
 * Convert a W3C Web Annotation from Annotorious back to a
 * Field Studio IIIF annotation.
 *
 * Pseudocode:
 * 1. Extract body (W3C can have array or single)
 * 2. Map purpose back to IIIF motivation
 * 3. Convert target: string stays as-is, { source, selector }
 *    becomes IIIF SpecificResource
 * 4. Wrap in IIIF annotation envelope
 */
export function w3cToIIIF(
  w3cAnnotation: W3CAnnotationLike,
  canvasId: string,
): IIIFAnnotationLike {
  // Extract body
  const body = Array.isArray(w3cAnnotation.body)
    ? w3cAnnotation.body[0]
    : w3cAnnotation.body;

  const motivation = body?.purpose || 'commenting';

  // Build IIIF body
  const iiifBody = {
    type: (body?.type || 'TextualBody') as string,
    value: body?.value || '',
    format: body?.format || 'text/plain',
  };

  // Convert target back to IIIF SpecificResource
  let iiifTarget: any;
  if (typeof w3cAnnotation.target === 'string') {
    // Simple string target
    iiifTarget = w3cAnnotation.target;
  } else {
    const target = Array.isArray(w3cAnnotation.target)
      ? w3cAnnotation.target[0]
      : w3cAnnotation.target;

    if (target && typeof target === 'object' && 'selector' in target) {
      // W3C { source, selector } -> IIIF SpecificResource
      const selector = Array.isArray(target.selector)
        ? target.selector[0]
        : target.selector;
      iiifTarget = {
        type: 'SpecificResource' as const,
        source: 'source' in target ? (target.source as string) : canvasId,
        selector,
      };
    } else {
      // Fallback
      iiifTarget = canvasId;
    }
  }

  return {
    id: w3cAnnotation.id,
    type: 'Annotation',
    motivation,
    body: iiifBody,
    target: iiifTarget,
  };
}

// ---------------------------------------------------------------------------
// Style generator
// ---------------------------------------------------------------------------

/**
 * Create an Annotorious style function that responds to annotation
 * state (selected, hovered) and respects field mode theming.
 *
 * Returns a style function compatible with Annotorious setStyle().
 *
 * Pseudocode:
 * 1. Determine base color from params (field mode = yellow, default = green)
 * 2. Return a function that takes (annotation, state) and returns
 *    fill/stroke/width with adjustments for selected/hovered
 */
export function makeAnnotoriousStyle(params: {
  fieldMode?: boolean;
  color?: string;
  strokeWidth?: number;
  fillOpacity?: number;
}): (annotation: any, state?: { selected?: boolean; hovered?: boolean }) => Record<string, any> {
  const {
    fieldMode = false,
    color,
    strokeWidth = 2,
    fillOpacity = 0.1,
  } = params;

  const baseColor = color ?? (fieldMode ? '#eab308' : '#22c55e');

  return (_annotation: any, state?: { selected?: boolean; hovered?: boolean }) => {
    const isSelected = state?.selected ?? false;
    const isHovered = state?.hovered ?? false;

    // Compute fill opacity based on state
    let computedFillOpacity = fillOpacity;
    if (isSelected) {
      computedFillOpacity = Math.min(fillOpacity + 0.2, 0.5);
    } else if (isHovered) {
      computedFillOpacity = Math.min(fillOpacity + 0.15, 0.35);
    }

    // Compute stroke color based on state
    let strokeColor = baseColor;
    if (isSelected) {
      strokeColor = fieldMode ? '#fbbf24' : '#f59e0b';
    } else if (isHovered) {
      strokeColor = fieldMode ? '#fbbf24' : '#4ade80';
    }

    // Compute stroke width based on state
    let computedStrokeWidth = strokeWidth;
    if (isSelected) {
      computedStrokeWidth = strokeWidth + 1;
    } else if (isHovered) {
      computedStrokeWidth = strokeWidth + 0.5;
    }

    return {
      fill: baseColor,
      fillOpacity: computedFillOpacity,
      stroke: strokeColor,
      strokeWidth: computedStrokeWidth,
      strokeOpacity: 1,
    };
  };
}

// ---------------------------------------------------------------------------
// Annotation filtering helper
// ---------------------------------------------------------------------------

/**
 * Filter annotations to only spatial ones (SvgSelector or spatial
 * FragmentSelector). Excludes time-based FragmentSelectors.
 */
export function filterSpatialAnnotations(
  annotations: IIIFAnnotationLike[],
): IIIFAnnotationLike[] {
  return annotations.filter(a => {
    const target = a.target;
    if (typeof target === 'string') return false;
    const t = Array.isArray(target) ? target[0] : target;
    if (!t || typeof t === 'string') return false;
    const sel = Array.isArray(t.selector) ? t.selector[0] : t.selector;
    if (!sel) return false;

    // SvgSelector is always spatial
    if (sel.type === 'SvgSelector') return true;

    // FragmentSelector: spatial if NOT a time fragment
    if (sel.type === 'FragmentSelector') {
      const value = sel.value || '';
      // Time fragments start with 't='; spatial fragments start with 'xywh='
      return !value.startsWith('t=');
    }

    return false;
  });
}

// ---------------------------------------------------------------------------
// Svelte action
// ---------------------------------------------------------------------------

/**
 * Svelte action that bridges OpenSeadragon and Annotorious.
 *
 * Pseudocode:
 * 1. Wait for osdViewer to be available and open
 * 2. Initialize Annotorious on the OSD viewer (createOSDAnnotator)
 * 3. Set drawing tool, enabled state, and style
 * 4. Subscribe to create/update/delete/selection events
 * 5. Convert between IIIF and W3C formats at the boundary
 * 6. Load existing spatial annotations as W3C
 * 7. On update: diff params and apply changes (style, tool, annotations)
 * 8. On destroy: tear down Annotorious instance
 *
 * NOTE: The actual createOSDAnnotator call is stubbed since the
 * @annotorious/openseadragon library is a runtime dependency. The
 * format conversion, filtering, and style logic are fully functional.
 */
export const annotorious: Action<HTMLElement, AnnotoriousParams> = (
  node: HTMLElement,
  params: AnnotoriousParams,
) => {
  let annoInstance: any = null;
  let currentParams = params;

  // ---- Initialize Annotorious when OSD viewer is ready ----
  function init(): void {
    const viewer = currentParams.osdViewer;
    if (!viewer || !currentParams.canvasId) return;

    // Stub: In production, this would be:
    //   import { createOSDAnnotator, W3CImageFormat } from '@annotorious/openseadragon';
    //   annoInstance = createOSDAnnotator(viewer, {
    //     drawingEnabled: currentParams.drawingEnabled ?? false,
    //     adapter: W3CImageFormat(currentParams.canvasId),
    //   });
    //
    // For now, check if the library is available globally or skip
    const createOSDAnnotator = (globalThis as any).__annotorious__?.createOSDAnnotator;
    if (!createOSDAnnotator) {
      // Library not loaded; action is a no-op at runtime without the dependency.
      // All format conversion functions above are still usable standalone.
      return;
    }

    const W3CImageFormat = (globalThis as any).__annotorious__?.W3CImageFormat;

    annoInstance = createOSDAnnotator(viewer, {
      drawingEnabled: currentParams.drawingEnabled ?? false,
      adapter: W3CImageFormat?.(currentParams.canvasId),
    });

    // Apply style
    const styleFn = makeAnnotoriousStyle({
      fieldMode: currentParams.fieldMode,
      color: currentParams.style?.color,
      strokeWidth: currentParams.style?.strokeWidth,
      fillOpacity: currentParams.style?.fillOpacity,
    });
    annoInstance.setStyle(styleFn);

    // Set drawing tool
    if (currentParams.drawingTool) {
      annoInstance.setDrawingTool(currentParams.drawingTool);
    }

    // ---- Event handlers: convert W3C -> IIIF at the boundary ----

    const canvasId = currentParams.canvasId!;

    annoInstance.on('createAnnotation', (w3c: W3CAnnotationLike) => {
      const iiif = w3cToIIIF(w3c, canvasId);
      currentParams.onAnnotationCreate?.(iiif);
    });

    annoInstance.on('updateAnnotation', (w3c: W3CAnnotationLike) => {
      const iiif = w3cToIIIF(w3c, canvasId);
      currentParams.onAnnotationUpdate?.(iiif);
    });

    annoInstance.on('deleteAnnotation', (w3c: W3CAnnotationLike) => {
      const iiif = w3cToIIIF(w3c, canvasId);
      currentParams.onAnnotationDelete?.(iiif.id);
    });

    annoInstance.on('selectionChanged', (selected: W3CAnnotationLike[]) => {
      const first = selected[0];
      currentParams.onAnnotationSelect?.(
        first ? w3cToIIIF(first, canvasId) : null,
      );
    });

    annoInstance.on('mouseEnterAnnotation', (w3c: W3CAnnotationLike) => {
      currentParams.onMouseEnter?.(w3cToIIIF(w3c, canvasId));
    });

    annoInstance.on('mouseLeaveAnnotation', (w3c: W3CAnnotationLike) => {
      currentParams.onMouseLeave?.(w3cToIIIF(w3c, canvasId));
    });

    // Load existing spatial annotations
    loadAnnotations(currentParams.annotations ?? [], canvasId);
  }

  // ---- Load/sync IIIF annotations into Annotorious ----
  function loadAnnotations(
    annotations: IIIFAnnotationLike[],
    canvasId: string,
  ): void {
    if (!annoInstance) return;

    const spatial = filterSpatialAnnotations(annotations);
    if (spatial.length > 0) {
      const w3c = spatial.map(a => iiifToW3C(a, canvasId));
      annoInstance.setAnnotations(w3c);
    }
  }

  // ---- Try to initialize ----
  const viewer = params.osdViewer;
  if (viewer) {
    // If OSD is already open, init immediately; otherwise wait for 'open'
    if (viewer.isOpen?.()) {
      init();
    } else {
      viewer.addHandler?.('open', init);
    }
  }

  // ---- Return update/destroy for Svelte action protocol ----
  return {
    /**
     * Called by Svelte when action parameters change.
     *
     * Pseudocode:
     * 1. Diff old vs new params
     * 2. Update drawing enabled/tool if changed
     * 3. Update style if fieldMode or style options changed
     * 4. Reload annotations if annotation array changed
     * 5. If canvasId changed, destroy and reinitialize
     */
    update(newParams: AnnotoriousParams) {
      const prevParams = currentParams;
      currentParams = newParams;

      // If canvas changed, full reinitialize
      if (newParams.canvasId !== prevParams.canvasId) {
        if (annoInstance) {
          annoInstance.destroy();
          annoInstance = null;
        }
        init();
        return;
      }

      if (!annoInstance) {
        // Viewer may have become available
        if (newParams.osdViewer && !prevParams.osdViewer) {
          init();
        }
        return;
      }

      // Sync drawing enabled
      if (newParams.drawingEnabled !== prevParams.drawingEnabled) {
        annoInstance.setDrawingEnabled(newParams.drawingEnabled ?? false);
      }

      // Sync drawing tool
      if (newParams.drawingTool !== prevParams.drawingTool && newParams.drawingTool) {
        annoInstance.setDrawingTool(newParams.drawingTool);
      }

      // Sync style
      if (
        newParams.fieldMode !== prevParams.fieldMode ||
        newParams.style?.color !== prevParams.style?.color ||
        newParams.style?.strokeWidth !== prevParams.style?.strokeWidth ||
        newParams.style?.fillOpacity !== prevParams.style?.fillOpacity
      ) {
        const styleFn = makeAnnotoriousStyle({
          fieldMode: newParams.fieldMode,
          color: newParams.style?.color,
          strokeWidth: newParams.style?.strokeWidth,
          fillOpacity: newParams.style?.fillOpacity,
        });
        annoInstance.setStyle(styleFn);
      }

      // Sync annotations (reference equality check)
      if (
        newParams.annotations !== prevParams.annotations &&
        newParams.canvasId
      ) {
        loadAnnotations(
          newParams.annotations ?? [],
          newParams.canvasId,
        );
      }
    },

    destroy() {
      // Remove OSD open handler if we registered one
      const viewer = currentParams.osdViewer;
      if (viewer) {
        viewer.removeHandler?.('open', init);
      }

      // Destroy Annotorious instance
      if (annoInstance) {
        annoInstance.destroy();
        annoInstance = null;
      }
    },
  };
};
