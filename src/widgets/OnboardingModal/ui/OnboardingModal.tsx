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

interface OnboardingModalProps {
  onComplete: (level: AbstractionLevel) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
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
    <div className="fixed inset-0 bg-nb-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in ">
      <div className="bg-nb-white max-w-4xl w-full shadow-brutal-lg overflow-hidden border border-nb-black/20">

        {!showExpertise ? (
          // Welcome Screen - Simple and Quick
          <div className="p-8 animate-in fade-in ">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-nb-blue/100 to-nb-blue mb-4 text-white shadow-brutal">
                <Icon name="auto_awesome" className="text-2xl" />
              </div>
              <h1 className="text-2xl font-bold text-nb-black mb-2">Welcome to Field Studio</h1>
              <p className="text-nb-black/50 text-sm leading-relaxed">
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
                  <p className="text-sm font-medium text-nb-black/80">Drag folders to import</p>
                  <p className="text-xs text-nb-black/40">Structure is preserved automatically</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-nb-white ">
                <div className="w-8 h-8 bg-nb-blue/20 flex items-center justify-center shrink-0">
                  <Icon name="photo_camera" className="text-nb-blue text-sm" />
                </div>
                <div>
                  <p className="text-sm font-medium text-nb-black/80">Metadata extracted</p>
                  <p className="text-xs text-nb-black/40">GPS, dates, and camera info captured</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-nb-white ">
                <div className="w-8 h-8 bg-nb-purple/20 flex items-center justify-center shrink-0">
                  <Icon name="public" className="text-nb-purple text-sm" />
                </div>
                <div>
                  <p className="text-sm font-medium text-nb-black/80">Export to web</p>
                  <p className="text-xs text-nb-black/40">One-click shareable websites</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button variant="ghost" size="bare"
                onClick={handleQuickStart}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-nb flex items-center justify-center gap-2 shadow-brutal hover:shadow-brutal"
              >
                Get Started (Essential Mode)
                <Icon name="arrow_forward" />
              </Button>
              <Button variant="ghost" size="bare"
                onClick={() => setShowExpertise(true)}
                className="w-full text-nb-black/60 px-6 py-3 text-sm hover:text-nb-black hover:bg-nb-white transition-nb border border-nb-black/20 hover:border-nb-black/20"
              >
                <div className="flex items-center justify-center gap-2">
                  <Icon name="tune" className="text-nb-black/40" />
                  Customize my experience level
                </div>
              </Button>
            </div>

            {/* Help hint */}
            <p className="text-center text-[10px] text-nb-black/40 mt-6">
              Press <kbd className="px-1.5 py-0.5 bg-nb-cream text-[9px] font-mono">?</kbd> anytime for help
            </p>
          </div>
        ) : (
          // Expertise Selection with Enhanced ExperienceSelector
          <div className="p-8 animate-in slide-in-from-right-4 ">
            {/* Back Button - Clearer navigation */}
            <div className="flex items-center justify-between mb-6">
              <Button variant="ghost" size="bare"
                onClick={() => setShowExpertise(false)}
                className="flex items-center gap-2 text-nb-black/50 hover:text-nb-black/80 text-sm px-3 py-1.5 hover:bg-nb-white transition-nb"
              >
                <Icon name="arrow_back" className="text-sm" />
                Back to welcome
              </Button>
              <div className="text-sm text-nb-black/50">
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
            <div className="flex items-center justify-between pt-6 border-t border-nb-black/20">
              <div className="text-sm text-nb-black/50">
                Selected: <span className="font-semibold text-nb-black/80">
                  {selectedLevel === 'simple' ? 'Essential' : 
                   selectedLevel === 'standard' ? 'Complete' : 'Expert'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="bare"
                  onClick={handleSkipSelection}
                  className="px-4 py-2 text-sm text-nb-black/50 hover:text-nb-black/80 hover:bg-nb-white transition-nb"
                >
                  Skip for now
                </Button>
                <Button variant="ghost" size="bare"
                  onClick={handleConfirmSelection}
                  className="px-6 py-2.5 bg-gradient-to-r from-nb-blue/100 to-nb-blue text-white font-semibold hover:from-nb-blue hover:to-nb-blue transition-nb shadow-brutal-sm hover:shadow-brutal"
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