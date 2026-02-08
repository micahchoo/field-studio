/**
 * PipelineBanner - Shows current pipeline context
 *
 * Displays a contextual banner when navigating through the pipeline:
 *"Editing 5 items from Archive" with a back button
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
        bg:'bg-nb-yellow/20',
        border:'border-nb-yellow/50',
        text:'text-nb-yellow/60',
        accent:'text-nb-yellow',
        hoverBg:'hover:bg-nb-yellow/30',
      };
    }

    switch (pipeline.intent) {
      case'edit-metadata':
        return {
          bg:'bg-nb-purple/10',
          border:'border-nb-purple/20',
          text:'text-nb-purple200',
          accent:'text-nb-purple400',
          hoverBg:'hover:bg-nb-purple/10',
        };
      case'compose':
        return {
          bg:'bg-nb-blue/10',
          border:'border-nb-blue/30',
          text:'text-nb-blue/40',
          accent:'text-nb-blue',
          hoverBg:'hover:bg-nb-blue/20',
        };
      case'map':
        return {
          bg:'bg-nb-green/10',
          border:'border-nb-green/30',
          text:'text-nb-green/40',
          accent:'text-nb-green',
          hoverBg:'hover:bg-nb-green/20',
        };
      default:
        return {
          bg:'bg-nb-cream',
          border:'border-nb-black/20',
          text:'text-nb-black/70',
          accent:'text-nb-black/50',
          hoverBg:'hover:bg-nb-cream',
        };
    }
  };

  const colors = getIntentColors();

  // Get intent icon
  const getIntentIcon = () => {
    switch (pipeline.intent) {
      case'edit-metadata':
        return'table_chart';
      case'compose':
        return'dashboard';
      case'map':
        return'map';
      case'view':
        return'visibility';
      default:
        return'arrow_forward';
    }
  };

  return (
    <div
      className={`
        flex items-center justify-between px-4 py-2 border-b
        ${colors.bg} ${colors.border}
        animate-in slide-in-from-top-2 
`}
    >
      {/* Left: Back button + Summary */}
      <div className="flex items-center gap-3">
        {pipeline.breadcrumbs.length > 0 && (
          <Button variant="ghost" size="bare"
            onClick={handleBack}
            className={`
              flex items-center gap-1 px-2 py-1 
              ${colors.text} ${colors.hoverBg}
              transition-nb
`}
            title="Go back"
          >
            <Icon name="arrow_back" className="text-lg" />
            <span className="text-sm font-medium">
              {pipeline.breadcrumbs[pipeline.breadcrumbs.length - 1]?.label ||'Back'}
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
          flex items-center gap-1 px-2 py-1 
          ${colors.text} ${colors.hoverBg}
          opacity-60 hover:opacity-100 transition-nb
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
