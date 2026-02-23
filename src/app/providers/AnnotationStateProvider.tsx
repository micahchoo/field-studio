/**
 * AnnotationStateProvider
 *
 * Centralizes annotation-related state that was previously prop-drilled
 * through ViewRouter → ViewerView and ViewRouter → Inspector.
 *
 * State managed:
 * - showAnnotationTool / toggle
 * - annotationText / setter
 * - annotationMotivation / setter
 * - annotationDrawingState / setter
 * - forceAnnotationsTab
 * - timeRange / setter
 * - currentPlaybackTime (throttled)
 * - save/clear refs for spatial annotations
 */

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useAppModeActions } from '@/src/app/providers';

// ============================================================================
// Types
// ============================================================================

export type AnnotationMotivation = 'commenting' | 'tagging' | 'describing';

export interface AnnotationDrawingState {
  pointCount: number;
  isDrawing: boolean;
  canSave: boolean;
}

export interface TimeRange {
  start: number;
  end?: number;
}

export interface AnnotationStateContextValue {
  // Spatial annotation state
  showAnnotationTool: boolean;
  annotationText: string;
  annotationMotivation: AnnotationMotivation;
  annotationDrawingState: AnnotationDrawingState;
  forceAnnotationsTab: boolean;

  // Time-based annotation state
  timeRange: TimeRange | null;
  currentPlaybackTime: number;

  // Setters
  setAnnotationText: (text: string) => void;
  setAnnotationMotivation: (motivation: AnnotationMotivation) => void;
  setAnnotationDrawingState: (state: AnnotationDrawingState) => void;
  setTimeRange: (range: TimeRange | null) => void;

  // Handlers
  handleAnnotationToolToggle: (active: boolean) => void;
  handlePlaybackTimeChange: (time: number) => void;

  // Refs for spatial annotation save/clear
  annotationSaveRef: React.MutableRefObject<(() => void) | null>;
  annotationClearRef: React.MutableRefObject<(() => void) | null>;
}

// ============================================================================
// Context
// ============================================================================

const AnnotationStateContext = createContext<AnnotationStateContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export const AnnotationStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const appModeActions = useAppModeActions();

  // Spatial annotation state
  const [showAnnotationTool, setShowAnnotationTool] = useState(false);
  const [annotationText, setAnnotationText] = useState('');
  const [annotationMotivation, setAnnotationMotivation] = useState<AnnotationMotivation>('commenting');
  const [annotationDrawingState, setAnnotationDrawingState] = useState<AnnotationDrawingState>({
    pointCount: 0,
    isDrawing: false,
    canSave: false,
  });
  const [forceAnnotationsTab, setForceAnnotationsTab] = useState(false);

  // Time-based annotation state
  const [timeRange, setTimeRange] = useState<TimeRange | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);

  // Throttle playback time updates to prevent excessive re-renders
  const lastPlaybackUpdateRef = useRef<number>(0);
  const handlePlaybackTimeChange = useCallback((time: number) => {
    const now = Date.now();
    if (now - lastPlaybackUpdateRef.current > 500) {
      lastPlaybackUpdateRef.current = now;
      setCurrentPlaybackTime(time);
    }
  }, []);

  // Refs for spatial annotation controls from AnnotationDrawingOverlay
  const annotationSaveRef = useRef<(() => void) | null>(null);
  const annotationClearRef = useRef<(() => void) | null>(null);

  // Handle annotation tool toggle - auto-open inspector
  const handleAnnotationToolToggle = useCallback((active: boolean) => {
    setShowAnnotationTool(active);
    appModeActions.setAnnotationMode(active);
    if (active) {
      setForceAnnotationsTab(true);
    } else {
      setForceAnnotationsTab(false);
      setAnnotationText('');
      setTimeRange(null);
    }
  }, [appModeActions]);

  const value: AnnotationStateContextValue = {
    showAnnotationTool,
    annotationText,
    annotationMotivation,
    annotationDrawingState,
    forceAnnotationsTab,
    timeRange,
    currentPlaybackTime,
    setAnnotationText,
    setAnnotationMotivation,
    setAnnotationDrawingState,
    setTimeRange,
    handleAnnotationToolToggle,
    handlePlaybackTimeChange,
    annotationSaveRef,
    annotationClearRef,
  };

  return (
    <AnnotationStateContext.Provider value={value}>
      {children}
    </AnnotationStateContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

export function useAnnotationState(): AnnotationStateContextValue {
  const context = useContext(AnnotationStateContext);
  if (!context) {
    throw new Error('useAnnotationState must be used within an AnnotationStateProvider');
  }
  return context;
}
