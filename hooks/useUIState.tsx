/**
 * Unified UI State Provider
 * 
 * Consolidates UserIntent and ResourceContext into a single provider to reduce
 * cognitive load and boilerplate while maintaining split-context performance.
 * 
 * This provider wraps both existing contexts, offering a single point of entry
 * while preserving backward compatibility with existing hooks.
 */

import React, { ReactNode } from 'react';
import { UserIntentProvider, UserIntentProviderProps } from './useUserIntent';
import { ResourceContextProvider, ResourceContextProviderProps } from './useResourceContext';

export interface UIStateProviderProps {
  children: ReactNode;
  /** Initial user intent (passed to UserIntentProvider) */
  initialIntent?: UserIntentProviderProps['initialIntent'];
  /** Initial resource (passed to ResourceContextProvider) */
  initialResource?: ResourceContextProviderProps['initialResource'];
}

/**
 * Single provider that wraps both UserIntent and ResourceContext providers.
 * Reduces nesting from two separate providers to one.
 */
export const UIStateProvider: React.FC<UIStateProviderProps> = ({
  children,
  initialIntent = 'idle',
  initialResource = null,
}) => {
  return (
    <UserIntentProvider initialIntent={initialIntent}>
      <ResourceContextProvider initialResource={initialResource}>
        {children}
      </ResourceContextProvider>
    </UserIntentProvider>
  );
};

/**
 * Re‑export all hooks for convenience.
 */
export {
  // User Intent hooks
  useUserIntentState,
  useUserIntentDispatch,
  useUserIntent,
  useUserIntentOptional,
  useIsEditing,
  useIsFieldMode,
  useIntentMicrocopy,
  // Resource Context hooks
  useResourceContextState,
  useResourceContextDispatch,
  useResourceContext,
  useResourceContextOptional,
  useHasResource,
  useIsCanvas,
  useIsManifest,
  useIsCollection,
  useResourceMicrocopy,
} from './index';