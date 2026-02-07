/**
 * ExperienceSelector Widget - Bold, Memorable Mode Selection
 * 
 * Solves all 5 critical UX problems with the mode selection dialog:
 * 1. No Context for Decision → Adds feature lists, previews, and "Help me choose"
 * 2. Arrow Icons Suggest Navigation → Uses radio buttons and selection indicators
 * 3. "Simple" Description is Condescending → Reframes as positive "Essential/Complete/Expert"
 * 4. No Visual Differentiation → Color coding, complexity dots, distinct visual design
 * 5. Ambiguous Back Button → Clear navigation with "Skip for now" option
 * 
 * BOLD AESTHETIC: Editorial magazine style with strong typography, 
 * geometric shapes, and theatrical color coding.
 */

import React, { useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { AbstractionLevel } from '@/src/shared/types';
import { COLORS, INTERACTION, LAYOUT, SPACING } from '@/src/shared/config/design-tokens';

export interface ExperienceSelectorProps {
  /** Current selected level */
  selectedLevel: AbstractionLevel;
  /** Callback when selection changes */
  onSelect: (level: AbstractionLevel) => void;
  /** Whether to show the "Skip for now" option */
  showSkipOption?: boolean;
  /** Callback when user skips selection */
  onSkip?: () => void;
  /** Whether to show detailed feature comparison */
  showFeatureComparison?: boolean;
}

interface ExperienceOption {
  level: AbstractionLevel;
  title: string;
  subtitle: string;
  tagline: string;
  description: string;
  features: string[];
  color: {
    primary: string;
    light: string;
    dark: string;
  };
  complexity: number; // 1-3 dots
  icon: string;
}

const EXPERIENCE_OPTIONS: ExperienceOption[] = [
  {
    level: 'simple',
    title: 'Essential',
    subtitle: 'Quick & Intuitive',
    tagline: 'Clean interface for fast photo organization',
    description: 'Perfect for photographers, archivists, and anyone who wants to organize media without technical complexity.',
    features: [
      'Drag & drop import',
      'Basic metadata editing',
      'Auto-generated galleries',
      'One-click exports',
      'Simplified terminology'
    ],
    color: {
      primary: '#10b981', // Emerald 500
      light: '#d1fae5',   // Emerald 100
      dark: '#059669'     // Emerald 600
    },
    complexity: 1,
    icon: '🎯'
  },
  {
    level: 'standard',
    title: 'Complete',
    subtitle: 'Full Featured',
    tagline: 'Everything you need for professional archiving',
    description: 'For librarians, curators, and professionals who need full metadata control and IIIF compliance.',
    features: [
      'Everything in Essential',
      'Batch editing & workflows',
      'Full IIIF metadata fields',
      'Advanced search & filtering',
      'Custom field templates'
    ],
    color: {
      primary: '#3b82f6', // Blue 500
      light: '#dbeafe',   // Blue 100
      dark: '#1d4ed8'     // Blue 700
    },
    complexity: 2,
    icon: '📋'
  },
  {
    level: 'advanced',
    title: 'Expert',
    subtitle: 'Maximum Control',
    tagline: 'Advanced IIIF control and custom options',
    description: 'For developers, IIIF specialists, and technical users who need JSON editing and custom workflows.',
    features: [
      'Everything in Complete',
      'Raw JSON-LD editing',
      'Custom ID patterns',
      'API & scripting access',
      'Advanced validation'
    ],
    color: {
      primary: '#8b5cf6', // Violet 500
      light: '#ede9fe',   // Violet 100
      dark: '#7c3aed'     // Violet 600
    },
    complexity: 3,
    icon: '⚡'
  }
];

/**
 * Complexity Indicator Dots
 */
const ComplexityDots: React.FC<{ complexity: number; activeColor: string }> = ({ complexity, activeColor }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3].map((dot) => (
      <div
        key={dot}
        className={`w-2 h-2 rounded-full transition-all duration-300 ${dot <= complexity ? '' : 'opacity-30'}`}
        style={{
          backgroundColor: dot <= complexity ? activeColor : COLORS.border.default,
          transform: dot <= complexity ? 'scale(1.1)' : 'scale(0.9)'
        }}
      />
    ))}
    <span className="text-xs ml-1" style={{ color: COLORS.text.tertiary }}>
      {complexity === 1 ? 'Easy' : complexity === 2 ? 'Medium' : 'Advanced'}
    </span>
  </div>
);

/**
 * Help Me Choose Preview Component
 */
