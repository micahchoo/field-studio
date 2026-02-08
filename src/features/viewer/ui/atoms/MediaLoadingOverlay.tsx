/**
 * MediaLoadingOverlay Atom
 *
 * Loading/buffering state display overlay for media player.
 * Shows spinner with optional loading message.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (pure presentational)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/MediaLoadingOverlay
 */

import React from 'react';
export interface MediaLoadingOverlayProps {
  /** Optional loading message to display */
  message?: string;
  /** Size of the spinner */
  spinnerSize?: 'sm' | 'md' | 'lg';
  /** Opacity of the overlay background */
  opacity?: 'light' | 'medium' | 'dark';
  /** Additional CSS classes */
  className?: string;
  /** Field mode flag */
  fieldMode?: boolean;
}

const spinnerSizes = {
  sm: { width: '24px', height: '24px', border: '3px' },
  md: { width: '48px', height: '48px', border: '4px' },
  lg: { width: '64px', height: '64px', border: '5px' },
};

const opacityClasses = {
  light: 'bg-nb-black/30',
  medium: 'bg-nb-black/50',
  dark: 'bg-nb-black/70',
};

export const MediaLoadingOverlay: React.FC<MediaLoadingOverlayProps> = ({
  message,
  spinnerSize = 'md',
  opacity = 'medium',
  className = '',
  fieldMode = false,
}) => {
  const size = spinnerSizes[spinnerSize];
  const bgClass = fieldMode ? 'bg-nb-black/60' : opacityClasses[opacity];

  const spinnerColor = fieldMode ? '#facc15' : '#ffffff';
  const textColor = fieldMode ? 'text-nb-yellow' : 'text-white';

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center z-20 ${bgClass} ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className=" animate-spin"
        style={{
          width: size.width,
          height: size.height,
          border: `${size.border} solid rgba(255, 255, 255, 0.2)`,
          borderTopColor: spinnerColor,
        }}
        aria-hidden="true"
      />
      {message && (
        <p className={`mt-4 text-sm ${textColor} text-center px-4`}>
          {message}
        </p>
      )}
      <span className="sr-only">Loading media...</span>
    </div>
  );
};

export default MediaLoadingOverlay;
