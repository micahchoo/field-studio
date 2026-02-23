/**
 * App Mode Store — Svelte 5 Runes
 *
 * Global singleton replacing React AppModeProvider.
 * Tracks current view mode with back-navigation support.
 *
 * React source: src/shared/lib/providers/AppModeProvider.tsx
 *
 * Usage:
 *   import { appMode } from '@/src/shared/stores/appMode.svelte';
 *
 *   appMode.mode              // reactive: current AppMode
 *   appMode.previousMode      // reactive: for back navigation
 *   appMode.annotationMode    // reactive: annotation tool active
 *
 *   appMode.setMode('viewer');
 *   appMode.goBack();
 *   appMode.setAnnotationMode(true);
 *
 * WARNING: Do NOT destructure — breaks reactivity.
 */

export type AppMode =
  | 'archive'
  | 'collections'
  | 'structure'
  | 'boards'
  | 'search'
  | 'viewer'
  | 'metadata'
  | 'trash'
  | 'admin-deps'
  | 'map'
  | 'timeline';

class AppModeStore {
  #mode = $state<AppMode>('archive');
  #previousMode = $state<AppMode | null>(null);
  #changedAt = $state<number>(Date.now());
  #annotationMode = $state<boolean>(false);

  // ── Reactive reads ──

  /** Current app mode */
  get mode(): AppMode {
    return this.#mode;
  }

  /** Previous mode (for back navigation) */
  get previousMode(): AppMode | null {
    return this.#previousMode;
  }

  /** Timestamp of last mode change */
  get changedAt(): number {
    return this.#changedAt;
  }

  /** Whether annotation mode is active */
  get annotationMode(): boolean {
    return this.#annotationMode;
  }

  // ── Actions ──

  /** Set the current app mode. Stores previous mode for back navigation. */
  setMode(mode: AppMode): void {
    if (mode === this.#mode) return;
    this.#previousMode = this.#mode;
    this.#mode = mode;
    this.#changedAt = Date.now();
  }

  /** Go back to previous mode. Swaps current and previous. */
  goBack(): void {
    if (!this.#previousMode) return;
    const temp = this.#mode;
    this.#mode = this.#previousMode;
    this.#previousMode = temp;
    this.#changedAt = Date.now();
  }

  /** Check if current mode matches (non-reactive convenience method) */
  isMode(mode: AppMode): boolean {
    return this.#mode === mode;
  }

  /** Set annotation mode active/inactive */
  setAnnotationMode(active: boolean): void {
    this.#annotationMode = active;
  }
}

/** Singleton app mode store */
export const appMode = new AppModeStore();
