/**
 * MediaErrorOverlay Atom
 *
 * Error state display overlay for media player.
 * Shows error messages with appropriate iconography.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (pure presentational)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/MediaErrorOverlay
 */

import React from 'react';
import { Button } from '@/ui/primitives/Button';
import { Icon } from '@/src/shared/ui/atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export type MediaErrorType =
  | 'aborted'
  | 'network'
  | 'decode'
  | 'format'
  | 'unknown';

export interface MediaErrorOverlayProps {
  /** Error message to display */
  message: string;
  /** Type of error for icon selection */
  errorType?: MediaErrorType;
  /** Callback to retry loading */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

const errorIcons: Record<MediaErrorType, string> = {
  aborted: 'stop_circle',
  network: 'wifi_off',
  decode: 'broken_image',
  format: 'video_file',
  unknown: 'error_outline',
};

const defaultMessages: Record<MediaErrorType, string> = {
  aborted: 'Media loading was aborted',
  network: 'Network error while loading media',
  decode: 'Media decoding failed',
  format: 'Media format not supported',
  unknown: 'An unknown error occurred',
};

export const MediaErrorOverlay: React.FC<MediaErrorOverlayProps> = ({
  message,
  errorType = 'unknown',
  onRetry,
  className = '',
  cx: _cx,
  fieldMode = false,
}) => {
  const displayMessage = message || defaultMessages[errorType];
  const iconName = errorIcons[errorType];

  const bgClass = fieldMode ? 'bg-slate-900/90' : 'bg-black/80';
  const iconColor = fieldMode ? 'text-red-400' : 'text-red-400';
  const titleColor = fieldMode ? 'text-yellow-400' : 'text-white';
  const messageColor = fieldMode ? 'text-slate-300' : 'text-slate-300';

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center z-20 ${bgClass} ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="text-center p-6 max-w-md">
        <Icon
          name={iconName}
          className={`text-5xl ${iconColor} mb-4`}
          label="Error"
        />
        <h3 className={`text-lg font-medium mb-2 ${titleColor}`}>
          Media Error
        </h3>
        <p className={`text-sm mb-4 ${messageColor}`}>
          {displayMessage}
        </p>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant={fieldMode ? 'primary' : 'primary'}
            size="base"
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  );
};

export default MediaErrorOverlay;
