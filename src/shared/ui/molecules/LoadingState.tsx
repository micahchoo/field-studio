/**
 * LoadingState Molecule
 *
 * Composes: Spinner + loading message
 *
 * Standardized loading placeholder while content loads.
 * Shows animated spinner and optional status message.
 *
 * IDEAL OUTCOME: Clear loading indicator with optional message
 * FAILURE PREVENTED: Stale content or unclear loading state
 */

import React, { useMemo } from 'react';
import { useContextualStyles } from '../../../hooks/useContextualStyles';
import { useAppSettings } from '../../../hooks/useAppSettings';

export interface LoadingStateProps {
  /** Optional status/progress message */
  message?: string;
  /** Optional aria-label for accessibility */
  ariaLabel?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show a large centered spinner (vs inline) */
  centered?: boolean;
}

/**
 * LoadingState Molecule
 *
 * @example
 * {isLoading ? (
 *   <LoadingState message="Loading archive..." centered />
 * ) : (
 *   <Content />
 * )}
 *
 * @example
 * <LoadingState message="Processing files..." />
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  ariaLabel = message,
  className = '',
  centered = true,
}) => {
  // Theme via context
  const { settings } = useAppSettings();
  const cx = useContextualStyles(settings.fieldMode);

  // Memoize spinner SVG
  const spinnerSvg = useMemo(
    () => (
      <svg
        className="w-8 h-8 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    ),
    []
  );

  if (centered) {
    return (
      <div
        className={`
          flex flex-col items-center justify-center
          py-12 px-6 min-h-[300px]
          ${className}
        `}
        role="status"
        aria-label={ariaLabel}
      >
        {/* Spinner */}
        <div
          className={`
            mb-4
            ${settings.fieldMode ? 'text-yellow-400' : 'text-iiif-blue'}
          `}
        >
          {spinnerSvg}
        </div>

        {/* Message */}
        {message && (
          <p
            className={`
              text-sm font-medium
              ${settings.fieldMode ? 'text-slate-300' : 'text-slate-600'}
            `}
          >
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`
        flex items-center gap-3 p-4
        ${className}
      `}
      role="status"
      aria-label={ariaLabel}
    >
      {/* Inline Spinner */}
      <div
        className={`
          flex-shrink-0
          ${settings.fieldMode ? 'text-yellow-400' : 'text-iiif-blue'}
        `}
      >
        {spinnerSvg}
      </div>

      {/* Message */}
      {message && (
        <p
          className={`
            text-sm font-medium
            ${settings.fieldMode ? 'text-slate-300' : 'text-slate-600'}
          `}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingState;
