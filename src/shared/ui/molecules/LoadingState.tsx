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
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import { UI_TIMING } from '../../config/tokens';

const defaultCx: ContextualClassNames = {
  surface:'bg-nb-white',
  text:'text-nb-black/10',
  accent:'text-nb-blue',
};

export type SkeletonVariant = 'block' | 'grid' | 'list' | 'card' | 'detail' | 'tree';

export interface LoadingStateProps {
  /** Optional status message */
  message?: string;
  /** Size variant */
  size?:'sm' |'md' |'lg';
  /** Full container height (centered) */
  fullHeight?: boolean;
  /** Show skeleton placeholder instead of spinner */
  skeleton?: boolean;
  /** Skeleton layout variant */
  variant?: SkeletonVariant;
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
  sm: { icon:'text-lg', spinner:'w-5 h-5', text:'text-sm' },
  md: { icon:'text-2xl', spinner:'w-8 h-8', text:'text-base' },
  lg: { icon:'text-4xl', spinner:'w-12 h-12', text:'text-lg' },
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
        <span className={`text-xs ${cx?.textMuted ||'text-nb-black/50'}`}>
          Processing...
        </span>
        <span className={`text-xs font-semibold ${fieldMode ?'text-nb-blue' :'text-nb-blue'}`}>
          {Math.round(clampedProgress)}%
        </span>
      </div>
      <div className={`
        h-2  overflow-hidden
        ${fieldMode ?'bg-nb-black' :'bg-nb-cream'}
`}>
        <div
          className={`
            h-full  transition-nb  ease-out
            ${fieldMode 
              ?'bg-gradient-to-r from-nb-blue to-blue-400' 
              :'bg-gradient-to-r from-nb-blue to-blue-400'
            }
`}
          style={{ width:`${clampedProgress}%` }}
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
/**
 * Renders skeleton bars with field-mode aware color
 */
const SkeletonBar: React.FC<{ className?: string; bg?: string }> = ({ className = '', bg }) => (
  <div className={`${bg || 'bg-nb-black/10'} motion-reduce:animate-none ${className}`} />
);

const SkeletonGrid: React.FC<{ bg?: string }> = ({ bg }) => (
  <div className="grid grid-cols-3 gap-3 w-full p-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <SkeletonBar key={i} bg={bg} className="aspect-square" />
    ))}
  </div>
);

const SkeletonList: React.FC<{ bg?: string }> = ({ bg }) => (
  <div className="flex flex-col gap-3 w-full p-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <SkeletonBar bg={bg} className="w-10 h-10 shrink-0" />
        <div className="flex-1 flex flex-col gap-1.5">
          <SkeletonBar bg={bg} className="h-3 w-3/4" />
          <SkeletonBar bg={bg} className="h-2.5 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

const SkeletonCard: React.FC<{ bg?: string }> = ({ bg }) => (
  <div className="w-full max-w-xs p-4">
    <SkeletonBar bg={bg} className="w-full aspect-video mb-3" />
    <SkeletonBar bg={bg} className="h-4 w-3/4 mb-2" />
    <SkeletonBar bg={bg} className="h-3 w-1/2" />
  </div>
);

const SkeletonDetail: React.FC<{ bg?: string }> = ({ bg }) => (
  <div className="flex flex-col gap-4 w-full p-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="flex flex-col gap-1.5">
        <SkeletonBar bg={bg} className="h-2.5 w-20" />
        <SkeletonBar bg={bg} className="h-3.5 w-full" />
      </div>
    ))}
  </div>
);

const SkeletonTree: React.FC<{ bg?: string }> = ({ bg }) => (
  <div className="flex flex-col gap-2 w-full p-4">
    {[0, 0, 1, 1, 2, 2, 1, 0].map((indent, i) => (
      <div key={i} className="flex items-center gap-2" style={{ paddingLeft: `${indent * 16}px` }}>
        <SkeletonBar bg={bg} className="w-4 h-4 shrink-0" />
        <SkeletonBar bg={bg} className="h-3 flex-1" />
      </div>
    ))}
  </div>
);

export const LoadingState: React.FC<LoadingStateProps> = ({
  message ='Loading...',
  size ='md',
  fullHeight = false,
  skeleton = false,
  variant = 'block',
  className ='',
  cx = defaultCx,
  fieldMode: _fieldMode = false,
  progress,
  spinner = false,
  statusText,
}) => {
  const sizeClass = sizeClasses[size];
  const hasProgress = progress !== undefined && progress >= 0;
  const barBg = cx.subtleBg || (_fieldMode ? 'bg-nb-yellow/20' : 'bg-nb-black/10');

  if (skeleton) {
    const wrapClass = `animate-pulse motion-reduce:animate-none ${fullHeight ? 'h-full flex items-center justify-center' : ''} ${className}`;

    return (
      <div className={wrapClass} role="status" aria-label={message}>
        {variant === 'grid' && <SkeletonGrid bg={barBg} />}
        {variant === 'list' && <SkeletonList bg={barBg} />}
        {variant === 'card' && <SkeletonCard bg={barBg} />}
        {variant === 'detail' && <SkeletonDetail bg={barBg} />}
        {variant === 'tree' && <SkeletonTree bg={barBg} />}
        {variant === 'block' && <div className={`${barBg} w-full h-24`} />}
      </div>
    );
  }

  return (
    <div
      className={`
        flex flex-col items-center justify-center gap-4
        ${fullHeight ?'h-full min-h-[200px]' :'py-8'}
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
              
              border-2 ${_fieldMode ?'border-nb-black/80' :'border-nb-black/20'}
              border-t-transparent
              animate-spin
`}
            style={{ animationDuration:`${UI_TIMING.animation * 2}ms` }}
            aria-hidden="true"
          />

          {/* Center icon */}
          <div
            className={`
              absolute inset-0
              flex items-center justify-center
              ${sizeClass.icon} ${cx.textMuted ||'text-nb-black/40'}
`}
          >
            <Icon name="refresh" className="animate-pulse" aria-hidden="true" />
          </div>
        </div>
      )}

      {/* Message */}
      <div className="text-center">
        <p className={`${sizeClass.text} ${cx.textMuted ||'text-nb-black/50'} font-medium`}>
          {message}
        </p>
        {statusText && (
          <p className={`text-xs mt-1 ${cx.textMuted ||'text-nb-black/40'}`}>
            {statusText}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingState;
