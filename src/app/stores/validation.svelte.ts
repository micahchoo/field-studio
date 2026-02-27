/**
 * Validation — Async/Effects (Category 4)
 *
 * Replaces useValidation React hook.
 * Architecture doc §4 Cat 4: store + $effect in component.
 *
 * Debounced IIIF tree validation. The store holds state;
 * the component's $effect triggers validation on state changes.
 *
 * Usage in root +layout.svelte:
 *
 *   import { validation } from '@/src/app/stores/validation.svelte';
 *   import { vault } from '@/src/shared/stores/vault.svelte';
 *   import { validateTree } from '@/src/entities/manifest/model/validation/validator';
 *
 *   $effect(() => {
 *     // Track vault state — re-runs when state changes
 *     const state = vault.state;
 *     validation.scheduleValidation(() => validateTree(state));
 *     return () => validation.destroy();
 *   });
 *
 *   // Reactive reads
 *   validation.issues
 *   validation.isValidating
 *   validation.totalIssues
 *   validation.errorCount
 */

// ──────────────────────────────────────────────
// Types — re-export from shared/types (canonical)
// ──────────────────────────────────────────────

import type { TreeValidationIssue } from '@/src/shared/types';
type ValidationIssue = TreeValidationIssue;

// ──────────────────────────────────────────────
// Store class
// ──────────────────────────────────────────────

export class ValidationStore {
  // -- Reactive state --
  #issues = $state<Record<string, ValidationIssue[]>>({});
  #isValidating = $state(false);

  // -- Non-reactive internals --
  #debounceTimer: ReturnType<typeof setTimeout> | null = null;
  #debounceMs: number;

  constructor(debounceMs: number = 800) {
    this.#debounceMs = debounceMs;
  }

  // ──────────────────────────────────────────────
  // Reactive getters
  // ──────────────────────────────────────────────

  /** Map of entityId -> issues for that entity */
  get issues(): Record<string, ValidationIssue[]> {
    return this.#issues;
  }

  /** Whether a validation pass is currently running */
  get isValidating(): boolean {
    return this.#isValidating;
  }

  /**
   * Total number of issues across all entities.
   *
   * Pseudocode:
   *   Sum the length of every issue array in the issues map
   */
  get totalIssues(): number {
    let count = 0;
    for (const key of Object.keys(this.#issues)) {
      count += this.#issues[key].length;
    }
    return count;
  }

  /**
   * Count of issues with severity 'error'.
   */
  get errorCount(): number {
    let count = 0;
    for (const key of Object.keys(this.#issues)) {
      for (const issue of this.#issues[key]) {
        if (issue.severity === 'error') count++;
      }
    }
    return count;
  }

  // ──────────────────────────────────────────────
  // Debounced validation scheduling
  // ──────────────────────────────────────────────

  /**
   * Schedule a debounced validation run.
   * Call this from a component's $effect that tracks vault state.
   *
   * The validateFn should be a synchronous function that returns
   * the full issues map. It is called after the debounce delay,
   * preventing rapid re-validation during bursts of edits.
   *
   * Pseudocode:
   *   Clear any pending debounce timer
   *   Set a new timer for debounceMs
   *   When timer fires:
   *     Set isValidating = true
   *     Call validateFn to get issues
   *     Set issues = result
   *     Set isValidating = false
   */
  scheduleValidation(
    validateFn: () => Record<string, ValidationIssue[]>
  ): void {
    // Clear any pending timer
    if (this.#debounceTimer) {
      clearTimeout(this.#debounceTimer);
    }

    this.#debounceTimer = setTimeout(() => {
      this.#isValidating = true;

      try {
        const result = validateFn();
        this.#issues = result;
      } catch {
        // If validation itself throws, keep previous issues
        // but clear the validating flag
      } finally {
        this.#isValidating = false;
      }
    }, this.#debounceMs);
  }

  // ──────────────────────────────────────────────
  // Manual controls
  // ──────────────────────────────────────────────

  /** Clear all issues and cancel any pending validation */
  clear(): void {
    this.#issues = {};
    this.#isValidating = false;
    if (this.#debounceTimer) {
      clearTimeout(this.#debounceTimer);
      this.#debounceTimer = null;
    }
  }

  // ──────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────

  /** Clean up timers. Call from onDestroy or $effect cleanup. */
  destroy(): void {
    if (this.#debounceTimer) {
      clearTimeout(this.#debounceTimer);
      this.#debounceTimer = null;
    }
  }
}

/** Global singleton */
export const validation = new ValidationStore();
