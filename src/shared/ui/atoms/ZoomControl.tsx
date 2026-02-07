/**
 * ZoomControl Atom
 *
 * Zoom in/out/reset controls for IIIF viewer interfaces.
 * Composes Button atoms with zoom level display.
 *
 * ATOMIC DESIGN:
 * - Composes: Button atom
 * - Has local state: current zoom percentage display
 * - No domain logic (zoom state managed by viewer parent)
 *
 * IDEAL OUTCOME: Precise zoom control with clear level indication
 * FAILURE PREVENTED: Lost zoom state, imprecise zoom jumps
 *
 * @example
 * <ZoomControl
 *   zoom={1.5}
 *   min={0.5}
 *   max={5}
 *   step={0.25}
 *   onZoomChange={(z) => setZoom(z)}
 * />
 */

import React, { useCallback } from 'react';
import { Button } from '@/ui/primitives/Button';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface ZoomControlProps {
  /** Current zoom level (1 = 100%) */
  zoom: number;
  /** Minimum zoom level */
  min?: number;
  /** Maximum zoom level */
  max?: number;
  /** Zoom step increment */
  step?: number;
  /** Called when zoom changes */
  onZoomChange: (zoom: number) => void;
  /** Called when reset is clicked */
  onReset?: () => void;
  /** Fit-to-view handler */
  onFit?: () => void;
  /** Compact mode (no label) */
  compact?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Contextual styles from template (required for theming) */
  cx: ContextualClassNames;
  fieldMode?: boolean;
}

/**
 * ZoomControl Component
 *
 * Zoom controls with percentage display.
 */
export const ZoomControl: React.FC<ZoomControlProps> = ({
  zoom,
  min = 0.25,
  max = 5,
  step = 0.25,
  onZoomChange,
  onReset,
  onFit,
  compact = false,
  disabled = false,
  cx,
}) => {

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoom + step, max);
    onZoomChange(newZoom);
  }, [zoom, step, max, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoom - step, min);
    onZoomChange(newZoom);
  }, [zoom, step, min, onZoomChange]);

  const handleReset = useCallback(() => {
    if (onReset) {
      onReset();
    } else {
      onZoomChange(1);
    }
  }, [onReset, onZoomChange]);

  const canZoomIn = zoom < max;
  const canZoomOut = zoom > min;
  const canReset = zoom !== 1;

  // Format zoom as percentage
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      className={`
        inline-flex items-center gap-1
        rounded-lg border ${cx.border} ${cx.surface} p-1
      `}
      role="group"
      aria-label="Zoom controls"
    >
      {/* Zoom Out */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleZoomOut}
        disabled={disabled || !canZoomOut}
        aria-label="Zoom out"
        className="!px-2"
      >
        <span className="material-icons">remove</span>
      </Button>

      {/* Zoom Level Display */}
      <div
        className={`
          min-w-[60px] text-center text-sm font-medium
          ${cx.text} select-none
        `}
        aria-live="polite"
        aria-atomic="true"
      >
        {zoomPercent}%
      </div>

      {/* Zoom In */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleZoomIn}
        disabled={disabled || !canZoomIn}
        aria-label="Zoom in"
        className="!px-2"
      >
        <span className="material-icons">add</span>
      </Button>

      {/* Divider */}
      <div className={`w-px h-6 ${cx.divider} mx-1`} />

      {/* Reset / Fit */}
      {!compact && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={disabled || !canReset}
            aria-label="Reset zoom"
          >
            100%
          </Button>

          {onFit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onFit}
              disabled={disabled}
              aria-label="Fit to view"
              className="!px-2"
            >
              <span className="material-icons">fit_screen</span>
            </Button>
          )}
        </>
      )}
    </div>
  );
};
