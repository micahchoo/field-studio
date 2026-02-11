/**
 * OnboardingModal - Updated with Enhanced Experience Selector
 * 
 * Uses the new ExperienceSelector widget to solve all UX problems:
 * 1. No Context for Decision
 * 2. Arrow Icons Suggest Navigation
 * 3. Condescending Descriptions
 * 4. No Visual Differentiation
 * 5. Ambiguous Back Button
 */

import React, { useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { AbstractionLevel } from '@/src/shared/types';
import { ExperienceSelector } from '@/src/widgets/ExperienceSelector/ExperienceSelector';
import { useContextualStyles } from '@/src/shared/lib/hooks/useContextualStyles';
import { cn } from '@/src/shared/lib/cn';

interface OnboardingModalProps {
  onComplete: (level: AbstractionLevel) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const cx = useContextualStyles();
  const [showExpertise, setShowExpertise] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<AbstractionLevel>('standard');

  // Quick start with default settings
  const handleQuickStart = () => {
    onComplete('simple');
  };

  // Choose expertise level
  const handleSelectLevel = (level: AbstractionLevel) => {
    setSelectedLevel(level);
  };

  const handleConfirmSelection = () => {
    onComplete(selectedLevel);
  };

  const handleSkipSelection = () => {
    onComplete('standard'); // Default to Complete
  };

  return (
    <div className="fixed inset-0 bg-nb-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in ">
      <div className={cn(cx.surface, 'max-w-4xl w-full shadow-brutal-lg overflow-hidden')}>

        {!showExpertise ? (
          // Welcome Screen - Simple and Quick
          <div className="p-8 animate-in fade-in ">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-nb-blue/100 to-nb-blue mb-4 text-white shadow-brutal">
                <Icon name="auto_awesome" className="text-2xl" />
              </div>
              <h1 className={cn('text-2xl font-bold mb-2', cx.text)}>Welcome to Field Studio</h1>
              <p className={cn('text-sm leading-relaxed', cx.textMuted)}>
                Turn your files into organized, shareable digital archives.
              </p>
            </div>

            {/* Quick Start Features */}
            <div className="space-y-3 mb-8">
              <div className="flex items-start gap-3 p-3 bg-nb-white ">
                <div className="w-8 h-8 bg-nb-green/20 flex items-center justify-center shrink-0">
                  <Icon name="folder" className="text-nb-green text-sm" />
                </div>
                <div>
                  <p className={cn('text-sm font-medium', cx.text)}>Drag folders to import</p>
                  <p className={cn('text-xs', cx.textMuted)}>Structure is preserved automatically</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-nb-white ">
                <div className="w-8 h-8 bg-nb-blue/20 flex items-center justify-center shrink-0">
                  <Icon name="photo_camera" className="text-nb-blue text-sm" />
                </div>
                <div>
                  <p className={cn('text-sm font-medium', cx.text)}>Metadata extracted</p>
                  <p className={cn('text-xs', cx.textMuted)}>GPS, dates, and camera info captured</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-nb-white ">
                <div className="w-8 h-8 bg-nb-purple/20 flex items-center justify-center shrink-0">
                  <Icon name="public" className="text-nb-purple text-sm" />
                </div>
                <div>
                  <p className={cn('text-sm font-medium', cx.text)}>Export to web</p>
                  <p className={cn('text-xs', cx.textMuted)}>One-click shareable websites</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button variant="success" size="lg"
                onClick={handleQuickStart}
                fullWidth
                iconAfter={<Icon name="arrow_forward" />}
              >
                Get Started (Essential Mode)
              </Button>
              <Button variant="secondary" size="base"
                onClick={() => setShowExpertise(true)}
                fullWidth
                icon={<Icon name="tune" />}
              >
                Customize my experience level
              </Button>
            </div>

            {/* Help hint */}
            <p className={cn('text-center text-[10px] mt-6', cx.textMuted)}>
              Press <kbd className={cn('px-1.5 py-0.5 text-[9px] font-mono', cx.kbd)}>?</kbd> anytime for help
            </p>
          </div>
        ) : (
          // Expertise Selection with Enhanced ExperienceSelector
          <div className="p-8 animate-in slide-in-from-right-4 ">
            {/* Back Button - Clearer navigation */}
            <div className="flex items-center justify-between mb-6">
              <Button variant="ghost" size="bare"
                onClick={() => setShowExpertise(false)}
                className={cn('flex items-center gap-2 text-sm px-3 py-1.5 transition-nb', cx.textMuted)}
              >
                <Icon name="arrow_back" className="text-sm" />
                Back to welcome
              </Button>
              <div className={cn('text-sm', cx.textMuted)}>
                Step 2 of 2
              </div>
            </div>

            {/* Enhanced Experience Selector */}
            <div className="mb-8">
              <ExperienceSelector
                selectedLevel={selectedLevel}
                onSelect={handleSelectLevel}
                showSkipOption={true}
                onSkip={handleSkipSelection}
                showFeatureComparison={true}
              />
            </div>

            {/* Confirmation Actions */}
            <div className={cn('flex items-center justify-between pt-6 border-t', cx.divider)}>
              <div className={cn('text-sm', cx.textMuted)}>
                Selected: <span className={cn('font-semibold', cx.text)}>
                  {selectedLevel === 'simple' ? 'Essential' : 
                   selectedLevel === 'standard' ? 'Complete' : 'Expert'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm"
                  onClick={handleSkipSelection}
                >
                  Skip for now
                </Button>
                <Button variant="primary" size="base"
                  onClick={handleConfirmSelection}
                >
                  Continue with {selectedLevel === 'simple' ? 'Essential' :
                                selectedLevel === 'standard' ? 'Complete' : 'Expert'}
                </Button>
              </div>
            </div>

            {/* Additional Guidance */}
            <div className="mt-6 p-4 bg-nb-blue/10 border border-nb-blue/20">
              <div className="flex items-start gap-3">
                <Icon name="lightbulb" className="text-nb-blue text-lg mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-nb-blue mb-1">
                    Not sure which to choose?
                  </p>
                  <p className="text-xs text-nb-blue">
                    <strong>Essential</strong> is perfect for quick organization. <strong>Complete</strong> adds full metadata control. 
                    <strong>Expert</strong> is for IIIF specialists. You can change this anytime in Settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};