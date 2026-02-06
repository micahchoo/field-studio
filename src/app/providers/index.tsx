/**
 * App Providers - Consolidated Context Provider
 *
 * Centralizes all context providers and template-level hooks used by the app.
 *
 * This module exports:
 * 1. AppProviders component - Wraps the app with all context providers
 * 2. Template hooks (useAppSettings, useTerminology) - For template-level use only
 *
 * Provider hierarchy:
 * 1. VaultProvider - Normalized state management for IIIF data
 * 2. ToastProvider - Toast notifications
 * 3. ErrorBoundary - Error handling
 * 4. UserIntentProvider - User intent tracking (editing, viewing, etc.)
 * 5. ResourceContextProvider - Current resource state (type, validation, etc.)
 *
 * IMPORTANT: Template hooks should ONLY be used by:
 * - Templates (FieldModeTemplate, BaseTemplate)
 * - Pages/App root
 *
 * ORGANISMS SHOULD NOT IMPORT THESE DIRECTLY.
 * Instead, receive context via props from templates using render props pattern.
 *
 * @example
 * // App.tsx usage
 * import { AppProviders } from '@/src/app/providers';
 *
 * <AppProviders>
 *   <MainApp />
 * </AppProviders>
 *
 * @example
 * // Template usage (correct)
 * import { useAppSettings, useTerminology } from '@/src/app/providers';
 *
 * const { settings } = useAppSettings();
 * const { t } = useTerminology({ level: settings.abstractionLevel });
 * return children({ cx, fieldMode: settings.fieldMode, t });
 *
 * @example
 * // Organism usage (WRONG - don't do this)
 * import { useAppSettings } from '@/src/app/providers'; // ❌
 * const { fieldMode } = useAppSettings(); // ❌
 *
 * // Organism usage (correct)
 * interface Props {
 *   fieldMode: boolean;  // ✅ Receive via props from template
 *   t: (key: string) => string;  // ✅ Receive via props from template
 * }
 */

import React, { ReactNode } from 'react';
import { VaultProvider } from '@/src/entities/manifest/model/hooks/useIIIFEntity';
import { ToastProvider } from '@/src/shared/ui/molecules/Toast';
import { ErrorBoundary } from '@/src/shared/ui/molecules/ErrorBoundary';
import { UserIntentProvider } from './UserIntentProvider';
import { ResourceContextProvider } from './ResourceContextProvider';
import { AppModeProvider } from './AppModeProvider';

export interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Consolidated provider wrapper
 *
 * Wraps the app with all required context providers in the correct order.
 * Order matters: outer providers are available to inner ones.
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => (
  <VaultProvider>
    <ToastProvider>
      <ErrorBoundary>
        <UserIntentProvider>
          <ResourceContextProvider>
            <AppModeProvider>
              {children}
            </AppModeProvider>
          </ResourceContextProvider>
        </UserIntentProvider>
      </ErrorBoundary>
    </ToastProvider>
  </VaultProvider>
);

export default AppProviders;

// ============================================================================
// Template-level Hooks (use only in templates/pages, not organisms)
// ============================================================================

export { useAppSettings } from './useAppSettings';
export type { UseAppSettingsReturn } from './useAppSettings';

export {
  useTerminology,
  useTerminologyWithLevel,
} from './useTerminology';
export type {
  UseTerminologyOptions,
  UseTerminologyReturn,
} from './useTerminology';

export { useAppModeState, useAppModeActions, useAppMode } from './AppModeProvider';
