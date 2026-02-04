/**
 * Contextual Microcopy Hook
 * 
 * Combines user intent, resource context, and i18n templates to generate
 * dynamic microcopy across all UI controls.
 * 
 * Implements the three‑tier microcopy strategy:
 * - Tier 1: Static i18n strings (basic translations)
 * - Tier 2: Template‑based microcopy (`No ${resourceType} selected`)
 * - Tier 3: Context‑aware intelligent text (`Editing ${resourceType} – ${validationStatus} issues need attention`)
 */

import { useUserIntentState } from './useUserIntent';
import { useResourceContextState } from './useResourceContext';
import { CONTEXTUAL_TOKENS } from '../designSystem';
import { ValidationSummary } from './useVaultSelectors';

export interface ContextualMicrocopyOptions {
  /** Override intent (defaults to current user intent) */
  intent?: string;
  /** Override resource type (defaults to current resource) */
  resourceType?: string;
  /** Include validation status in microcopy */
  includeValidation?: boolean;
  /** Custom data for template interpolation */
  data?: Record<string, any>;
}

export interface ContextualMicrocopyResult {
  /** Tier 1: Basic translated string */
  t: (key: string, options?: any) => string;
  /** Tier 2: Template‑based microcopy with interpolation */
  template: (templateKey: keyof typeof CONTEXTUAL_TOKENS.microcopy, ...args: any[]) => string;
  /** Tier 3: Context‑aware intelligent microcopy */
  contextual: (options?: ContextualMicrocopyOptions) => string;
  /** Current intent microcopy from design tokens */
  intentMicrocopy: string;
  /** Current resource microcopy from design tokens */
  resourceMicrocopy: string;
  /** Combined intent + resource microcopy */
  combinedMicrocopy: string;
}

/**
 * Hook that provides contextual microcopy based on user intent, resource context, and i18n
 */
export function useContextualMicrocopy(): ContextualMicrocopyResult {
  const { intent } = useUserIntentState();
  const { type, validationStatus } = useResourceContextState();

  // Tier 1: Translation pass-through (replace with i18n.t when i18n is wired up)
  const translate = (key: string, _options?: any) => key;

  // Tier 2: Template‑based microcopy from design system
  const template = (templateKey: keyof typeof CONTEXTUAL_TOKENS.microcopy, ...args: any[]): string => {
    const fn = CONTEXTUAL_TOKENS.microcopy[templateKey];
    if (typeof fn === 'function') {
      return fn(...args);
    }
    return fn as string;
  };

  // Tier 3: Context‑aware intelligent microcopy
  const contextual = (options?: ContextualMicrocopyOptions): string => {
    const currentIntent = options?.intent || intent;
    const currentType = options?.resourceType || type;
    const includeValidation = options?.includeValidation ?? true;
    const customData = options?.data || {};

    // Base microcopy from design tokens
    const intentContext = CONTEXTUAL_TOKENS.contexts[currentIntent as keyof typeof CONTEXTUAL_TOKENS.contexts];
    const intentText = intentContext?.microcopy || '';

    // Resource‑specific microcopy
    let resourceText = '';
    if (currentType) {
      const resourceConfig = CONTEXTUAL_TOKENS.contexts[currentType as keyof typeof CONTEXTUAL_TOKENS.contexts];
      resourceText = resourceConfig?.microcopy || '';
    }

    // Validation‑aware microcopy
    let validationText = '';
    if (includeValidation && validationStatus) {
      if (validationStatus.totalIssues > 0) {
        validationText = ` – ${validationStatus.totalIssues} issue${validationStatus.totalIssues > 1 ? 's' : ''} need${validationStatus.totalIssues === 1 ? 's' : ''} attention`;
      } else {
        validationText = ' – all good';
      }
    }

    // Combine based on context priority
    if (currentIntent === 'editing' && currentType) {
      return `Editing ${currentType}${validationText}`;
    }
    if (currentIntent === 'validating') {
      return `Validating${currentType ? ` ${currentType}` : ''}${validationText}`;
    }
    if (intentText && resourceText) {
      return `${intentText} (${resourceText})`;
    }
    return intentText || resourceText || '';
  };

  // Derived microcopy values
  const intentContext = CONTEXTUAL_TOKENS.contexts[intent as keyof typeof CONTEXTUAL_TOKENS.contexts];
  const intentMicrocopy = intentContext?.microcopy || '';

  const resourceContext = type ? CONTEXTUAL_TOKENS.contexts[type as keyof typeof CONTEXTUAL_TOKENS.contexts] : null;
  const resourceMicrocopy = resourceContext?.microcopy || '';

  const combinedMicrocopy = contextual();

  return {
    t: translate,
    template,
    contextual,
    intentMicrocopy,
    resourceMicrocopy,
    combinedMicrocopy,
  };
}

/**
 * Hook that returns a specific contextual microcopy string for the current intent
 */
export function useIntentMicrocopy(): string {
  const { intent } = useUserIntentState();
  const intentContext = CONTEXTUAL_TOKENS.contexts[intent as keyof typeof CONTEXTUAL_TOKENS.contexts];
  return intentContext?.microcopy || '';
}

/**
 * Hook that returns a specific contextual microcopy string for the current resource type
 */
export function useResourceMicrocopy(): string {
  const { type } = useResourceContextState();
  if (!type) return '';
  const resourceContext = CONTEXTUAL_TOKENS.contexts[type as keyof typeof CONTEXTUAL_TOKENS.contexts];
  return resourceContext?.microcopy || '';
}

/**
 * Hook that returns validation‑aware microcopy
 */
export function useValidationMicrocopy(validation: ValidationSummary | null): string {
  if (!validation) return 'No validation data';
  if (validation.totalIssues === 0) return 'All checks passed';
  return `${validation.totalIssues} issue${validation.totalIssues > 1 ? 's' : ''} detected`;
}