/**
 * AnnotationCanvas Molecule
 *
 * Canvas area for drawing annotations with SVG overlay.
 */

import React from 'react';
import type { IIIFAnnotation, IIIFCanvas } from '@/types';
import type { Point } from '@/constants/viewport';
import { parseSvgSelector, pointsToSvgPath } from '../../model/annotation';

export interface AnnotationCanvasProps {
  canvas: IIIFCanvas;
  imageUrl: string;
  points: Point[];
  freehandPoints: Point[];
  existingAnnotations: IIIFAnnotation[];
  showExisting: boolean;
  isDrawing: boolean;
  scale: number;
  offset: { x: number; y: number };
  containerRef: React.RefObject<HTMLDivElement>;
  imageRef: React.RefObject<HTMLImageElement>;
  onMouseMove: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  canvas,
  imageUrl,
  points,
  freehandPoints,
  existingAnnotations,
  showExisting,
  isDrawing,
  scale,
  offset,
  containerRef,
  imageRef,
  onMouseMove,
  onClick,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
}) => {
  const existingSvgAnnotations = existingAnnotations.filter((anno) => {
    const selector = (anno.target as any)?.selector;
    return selector?.type === 'SvgSelector';
  });

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-slate-950 cursor-crosshair"
      onMouseMove={onMouseMove}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="absolute"
        style={{
          left: offset.x,
          top: offset.y,
          width: canvas.width * scale,
          height: canvas.height * scale,
        }}
      >
        {/* Base Image */}
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Canvas"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          draggable={false}
        />

        {/* SVG Drawing Layer */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${canvas.width} ${canvas.height}`}
          preserveAspectRatio="none"
        >
          {/* Existing Annotations */}
          {showExisting &&
            existingSvgAnnotations.map((anno) => {
              const selector = (anno.target as any)?.selector;
              const existingPoints = parseSvgSelector(selector?.value || '');
              if (existingPoints.length < 3) return null;

              return (
                <path
                  key={anno.id}
                  d={pointsToSvgPath(existingPoints, true)}
                  fill="rgba(59, 130, 246, 0.15)"
                  stroke="rgba(59, 130, 246, 0.8)"
                  strokeWidth={2}
                />
              );
            })}

          {/* Freehand Preview */}
          {freehandPoints.length > 1 && (
            <path
              d={pointsToSvgPath(freehandPoints, false)}
              fill="none"
              stroke="rgba(34, 197, 94, 0.8)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Current Drawing */}
          {points.length >= 2 && (
            <>
              <polyline
                points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="rgba(34, 197, 94, 1)"
                strokeWidth={2}
                strokeDasharray={isDrawing ? '5,5' : 'none'}
              />
              {points.length >= 3 && (
                <path
                  d={pointsToSvgPath(points, !isDrawing)}
                  fill={isDrawing ? 'none' : 'rgba(34, 197, 94, 0.2)'}
                  stroke="rgba(34, 197, 94, 1)"
                  strokeWidth={2}
                  strokeDasharray={isDrawing ? '5,5' : 'none'}
                />
              )}
            </>
          )}

          {/* Point Markers */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={6} fill={i === 0 ? 'rgba(34, 197, 94, 1)' : 'white'} />
              <text x={p.x + 10} y={p.y} fill="white" fontSize="12">
                {i + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};
