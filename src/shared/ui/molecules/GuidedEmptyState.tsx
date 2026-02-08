/**
 * GuidedEmptyState Molecule
 *
 * Composes: Icon + title + message + step-by-step guide + CTAs
 *
 * Enhanced empty state that doesn't just say"nothing here" but
 * provides a clear path forward with visual progress indicators.
 *
 * COMMUNICATIVE DESIGN:
 * - Shows where user is in the overall workflow
 * - Provides clear next steps with visual hierarchy
 * - Uses progressive disclosure (show 3 steps, expand for more)
 * - Celebrates progress when some steps are complete
 *
 * IDEAL OUTCOME: Users know exactly what to do next
 * FAILURE PREVENTED: Dead ends, confusion about how to proceed
 */

import React, { useState } from 'react';
import { Button, Icon } from '../atoms';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface WorkflowStep {
  /** Step identifier */
  id: string;
  /** Step number (1-indexed) */
  number: number;
  /** Step title */
  title: string;
  /** Step description */
  description: string;
  /** Icon name */
  icon: string;
  /** Whether this step is completed */
  completed?: boolean;
  /** Whether this step is currently active */
  active?: boolean;
  /** Action to take when clicking this step */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Help text for this step */
  helpText?: string;
}

export interface GuidedEmptyStateProps {
  /** Main icon/illustration */
  icon: string;
  /** Hero title */
  title: string;
  /** Subtitle description */
  subtitle: string;
  /** Workflow steps to display */
  steps: WorkflowStep[];
  /** Primary CTA button */
  primaryAction: {
    label: string;
    icon?: string;
    onClick: () => void;
  };
  /** Secondary CTA button */
  secondaryAction?: {
    label: string;
    icon?: string;
    onClick: () => void;
  };
  /** Contextual styles from template */
  cx: ContextualClassNames;
  /** Current field mode */
  fieldMode?: boolean;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Optional tip/help message */
  tip?: string;
  /** Whether to show steps as expandable accordion */
  expandableSteps?: boolean;
}

/**
 * GuidedEmptyState Molecule
 *
 * @example
 * <GuidedEmptyState
 *   icon="inventory_2"
 *   title="Welcome to Field Studio"
 *   subtitle="Create your first archive in 3 simple steps"
 *   steps={[
 *     { id:'import', number: 1, title:'Import', description:'Add photos', icon:'upload', active: true },
 *     { id:'organize', number: 2, title:'Organize', description:'Structure items', icon:'folder' },
 *     { id:'export', number: 3, title:'Export', description:'Share archive', icon:'download' },
 *   ]}
 *   primaryAction={{ label:'Import Photos', icon:'upload', onClick: onImport }}
 *   cx={cx}
 * />
 */
