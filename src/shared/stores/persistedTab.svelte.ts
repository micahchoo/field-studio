/**
 * Persisted Tab — Persistent state (Category 5)
 *
 * Replaces usePersistedTab React hook.
 * Architecture doc §4 Cat 5: $state + explicit persist.
 *
 * Exported as CLASS (not singleton) — multiple instances for different tab contexts.
 * Per §3.E: no $effect in constructor (module-level class).
 * Persistence via explicit persist() method called by owning component's $effect.
 *
 * Usage:
 *   const inspectorTab = new PersistedTabStore('inspector', 'manifest', ['metadata', 'structure', 'annotations'], 'metadata');
 *   // In component: $effect(() => inspectorTab.persist());
 */

export class PersistedTabStore<T extends string = string> {
  #tab: T;
  #storageKey: string;
  #allowedValues: readonly T[];

  constructor(
    namespace: string,
    key: string,
    allowedValues: readonly T[],
    defaultValue: T
  ) {
    this.#allowedValues = allowedValues;
    this.#storageKey = `${namespace}-tab-${key}`;

    // Read initial value from localStorage
    let initial = defaultValue;
    try {
      const stored = localStorage.getItem(this.#storageKey);
      if (stored && allowedValues.includes(stored as T)) {
        initial = stored as T;
      }
    } catch { /* SSR or storage unavailable */ }

    this.#tab = $state(initial) as T;
  }

  get tab(): T { return this.#tab; }

  set tab(value: T) {
    if (this.#allowedValues.includes(value)) {
      this.#tab = value;
    }
  }

  /** Write current tab to localStorage. Call from $effect in the owning component. */
  persist(): void {
    try {
      localStorage.setItem(this.#storageKey, this.#tab);
    } catch { /* quota exceeded */ }
  }

  /** Re-read from storage (e.g., when the key context changes) */
  reload(namespace: string, key: string, defaultValue: T): void {
    this.#storageKey = `${namespace}-tab-${key}`;
    try {
      const stored = localStorage.getItem(this.#storageKey);
      if (stored && this.#allowedValues.includes(stored as T)) {
        this.#tab = stored as T;
        return;
      }
    } catch {}
    this.#tab = defaultValue;
  }
}
