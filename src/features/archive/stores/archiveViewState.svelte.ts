/**
 * ArchiveViewState — ViewStateProvider for the Archive view
 *
 * Encapsulates all local state currently managed by ArchiveView.svelte
 * (view mode, filter, sort, grouping, selection, active item) into a
 * class that implements the ViewStateProvider protocol.
 *
 * Part of ROADMAP.md S0.1 — ViewBus Phase 0.1.
 *
 * @see src/shared/types/viewProtocol.ts
 */

import type {
  ViewId,
  ViewSnapshot,
  ViewFilters,
  ViewStateProvider,
} from '@/src/shared/types/viewProtocol';

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export type ArchiveViewMode = 'grid' | 'list' | 'grouped';
export type ArchiveSortBy = 'name' | 'date' | 'size';
export type ArchiveSortDirection = 'asc' | 'desc';

/** Snapshot schema version for forward-compatibility checks. */
const SNAPSHOT_VERSION = 1;

// ═══════════════════════════════════════════════════════════════════════
// ArchiveViewState
// ═══════════════════════════════════════════════════════════════════════

export class ArchiveViewState implements ViewStateProvider {
  readonly viewId: ViewId = 'archive';

  // ── Private reactive state ──────────────────────────────────────────
  #viewMode = $state<ArchiveViewMode>('grid');
  #filter = $state('');
  #sortBy = $state<ArchiveSortBy>('name');
  #sortDirection = $state<ArchiveSortDirection>('asc');
  #groupByManifest = $state(false);
  #selectedIds = $state(new Set<string>());
  #activeItemId = $state<string | null>(null);

  // ── ViewStateProvider: selection ────────────────────────────────────

  get selection(): ReadonlySet<string> {
    return this.#selectedIds;
  }

  setSelection(ids: ReadonlySet<string>): void {
    this.#selectedIds = new Set(ids);
  }

  // ── ViewStateProvider: filters ─────────────────────────────────────

  get filters(): Readonly<ViewFilters> {
    return {
      textFilter: this.#filter,
      sortBy: this.#sortBy,
      sortDirection: this.#sortDirection,
      groupByManifest: this.#groupByManifest,
    };
  }

  // ── ViewStateProvider: snapshot ────────────────────────────────────

  getSnapshot(): ViewSnapshot {
    return {
      viewId: this.viewId,
      version: SNAPSHOT_VERSION,
      data: {
        viewMode: this.#viewMode,
        filter: this.#filter,
        sortBy: this.#sortBy,
        sortDirection: this.#sortDirection,
        groupByManifest: this.#groupByManifest,
        selectedIds: [...this.#selectedIds],
        activeItemId: this.#activeItemId,
      },
    };
  }

  restoreSnapshot(snapshot: ViewSnapshot): void {
    if (snapshot.viewId !== this.viewId) {
      throw new Error(
        `Cannot restore snapshot for "${snapshot.viewId}" into "${this.viewId}" provider`
      );
    }

    const d = snapshot.data;

    // Defensive: use defaults for any missing/invalid fields
    this.#viewMode = isArchiveViewMode(d.viewMode) ? d.viewMode : 'grid';
    this.#filter = typeof d.filter === 'string' ? d.filter : '';
    this.#sortBy = isArchiveSortBy(d.sortBy) ? d.sortBy : 'name';
    this.#sortDirection = isArchiveSortDirection(d.sortDirection) ? d.sortDirection : 'asc';
    this.#groupByManifest = typeof d.groupByManifest === 'boolean' ? d.groupByManifest : false;
    this.#selectedIds = new Set(
      Array.isArray(d.selectedIds) ? (d.selectedIds as string[]) : []
    );
    this.#activeItemId =
      typeof d.activeItemId === 'string' ? d.activeItemId : null;
  }

  // ── Archive-specific getters ───────────────────────────────────────

  get viewMode(): ArchiveViewMode {
    return this.#viewMode;
  }

  get filter(): string {
    return this.#filter;
  }

  get sortBy(): ArchiveSortBy {
    return this.#sortBy;
  }

  get sortDirection(): ArchiveSortDirection {
    return this.#sortDirection;
  }

  get groupByManifest(): boolean {
    return this.#groupByManifest;
  }

  get activeItemId(): string | null {
    return this.#activeItemId;
  }

  // ── Archive-specific setters ───────────────────────────────────────

  setViewMode(mode: ArchiveViewMode): void {
    this.#viewMode = mode;
  }

  setFilter(value: string): void {
    this.#filter = value;
  }

  setSortBy(field: ArchiveSortBy): void {
    this.#sortBy = field;
  }

  setSortDirection(direction: ArchiveSortDirection): void {
    this.#sortDirection = direction;
  }

  toggleSortDirection(): void {
    this.#sortDirection = this.#sortDirection === 'asc' ? 'desc' : 'asc';
  }

  setGroupByManifest(enabled: boolean): void {
    this.#groupByManifest = enabled;
  }

  setActiveItemId(id: string | null): void {
    this.#activeItemId = id;
  }

  // ── Selection helpers ──────────────────────────────────────────────

  toggleSelection(id: string): void {
    const next = new Set(this.#selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.#selectedIds = next;
  }

  clearSelection(): void {
    this.#selectedIds = new Set();
  }

  selectRange(ids: ReadonlyArray<string>): void {
    const next = new Set(this.#selectedIds);
    for (const id of ids) {
      next.add(id);
    }
    this.#selectedIds = next;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Type guards (internal)
// ═══════════════════════════════════════════════════════════════════════

function isArchiveViewMode(v: unknown): v is ArchiveViewMode {
  return v === 'grid' || v === 'list' || v === 'grouped';
}

function isArchiveSortBy(v: unknown): v is ArchiveSortBy {
  return v === 'name' || v === 'date' || v === 'size';
}

function isArchiveSortDirection(v: unknown): v is ArchiveSortDirection {
  return v === 'asc' || v === 'desc';
}