export const GuidedEmptyState: React.FC<GuidedEmptyStateProps> = ({
  icon,
  title,
  subtitle,
  steps,
  primaryAction,
  secondaryAction,
  cx,
  fieldMode = false,
  progress = 0,
  tip,
  expandableSteps = false,
}) => {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [showAllSteps, setShowAllSteps] = useState(!expandableSteps);

  const completedSteps = steps.filter(s => s.completed).length;
  const activeStep = steps.find(s => s.active) || steps[0];
  const visibleSteps = showAllSteps ? steps : steps.slice(0, 3);

  const getStepStyles = (step: WorkflowStep) => {
    if (step.completed) {
      return {
        container: fieldMode ?'bg-nb-green/30 border-nb-green' :'bg-nb-green/10 border-nb-green/30',
        icon: fieldMode ?'bg-nb-green text-nb-green' :'bg-nb-green/20 text-nb-green',
        number: fieldMode ?'text-nb-green' :'text-nb-green',
        title: fieldMode ?'text-nb-green/60' :'text-nb-green',
        desc: fieldMode ?'text-nb-green/70' :'text-nb-green/70',
      };
    }
    if (step.active) {
      return {
        container: fieldMode ?'bg-nb-blue/30 border-nb-blue' :'bg-nb-blue/10 border-nb-blue/30',
        icon: fieldMode ?'bg-nb-blue text-nb-blue' :'bg-nb-blue/20 text-nb-blue',
        number: fieldMode ?'text-nb-blue' :'text-nb-blue',
        title: fieldMode ?'text-nb-blue/60' :'text-nb-blue',
        desc: fieldMode ?'text-nb-blue/70' :'text-nb-blue/70',
      };
    }
    return {
      container: fieldMode ?'bg-nb-black/50 border-nb-black/80' :'bg-nb-white border-nb-black/20',
      icon: fieldMode ?'bg-nb-black text-nb-black/50' :'bg-nb-cream text-nb-black/40',
      number: fieldMode ?'text-nb-black/50' :'text-nb-black/40',
      title: fieldMode ?'text-nb-black/40' :'text-nb-black/50',
      desc: fieldMode ?'text-nb-black/50' :'text-nb-black/40',
    };
  };

  return (
    <div
      className={`
        flex flex-col items-center justify-center
        min-h-[500px] p-8
        ${fieldMode ?'bg-nb-black' :'bg-nb-white'}
`}
    >
      {/* Hero Section */}
      <div className="text-center max-w-2xl mx-auto">
        {/* Icon */}
        <div
          className={`
            w-24 h-24  mx-auto mb-6 flex items-center justify-center
            ${fieldMode ?'bg-nb-black border-2 border-nb-black' :'bg-nb-white border-2 border-nb-black/20 shadow-brutal'}
            animate-in zoom-in duration-500
`}
        >
          <Icon name={icon} className="text-5xl" />
        </div>

        {/* Title */}
        <h1
          className={`
            text-3xl font-bold mb-3
            ${fieldMode ?'text-white' :'text-nb-black'}
            animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100
`}
        >
          {title}
        </h1>

        {/* Subtitle */}
        <p
          className={`
            text-lg mb-8
            ${cx.textMuted}
            animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200
`}
        >
          {subtitle}
        </p>

        {/* Progress Bar (if there's progress) */}
        {progress > 0 && (
          <div className="mb-8 animate-in fade-in duration-500 delay-300">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className={fieldMode ?'text-nb-black/40' :'text-nb-black/50'}>
                Progress
              </span>
              <span className={fieldMode ?'text-white font-medium' :'text-nb-black font-medium'}>
                {Math.round(progress)}%
              </span>
            </div>
            <div
              className={`
                h-2  overflow-hidden
                ${fieldMode ?'bg-nb-black' :'bg-nb-cream'}
`}
            >
              <div
                className={`
                  h-full  transition-nb duration-1000 ease-out
                  ${fieldMode ?'bg-nb-green' :'bg-nb-green'}
`}
                style={{ width:`${progress}%` }}
              />
            </div>
            <p className={`mt-2 text-sm ${cx.textMuted}`}>
              {completedSteps} of {steps.length} steps completed
            </p>
          </div>
        )}

        {/* Primary Actions */}
        <div
          className="flex flex-col sm:flex-row gap-3 justify-center mb-10
          animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300"
        >
          <Button
            variant="primary"
            size="lg"
            icon={primaryAction.icon ? <Icon name={primaryAction.icon} /> : undefined}
            onClick={primaryAction.onClick}
            className="px-8"
          >
            {primaryAction.label}
          </Button>
          {secondaryAction && (
            <Button
              variant="secondary"
              size="lg"
              icon={secondaryAction.icon ? <Icon name={secondaryAction.icon} /> : undefined}
              onClick={secondaryAction.onClick}
              className="px-8"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </div>

      {/* Steps Section */}
      <div
        className={`
          w-full max-w-3xl  p-6
          ${fieldMode ?'bg-nb-black border border-nb-black' :'bg-nb-white border border-nb-black/20 shadow-brutal'}
          animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400
`}
      >
        <h2 className={`text-sm font-bold uppercase tracking-wider mb-6 ${cx.textMuted}`}>
          Getting Started
        </h2>

        <div className="space-y-3">
          {visibleSteps.map((step, index) => {
            const styles = getStepStyles(step);
            const isExpanded = expandedStep === step.id;

            return (
              <div
                key={step.id}
                className={`
                   border transition-nb 
                  ${styles.container}
                  ${step.active ?`ring-2 ring-offset-2 ${fieldMode ?'ring-nb-blue ring-offset-nb-black' :'ring-nb-blue ring-offset-white'}` :''}
                  ${expandableSteps ?'cursor-pointer hover:shadow-brutal-sm' :''}
`}
                onClick={() => expandableSteps && setExpandedStep(isExpanded ? null : step.id)}
              >
                <div className="flex items-start gap-4 p-4">
                  {/* Step Number / Icon */}
                  <div
                    className={`
                      w-10 h-10  flex items-center justify-center shrink-0
                      transition-nb
                      ${styles.icon}
`}
                  >
                    {step.completed ? (
                      <Icon name="check" className="text-lg" />
                    ) : (
                      <Icon name={step.icon} className="text-lg" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${styles.number}`}>
                        Step {step.number}
                      </span>
                      {step.active && (
                        <span
                          className={`
                            px-2 py-0.5 text-xs  font-medium
                            ${fieldMode ?'bg-nb-blue text-nb-blue/60' :'bg-nb-blue/20 text-nb-blue'}
`}
                        >
                          Current
                        </span>
                      )}
                      {step.completed && (
                        <span
                          className={`
                            px-2 py-0.5 text-xs  font-medium
                            ${fieldMode ?'bg-nb-green text-nb-green/60' :'bg-nb-green/20 text-nb-green'}
`}
                        >
                          Done
                        </span>
                      )}
                    </div>
                    <h3 className={`font-semibold mt-1 ${styles.title}`}>
                      {step.title}
                    </h3>
                    <p className={`text-sm mt-1 ${styles.desc}`}>
                      {step.description}
                    </p>

                    {/* Expanded content */}
                    {isExpanded && step.helpText && (
                      <div
                        className={`
                          mt-3 p-3  text-sm
                          ${fieldMode ?'bg-nb-black text-nb-black/30' :'bg-nb-cream text-nb-black/60'}
                          animate-in fade-in slide-in-from-top-2
`}
                      >
                        <Icon name="lightbulb" className="inline mr-2 text-xs" />
                        {step.helpText}
                      </div>
                    )}

                    {/* Action button for this step */}
                    {step.active && step.action && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          step.action?.onClick();
                        }}
                        className="mt-3"
                      >
                        {step.action.label}
                      </Button>
                    )}
                  </div>

                  {/* Expand chevron */}
                  {expandableSteps && (
                    <Icon
                      name={isExpanded ?'expand_less' :'expand_more'}
                      className={`shrink-0 ${fieldMode ?'text-nb-black/50' :'text-nb-black/40'}`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Show more/less */}
        {expandableSteps && steps.length > 3 && (
          <Button variant="ghost" size="bare"
            onClick={() => setShowAllSteps(!showAllSteps)}
            className={`
              w-full mt-4 py-2 text-sm font-medium
              transition-nb 
              ${fieldMode
                ?'text-nb-black/40 hover:text-white hover:bg-nb-black'
                :'text-nb-black/50 hover:text-nb-black hover:bg-nb-cream'
              }
`}
          >
            {showAllSteps ? (
              <>Show less <Icon name="expand_less" className="inline ml-1" /></>
            ) : (
              <>Show all {steps.length} steps <Icon name="expand_more" className="inline ml-1" /></>
            )}
          </Button>
        )}
      </div>

      {/* Tip Section */}
      {tip && (
        <div
          className={`
            mt-6 flex items-center gap-2 text-sm
            ${cx.textMuted}
            animate-in fade-in duration-500 delay-500
`}
        >
          <Icon name="info" className="text-xs" />
          <span>{tip}</span>
        </div>
      )}

      {/* Keyboard shortcut hint */}
      <div
        className={`
          mt-8 text-sm
          ${cx.textMuted}
          animate-in fade-in duration-500 delay-500
`}
      >
        Press{''}
        <kbd
          className={`
            px-2 py-1 text-xs font-mono
            ${fieldMode ?'bg-nb-black text-nb-black/30' :'bg-nb-cream text-nb-black/60'}
`}
        >
          ?
        </kbd>{''}
        for keyboard shortcuts
      </div>
    </div>
  );
};

export default GuidedEmptyState;
