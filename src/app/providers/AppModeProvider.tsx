/**
 * App Mode Context
 * 
 * Tracks the current app mode (archive, metadata, viewer, etc.) to enable
 * mode-aware UI adaptations and routing.
 * 
 * Uses split context pattern to prevent unnecessary re‑renders:
 * - AppModeStateContext: changes trigger re‑renders (for read‑only components)
 * - AppModeDispatchContext: stable reference, never triggers re‑renders (for actions)
 */

import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { AppMode } from '@/src/shared/types';

// ============================================================================
// Types
// ============================================================================

export interface AppModeState {
  /** Current app mode */
  mode: AppMode;
  /** Previous app mode (for back navigation) */
  previousMode: AppMode | null;
  /** Timestamp when mode changed */
  changedAt: number;
}

export interface AppModeActions {
  /** Set the current app mode */
  setMode: (mode: AppMode) => void;
  /** Go back to previous mode (if any) */
  goBack: () => void;
  /** Check if current mode matches */
  isMode: (mode: AppMode) => boolean;
}

// ============================================================================
// Contexts
// ============================================================================

const AppModeStateContext = createContext<AppModeState | null>(null);
const AppModeDispatchContext = createContext<AppModeActions | null>(null);

// ============================================================================
// Provider
// ============================================================================

export interface AppModeProviderProps {
  children: ReactNode;
  /** Initial mode (default: 'archive') */
  initialMode?: AppMode;
}

export const AppModeProvider: React.FC<AppModeProviderProps> = ({
  children,
  initialMode = 'archive'
}) => {
  const [state, setState] = useState<AppModeState>({
    mode: initialMode,
    previousMode: null,
    changedAt: Date.now(),
  });

  const setMode = useCallback((mode: AppMode) => {
    setState(prev => ({
      mode,
      previousMode: prev.mode,
      changedAt: Date.now(),
    }));
  }, []);

  const goBack = useCallback(() => {
    if (state.previousMode) {
      setState(prev => ({
        mode: prev.previousMode!,
        previousMode: prev.mode,
        changedAt: Date.now(),
      }));
    }
  }, [state.previousMode]);

  const isMode = useCallback((mode: AppMode) => state.mode === mode, [state.mode]);

  const actions = useMemo<AppModeActions>(() => ({
    setMode,
    goBack,
    isMode,
  }), [setMode, goBack, isMode]);

  return (
    <AppModeStateContext.Provider value={state}>
      <AppModeDispatchContext.Provider value={actions}>
        {children}
      </AppModeDispatchContext.Provider>
    </AppModeStateContext.Provider>
  );
};

// ============================================================================
// Hooks
// ============================================================================

export function useAppModeState(): AppModeState {
  const context = useContext(AppModeStateContext);
  if (!context) {
    throw new Error('useAppModeState must be used within an AppModeProvider');
  }
  return context;
}

export function useAppModeActions(): AppModeActions {
  const context = useContext(AppModeDispatchContext);
  if (!context) {
    throw new Error('useAppModeActions must be used within an AppModeProvider');
  }
  return context;
}

export function useAppMode(): [AppMode, (mode: AppMode) => void] {
  const state = useAppModeState();
  const actions = useAppModeActions();
  return [state.mode, actions.setMode];
}

export default AppModeProvider;