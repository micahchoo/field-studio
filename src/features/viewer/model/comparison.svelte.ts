/**
 * Comparison — State container (Category 2)
 *
 * Replaces useComparison React hook.
 * Architecture doc §4 Cat 2: Reactive class in .svelte.ts
 *
 * Side-by-side/overlay/curtain comparison mode for viewer.
 * Scoped class — each viewer instance creates its own.
 */

export type ComparisonMode = 'side-by-side' | 'overlay' | 'curtain' | 'off';

export class ComparisonStore {
  #mode = $state<ComparisonMode>('off');
  #leftCanvasId = $state<string | null>(null);
  #rightCanvasId = $state<string | null>(null);
  #overlayOpacity = $state(0.5);
  #curtainPosition = $state(50); // percentage
  #syncViewports = $state(true);

  get mode(): ComparisonMode { return this.#mode; }
  get leftCanvasId(): string | null { return this.#leftCanvasId; }
  get rightCanvasId(): string | null { return this.#rightCanvasId; }
  get overlayOpacity(): number { return this.#overlayOpacity; }
  get curtainPosition(): number { return this.#curtainPosition; }
  get syncViewports(): boolean { return this.#syncViewports; }
  get isActive(): boolean { return this.#mode !== 'off'; }

  setMode(mode: ComparisonMode): void { this.#mode = mode; }

  setCanvases(leftId: string, rightId: string): void {
    this.#leftCanvasId = leftId;
    this.#rightCanvasId = rightId;
  }

  setOverlayOpacity(opacity: number): void {
    this.#overlayOpacity = Math.max(0, Math.min(1, opacity));
  }

  setCurtainPosition(position: number): void {
    this.#curtainPosition = Math.max(0, Math.min(100, position));
  }

  toggleSyncViewports(): void {
    this.#syncViewports = !this.#syncViewports;
  }

  swapCanvases(): void {
    const tmp = this.#leftCanvasId;
    this.#leftCanvasId = this.#rightCanvasId;
    this.#rightCanvasId = tmp;
  }

  reset(): void {
    this.#mode = 'off';
    this.#leftCanvasId = null;
    this.#rightCanvasId = null;
    this.#overlayOpacity = 0.5;
    this.#curtainPosition = 50;
    this.#syncViewports = true;
  }
}
