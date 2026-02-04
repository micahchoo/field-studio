/**
 * useTerminology - React hook for terminology translation
 *
 * Provides terminology based on current abstraction level.
 * Part of Phase 3 UX Simplification: Progressive Disclosure.
 */

import { useCallback, useMemo } from 'react';
import {
  formatCountWithTerm as formatCountWithTermUtil,
  getResourceTypeLabel as getResourceTypeLabelUtil,
  getTermDescription as getTermDescriptionUtil,
  getTerms as getTermsUtil,
  getTerm as getTermUtil,
  TERMINOLOGY_MAP,
  type TerminologyKey
} from '../utils/uiTerminology';
import type { AbstractionLevel } from '../types';

export interface UseTerminologyOptions {
  /** The abstraction level to use for terminology */
  level: AbstractionLevel;
}

export interface UseTerminologyReturn {
  /** Current abstraction level */
  level: AbstractionLevel;
  /** Full terminology map for current level */
  terms: Record<string, string>;
  /** Get a single term */
  t: (key: string) => string;
  /** Get multiple terms */
  getTerms: <K extends string>(keys: K[]) => Record<K, string>;
  /** Get resource type label */
  getResourceTypeLabel: (type: string, includeArticle?: boolean) => string;
  /** Get term description/tooltip */
  getDescription: (key: string) => string | null;
  /** Format count with pluralized term */
  formatCount: (count: number, key: string) => string;
  /** Check if currently using simple terminology */
  isSimple: boolean;
  /** Check if currently using standard terminology */
  isStandard: boolean;
  /** Check if currently using advanced terminology */
  isAdvanced: boolean;
}

/**
 * React hook for accessing terminology based on abstraction level
 *
 * @param options - Configuration options
 * @returns Terminology utilities
 *
 * @example
 * const { t, getResourceTypeLabel, formatCount } = useTerminology({ level: 'simple' });
 *
 * // Get a term
 * <h1>{t('Collection')}</h1> // 'Album' in simple mode
 *
 * // Get resource type with article
 * <p>This is {getResourceTypeLabel('Manifest', true)}</p> // 'an Item Group'
 *
 * // Format count
 * <span>{formatCount(5, 'Canvas')}</span> // '5 Pages'
 */
export function useTerminology(options: UseTerminologyOptions): UseTerminologyReturn {
  const { level } = options;

  // Memoize the terms map for current level
  const terms = useMemo(() => TERMINOLOGY_MAP[level], [level]);

  /**
   * Get a single term (memoized callback)
   */
  const t = useCallback(
    (key: string): string => getTermUtil(key, level),
    [level]
  );

  /**
   * Get multiple terms (memoized callback)
   */
  const getTerms = useCallback(
    <K extends string>(keys: K[]): Record<K, string> => getTermsUtil(keys, level),
    [level]
  );

  /**
   * Get resource type label (memoized callback)
   */
  const getResourceTypeLabel = useCallback(
    (type: string, includeArticle: boolean = false): string =>
      getResourceTypeLabelUtil(type, level, includeArticle),
    [level]
  );

  /**
   * Get term description (memoized callback)
   */
  const getDescription = useCallback(
    (key: string): string | null => getTermDescriptionUtil(key),
    []
  );

  /**
   * Format count with term (memoized callback)
   */
  const formatCount = useCallback(
    (count: number, key: string): string => formatCountWithTermUtil(count, key, level),
    [level]
  );

  // Memoize helper flags
  const helpers = useMemo(
    () => ({
      isSimple: level === 'simple',
      isStandard: level === 'standard',
      isAdvanced: level === 'advanced'
    }),
    [level]
  );

  return {
    level,
    terms,
    t,
    getTerms,
    getResourceTypeLabel,
    getDescription,
    formatCount,
    ...helpers
  };
}

/**
 * Convenience hook that combines useAbstractionLevel and useTerminology
 * Automatically uses the current abstraction level from useAbstractionLevel
 *
 * @example
 * const { t, level, setLevel } = useTerminologyWithLevel();
 */
export function useTerminologyWithLevel(): UseTerminologyReturn & {
  setLevel: (level: AbstractionLevel) => void;
} {
  // Import dynamically to avoid circular dependency issues
  const { useAbstractionLevel } = require('./useAbstractionLevel');
  const abstraction = useAbstractionLevel();
  const terminology = useTerminology({ level: abstraction.level });

  return {
    ...terminology,
    setLevel: abstraction.setLevel
  };
}

export default useTerminology;
