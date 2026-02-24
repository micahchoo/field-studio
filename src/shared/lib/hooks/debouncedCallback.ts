/**
 * Debounced Callback — Async/Effects (Category 4)
 *
 * Replaces useDebouncedCallback React hook.
 * Architecture doc §4 Cat 4: plain utility function (no runes needed).
 *
 * Returns a debounced function with cancel/flush.
 * Framework-agnostic — works identically in React or Svelte.
 *
 * IMPORTANT: Caller is responsible for cleanup (calling cancel/destroy).
 * In Svelte, use onDestroy or $effect cleanup.
 */

// Standard TypeScript generic callable constraint — narrower bounds break Parameters<T>/ReturnType<T>.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CallbackFn = (...args: any[]) => any;

export interface DebouncedFn<T extends CallbackFn> {
  (...args: Parameters<T>): void;
  cancel(): void;
  flush(): void;
}

export function createDebouncedCallback<T extends CallbackFn>(
  callback: T,
  delay: number
): DebouncedFn<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Parameters<T> | null = null;
  let currentCallback = callback;

  const debouncedFn = (...args: Parameters<T>) => {
    pendingArgs = args;
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (pendingArgs) {
        currentCallback(...pendingArgs);
        pendingArgs = null;
      }
      timeoutId = null;
    }, delay);
  };

  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      pendingArgs = null;
    }
  };

  debouncedFn.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (pendingArgs) {
      currentCallback(...pendingArgs);
      pendingArgs = null;
    }
  };

  return debouncedFn as DebouncedFn<T>;
}

/**
 * Debounced value helper — manages local value + debounced flush.
 * Exported as CLASS for scoped use.
 */
export class DebouncedValue<T> {
  #value: T;
  #onChange: (value: T) => void;
  #delay: number;
  #timeoutId: ReturnType<typeof setTimeout> | null = null;
  #isEditing = false;

  constructor(initialValue: T, onChange: (value: T) => void, delay = 300) {
    this.#value = initialValue;
    this.#onChange = onChange;
    this.#delay = delay;
  }

  get value(): T { return this.#value; }

  /** Update local value and start debounce timer */
  set(newValue: T): void {
    this.#isEditing = true;
    this.#value = newValue;

    if (this.#timeoutId) clearTimeout(this.#timeoutId);
    this.#timeoutId = setTimeout(() => {
      this.#onChange(newValue);
      this.#isEditing = false;
    }, this.#delay);
  }

  /** Sync from parent when not actively editing */
  sync(parentValue: T): void {
    if (!this.#isEditing) {
      this.#value = parentValue;
    }
  }

  /** Fire onChange immediately */
  flush(): void {
    if (this.#timeoutId) {
      clearTimeout(this.#timeoutId);
      this.#timeoutId = null;
    }
    this.#onChange(this.#value);
    this.#isEditing = false;
  }

  /** Cancel pending timer */
  cancel(): void {
    if (this.#timeoutId) {
      clearTimeout(this.#timeoutId);
      this.#timeoutId = null;
    }
  }

  destroy(): void {
    this.cancel();
  }
}
