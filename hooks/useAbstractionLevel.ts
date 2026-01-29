/**
 * useAbstractionLevel - Progressive Disclosure State Management
 *
 * Manages UI abstraction level with localStorage persistence.
 * Part of Phase 3 UX Simplification: Progressive Disclosure.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AbstractionLevel, UIAbstractionConfig } from '../types';
import { DEFAULT_ABSTRACTION_CONFIG, FEATURE_FLAGS } from '../constants';

const STORAGE_KEY = 'iiif-studio-abstraction-config';

/**
 * Get configuration based on abstraction level
 */
function getConfigForLevel(level: AbstractionLevel): UIAbstractionConfig {
  switch (level) {
    case 'simple':
      return {
        level: 'simple',
        showTechnicalIds: false,
        showRawIIIF: false,
        showAdvancedActions: false,
        simplifiedLabels: true
      };
    case 'standard':
      return {
        level: 'standard',
        showTechnicalIds: false,
        showRawIIIF: false,
        showAdvancedActions: false,
        simplifiedLabels: false
      };
    case 'advanced':
      return {
        level: 'advanced',
        showTechnicalIds: true,
        showRawIIIF: true,
        showAdvancedActions: true,
        simplifiedLabels: false
      };
    default:
      return DEFAULT_ABSTRACTION_CONFIG;
  }
}

/**
 * Load stored config from localStorage
 */
function loadStoredConfig(): UIAbstractionConfig | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate the stored config has required fields
      if (parsed.level && ['simple', 'standard', 'advanced'].includes(parsed.level)) {
        return {
          ...getConfigForLevel(parsed.level),
          ...parsed
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load abstraction config from localStorage:', e);
  }
  return null;
}

/**
 * Save config to localStorage
 */
function saveConfig(config: UIAbstractionConfig): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save abstraction config to localStorage:', e);
  }
}

export interface UseAbstractionLevelReturn {
  /** Current abstraction level */
  level: AbstractionLevel;
  /** Full UI abstraction configuration */
  config: UIAbstractionConfig;
  /** Set abstraction level (updates config accordingly) */
  setLevel: (level: AbstractionLevel) => void;
  /** Update individual config properties */
  updateConfig: (updates: Partial<UIAbstractionConfig>) => void;
  /** Reset to default configuration */
  resetConfig: () => void;
  /** Whether progressive disclosure is enabled via feature flag */
  isEnabled: boolean;
  /** Helper: is currently in simple mode */
  isSimple: boolean;
  /** Helper: is currently in standard mode */
  isStandard: boolean;
  /** Helper: is currently in advanced mode */
  isAdvanced: boolean;
}

/**
 * Hook for managing UI abstraction level with persistence
 *
 * @example
 * const { level, config, setLevel, isSimple } = useAbstractionLevel();
 *
 * // Conditionally render based on level
 * {isSimple ? <SimpleView /> : <AdvancedView />}
 *
 * // Check specific config flags
 * {config.showTechnicalIds && <TechnicalDetails />}
 */
export function useAbstractionLevel(): UseAbstractionLevelReturn {
  const isEnabled = FEATURE_FLAGS.USE_PROGRESSIVE_DISCLOSURE;
  
  // Initialize state from localStorage or defaults
  const [config, setConfig] = useState<UIAbstractionConfig>(() => {
    const stored = loadStoredConfig();
    return stored || DEFAULT_ABSTRACTION_CONFIG;
  });

  // Persist to localStorage when config changes
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  /**
   * Set abstraction level (updates full config)
   */
  const setLevel = useCallback((level: AbstractionLevel) => {
    setConfig(getConfigForLevel(level));
  }, []);

  /**
   * Update individual config properties
   */
  const updateConfig = useCallback((updates: Partial<UIAbstractionConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  /**
   * Reset to default configuration
   */
  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_ABSTRACTION_CONFIG);
  }, []);

  // Memoized helper flags
  const helpers = useMemo(() => ({
    isSimple: config.level === 'simple',
    isStandard: config.level === 'standard',
    isAdvanced: config.level === 'advanced'
  }), [config.level]);

  return {
    level: config.level,
    config,
    setLevel,
    updateConfig,
    resetConfig,
    isEnabled,
    ...helpers
  };
}

export default useAbstractionLevel;
