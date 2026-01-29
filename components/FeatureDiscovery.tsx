/**
 * FeatureDiscovery - In-app tour component for onboarding
 * 
 * Provides guided tours for:
 * - Command Palette (⌘K)
 * - Field Mode
 * - QC Dashboard
 * - Metadata Editor
 * 
 * Uses localStorage to track completed tours
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from './Icon';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  icon?: string;
}

export interface Tour {
  id: string;
  name: string;
  description: string;
  steps: TourStep[];
  /** Minimum app version required for this tour */
  minVersion?: string;
  /** Whether tour should auto-start on first visit */
  autoStart?: boolean;
}

// Predefined tours
export const TOURS: Record<string, Tour> = {
  commandPalette: {
    id: 'commandPalette',
    name: 'Command Palette Tour',
    description: 'Learn how to quickly access any feature using keyboard shortcuts',
    autoStart: true,
    steps: [
      {
        id: 'intro',
        title: 'Welcome to Command Palette',
        description: 'The Command Palette lets you access any feature instantly. Press ⌘K (or Ctrl+K) to open it anytime.',
        icon: 'keyboard_command_key'
      },
      {
        id: 'search',
        title: 'Quick Search',
        description: 'Type to search commands, files, or navigate to any view. Results appear instantly.',
        icon: 'search'
      },
      {
        id: 'shortcuts',
        title: 'Keyboard Shortcuts',
        description: 'Each command shows its keyboard shortcut. Press the highlighted key to execute immediately.',
        icon: 'keyboard'
      }
    ]
  },
  fieldMode: {
    id: 'fieldMode',
    name: 'Field Mode Tour',
    description: 'Optimized interface for mobile data collection',
    autoStart: false,
    steps: [
      {
        id: 'intro',
        title: 'Field Mode',
        description: 'Field Mode provides a simplified interface optimized for mobile devices and offline use.',
        icon: 'photo_camera'
      },
      {
        id: 'quickCapture',
        title: 'Quick Capture',
        description: 'Use the Quick Capture button to add photos, audio recordings, or notes instantly.',
        icon: 'add_a_photo'
      },
      {
        id: 'offline',
        title: 'Offline Sync',
        description: 'Your data is saved locally and syncs automatically when you reconnect.',
        icon: 'cloud_sync'
      }
    ]
  },
  qcDashboard: {
    id: 'qcDashboard',
    name: 'Quality Control Tour',
    description: 'Monitor and fix data integrity issues',
    autoStart: false,
    steps: [
      {
        id: 'intro',
        title: 'Quality Control Dashboard',
        description: 'The QC Dashboard helps you identify and fix data integrity issues in your archive.',
        icon: 'verified'
      },
      {
        id: 'healthScore',
        title: 'Health Score',
        description: 'The health score shows overall data quality. Click any category to see specific issues.',
        icon: 'healing'
      },
      {
        id: 'autoFix',
        title: 'Auto-Fix Issues',
        description: 'Many issues can be fixed automatically. Click "Fix It" to apply suggested corrections.',
        icon: 'auto_fix_high'
      }
    ]
  },
  metadataEditor: {
    id: 'metadataEditor',
    name: 'Metadata Editor Tour',
    description: 'Rich editing for IIIF metadata',
    autoStart: false,
    steps: [
      {
        id: 'intro',
        title: 'Metadata Editor',
        description: 'Edit IIIF metadata with real-time validation and Dublin Core mapping.',
        icon: 'edit_note'
      },
      {
        id: 'multilingual',
        title: 'Multilingual Support',
        description: 'Add translations for any field. Click the language indicator to add alternate languages.',
        icon: 'translate'
      },
      {
        id: 'templates',
        title: 'Field Templates',
        description: 'Use templates to quickly apply standard metadata fields for different resource types.',
        icon: 'format_list_bulleted'
      }
    ]
  }
};

const STORAGE_KEY = 'biiif-completed-tours';
const STORAGE_KEY_CURRENT = 'biiif-current-tour';

interface FeatureDiscoveryProps {
  /** Specific tour ID to start, or undefined for tour selection */
  tourId?: string;
  /** Called when tour is completed or dismissed */
  onComplete?: (tourId: string) => void;
  /** Called when tour is dismissed early */
  onDismiss?: (tourId: string) => void;
  /** Whether to show the tour selector when no tourId is specified */
  showTourSelector?: boolean;
}

/**
 * Get list of completed tours from localStorage
 */
