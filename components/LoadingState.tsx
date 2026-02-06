/**
 * LoadingState - Standardized loading indicators across the application
 * 
 * Addresses Issue 4.3: Loading states inconsistent across views
 * Provides consistent loading patterns following designSystem.ts
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { designSystem } from '../designSystem';

export type LoadingVariant = 'spinner' | 'skeleton' | 'progress' | 'overlay';
export type LoadingSize = 'sm' | 'base' | 'lg' | 'xl';

interface LoadingStateProps {
  variant?: LoadingVariant;
  size?: LoadingSize;
  message?: string;
  progress?: number; // 0-100
  className?: string;
  fullScreen?: boolean;
}

const sizeClasses: Record<LoadingSize, { spinner: string; text: string }> = {
  sm: { spinner: 'w-4 h-4', text: 'text-xs' },
  base: { spinner: 'w-6 h-6', text: 'text-sm' },
  lg: { spinner: 'w-8 h-8', text: 'text-base' },
  xl: { spinner: 'w-12 h-12', text: 'text-lg' }
};

export const LoadingSpinner: React.FC<{ size?: LoadingSize; className?: string }> = ({ 
  size = 'base',
  className = ''
}) => {
  const classes = sizeClasses[size];
  return (
    <div className={`${classes.spinner} relative ${className}`}>
      <div className="absolute inset-0 border-2 border-slate-200 rounded-full" />
      <div className="absolute inset-0 border-2 border-iiif-blue rounded-full border-t-transparent animate-spin" />
    </div>
  );
};

export const SkeletonBlock: React.FC<{ 
  lines?: number; 
  className?: string;
  animate?: boolean;
}> = ({ 
  lines = 3, 
  className = '',
  animate = true 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i}
          className={`h-4 bg-slate-200 rounded ${animate ? 'animate-pulse' : ''}`}
          style={{ width: `${Math.random() * 30 + 70}%` }}
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC<{ 
  className?: string;
  animate?: boolean;
}> = ({ 
  className = '',
  animate = true 
}) => {
  return (
    <div className={`p-4 border border-slate-200 rounded-xl ${className}`}>
      <div className={`h-32 bg-slate-200 rounded-lg mb-4 ${animate ? 'animate-pulse' : ''}`} />
      <div className={`h-4 bg-slate-200 rounded w-3/4 mb-2 ${animate ? 'animate-pulse' : ''}`} />
      <div className={`h-4 bg-slate-200 rounded w-1/2 ${animate ? 'animate-pulse' : ''}`} />
    </div>
  );
};

export const ProgressBar: React.FC<{
  progress: number;
  message?: string;
  showPercentage?: boolean;
  className?: string;
}> = ({ 
  progress, 
  message,
  showPercentage = true,
  className = ''
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  return (
    <div className={`w-full ${className}`}>
      {(message || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {message && (
            <span className="text-sm text-slate-600 font-medium">{message}</span>
          )}
          {showPercentage && (
            <span className="text-sm font-bold text-iiif-blue">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-iiif-blue to-blue-400 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

export const LoadingState: React.FC<LoadingStateProps> = ({
  variant = 'spinner',
  size = 'base',
  message,
  progress = 0,
  className = '',
  fullScreen = false
}) => {
  const classes = sizeClasses[size];
  
  const content = () => {
    switch (variant) {
      case 'spinner':
        return (
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner size={size} />
            {message && (
              <p className={`${classes.text} text-slate-500 font-medium`}>{message}</p>
            )}
          </div>
        );
        
      case 'skeleton':
        return <SkeletonBlock className={className} />;
        
      case 'progress':
        return (
          <div className="w-full max-w-md">
            <ProgressBar progress={progress} message={message} />
          </div>
        );
        
      case 'overlay':
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <LoadingSpinner size="xl" />
              {progress > 0 && (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-iiif-blue">
                  {Math.round(progress)}%
                </span>
              )}
            </div>
            {message && (
              <div className="text-center">
                <p className="text-lg font-bold text-slate-800 mb-1">{message}</p>
                <p className="text-sm text-slate-500">Please wait...</p>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };
  
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
        {content()}
      </div>
    );
  }
  
  return (
    <div className={`flex items-center justify-center ${className}`}>
      {content()}
    </div>
  );
};

// Specialized loading states for common scenarios
export const TableLoading: React.FC<{ rows?: number; cols?: number }> = ({ 
  rows = 5, 
  cols = 4 
}) => {
  return (
    <div className="w-full">
      {/* Header skeleton */}
      <div className="flex gap-4 mb-4 pb-4 border-b border-slate-200">
        {Array.from({ length: cols }).map((_, i) => (
          <div 
            key={`header-${i}`}
            className="h-4 bg-slate-200 rounded animate-pulse flex-1"
          />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={`row-${rowIdx}`} className="flex gap-4 mb-3">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div 
              key={`cell-${rowIdx}-${colIdx}`}
              className="h-4 bg-slate-100 rounded animate-pulse flex-1"
              style={{ animationDelay: `${rowIdx * 100}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const GridLoading: React.FC<{ items?: number; className?: string }> = ({
  items = 8,
  className = ''
}) => {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} style={{ animationDelay: `${i * 50}ms` }}>
          <SkeletonCard animate />
        </div>
      ))}
    </div>
  );
};

export default LoadingState;