const HelpPreview: React.FC<{ option: ExperienceOption }> = ({ option }) => (
  <div className="mt-4 p-4 rounded-xl border" style={{ borderColor: option.color.light, backgroundColor: `${option.color.light}20` }}>
    <div className="flex items-center justify-between mb-2">
      <h4 className="font-semibold" style={{ color: option.color.dark }}>Preview: {option.title} Mode</h4>
      <span className="text-sm" style={{ color: COLORS.text.secondary }}>UI will show:</span>
    </div>
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: option.color.primary }} />
        <span className="text-sm">Simplified toolbar with 5-7 main actions</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: option.color.primary }} />
        <span className="text-sm">{option.complexity === 1 ? 'Friendly labels' : 'Technical terminology'}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: option.color.primary }} />
        <span className="text-sm">{option.complexity === 3 ? 'JSON editor visible' : 'Guided forms'}</span>
      </div>
    </div>
    <div className="mt-3 text-xs" style={{ color: COLORS.text.tertiary }}>
      You can change this anytime in Settings → Experience Level
    </div>
  </div>
);

export const ExperienceSelector: React.FC<ExperienceSelectorProps> = ({
  selectedLevel,
  onSelect,
  showSkipOption = true,
  onSkip,
  showFeatureComparison = true
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [helpOption, setHelpOption] = useState<AbstractionLevel | null>(null);

  const handleOptionClick = (option: ExperienceOption) => {
    onSelect(option.level);
    if (showHelp) {
      setHelpOption(option.level);
    }
  };

  const handleHelpClick = () => {
    setShowHelp(!showHelp);
    if (!showHelp) {
      setHelpOption(selectedLevel);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold" style={{ color: COLORS.text.primary }}>
          Choose Your Experience Level
        </h2>
        <p className="mt-2 text-sm" style={{ color: COLORS.text.secondary }}>
          Tailor the interface to your expertise. This affects which tools and options are visible.
        </p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <Button variant="ghost" size="bare"
            onClick={handleHelpClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors hover:bg-slate-50"
            style={{ color: COLORS.primary[600], borderColor: COLORS.primary[300] }}
          >
            <span className="text-base">💡</span>
            {showHelp ? 'Hide help' : 'Help me choose'}
          </Button>
          {showSkipOption && onSkip && (
            <Button variant="ghost" size="bare"
              onClick={onSkip}
              className="text-sm px-3 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Skip for now (uses Complete)
            </Button>
          )}
        </div>
      </div>

      {/* Options Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {EXPERIENCE_OPTIONS.map((option) => {
          const isSelected = selectedLevel === option.level;
          return (
            <div
              key={option.level}
              onClick={() => handleOptionClick(option)}
              className="relative cursor-pointer rounded-2xl border-2 p-5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.99]"
              style={{
                borderColor: isSelected ? option.color.primary : COLORS.border.default,
                backgroundColor: isSelected ? `${option.color.light}30` : COLORS.background.elevated,
                boxShadow: isSelected 
                  ? `0 10px 25px -5px ${option.color.primary}20, 0 4px 6px -4px ${option.color.primary}10`
                  : ELEVATION.sm
              }}
            >
              {/* Selection Indicator */}
              <div className="absolute top-4 right-4">
                <div
                  className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: isSelected ? option.color.primary : COLORS.border.default,
                    backgroundColor: isSelected ? option.color.primary : 'transparent'
                  }}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Icon & Title */}
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${option.color.primary}15` }}
                >
                  {option.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg" style={{ color: COLORS.text.primary }}>
                      {option.title}
                    </h3>
                    <ComplexityDots complexity={option.complexity} activeColor={option.color.primary} />
                  </div>
                  <p className="text-sm mt-1" style={{ color: option.color.dark }}>
                    {option.subtitle}
                  </p>
                </div>
              </div>

              {/* Tagline & Description */}
              <p className="font-medium mb-2" style={{ color: COLORS.text.primary }}>
                {option.tagline}
              </p>
              <p className="text-sm mb-4" style={{ color: COLORS.text.secondary }}>
                {option.description}
              </p>

              {/* Feature List */}
              {showFeatureComparison && (
                <ul className="space-y-1.5 mb-4">
                  {option.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: option.color.primary }}
                      />
                      <span className="text-sm" style={{ color: COLORS.text.secondary }}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Selected Indicator Bar */}
              {isSelected && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl transition-all"
                  style={{ backgroundColor: option.color.primary }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Help Preview */}
      {showHelp && helpOption && (
        <div className="mt-6 animate-in fade-in duration-300">
          <HelpPreview option={EXPERIENCE_OPTIONS.find(o => o.level === helpOption)!} />
        </div>
      )}

      {/* Footer Note */}
      <div className="text-center pt-4 border-t" style={{ borderColor: COLORS.border.default }}>
        <p className="text-xs" style={{ color: COLORS.text.tertiary }}>
          <strong>Tip:</strong> Start with Essential if you're new to IIIF. You can always switch later in Settings.
          All your data and work are preserved when changing levels.
        </p>
      </div>
    </div>
  );
};

// Re-export the ELEVATION constant for styling consistency
const ELEVATION = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
} as const;