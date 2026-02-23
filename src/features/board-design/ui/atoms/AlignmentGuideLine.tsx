/**
 * AlignmentGuideLine Atom
 *
 * SVG line elements for alignment guides during drag.
 *
 * @module features/board-design/ui/atoms/AlignmentGuideLine
 */

import React from 'react';
import type { AlignmentGuide } from '../../hooks/useAlignmentGuides';

export interface AlignmentGuideLineProps {
  guides: AlignmentGuide[];
  canvasSize: { width: number; height: number };
}

export const AlignmentGuideLine: React.FC<AlignmentGuideLineProps> = ({ guides, canvasSize }) => {
  if (guides.length === 0) return null;

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
      {guides.map((guide, i) =>
        guide.type === 'vertical' ? (
          <line
            key={`v-${i}`}
            x1={guide.position}
            y1={0}
            x2={guide.position}
            y2={canvasSize.height}
            stroke="#e879f9"
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={0.6}
          />
        ) : (
          <line
            key={`h-${i}`}
            x1={0}
            y1={guide.position}
            x2={canvasSize.width}
            y2={guide.position}
            stroke="#22d3ee"
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={0.6}
          />
        )
      )}
    </svg>
  );
};
