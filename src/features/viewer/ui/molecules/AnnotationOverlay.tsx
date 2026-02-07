/**
 * AnnotationOverlay Molecule
 *
 * Composes: SVG elements for annotation rendering
 *
 * Renders IIIF annotations as SVG overlays on the viewer canvas.
 * Supports W3C Media Fragments and SVG selectors.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props (no hook calls)
 * - Renders SVG annotations
 * - Local UI state only
 * - No domain logic
 *
 * IDEAL OUTCOME: Visual annotation overlay synchronized with viewer
 * FAILURE PREVENTED: Annotation misalignment, rendering errors
 *
 * @module features/viewer/ui/molecules/AnnotationOverlay
 */

import React, { useMemo } from 'react';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

/** IIIF Annotation structure */
export interface IIIFAnnotation {
  id: string;
  type: 'Annotation';
  motivation?: string;
  body?: {
    type: string;
    value?: string;
    format?: string;
  } | Array<{
    type: string;
    value?: string;
    format?: string;
  }>;
  target?: string | {
    id?: string;
    selector?: {
      type: string;
      value?: string;
      region?: string;
    };
  };
}

export interface AnnotationOverlayProps {
  /** Annotations to render */
  annotations: IIIFAnnotation[];
  /** Canvas dimensions */
  canvasWidth: number;
  /** Canvas height */
  canvasHeight: number;
  /** Currently selected annotation ID */
  selectedId?: string | null;
  /** Called when annotation is clicked */
  onAnnotationClick?: (annotation: IIIFAnnotation) => void;
  /** Whether annotations are visible */
  visible?: boolean;
  /** Contextual styles from template */
  cx?: ContextualClassNames;
  /** Current field mode */
  fieldMode?: boolean;
}

/**
 * Parse W3C Media Fragment region (xywh format)
 */
const parseRegion = (region: string): { x: number; y: number; w: number; h: number } | null => {
  const match = region.match(/xywh=(\d+),(\d+),(\d+),(\d+)/);
  if (!match) return null;
  return {
    x: parseInt(match[1], 10),
    y: parseInt(match[2], 10),
    w: parseInt(match[3], 10),
    h: parseInt(match[4], 10),
  };
};

/**
 * Parse SVG path from selector
 */
const parseSvgPath = (value: string): string | null => {
  // Extract path from SVG <path> element
  const match = value.match(/<path[^>]*d="([^"]*)"/);
  return match ? match[1] : value;
};

/**
 * AnnotationOverlay Molecule
 *
 * @example
 * <AnnotationOverlay
 *   annotations={annotations}
 *   canvasWidth={1000}
 *   canvasHeight={1500}
 *   selectedId={selectedAnnotationId}
 *   onAnnotationClick={handleAnnotationClick}
 *   cx={cx}
 *   fieldMode={fieldMode}
 * />
 */
export const AnnotationOverlay: React.FC<AnnotationOverlayProps> = ({
  annotations,
  canvasWidth,
  canvasHeight,
  selectedId,
  onAnnotationClick,
  visible = true,
  fieldMode = false,
}) => {
  const renderedAnnotations = useMemo(() => {
    return annotations.map((annotation) => {
      const isSelected = annotation.id === selectedId;
      const {target} = annotation;

      // Extract region from target
      let region: { x: number; y: number; w: number; h: number } | null = null;
      let path: string | null = null;

      if (typeof target === 'string') {
        // Parse URL with fragment
        const [, fragment] = target.split('#');
        if (fragment) {
          region = parseRegion(fragment);
        }
      } else if (target?.selector) {
        const { selector } = target;
        if (selector.type === 'FragmentSelector' && selector.value) {
          region = parseRegion(selector.value);
        } else if (selector.type === 'SvgSelector' && selector.value) {
          path = parseSvgPath(selector.value);
        }
      }

      return {
        annotation,
        isSelected,
        region,
        path,
      };
    });
  }, [annotations, selectedId]);

  if (!visible || annotations.length === 0) return null;

  const strokeColor = fieldMode ? '#4ade80' : '#22c55e';
  const fillColor = fieldMode ? 'rgba(74, 222, 128, 0.1)' : 'rgba(34, 197, 94, 0.1)';
  const selectedStrokeColor = fieldMode ? '#fbbf24' : '#f59e0b';
  const selectedFillColor = fieldMode ? 'rgba(251, 191, 36, 0.2)' : 'rgba(245, 158, 11, 0.2)';

  return (
    <svg
      className="absolute inset-0 pointer-events-auto"
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%' }}
    >
      {renderedAnnotations.map(({ annotation, isSelected, region, path }) => {
        const commonProps = {
          key: annotation.id,
          onClick: () => onAnnotationClick?.(annotation),
          style: { cursor: onAnnotationClick ? 'pointer' : 'default' },
          stroke: isSelected ? selectedStrokeColor : strokeColor,
          strokeWidth: isSelected ? 3 : 2,
          fill: isSelected ? selectedFillColor : fillColor,
        };

        if (region) {
          return (
            <rect
              {...commonProps}
              x={region.x}
              y={region.y}
              width={region.w}
              height={region.h}
            />
          );
        }

        if (path) {
          return <path {...commonProps} d={path} />;
        }

        return null;
      })}
    </svg>
  );
};

export default AnnotationOverlay;
