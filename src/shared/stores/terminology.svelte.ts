/**
 * Terminology Store — Reactive singleton (Category 2)
 *
 * Architecture doc §5.C: eliminates the FSD "pass t via props" workaround.
 * Components read: terminology.t('Canvas')
 *
 * Pure functions live in src/shared/lib/hooks/terminology.ts
 * This store wraps them with reactive $state for the current level.
 */

import type { AbstractionLevel } from '@/src/shared/types';
import {
  getTerm, getTerms, getResourceTypeLabel, getTermDescription,
  formatCount, TERMINOLOGY_MAP,
} from '@/src/shared/lib/hooks/terminology';

// Re-export pure functions for direct use
export { getTerm, getTerms, getResourceTypeLabel, getTermDescription, formatCount };

class TerminologyStore {
  #level = $state<AbstractionLevel>('standard');

  get level(): AbstractionLevel { return this.#level; }
  set level(v: AbstractionLevel) { this.#level = v; }

  /** Translate a key to the current level's term */
  t(key: string): string {
    return getTerm(key, this.#level);
  }

  /** Get the full terms map for current level */
  get terms(): Record<string, string> {
    return TERMINOLOGY_MAP[this.#level];
  }

  /** Format count with pluralized term */
  formatCount(count: number, key: string): string {
    return formatCount(count, key, this.#level);
  }

  /** Resource type label */
  getResourceTypeLabel(type: string, includeArticle = false): string {
    return getResourceTypeLabel(type, this.#level, includeArticle);
  }

  /** Term description */
  getDescription(key: string): string | null {
    return getTermDescription(key);
  }

  get isSimple(): boolean { return this.#level === 'simple'; }
  get isStandard(): boolean { return this.#level === 'standard'; }
  get isAdvanced(): boolean { return this.#level === 'advanced'; }
}

export const terminology = new TerminologyStore();
