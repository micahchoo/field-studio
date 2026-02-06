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
import { Icon } from './Icon';
import { AbstractionLevel } from '../types';
import { ExperienceSelector } from '../src/widgets/ExperienceSelector';

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
    <div className="fixed inset-0 bg-slate-900/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white max-w-4xl w-full rounded-2xl shadow-2xl overflow-hidden border border-slate-200">

        {!showExpertise ? (
          // Welcome Screen - Simple and Quick
          <div className="p-8 animate-in fade-in duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 text-white shadow-lg">
                <Icon name="auto_awesome" className="text-2xl" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Field Studio</h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                Turn your files into organized, shareable digital archives.
              </p>
            </div>

            {/* Quick Start Features */}
            <div className="space-y-3 mb-8">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <Icon name="folder" className="text-emerald-600 text-sm" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Drag folders to import</p>
                  <p className="text-xs text-slate-400">Structure is preserved automatically</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Icon name="photo_camera" className="text-blue-600 text-sm" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Metadata extracted</p>
                  <p className="text-xs text-slate-400">GPS, dates, and camera info captured</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                  <Icon name="public" className="text-violet-600 text-sm" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Export to web</p>
                  <p className="text-xs text-slate-400">One-click shareable websites</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleQuickStart}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                Get Started (Essential Mode)
                <Icon name="arrow_forward" />
              </button>
              <button
                onClick={() => setShowExpertise(true)}
                className="w-full text-slate-600 px-6 py-3 rounded-xl text-sm hover:text-slate-800 hover:bg-slate-50 transition-colors border border-slate-200 hover:border-slate-300"
              >
                <div className="flex items-center justify-center gap-2">
                  <Icon name="tune" className="text-slate-400" />
                  Customize my experience level
                </div>
              </button>
            </div>

            {/* Help hint */}
            <p className="text-center text-[10px] text-slate-400 mt-6">
              Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-mono">?</kbd> anytime for help
            </p>
          </div>
        ) : (
          // Expertise Selection with Enhanced ExperienceSelector
          <div className="p-8 animate-in slide-in-from-right-4 duration-300">
            {/* Back Button - Clearer navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setShowExpertise(false)}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <Icon name="arrow_back" className="text-sm" />
                Back to welcome
              </button>
              <div className="text-sm text-slate-500">
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
            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <div className="text-sm text-slate-500">
                Selected: <span className="font-semibold text-slate-700">
                  {selectedLevel === 'simple' ? 'Essential' : 
                   selectedLevel === 'standard' ? 'Complete' : 'Expert'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSkipSelection}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleConfirmSelection}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
                >
                  Continue with {selectedLevel === 'simple' ? 'Essential' : 
                                selectedLevel === 'standard' ? 'Complete' : 'Expert'}
                </button>
              </div>
            </div>

            {/* Additional Guidance */}
            <div className="mt-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
              <div className="flex items-start gap-3">
                <Icon name="lightbulb" className="text-blue-500 text-lg mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800 mb-1">
                    Not sure which to choose?
                  </p>
                  <p className="text-xs text-blue-600">
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