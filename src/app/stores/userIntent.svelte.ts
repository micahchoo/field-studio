/**
 * User Intent Store — Svelte 5 Runes
 *
 * Replaces React UserIntentProvider context.
 * Architecture doc §4 Cat 2: Reactive class in .svelte.ts
 *
 * Tracks the user's current intent (editing, viewing, exporting, etc.) to
 * enable context-aware UI adaptations (microcopy, styling, progressive
 * disclosure).
 *
 * WARNING: Do NOT destructure — breaks reactivity.
 */

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type UserIntent =
  | 'viewing'      // Passive consumption, no modifications
  | 'editing'      // Actively editing metadata or structure
  | 'selecting'    // Multi-selection (batch operations)
  | 'dragging'     // Drag-and-drop in progress
  | 'exporting'    // Export flow active
  | 'importing'    // Import flow active
  | 'validating'   // Validation or QC in progress
  | 'searching'    // Search query active
  | 'navigating'   // Browsing hierarchy
  | 'annotating'   // Adding annotations
  | 'designing'    // Board design mode
  | 'fieldMode'    // High-contrast field mode active
  | 'idle';        // No specific intent

export interface UserIntentState {
  intent: UserIntent;
  secondary?: UserIntent;
  startedAt: number;
  resourceId?: string;
  area?: string;
  meta?: Record<string, unknown>;
}

// ──────────────────────────────────────────────
// Store class
// ──────────────────────────────────────────────

class UserIntentStore {
  // ── Reactive state ──
  #intent = $state<UserIntent>('idle');
  #secondary = $state<UserIntent | undefined>(undefined);
  #startedAt = $state<number>(Date.now());
  #resourceId = $state<string | undefined>(undefined);
  #area = $state<string | undefined>(undefined);
  #meta = $state<Record<string, unknown> | undefined>(undefined);

  // ── Reactive getters ──

  get intent(): UserIntent { return this.#intent; }
  get secondary(): UserIntent | undefined { return this.#secondary; }
  get startedAt(): number { return this.#startedAt; }
  get resourceId(): string | undefined { return this.#resourceId; }
  get area(): string | undefined { return this.#area; }
  get meta(): Record<string, unknown> | undefined { return this.#meta; }

  /** Snapshot of full state as a plain object */
  get state(): UserIntentState {
    return {
      intent: this.#intent,
      secondary: this.#secondary,
      startedAt: this.#startedAt,
      resourceId: this.#resourceId,
      area: this.#area,
      meta: this.#meta,
    };
  }

  // ── Derived convenience getters ──

  get isEditing(): boolean { return this.#intent === 'editing'; }
  get isAnnotating(): boolean { return this.#intent === 'annotating'; }
  get isFieldMode(): boolean { return this.#intent === 'fieldMode'; }
  get isIdle(): boolean { return this.#intent === 'idle'; }

  /** Check if current intent matches (non-reactive convenience method) */
  isIntent(intent: UserIntent): boolean {
    return this.#intent === intent;
  }

  // ── Actions ──

  /**
   * Set primary intent.
   * Resets startedAt to now.
   */
  setIntent(
    intent: UserIntent,
    options?: {
      secondary?: UserIntent;
      resourceId?: string;
      area?: string;
      meta?: Record<string, unknown>;
    }
  ): void {
    this.#intent = intent;
    this.#startedAt = Date.now();
    this.#secondary = options?.secondary;
    this.#resourceId = options?.resourceId;
    this.#area = options?.area;
    this.#meta = options?.meta;
  }

  /** Clear intent — reset to idle */
  clearIntent(): void {
    this.#intent = 'idle';
    this.#startedAt = Date.now();
    this.#secondary = undefined;
    this.#resourceId = undefined;
    this.#area = undefined;
    this.#meta = undefined;
  }

  /** Update meta data (shallow merge with existing meta) */
  updateMeta(meta: Record<string, unknown>): void {
    this.#meta = { ...this.#meta, ...meta };
  }
}

/** Global singleton */
export const userIntent = new UserIntentStore();
