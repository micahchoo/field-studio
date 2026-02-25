/**
 * ViewStateProvider Protocol Types — Phase 0.1 ViewBus
 *
 * Defines the protocol every view must implement to participate
 * in the ViewRegistry. Part of ROADMAP.md S0.1.
 *
 * @see docs/ROADMAP.md
 */

import type { AppMode } from '@/src/shared/stores/appMode.svelte';

// ═══════════════════════════════════════════════════════════════════════
// Core Types
// ═══════════════════════════════════════════════════════════════════════

/**
 * Canonical view identifiers. Subset of AppMode that maps to actual views.
 * Excludes deprecated/internal modes (collections, structure, trash, admin-deps).
 */
export type ViewId = 'archive' | 'viewer' | 'boards' | 'search' | 'map' | 'timeline' | 'metadata';

/**
 * Serializable snapshot of a view's state for persistence and undo/redo.
 * All properties are readonly to enforce immutability.
 */
export interface ViewSnapshot {
  readonly viewId: ViewId;
  readonly version: number;
  readonly data: Record<string, unknown>;
}

/**
 * Generic filter shape for view-specific filtering criteria.
 * Each view can define its own filter keys.
 */
export type ViewFilters = Record<string, unknown>;

// ═══════════════════════════════════════════════════════════════════════
// ViewStateProvider Interface
// ═══════════════════════════════════════════════════════════════════════

/**
 * Protocol that every view must implement to participate in the ViewRegistry.
 *
 * - `viewId`: identifies which view this provider belongs to
 * - `selection`: the current set of selected entity IDs
 * - `filters`: view-specific filtering state
 * - `getSnapshot()`: serializes the view state for persistence
 * - `restoreSnapshot()`: hydrates the view from a previously saved snapshot
 */
export interface ViewStateProvider {
  readonly viewId: ViewId;
  readonly selection: ReadonlySet<string>;
  setSelection(ids: ReadonlySet<string>): void;
  readonly filters: Readonly<ViewFilters>;
  getSnapshot(): ViewSnapshot;
  restoreSnapshot(snapshot: ViewSnapshot): void;
}

// ═══════════════════════════════════════════════════════════════════════
// Mapping Utility
// ═══════════════════════════════════════════════════════════════════════

/**
 * Maps an AppMode to its corresponding ViewId.
 * Returns undefined for deprecated or internal modes that do not
 * correspond to a registered view.
 */
export function appModeToViewId(mode: AppMode): ViewId | undefined {
  switch (mode) {
    case 'archive': return 'archive';
    case 'viewer': return 'viewer';
    case 'boards': return 'boards';
    case 'search': return 'search';
    case 'map': return 'map';
    case 'timeline': return 'timeline';
    case 'metadata': return 'metadata';
    default: return undefined;
  }
}