export function getCompletedTours(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Mark a tour as completed
 */
export function markTourCompleted(tourId: string): void {
  try {
    const completed = getCompletedTours();
    if (!completed.includes(tourId)) {
      completed.push(tourId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
    }
    localStorage.removeItem(STORAGE_KEY_CURRENT);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if a tour has been completed
 */
export function isTourCompleted(tourId: string): boolean {
  return getCompletedTours().includes(tourId);
}

/**
 * Reset all tour progress
 */
export function resetAllTours(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_CURRENT);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Start a specific tour
 */
export function startTour(tourId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_CURRENT, tourId);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Feature Discovery Tour Component
 */
export const FeatureDiscovery: React.FC<FeatureDiscoveryProps> = ({
  tourId,
  onComplete,
  onDismiss,
  showTourSelector = true
}) => {
  const [activeTour, setActiveTour] = useState<Tour | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  // Load tour state on mount
  useEffect(() => {
    if (tourId) {
      const tour = TOURS[tourId];
      if (tour) {
        setActiveTour(tour);
        setCurrentStep(0);
        setIsVisible(true);
      }
    } else if (showTourSelector) {
      setShowSelector(true);
    }
  }, [tourId, showTourSelector]);

  // Check for auto-start tours on mount
  useEffect(() => {
    const checkAutoStart = () => {
      // Don't auto-start if a tour is already active
      if (tourId || activeTour) return;
      
      // Check for any uncompleted auto-start tours
      for (const [id, tour] of Object.entries(TOURS)) {
        if (tour.autoStart && !isTourCompleted(id)) {
          setActiveTour(tour);
          setCurrentStep(0);
          setIsVisible(true);
          setShowSelector(false);
          break;
        }
      }
    };

    // Delay to let app fully load
    const timer = setTimeout(checkAutoStart, 1000);
    return () => clearTimeout(timer);
  }, [tourId, activeTour]);

  const handleNext = useCallback(() => {
    if (!activeTour) return;
    
    if (currentStep < activeTour.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Tour complete
      markTourCompleted(activeTour.id);
      setIsVisible(false);
      onComplete?.(activeTour.id);
    }
  }, [activeTour, currentStep, onComplete]);

  const handlePrevious = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const handleDismiss = useCallback(() => {
    if (activeTour) {
      onDismiss?.(activeTour.id);
    }
    setIsVisible(false);
    setActiveTour(null);
    setShowSelector(false);
  }, [activeTour, onDismiss]);

  const handleStartTour = useCallback((id: string) => {
    const tour = TOURS[id];
    if (tour) {
      setActiveTour(tour);
      setCurrentStep(0);
      setIsVisible(true);
      setShowSelector(false);
      startTour(id);
    }
  }, []);

  const handleSkip = useCallback(() => {
    if (activeTour) {
      markTourCompleted(activeTour.id);
      onComplete?.(activeTour.id);
    }
    setIsVisible(false);
    setActiveTour(null);
  }, [activeTour, onComplete]);

  // Tour selector view
  if (showSelector && !activeTour) {
    const completedTours = getCompletedTours();
    
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[700] flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
          <div className="p-6 border-b bg-slate-50">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Icon name="school" className="text-iiif-blue" />
              Feature Tours
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Learn how to use key features with guided tours
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid gap-4">
              {Object.values(TOURS).map(tour => {
                const isCompleted = completedTours.includes(tour.id);
                return (
                  <button
                    key={tour.id}
                    onClick={() => handleStartTour(tour.id)}
                    className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all hover:shadow-md ${
                      isCompleted 
                        ? 'bg-slate-50 border-slate-200 opacity-70' 
                        : 'bg-white border-slate-200 hover:border-iiif-blue'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      isCompleted ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-iiif-blue'
                    }`}>
                      <Icon name={isCompleted ? 'check_circle' : 'play_circle'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800">{tour.name}</h3>
                        {isCompleted && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Completed
                          </span>
                        )}
                        {tour.autoStart && !isCompleted && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{tour.description}</p>
                      <p className="text-xs text-slate-400 mt-2">{tour.steps.length} steps</p>
                    </div>
                    <Icon name="chevron_right" className="text-slate-400" />
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
            <button
              onClick={() => {
                resetAllTours();
                // Force re-render
                setShowSelector(false);
                setTimeout(() => setShowSelector(true), 0);
              }}
              className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2"
            >
              Reset Progress
            </button>
            <button
              onClick={() => setShowSelector(false)}
              className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No active tour
  if (!activeTour || !isVisible) {
    return null;
  }

  const step = activeTour.steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === activeTour.steps.length - 1;
  const progress = ((currentStep + 1) / activeTour.steps.length) * 100;

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleDismiss}
      />
      
      {/* Tour Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100">
          <div 
            className="h-full bg-iiif-blue transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Step {currentStep + 1} of {activeTour.steps.length}
            </span>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Close tour"
            >
              <Icon name="close" className="text-lg" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 pt-4">
          <div className="flex items-start gap-4">
            {step.icon && (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                <Icon name={step.icon} className="text-2xl text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                {step.title}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
          <div className="flex gap-1">
            {activeTour.steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-iiif-blue' : 'bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Skip Tour
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-2 text-sm font-medium text-white bg-iiif-blue hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1"
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <Icon name="arrow_forward" className="text-sm" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureDiscovery;