/**
 * PipelineBanner - Shows current pipeline context
 *
 * Displays a contextual banner when navigating through the pipeline:
 * "Editing 5 items from Archive" with a back button
 *
 * @module shared/ui/molecules/PipelineBanner
 */

import React from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '../atoms';
import { usePipeline } from '../../lib/hooks/usePipeline';

export interface PipelineBannerProps {
  /** Handler for back navigation */
  onBack?: (targetMode: string) => void;
  /** Handler for clearing pipeline */
  onClear?: () => void;
  /** Contextual class names */
  cx?: {
    surface?: string;
    text?: string;
    accent?: string;
    border?: string;
  };
  /** Field mode styling */
  fieldMode?: boolean;
}

/**
 * PipelineBanner - Visual indicator for cross-view operations
 *
 * @example
 * <PipelineBanner
 *   onBack={(mode) => setCurrentMode(mode)}
 *   onClear={() => clearPipeline()}
 * />
 */
export const PipelineBanner: React.FC<PipelineBannerProps> = ({
  onBack,
  onClear,
  cx,
  fieldMode = false,
}) => {
  const pipeline = usePipeline();

  // Don't render if no pipeline context
  if (!pipeline.hasPipeline) return null;

  const summary = pipeline.getPipelineSummary();
  if (!summary) return null;

  const handleBack = () => {
    const prev = pipeline.goBack();
    if (prev && onBack) {
      onBack(prev.mode);
    }
  };

  const handleClear = () => {
    pipeline.clearPipeline();
    onClear?.();
  };

  // Get intent-specific colors
  const getIntentColors = () => {
    if (fieldMode) {
      return {
        bg: 'bg-yellow-900/30',
        border: 'border-yellow-700/50',
        text: 'text-yellow-200',
        accent: 'text-yellow-400',
        hoverBg: 'hover:bg-yellow-800/30',
      };
    }

    switch (pipeline.intent) {
      case 'edit-metadata':
        return {
          bg: 'bg-purple-50 dark:bg-purple-900/30',
          border: 'border-purple-200 dark:border-purple-800',
          text: 'text-purple-800 dark:text-purple-200',
          accent: 'text-purple-600 dark:text-purple-400',
          hoverBg: 'hover:bg-purple-100 dark:hover:bg-purple-800/30',
        };
      case 'compose':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/30',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-800 dark:text-blue-200',
          accent: 'text-blue-600 dark:text-blue-400',
          hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-800/30',
        };
      case 'map':
        return {
          bg: 'bg-green-50 dark:bg-green-900/30',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-800 dark:text-green-200',
          accent: 'text-green-600 dark:text-green-400',
          hoverBg: 'hover:bg-green-100 dark:hover:bg-green-800/30',
        };
      default:
        return {
          bg: 'bg-slate-100 dark:bg-slate-800',
          border: 'border-slate-200 dark:border-slate-700',
          text: 'text-slate-700 dark:text-slate-300',
          accent: 'text-slate-600 dark:text-slate-400',
          hoverBg: 'hover:bg-slate-200 dark:hover:bg-slate-700',
        };
    }
  };

  const colors = getIntentColors();

  // Get intent icon
  const getIntentIcon = () => {
    switch (pipeline.intent) {
      case 'edit-metadata':
        return 'table_chart';
      case 'compose':
        return 'dashboard';
      case 'map':
        return 'map';
      case 'view':
        return 'visibility';
      default:
        return 'arrow_forward';
    }
  };

  return (
    <div
      className={`
        flex items-center justify-between px-4 py-2 border-b
        ${colors.bg} ${colors.border}
        animate-in slide-in-from-top-2 duration-200
      `}
    >
      {/* Left: Back button + Summary */}
      <div className="flex items-center gap-3">
        {pipeline.breadcrumbs.length > 0 && (
          <Button variant="ghost" size="bare"
            onClick={handleBack}
            className={`
              flex items-center gap-1 px-2 py-1 rounded-md
              ${colors.text} ${colors.hoverBg}
              transition-colors
            `}
            title="Go back"
          >
            <Icon name="arrow_back" className="text-lg" />
            <span className="text-sm font-medium">
              {pipeline.breadcrumbs[pipeline.breadcrumbs.length - 1]?.label || 'Back'}
            </span>
          </Button>
        )}

        <div className="flex items-center gap-2">
          <Icon name={getIntentIcon()} className={`text-lg ${colors.accent}`} />
          <span className={`text-sm font-medium ${colors.text}`}>
            {summary}
          </span>
        </div>
      </div>

      {/* Right: Clear button */}
      <Button variant="ghost" size="bare"
        onClick={handleClear}
        className={`
          flex items-center gap-1 px-2 py-1 rounded-md
          ${colors.text} ${colors.hoverBg}
          opacity-60 hover:opacity-100 transition-all
        `}
        title="Clear pipeline"
      >
        <Icon name="close" className="text-lg" />
        <span className="text-sm hidden sm:inline">Clear</span>
      </Button>
    </div>
  );
};

export default PipelineBanner;
