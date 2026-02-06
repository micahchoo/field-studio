/**
 * ViewportControls Component
 *
 * Reusable UI control bar for viewport manipulation.
 * Provides consistent zoom, rotation, and reset controls across all viewers.
 */

import React from 'react';
import type { UseViewportReturn } from '../hooks/useViewport';
import { VIEWPORT_DEFAULTS } from '../constants/viewport';
import { Icon } from '@/src/shared/ui/atoms/Icon';

// ============================================================================
// Types
// ============================================================================

export interface ViewportControlsProps {
  /** Viewport hook return value */
  viewport: UseViewportReturn;
  /** Show zoom in/out buttons */
  showZoom?: boolean;
  /** Show zoom percentage display */
  showZoomPercent?: boolean;
  /** Show rotation controls */
  showRotation?: boolean;
  /** Show reset button */
  showReset?: boolean;
  /** Show fit-to-view button */
  showFitToView?: boolean;
  /** Callback when fit-to-view is clicked */
  onFitToView?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Position of the control bar */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom-center';
  /** Compact mode (smaller buttons) */
  compact?: boolean;
  /** Vertical layout instead of horizontal */
  vertical?: boolean;
}

// ============================================================================
// Position Classes
// ============================================================================

const POSITION_CLASSES: Record<NonNullable<ViewportControlsProps['position']>, string> = {
  'top-left': 'top-2 left-2',
  'top-right': 'top-2 right-2',
  'bottom-left': 'bottom-2 left-2',
  'bottom-right': 'bottom-2 right-2',
  'bottom-center': 'bottom-2 left-1/2 -translate-x-1/2',
};

// ============================================================================
// Component
// ============================================================================

export function ViewportControls({
  viewport,
  showZoom = true,
  showZoomPercent = true,
  showRotation = false,
  showReset = true,
  showFitToView = false,
  onFitToView,
  className = '',
  position = 'bottom-right',
  compact = false,
  vertical = false,
}: ViewportControlsProps): React.ReactElement {
  const { zoomIn, zoomOut, rotate, reset, scalePercent, config } = viewport;

  const buttonSize = compact ? 'h-7 w-7 text-sm' : 'h-8 w-8 text-base';
  const iconSize = compact ? 'text-sm' : 'text-lg';
  const layoutClass = vertical ? 'flex-col' : 'flex-row';

  // Check if scale is at limits
  const isAtMinScale = viewport.viewport.scale <= config.minScale;
  const isAtMaxScale = viewport.viewport.scale >= config.maxScale;

  return (
    <div
      className={`
        absolute ${POSITION_CLASSES[position]} z-10
        flex ${layoutClass} items-center gap-1
        bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm
        rounded-lg shadow-md border border-gray-200 dark:border-gray-700
        p-1
        ${className}
      `}
    >
      {/* Zoom Controls */}
      {showZoom && (
        <>
          <button
            type="button"
            onClick={zoomOut}
            disabled={isAtMinScale}
            className={`
              ${buttonSize} flex items-center justify-center
              rounded hover:bg-gray-100 dark:hover:bg-gray-700
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors
            `}
            title="Zoom out (-)"
            aria-label="Zoom out"
          >
            <Icon name="remove" className={iconSize} />
          </button>

          {showZoomPercent && (
            <span
              className={`
                ${compact ? 'min-w-[40px] text-xs' : 'min-w-[48px] text-sm'}
                text-center font-mono text-gray-700 dark:text-gray-300
                select-none
              `}
              title={`${scalePercent}% zoom`}
            >
              {scalePercent}%
            </span>
          )}

          <button
            type="button"
            onClick={zoomIn}
            disabled={isAtMaxScale}
            className={`
              ${buttonSize} flex items-center justify-center
              rounded hover:bg-gray-100 dark:hover:bg-gray-700
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors
            `}
            title="Zoom in (+)"
            aria-label="Zoom in"
          >
            <Icon name="add" className={iconSize} />
          </button>
        </>
      )}

      {/* Separator */}
      {showZoom && (showRotation || showReset || showFitToView) && (
        <div
          className={`
            ${vertical ? 'w-full h-px' : 'h-full w-px'}
            bg-gray-200 dark:bg-gray-600 mx-1
          `}
        />
      )}

      {/* Fit to View */}
      {showFitToView && onFitToView && (
        <button
          type="button"
          onClick={onFitToView}
          className={`
            ${buttonSize} flex items-center justify-center
            rounded hover:bg-gray-100 dark:hover:bg-gray-700
            transition-colors
          `}
          title="Fit to view"
          aria-label="Fit to view"
        >
          <Icon name="fit_screen" className={iconSize} />
        </button>
      )}

      {/* Rotation Controls */}
      {showRotation && config.enableRotation && (
        <>
          <button
            type="button"
            onClick={() => rotate(-VIEWPORT_DEFAULTS.ROTATION_STEP)}
            className={`
              ${buttonSize} flex items-center justify-center
              rounded hover:bg-gray-100 dark:hover:bg-gray-700
              transition-colors
            `}
            title="Rotate counter-clockwise (Shift+R)"
            aria-label="Rotate counter-clockwise"
          >
            <Icon name="rotate_left" className={iconSize} />
          </button>

          <button
            type="button"
            onClick={() => rotate(VIEWPORT_DEFAULTS.ROTATION_STEP)}
            className={`
              ${buttonSize} flex items-center justify-center
              rounded hover:bg-gray-100 dark:hover:bg-gray-700
              transition-colors
            `}
            title="Rotate clockwise (R)"
            aria-label="Rotate clockwise"
          >
            <Icon name="rotate_right" className={iconSize} />
          </button>
        </>
      )}

      {/* Reset */}
      {showReset && (
        <button
          type="button"
          onClick={reset}
          className={`
            ${buttonSize} flex items-center justify-center
            rounded hover:bg-gray-100 dark:hover:bg-gray-700
            transition-colors
          `}
          title="Reset view (Ctrl/Cmd+0)"
          aria-label="Reset view"
        >
          <Icon name="restart_alt" className={iconSize} />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Minimal Inline Controls (for tight spaces)
// ============================================================================

export interface InlineZoomControlsProps {
  viewport: UseViewportReturn;
  className?: string;
}

export function InlineZoomControls({
  viewport,
  className = '',
}: InlineZoomControlsProps): React.ReactElement {
  const { zoomIn, zoomOut, scalePercent, config } = viewport;

  const isAtMinScale = viewport.viewport.scale <= config.minScale;
  const isAtMaxScale = viewport.viewport.scale >= config.maxScale;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={zoomOut}
        disabled={isAtMinScale}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
        title="Zoom out"
      >
        <Icon name="remove" className="text-sm" />
      </button>
      <span className="text-xs font-mono min-w-[36px] text-center">{scalePercent}%</span>
      <button
        type="button"
        onClick={zoomIn}
        disabled={isAtMaxScale}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
        title="Zoom in"
      >
        <Icon name="add" className="text-sm" />
      </button>
    </div>
  );
}

export default ViewportControls;
