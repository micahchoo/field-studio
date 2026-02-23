/**
 * Auto-Save — Async/Effects (Category 4)
 *
 * Replaces useAutoSave React hook.
 * Architecture doc §4 Cat 4: $effect + store.
 *
 * Module store with state fields. The actual $effect lives in the
 * root layout component (per §3.E: no $effect in module singletons).
 *
 * Usage in root +layout.svelte:
 *   $effect(() => autoSave.tick()); // periodic check
 */

const DIRTY_DEBOUNCE_MS = 2000;
const MAX_FAILURES = 3;

class AutoSaveStore {
  #dirty = $state(false);
  #saveStatus = $state<'saved' | 'saving' | 'error'>('saved');
  #consecutiveFailures = $state(0);
  #lastSaveAt = $state(0);
  #debounceTimer: ReturnType<typeof setTimeout> | null = null;

  get dirty(): boolean { return this.#dirty; }
  get saveStatus(): 'saved' | 'saving' | 'error' { return this.#saveStatus; }
  get consecutiveFailures(): number { return this.#consecutiveFailures; }
  get lastSaveAt(): number { return this.#lastSaveAt; }
  get isDisabled(): boolean { return this.#consecutiveFailures >= MAX_FAILURES; }

  /** Mark the project as having unsaved changes */
  markDirty(): void {
    this.#dirty = true;
    // Debounce: schedule a save check
    if (this.#debounceTimer) clearTimeout(this.#debounceTimer);
    this.#debounceTimer = setTimeout(() => {
      // The actual save is triggered by the owning component's $effect
      // which watches autoSave.dirty
    }, DIRTY_DEBOUNCE_MS);
  }

  /** Called by the save $effect when it's time to persist */
  async save(doSave: () => Promise<void>): Promise<void> {
    if (!this.#dirty || this.#saveStatus === 'saving') return;
    if (this.#consecutiveFailures >= MAX_FAILURES) return;

    this.#saveStatus = 'saving';
    try {
      await doSave();
      this.#dirty = false;
      this.#saveStatus = 'saved';
      this.#consecutiveFailures = 0;
      this.#lastSaveAt = Date.now();
    } catch {
      this.#consecutiveFailures++;
      this.#saveStatus = 'error';
    }
  }

  /** Mark as saved (e.g., after manual save) */
  markSaved(): void {
    this.#dirty = false;
    this.#saveStatus = 'saved';
    this.#lastSaveAt = Date.now();
  }

  /** Reset failure counter (e.g., after user clears storage) */
  resetFailures(): void {
    this.#consecutiveFailures = 0;
    this.#saveStatus = this.#dirty ? 'saved' : 'saved';
  }

  /** Cleanup debounce timer */
  destroy(): void {
    if (this.#debounceTimer) clearTimeout(this.#debounceTimer);
  }
}

/** Global singleton */
export const autoSave = new AutoSaveStore();
