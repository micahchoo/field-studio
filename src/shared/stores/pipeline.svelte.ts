/**
 * Pipeline Store — State container + Async (Category 2+4)
 *
 * Replaces usePipeline React hook.
 * Architecture doc §4 Cat 2: Reactive class in .svelte.ts
 *
 * Manages cross-view pipeline state: origin, intent, selection, breadcrumbs.
 * Stores data in sessionStorage for tab-scoped persistence.
 */

export type PipelineIntent =
  | 'edit-metadata'
  | 'compose'
  | 'view-map'
  | 'view-timeline'
  | 'annotate'
  | 'search'
  | null;

export interface PipelineBreadcrumb {
  mode: string;
  label: string;
}

const SESSION_KEY = 'field-studio-pipeline';

class PipelineStore {
  #origin = $state<string | null>(null);
  #intent = $state<PipelineIntent>(null);
  #selectedIds = $state<string[]>([]);
  #breadcrumbs = $state<PipelineBreadcrumb[]>([]);

  constructor() {
    this.loadFromSession();
  }

  // ── Getters ──

  get origin(): string | null { return this.#origin; }
  get intent(): PipelineIntent { return this.#intent; }
  get selectedIds(): readonly string[] { return this.#selectedIds; }
  get breadcrumbs(): readonly PipelineBreadcrumb[] { return this.#breadcrumbs; }
  get isActive(): boolean { return this.#intent !== null; }
  get count(): number { return this.#selectedIds.length; }

  // ── Mutations ──

  /** Start a pipeline from a given origin mode */
  start(intent: PipelineIntent, originMode: string, ids: string[] = []): void {
    this.#intent = intent;
    this.#origin = originMode;
    this.#selectedIds = ids;
    this.#breadcrumbs = [{ mode: originMode, label: originMode }];
    this.saveToSession();
  }

  /** Push a new breadcrumb when navigating within the pipeline */
  pushBreadcrumb(mode: string, label: string): void {
    this.#breadcrumbs = [...this.#breadcrumbs, { mode, label }];
    this.saveToSession();
  }

  /** Pop back to a breadcrumb by index */
  popTo(index: number): string {
    const target = this.#breadcrumbs[index];
    this.#breadcrumbs = this.#breadcrumbs.slice(0, index + 1);
    this.saveToSession();
    return target.mode;
  }

  /** Update the selected IDs mid-pipeline */
  setSelectedIds(ids: string[]): void {
    this.#selectedIds = ids;
    this.saveToSession();
  }

  /** Clear the pipeline (back to idle) */
  clear(): void {
    this.#origin = null;
    this.#intent = null;
    this.#selectedIds = [];
    this.#breadcrumbs = [];
    this.clearSession();
  }

  // ── Persistence (sessionStorage) ──

  private saveToSession(): void {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        origin: this.#origin,
        intent: this.#intent,
        selectedIds: this.#selectedIds,
        breadcrumbs: this.#breadcrumbs,
      }));
    } catch { /* quota exceeded — silently skip */ }
  }

  private loadFromSession(): void {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.#origin = data.origin ?? null;
      this.#intent = data.intent ?? null;
      this.#selectedIds = Array.isArray(data.selectedIds) ? data.selectedIds : [];
      this.#breadcrumbs = Array.isArray(data.breadcrumbs) ? data.breadcrumbs : [];
    } catch { /* corrupted data — start fresh */ }
  }

  private clearSession(): void {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  }
}

/** Global singleton */
export const pipeline = new PipelineStore();
