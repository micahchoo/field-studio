/**
 * Presentation Mode -- State container (Category 2)
 *
 * Replaces usePresentationMode React hook.
 * Architecture doc S4 Cat 2: Reactive class in .svelte.ts.
 *
 * Manages slideshow mode with auto-advancing, keyboard shortcuts,
 * and slide ordering from board connections.
 *
 * Scoped class -- each board view creates its own instance.
 *
 * Usage in Svelte component:
 *   let presentation = new PresentationModeStore();
 *   presentation.enter(board.items, board.connections);
 *   presentation.next();
 *   // In template: {#if presentation.isActive} ...
 *   // Keyboard: handled by presentation.handleKeyboard(e)
 */

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface SlideItem {
  id: string;
  label?: string;
}

// ------------------------------------------------------------------
// Store
// ------------------------------------------------------------------

export class PresentationModeStore {
  // -- Reactive state --
  #isActive = $state(false);
  #currentIndex = $state(0);
  #slides = $state<SlideItem[]>([]);
  #isAutoAdvancing = $state(false);

  // -- Non-reactive internals --
  #autoAdvanceInterval = 5000; // ms
  #autoAdvanceTimer: ReturnType<typeof setInterval> | null = null;

  // ------------------------------------------------------------------
  // Getters -- reactive reads for templates / $derived
  // ------------------------------------------------------------------

