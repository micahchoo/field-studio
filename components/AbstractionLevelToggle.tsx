/**
 * AbstractionLevelToggle - Three-button toggle for progressive disclosure
 *
 * Replaces PersonaSettings with a compact, always-visible toggle.
 * Part of Phase 3 UX Simplification: Progressive Disclosure.
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import type { AbstractionLevel } from '@/src/shared/types';

export interface AbstractionLevelToggleProps {
  /** Current abstraction level */
  currentLevel: AbstractionLevel;
  /** Callback when level changes */
  onChange: (level: AbstractionLevel) => void;
  /** Optional additional CSS classes */
  className?: string;
  /** Whether to show labels (default: true) */
  showLabels?: boolean;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

interface LevelOption {
  level: AbstractionLevel;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  colorClass: string;
}

const LEVEL_OPTIONS: LevelOption[] = [
  {
    level: 'simple',
    label: 'Simple',
    shortLabel: 'S',
    icon: 'travel_explore',
    description: 'Streamlined interface with user-friendly terms',
    colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
  },
  {
    level: 'standard',
    label: 'Standard',
    shortLabel: 'Std',
    icon: 'inventory',
    description: 'Full IIIF terminology and standard features',
    colorClass: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100'
  },
  {
    level: 'advanced',
    label: 'Advanced',
    shortLabel: 'Adv',
    icon: 'terminal',
    description: 'Technical IDs, raw JSON-LD, and all features',
    colorClass: 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100'
  }
];

const ACTIVE_COLORS: Record<AbstractionLevel, string> = {
  simple: 'bg-emerald-500 text-white border-emerald-600 shadow-md',
  standard: 'bg-blue-500 text-white border-blue-600 shadow-md',
  advanced: 'bg-purple-500 text-white border-purple-600 shadow-md'
};

const SIZE_CLASSES: Record<string, { container: string; button: string; icon: string }> = {
  sm: {
    container: 'gap-1',
    button: 'px-2 py-1 text-[10px]',
    icon: 'text-xs'
  },
  md: {
    container: 'gap-2',
    button: 'px-3 py-1.5 text-xs',
    icon: 'text-sm'
  },
  lg: {
    container: 'gap-2',
    button: 'px-4 py-2 text-sm',
    icon: 'text-base'
  }
};

/**
 * AbstractionLevelToggle - Compact three-button toggle for progressive disclosure
 *
 * @example
 * <AbstractionLevelToggle
 *   currentLevel="standard"
 *   onChange={(level) => setLevel(level)}
 * />
 */
export const AbstractionLevelToggle: React.FC<AbstractionLevelToggleProps> = ({
  currentLevel,
  onChange,
  className = '',
  showLabels = true,
  disabled = false,
  size = 'md'
}) => {
  const sizeClasses = SIZE_CLASSES[size];

  return (
    <div
      className={`inline-flex items-center ${sizeClasses.container} ${className}`}
      role="radiogroup"
      aria-label="Abstraction level"
    >
      {LEVEL_OPTIONS.map((option) => {
        const isActive = currentLevel === option.level;

        return (
          <button
            key={option.level}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`${option.label} - ${option.description}`}
            disabled={disabled}
            onClick={() => onChange(option.level)}
            className={`
              flex items-center gap-1.5 rounded-lg border font-medium
              transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1
              ${sizeClasses.button}
              ${isActive
                ? `${ACTIVE_COLORS[option.level]} focus:ring-${option.level === 'simple' ? 'emerald' : option.level === 'standard' ? 'blue' : 'purple'}-400`
                : `${option.colorClass} focus:ring-slate-300`
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={option.description}
          >
            <Icon name={option.icon} className={sizeClasses.icon} />
            {showLabels && (
              <span className="hidden sm:inline">{option.label}</span>
            )}
            {!showLabels && (
              <span>{option.shortLabel}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Compact variant with icons only
 */
export const AbstractionLevelToggleCompact: React.FC<Omit<AbstractionLevelToggleProps, 'showLabels' | 'size'>> = (props) => (
  <AbstractionLevelToggle {...props} showLabels={false} size="sm" />
);

/**
 * Full variant with descriptions
 */
export const AbstractionLevelToggleFull: React.FC<AbstractionLevelToggleProps> = ({
  currentLevel,
  onChange,
  className = '',
  disabled = false
}) => {
  return (
    <div className={`space-y-2 ${className}`} role="radiogroup" aria-label="Abstraction level">
      {LEVEL_OPTIONS.map((option) => {
        const isActive = currentLevel === option.level;

        return (
          <button
            key={option.level}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(option.level)}
            className={`
              w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left
              transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1
              ${isActive
                ? `${ACTIVE_COLORS[option.level]} focus:ring-${option.level === 'simple' ? 'emerald' : option.level === 'standard' ? 'blue' : 'purple'}-400`
                : `${option.colorClass} focus:ring-slate-300`
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className={`
              p-2 rounded-lg
              ${isActive ? 'bg-white/20' : 'bg-white/50'}
            `}>
              <Icon name={option.icon} className="text-lg" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold">{option.label}</div>
              <div className={`
                text-xs mt-0.5
                ${isActive ? 'text-white/80' : 'text-slate-500'}
              `}>
                {option.description}
              </div>
            </div>
            {isActive && (
              <Icon name="check_circle" className="text-lg flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default AbstractionLevelToggle;
