/**
 * BoardControls Molecule
 *
 * Pan/zoom/reset controls for canvas viewport.
 * Composes ZoomControl atom from viewer feature.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Composes ZoomControl atom and Button atom
 * - No native HTML elements
 * - No domain logic
 * - Props-only API
 *
 * @module features/board-design/ui/molecules/BoardControls
 */

import React from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { ZoomControl } from '@/src/features/viewer/ui/atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface BoardControlsProps {
  /** Current viewport state */
  viewport: { x: number; y: number; zoom: number };
  /** Callback when viewport changes */
  onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void;
  /** Contextual styles */
  cx: ContextualClassNames;
  /** Field mode flag */
  fieldMode: boolean;
}

export const BoardControls: React.FC<BoardControlsProps> = ({
  viewport,
  onViewportChange,
  cx,
  fieldMode: _fieldMode,
}) => {
  const handleZoomChange = (zoom: number) => {
    onViewportChange({ ...viewport, zoom });
  };

  const handleFit = () => {
    onViewportChange({ x: 0, y: 0, zoom: 1 });
  };

  return (
    <div className="absolute bottom-4 right-4 flex items-center gap-2">
      <ZoomControl
        zoom={viewport.zoom}
        min={0.3}
        max={3}
        step={0.2}
        onZoomChange={handleZoomChange}
        onFit={handleFit}
        cx={cx}
      />
      <Button
        onClick={handleFit}
        variant="secondary"
        size="sm"
        aria-label="Fit to view"
      >
        Fit
      </Button>
    </div>
  );
};

export default BoardControls;
