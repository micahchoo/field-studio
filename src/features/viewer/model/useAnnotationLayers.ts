/**
 * useAnnotationLayers Hook
 *
 * Manages annotation page visibility as toggleable layers.
 * Reads non-painting annotation pages from a canvas and provides
 * per-layer toggle, color assignment, and filtered annotation lists.
 *
 * @see https://iiif.io/api/presentation/3.0/#annotationpage
 */

import { useCallback, useMemo, useState } from 'react';
import type { IIIFAnnotation, IIIFAnnotationPage, IIIFCanvas } from '@/src/shared/types';
import { getIIIFValue } from '@/src/shared/types';

// Auto-assigned layer colors
const LAYER_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#a855f7', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
];

export interface AnnotationLayer {
  /** AnnotationPage ID */
  id: string;
  /** Human-readable label from page label or motivation */
  label: string;
  /** Primary motivation of annotations in this layer */
  motivation: string;
  /** Number of annotations in this layer */
  annotationCount: number;
  /** Whether this layer is currently visible */
  visible: boolean;
  /** Auto-assigned color for visual distinction */
  color: string;
  /** Whether the page has behavior: ['hidden'] */
  hidden: boolean;
  /** Layer opacity 0-1 (default 1) */
  opacity: number;
}

export interface UseAnnotationLayersReturn {
  /** All annotation layers for the current canvas */
  layers: AnnotationLayer[];
  /** Toggle visibility of a single layer */
  toggleLayer: (id: string) => void;
  /** Set all layers visible or hidden */
  setAllVisible: (visible: boolean) => void;
  /** Set opacity for a specific layer */
  setLayerOpacity: (id: string, opacity: number) => void;
  /** All annotations from currently visible layers */
  visibleAnnotations: IIIFAnnotation[];
  /** Color assigned to a specific annotation (by its layer) */
  getAnnotationColor: (annotationId: string) => string;
  /** Opacity for a specific annotation (by its layer) */
  getAnnotationOpacity: (annotationId: string) => number;
}

/**
 * Determine if an annotation page contains painting annotations.
 */
function isPaintingPage(page: IIIFAnnotationPage): boolean {
  if (!page.items?.length) return false;
  return page.items.some(anno => {
    const m = anno.motivation;
    return m === 'painting' || (Array.isArray(m) && m.includes('painting'));
  });
}

/**
 * Get the primary motivation from a list of annotations.
 */
function getPrimaryMotivation(items: IIIFAnnotation[]): string {
  if (!items.length) return 'unknown';
  const m = items[0].motivation;
  if (Array.isArray(m)) return m[0] || 'unknown';
  return m || 'unknown';
}

export function useAnnotationLayers(canvas: IIIFCanvas | null): UseAnnotationLayersReturn {
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>({});
  const [opacityMap, setOpacityMap] = useState<Record<string, number>>({});

  // Build layer model from canvas annotation pages
  const { layers, annotationsByLayer } = useMemo(() => {
    if (!canvas?.annotations?.length) {
      return { layers: [] as AnnotationLayer[], annotationsByLayer: {} as Record<string, IIIFAnnotation[]> };
    }

    // Also check canvas.items for non-painting pages
    const allPages: IIIFAnnotationPage[] = [
      ...(canvas.annotations || []),
    ];

    // Filter to non-painting pages
    const nonPaintingPages = allPages.filter(page => !isPaintingPage(page));

    const layerList: AnnotationLayer[] = [];
    const annoMap: Record<string, IIIFAnnotation[]> = {};

    nonPaintingPages.forEach((page, index) => {
      const items = page.items || [];
      const motivation = getPrimaryMotivation(items);
      const pageBehaviors = (page as unknown as { behavior?: string[] }).behavior || [];
      const isHidden = pageBehaviors.includes('hidden');
      const label = getIIIFValue(page.label) ||
        motivation.charAt(0).toUpperCase() + motivation.slice(1);

      annoMap[page.id] = items;

      layerList.push({
        id: page.id,
        label,
        motivation,
        annotationCount: items.length,
        visible: visibilityMap[page.id] !== undefined
          ? visibilityMap[page.id]
          : !isHidden,
        color: LAYER_COLORS[index % LAYER_COLORS.length],
        hidden: isHidden,
        opacity: opacityMap[page.id] ?? 1,
      });
    });

    return { layers: layerList, annotationsByLayer: annoMap };
  }, [canvas?.id, canvas?.annotations, visibilityMap, opacityMap]);

  const toggleLayer = useCallback((id: string) => {
    setVisibilityMap(prev => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : false, // first toggle hides
    }));
  }, []);

  const setLayerOpacity = useCallback((id: string, opacity: number) => {
    setOpacityMap(prev => ({ ...prev, [id]: Math.max(0, Math.min(1, opacity)) }));
  }, []);

  const setAllVisible = useCallback((visible: boolean) => {
    setVisibilityMap(prev => {
      const next = { ...prev };
      for (const layer of layers) {
        next[layer.id] = visible;
      }
      return next;
    });
  }, [layers]);

  // Collect annotations from visible layers
  const visibleAnnotations = useMemo(() => {
    const result: IIIFAnnotation[] = [];
    for (const layer of layers) {
      if (layer.visible && annotationsByLayer[layer.id]) {
        result.push(...annotationsByLayer[layer.id]);
      }
    }
    return result;
  }, [layers, annotationsByLayer]);

  // Build a quick lookup from annotation ID to layer color
  const annotationColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const layer of layers) {
      const annos = annotationsByLayer[layer.id] || [];
      for (const anno of annos) {
        map[anno.id] = layer.color;
      }
    }
    return map;
  }, [layers, annotationsByLayer]);

  const getAnnotationColor = useCallback(
    (annotationId: string) => annotationColorMap[annotationId] || '#6b7280',
    [annotationColorMap]
  );

  // Build annotation-to-opacity lookup
  const annotationOpacityMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const layer of layers) {
      const annos = annotationsByLayer[layer.id] || [];
      for (const anno of annos) {
        map[anno.id] = layer.opacity;
      }
    }
    return map;
  }, [layers, annotationsByLayer]);

  const getAnnotationOpacity = useCallback(
    (annotationId: string) => annotationOpacityMap[annotationId] ?? 1,
    [annotationOpacityMap]
  );

  return {
    layers,
    toggleLayer,
    setAllVisible,
    setLayerOpacity,
    visibleAnnotations,
    getAnnotationColor,
    getAnnotationOpacity,
  };
}
