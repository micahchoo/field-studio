/**
 * LoadingState Molecule
 *
 * Composes: Spinner/skeleton/progress + message
 *
 * Standardized loading indicator with fieldmode-aware styling.
 * Provides visual feedback during async operations.
 * 
 * CHANGES:
 * - Added progress bar support for long-running operations
 * - Added progress percentage display
 * - Better visual feedback for search indexing
 *
 * IDEAL OUTCOME: Clear loading feedback prevents user confusion
 * FAILURE PREVENTED: Unclear state — user doesn't know if app is working
 */

import React from 'react';
import { Icon } from '../atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';
import { UI_TIMING } from '../../config/tokens';

export interface LoadingStateProps {
  /** Optional status message */
  message?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Full container height (centered) */
  fullHeight?: boolean;
  /** Show skeleton placeholder instead of spinner */
  skeleton?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Contextual styles from template */
  cx?: ContextualClassNames;
  /** Current field mode */
  fieldMode?: boolean;
  /** Show progress bar (0-100) */
  progress?: number;
  /** Show spinner animation */
  spinner?: boolean;
  /** Secondary status text */
  statusText?: string;
}

const sizeClasses = {
  sm: { icon: 'text-lg', spinner: 'w-5 h-5', text: 'text-sm' },
  md: { icon: 'text-2xl', spinner: 'w-8 h-8', text: 'text-base' },
  lg: { icon: 'text-4xl', spinner: 'w-12 h-12', text: 'text-lg' },
};

/**
 * Progress bar component
 */
const ProgressBar: React.FC<{
  progress: number;
  fieldMode?: boolean;
  cx?: ContextualClassNames;
}> = ({ progress, fieldMode, cx }) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  return (
    <div className="w-full max-w-xs">
      <div className="flex justify-between items-center mb-1.5">
        <span className={`text-xs ${cx?.textMuted || 'text-slate-500'}`}>
          Processing...
        </span>
        <span className={`text-xs font-semibold ${fieldMode ? 'text-blue-400' : 'text-blue-600'}`}>
          {Math.round(clampedProgress)}%
        </span>
      </div>
      <div className={`
        h-2 rounded-full overflow-hidden
        ${fieldMode ? 'bg-slate-800' : 'bg-slate-200'}
      `}>
        <div
          className={`
            h-full rounded-full transition-all duration-300 ease-out
            ${fieldMode 
              ? 'bg-gradient-to-r from-blue-600 to-blue-400' 
              : 'bg-gradient-to-r from-blue-600 to-blue-400'
            }
          `}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

/**
 * LoadingState Molecule
 *
 * @example
 * // Simple spinner
 * <LoadingState message="Loading archive..." size="lg" fullHeight />
 * 
 * @example
 * // With progress
 * <LoadingState 
 *   message="Updating Search Index..." 
 *   progress={45}
 *   statusText="Processing manifest 23 of 50..."
 *   fullHeight 
 * />
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  fullHeight = false,
  skeleton = false,
  className = '',
  cx = {},
  fieldMode: _fieldMode = false,
  progress,
  spinner = false,
  statusText,
}) => {
  const sizeClass = sizeClasses[size];
  const hasProgress = progress !== undefined && progress >= 0;

  if (skeleton) {
    return (
      <div
        className={`
          animate-pulse
          ${fullHeight ? 'h-full flex items-center justify-center' : ''}
          ${className}
        `}
        role="status"
        aria-label={message}
      >
        <div className={`${cx.subtleBg} rounded-md w-full h-24`} />
      </div>
    );
  }

  return (
    <div
      className={`
        flex flex-col items-center justify-center gap-4
        ${fullHeight ? 'h-full min-h-[200px]' : 'py-8'}
        ${className}
      `}
      role="status"
      aria-live="polite"
    >
      {/* Spinner animation or progress */}
      {hasProgress ? (
        <ProgressBar progress={progress} fieldMode={_fieldMode} cx={cx} />
      ) : (
        <div className="relative">
          {/* Outer ring */}
          <div
            className={`
              ${sizeClass.spinner}
              rounded-full
              border-2 ${_fieldMode ? 'border-slate-700' : 'border-slate-200'}
              border-t-transparent
              animate-spin
            `}
            style={{ animationDuration: `${UI_TIMING.animation * 2}ms` }}
            aria-hidden="true"
          />

          {/* Center icon */}
          <div
            className={`
              absolute inset-0
              flex items-center justify-center
              ${sizeClass.icon} ${cx.textMuted || 'text-slate-400'}
            `}
          >
            <Icon name="refresh" className="animate-pulse" aria-hidden="true" />
          </div>
        </div>
      )}

      {/* Message */}
      <div className="text-center">
        <p className={`${sizeClass.text} ${cx.textMuted || 'text-slate-500'} font-medium`}>
          {message}
        </p>
        {statusText && (
          <p className={`text-xs mt-1 ${cx.textMuted || 'text-slate-400'}`}>
            {statusText}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingState;
