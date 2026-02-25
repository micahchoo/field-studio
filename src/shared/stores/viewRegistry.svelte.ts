/**
 * View Registry Store — Svelte 5 Runes
 *
 * Global singleton that tracks registered ViewStateProviders
 * and delegates reads (selection, filters, snapshots) to the
 * currently active view's provider.
 *
 * Part of the ViewBus system (ROADMAP.md S0.1).
 *
 * Usage:
 *   import { viewRegistry } from '@/src/shared/stores/viewRegistry.svelte';
 *
 *   viewRegistry.activeViewId        // reactive: current ViewId
 *   viewRegistry.activeProvider       // reactive: provider for active view
 *   viewRegistry.activeSelection      // delegates to active provider's selection
 *   viewRegistry.registeredViewIds    // list of registered view IDs
 *
 *   viewRegistry.register(provider);
 *   viewRegistry.unregister('viewer');
 *   viewRegistry.setActiveView('boards');
 *
 * WARNING: Do NOT destructure — breaks reactivity.
 */

import type { ViewId, ViewStateProvider } from '@/src/shared/types/viewProtocol';

/** Frozen empty set returned when no active provider exists */
const EMPTY_SELECTION: ReadonlySet<string> = Object.freeze(new Set<string>());

export class ViewRegistry {
  // Use $state.raw for the Map to avoid deep proxy on large collections.
  // Mutations must create a new Map copy and reassign for reactivity.
  #providers = $state.raw<Map<ViewId, ViewStateProvider>>(new Map());
  #activeViewId = $state<ViewId>('archive');

  // ── Reactive reads ──

  /** The currently active view ID */
  get activeViewId(): ViewId {
    return this.#activeViewId;
  }

  /** The ViewStateProvider for the currently active view, or undefined */
  get activeProvider(): ViewStateProvider | undefined {
    return this.#providers.get(this.#activeViewId);
  }

  /** Selection from the active provider, or a frozen empty set */
  get activeSelection(): ReadonlySet<string> {
    return this.activeProvider?.selection ?? EMPTY_SELECTION;
  }

  /** All currently registered view IDs */
  get registeredViewIds(): ViewId[] {
    return Array.from(this.#providers.keys());
  }

  // ── Mutations ──

  /** Register a ViewStateProvider. Replaces any existing provider for the same viewId. */
  register(provider: ViewStateProvider): void {
    const next = new Map(this.#providers);
    next.set(provider.viewId, provider);
    this.#providers = next;
  }

  /** Unregister a provider by viewId. No-op if not registered. */
  unregister(viewId: ViewId): void {
    if (!this.#providers.has(viewId)) return;
    const next = new Map(this.#providers);
    next.delete(viewId);
    this.#providers = next;
  }

  /** Get a registered provider by viewId */
  get(viewId: ViewId): ViewStateProvider | undefined {
    return this.#providers.get(viewId);
  }

  /** Set the active view */
  setActiveView(viewId: ViewId): void {
    this.#activeViewId = viewId;
  }
}

/** Singleton view registry store */
export const viewRegistry = new ViewRegistry();
