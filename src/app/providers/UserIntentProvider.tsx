/**
 * User Intent Context
 * 
 * Tracks the user's current intent (editing, viewing, exporting, etc.) to enable
 * context‑aware UI adaptations (microcopy, styling, progressive disclosure).
 * 
 * Uses split context pattern to prevent unnecessary re‑renders:
 * - UserIntentStateContext: changes trigger re‑renders (for read‑only components)
 * - UserIntentDispatchContext: stable reference, never triggers re‑renders (for actions)
 */

import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { CONTEXTUAL_TOKENS } from '@/src/shared/config/design-tokens';

// ============================================================================
// Types
// ============================================================================

export type UserIntent =
  | 'viewing'           // Passive consumption, no modifications
  | 'editing'           // Actively editing metadata or structure
  | 'selecting'         // Multi‑selection (batch operations)
  | 'dragging'          // Drag‑and‑drop in progress
  | 'exporting'         // Export flow active
  | 'importing'         // Import flow active
  | 'validating'        // Validation or QC in progress
  | 'searching'         // Search query active
  | 'navigating'        // Browsing hierarchy
  | 'annotating'        // Adding annotations
  | 'designing'         // Board design mode
  | 'fieldMode'         // High‑contrast field mode active
  | 'idle';             // No specific intent

export interface UserIntentState {
  /** Primary intent */
  intent: UserIntent;
  /** Secondary intent (optional) */
  secondary?: UserIntent;
  /** Timestamp when intent started (for time‑based adaptations) */
  startedAt: number;
  /** Associated resource ID (if any) */
  resourceId?: string;
  /** UI area where intent applies (e.g., 'sidebar', 'inspector', 'canvas') */
  area?: string;
  /** Custom data for intent‑specific adaptations */
  meta?: Record<string, unknown>;
}

export interface UserIntentActions {
  /** Set primary intent */
  setIntent: (intent: UserIntent, options?: Partial<Omit<UserIntentState, 'intent' | 'startedAt'>>) => void;
  /** Clear intent (reset to idle) */
  clearIntent: () => void;
  /** Update meta data */
  updateMeta: (meta: Record<string, unknown>) => void;
}

// ============================================================================
// Contexts
// ============================================================================

const UserIntentStateContext = createContext<UserIntentState | null>(null);
const UserIntentDispatchContext = createContext<UserIntentActions | null>(null);

// ============================================================================
// Provider
// ============================================================================

export interface UserIntentProviderProps {
  children: ReactNode;
  /** Initial intent (default: 'idle') */
  initialIntent?: UserIntent;
}

export const UserIntentProvider: React.FC<UserIntentProviderProps> = ({
  children,
  initialIntent = 'idle'
}) => {
  const [state, setState] = useState<UserIntentState>({
    intent: initialIntent,
    startedAt: Date.now(),
  });

  const setIntent = useCallback((intent: UserIntent, options?: Partial<Omit<UserIntentState, 'intent' | 'startedAt'>>) => {
    setState({
      intent,
      startedAt: Date.now(),
      secondary: options?.secondary,
      resourceId: options?.resourceId,
      area: options?.area,
      meta: options?.meta,
    });
  }, []);

  const clearIntent = useCallback(() => {
    setState({
      intent: 'idle',
      startedAt: Date.now(),
    });
  }, []);

  const updateMeta = useCallback((meta: Record<string, unknown>) => {
    setState(prev => ({
      ...prev,
      meta: { ...prev.meta, ...meta },
    }));
  }, []);

  const actions = useMemo<UserIntentActions>(() => ({
    setIntent,
    clearIntent,
    updateMeta,
  }), [setIntent, clearIntent, updateMeta]);

  const stateValue = useMemo(() => state, [state]);

  return (
    <UserIntentStateContext.Provider value={stateValue}>
      <UserIntentDispatchContext.Provider value={actions}>
        {children}
      </UserIntentDispatchContext.Provider>
    </UserIntentStateContext.Provider>
  );
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access the user intent state (triggers re‑renders on changes)
 */
export function useUserIntentState(): UserIntentState {
  const context = useContext(UserIntentStateContext);
  if (!context) {
    throw new Error('useUserIntentState must be used within a UserIntentProvider');
  }
  return context;
}

/**
 * Access user intent actions (stable reference, no re‑renders)
 */
export function useUserIntentDispatch(): UserIntentActions {
  const context = useContext(UserIntentDispatchContext);
  if (!context) {
    throw new Error('useUserIntentDispatch must be used within a UserIntentProvider');
  }
  return context;
}

/**
 * Combined hook for convenience (triggers re‑renders on state changes)
 */
export function useUserIntent(): UserIntentState & UserIntentActions & {
  isIntent: (intent: UserIntent) => boolean;
  getContextualStyles: () => React.CSSProperties;
} {
  const state = useUserIntentState();
  const actions = useUserIntentDispatch();
  return {
    ...state,
    ...actions,
    isIntent: (intent: UserIntent) => state.intent === intent,
    getContextualStyles: () => {
      const contextKey = state.intent as keyof typeof CONTEXTUAL_TOKENS.contexts;
      const context = CONTEXTUAL_TOKENS.contexts[contextKey];
      if (!context) return {};
      const styles: React.CSSProperties = {};
      if ('border' in context) styles.borderColor = context.border;
      if ('background' in context) styles.backgroundColor = context.background;
      if ('opacity' in context) styles.opacity = context.opacity;
      if ('filter' in context) styles.filter = context.filter;
      return styles;
    },
  };
}

/**
 * Optional access (returns null if not in provider)
 */
export function useUserIntentOptional(): (UserIntentState & UserIntentActions & {
  isIntent: (intent: UserIntent) => boolean;
  getContextualStyles: () => React.CSSProperties;
}) | null {
  const state = useContext(UserIntentStateContext);
  const actions = useContext(UserIntentDispatchContext);
  if (!state || !actions) return null;
  return {
    ...state,
    ...actions,
    isIntent: (intent: UserIntent) => state.intent === intent,
    getContextualStyles: () => {
      const contextKey = state.intent as keyof typeof CONTEXTUAL_TOKENS.contexts;
      const context = CONTEXTUAL_TOKENS.contexts[contextKey];
      if (!context) return {};
      const styles: React.CSSProperties = {};
      if ('border' in context) styles.borderColor = context.border;
      if ('background' in context) styles.backgroundColor = context.background;
      if ('opacity' in context) styles.opacity = context.opacity;
      if ('filter' in context) styles.filter = context.filter;
      return styles;
    },
  };
}

// ============================================================================
// Derived Intent Utilities
// ============================================================================

/**
 * Hook that returns whether the user is currently editing
 */
export function useIsEditing(): boolean {
  const { intent } = useUserIntentState();
  return intent === 'editing';
}

/**
 * Hook that returns whether the user is in field mode
 */
export function useIsFieldMode(): boolean {
  const { intent } = useUserIntentState();
  return intent === 'fieldMode';
}

/**
 * Hook that returns contextual microcopy for the current intent
 */
export function useIntentMicrocopy(): string {
  const { intent } = useUserIntentState();
  const context = CONTEXTUAL_TOKENS.contexts[intent as keyof typeof CONTEXTUAL_TOKENS.contexts];
  return context?.microcopy ?? '';
}