  get isActive(): boolean { return this.#isActive; }
  get currentIndex(): number { return this.#currentIndex; }
  get currentSlide(): SlideItem | null { return this.#slides[this.#currentIndex] ?? null; }
  get totalSlides(): number { return this.#slides.length; }
  get isAutoAdvancing(): boolean { return this.#isAutoAdvancing; }
  get slides(): SlideItem[] { return this.#slides; }

  /** Progress from 0 to 1 (fraction complete) */
  get progress(): number {
    return this.#slides.length > 0
      ? (this.#currentIndex + 1) / this.#slides.length
      : 0;
  }

  /** Whether we're on the first slide */
  get isFirst(): boolean { return this.#currentIndex === 0; }

  /** Whether we're on the last slide */
  get isLast(): boolean { return this.#currentIndex === this.#slides.length - 1; }

  // ------------------------------------------------------------------
  // Enter / Exit
  //
  // Pseudocode:
  //   enter: Build slide order via BFS through sequence connections,
  //          then append any unreachable items. Set active, index 0.
  //   exit:  Clear slides, stop auto-advance, set inactive.
  // ------------------------------------------------------------------

  /**
   * Enter presentation mode.
   * Builds slide order from board items and their sequence connections.
   * Items connected by 'sequence' type form a BFS-ordered chain;
   * unreachable items are appended at the end.
   */
  enter(
    items: SlideItem[],
    connections: Array<{ fromId: string; toId: string; type: string }>,
  ): void {
    if (items.length === 0) return;
    this.#slides = this.#buildSlideOrder(items, connections);
    this.#currentIndex = 0;
    this.#isActive = true;
    this.#isAutoAdvancing = false;
    this.#stopAutoAdvance();
  }

  /** Exit presentation mode and clean up */
  exit(): void {
    this.#isActive = false;
    this.#currentIndex = 0;
    this.#slides = [];
    this.#isAutoAdvancing = false;
    this.#stopAutoAdvance();
  }

  // ------------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------------

  /** Advance to the next slide (wraps to first) */
  next(): void {
    if (this.#slides.length === 0) return;
    this.#currentIndex = (this.#currentIndex + 1) % this.#slides.length;
  }

  /** Go to the previous slide (wraps to last) */
  prev(): void {
    if (this.#slides.length === 0) return;
    this.#currentIndex =
      (this.#currentIndex - 1 + this.#slides.length) % this.#slides.length;
  }

  /** Jump to a specific slide index */
  goTo(index: number): void {
    if (index < 0 || index >= this.#slides.length) return;
    this.#currentIndex = index;
  }

  // ------------------------------------------------------------------
  // Auto-advance
  //
  // Pseudocode:
  //   Toggle: if running, stop timer; if stopped, start interval
  //   Start: setInterval calling next() every N ms
  //   Stop:  clearInterval
  // ------------------------------------------------------------------

  /** Toggle auto-advancing on/off */
  toggleAutoAdvance(): void {
    if (this.#isAutoAdvancing) {
      this.#stopAutoAdvance();
      this.#isAutoAdvancing = false;
    } else {
      this.#startAutoAdvance();
      this.#isAutoAdvancing = true;
    }
  }

  /** Set the auto-advance interval in milliseconds */
  setAutoAdvanceInterval(ms: number): void {
    this.#autoAdvanceInterval = Math.max(500, ms);
    // Restart if currently advancing so the new interval takes effect
    if (this.#isAutoAdvancing) {
      this.#stopAutoAdvance();
      this.#startAutoAdvance();
    }
  }

  // ------------------------------------------------------------------
  // Keyboard handling
  //
  // Pseudocode:
  //   Match key to action, call the appropriate method.
  //   Return true if handled (so the caller can preventDefault).
  // ------------------------------------------------------------------

  /**
   * Handle keyboard shortcuts while in presentation mode.
   * Returns true if the event was handled.
   *
   * Bindings:
   *   ArrowRight, ArrowDown, PageDown, Space  -> next()
   *   ArrowLeft, ArrowUp, PageUp              -> prev()
   *   Home                                     -> goTo(0)
   *   End                                      -> goTo(last)
   *   Escape                                   -> exit()
   *   a, A                                     -> toggleAutoAdvance()
   */
  handleKeyboard(e: KeyboardEvent): boolean {
    if (!this.#isActive) return false;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
        this.next();
        return true;

      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        this.prev();
        return true;

      case 'Home':
        this.goTo(0);
        return true;

      case 'End':
        this.goTo(this.#slides.length - 1);
        return true;

      case 'Escape':
        this.exit();
        return true;

      case 'a':
      case 'A':
        this.toggleAutoAdvance();
        return true;

      default:
        return false;
    }
  }

  // ------------------------------------------------------------------
  // Private: auto-advance timer management
  // ------------------------------------------------------------------

  #startAutoAdvance(): void {
    this.#stopAutoAdvance();
    this.#autoAdvanceTimer = setInterval(() => {
      this.next();
    }, this.#autoAdvanceInterval);
  }

  #stopAutoAdvance(): void {
    if (this.#autoAdvanceTimer) {
      clearInterval(this.#autoAdvanceTimer);
      this.#autoAdvanceTimer = null;
    }
  }

  // ------------------------------------------------------------------
  // Private: BFS slide ordering
  //
  // Pseudocode:
  //   1. Build adjacency list from 'sequence' connections only
  //   2. Find root nodes (items with no incoming sequence edges)
  //   3. BFS from each root, appending to ordered list
  //   4. Append any remaining unreachable items (not visited by BFS)
  //   5. Return the ordered slide list
  // ------------------------------------------------------------------

  #buildSlideOrder(
    items: SlideItem[],
    connections: Array<{ fromId: string; toId: string; type: string }>,
  ): SlideItem[] {
    const itemMap = new Map<string, SlideItem>();
    for (const item of items) {
      itemMap.set(item.id, item);
    }

    // Filter to only sequence connections between known items
    const sequenceConns = connections.filter(
      c => c.type === 'sequence' && itemMap.has(c.fromId) && itemMap.has(c.toId),
    );

    // Build adjacency list (forward edges only)
    const adj = new Map<string, string[]>();
    const incomingCount = new Map<string, number>();

    for (const item of items) {
      adj.set(item.id, []);
      incomingCount.set(item.id, 0);
    }

    for (const conn of sequenceConns) {
      adj.get(conn.fromId)!.push(conn.toId);
      incomingCount.set(conn.toId, (incomingCount.get(conn.toId) ?? 0) + 1);
    }

    // Find roots: items with zero incoming sequence edges
    const roots: string[] = [];
    for (const item of items) {
      if ((incomingCount.get(item.id) ?? 0) === 0) {
        roots.push(item.id);
      }
    }

    // BFS from each root
    const visited = new Set<string>();
    const ordered: SlideItem[] = [];

    for (const rootId of roots) {
      if (visited.has(rootId)) continue;
      const queue = [rootId];
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        const item = itemMap.get(current);
        if (item) ordered.push(item);

        const neighbors = adj.get(current) ?? [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        }
      }
    }

    // Append any unreachable items (not part of any sequence chain)
    for (const item of items) {
      if (!visited.has(item.id)) {
        ordered.push(item);
      }
    }

    return ordered;
  }

  // ------------------------------------------------------------------
  // Cleanup
  // ------------------------------------------------------------------

  /** Clean up timers. Call when the component/store is being destroyed. */
  destroy(): void {
    this.#stopAutoAdvance();
  }
}
